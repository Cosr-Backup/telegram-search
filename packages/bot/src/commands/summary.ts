import type { Bot } from 'grammy'

import type { BotCommandContext } from '.'

import { InlineKeyboard } from 'grammy'

import { buildPaginationButtons, paginateItems, splitTextToPages } from './helpers'

type SummaryMode = 'unread' | 'today' | 'last24h'

const SUMMARY_PAGE_SIZE = 3500

interface SummaryState {
  pages: string[]
}

const summaryStates = new Map<number, SummaryState>()

export function registerSummaryCommand(bot: Bot, ctx: BotCommandContext) {
  const logger = ctx.logger.withContext('bot:command:summary')

  // /summary - show mode selection
  bot.command('summary', async (gramCtx) => {
    const userId = gramCtx.from?.id
    if (!userId) {
      await gramCtx.reply('Could not identify you.')
      return
    }

    const account = await ctx.resolveAccountByTelegramUserId(userId)
    if (!account) {
      await gramCtx.reply('Your account is not linked. Please log in through the web interface first.')
      return
    }

    try {
      const keyboard = new InlineKeyboard()
        .text('📬 Unread', 'sum:unread')
        .text('📅 Today', 'sum:today')
        .row()
        .text('🕐 Last 24h', 'sum:last24h')

      await gramCtx.reply('Choose what to summarize:', { reply_markup: keyboard })
    }
    catch (error) {
      logger.withError(error).error('Summary command failed')
      await gramCtx.reply('An error occurred. Please try again later.')
    }
  })

  // Handle summary mode selection
  bot.callbackQuery(/^sum:/, async (gramCtx) => {
    const userId = gramCtx.from.id
    const mode = gramCtx.callbackQuery.data.split(':')[1] as SummaryMode

    const account = await ctx.resolveAccountByTelegramUserId(userId)
    if (!account) {
      await gramCtx.answerCallbackQuery('Account not linked.')
      return
    }

    try {
      summaryStates.delete(userId)
      await gramCtx.answerCallbackQuery()
      await gramCtx.editMessageText('📝 Fetching messages...')

      const db = ctx.getDB()

      // 1. Fetch messages
      const messages = await fetchMessagesForSummary(ctx, account.id, mode)

      if (messages.length === 0) {
        await gramCtx.editMessageText(`No ${mode} messages to summarize.`)
        return
      }

      // 2. Get LLM config
      const accountResult = await ctx.models.accountModels.findAccountByUUID(db, account.id)
      const accountData = accountResult.expect('Account not found')
      const llmConfig = accountData.settings?.llm

      if (!llmConfig?.apiKey) {
        await gramCtx.editMessageText(
          '⚠️ Please configure your OpenAI API key in the web interface first.\n\nGo to Settings → LLM Configuration',
        )
        return
      }

      // 3. Generate summary with streaming
      const modeLabel = {
        unread: 'Unread Messages',
        today: 'Today\'s Messages',
        last24h: 'Last 24 Hours',
      }[mode]

      let accumulatedText = ''
      let lastUpdateTime = 0
      const UPDATE_INTERVAL = 500 // Update every 500ms

      await generateSummary(messages, llmConfig, async (delta) => {
        accumulatedText += delta
        const now = Date.now()

        // Update message periodically to show streaming progress
        if (now - lastUpdateTime > UPDATE_INTERVAL) {
          lastUpdateTime = now
          const summaryText = `📊 **${modeLabel} Summary**\n\n${accumulatedText}\n\n---\n_Generating... (${messages.length} messages)_`

          try {
            await gramCtx.editMessageText(summaryText, { parse_mode: 'Markdown' })
          }
          catch (err) {
            // Ignore rate limit errors during streaming
            if (!(err instanceof Error) || !err.message.includes('Too Many Requests')) {
              throw err
            }
          }
        }
      })

      // 4. Final update with complete summary
      const summaryText = `📊 **${modeLabel} Summary**\n\n${accumulatedText}\n\n---\n_Based on ${messages.length} message(s)_`
      const pages = splitTextToPages(summaryText, SUMMARY_PAGE_SIZE)

      if (pages.length <= 1) {
        summaryStates.delete(userId)
        await gramCtx.editMessageText(
          summaryText,
          { parse_mode: 'Markdown' },
        )
        return
      }

      summaryStates.set(userId, { pages })
      const { pageItems, totalPages, page: safePage } = paginateItems(pages, 0, 1)
      const keyboard = new InlineKeyboard()
      const navButtons = buildPaginationButtons({
        page: safePage,
        hasMore: safePage < totalPages - 1,
        prefix: 'summarypage:',
        labels: { prev: '⬅️ Prev Page', next: '➡️ Next Page' },
      })

      if (navButtons.length > 0) {
        keyboard.row(...navButtons)
      }

      const pageText = pageItems[0] || ''
      await gramCtx.editMessageText(
        `${pageText}\n\n(Page ${safePage + 1}/${totalPages})`,
        { parse_mode: 'Markdown', reply_markup: keyboard },
      )
    }
    catch (error) {
      logger.withError(error).error('Summary generation failed')
      await gramCtx.reply('❌ An error occurred while generating summary. Please try again later.')
    }
  })

  // Handle summary pagination
  bot.callbackQuery(/^summarypage:/, async (gramCtx) => {
    const userId = gramCtx.from.id
    const page = Number.parseInt(gramCtx.callbackQuery.data.replace('summarypage:', ''), 10)

    const state = summaryStates.get(userId)
    if (!state) {
      await gramCtx.answerCallbackQuery('Session expired. Please /summary again.')
      return
    }

    const { pageItems, totalPages, page: safePage } = paginateItems(state.pages, page, 1)
    const keyboard = new InlineKeyboard()
    const navButtons = buildPaginationButtons({
      page: safePage,
      hasMore: safePage < totalPages - 1,
      prefix: 'summarypage:',
      labels: { prev: '⬅️ Prev Page', next: '➡️ Next Page' },
    })

    if (navButtons.length > 0) {
      keyboard.row(...navButtons)
    }

    await gramCtx.answerCallbackQuery()
    await gramCtx.editMessageText(
      `${pageItems[0] || ''}\n\n(Page ${safePage + 1}/${totalPages})`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  })
}

/**
 * Fetch messages based on summary mode
 */
async function fetchMessagesForSummary(
  ctx: BotCommandContext,
  accountId: string,
  mode: SummaryMode,
): Promise<Array<{ fromName?: string, fromId?: string, content: string }>> {
  const db = ctx.getDB()
  const now = Math.floor(Date.now() / 1000)

  let startTime: number
  const endTime = now

  switch (mode) {
    case 'unread': {
      // Fetch unread messages (simplified - get messages from last 7 days)
      startTime = now - 7 * 24 * 60 * 60
      break
    }
    case 'today': {
      // Today's messages (00:00 to now)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      startTime = Math.floor(todayStart.getTime() / 1000)
      break
    }
    case 'last24h': {
      // Last 24 hours
      startTime = now - 24 * 60 * 60
      break
    }
  }

  // Query messages
  const result = await ctx.models.chatMessageModels.retrieveMessages(
    db,
    ctx.logger,
    accountId,
    undefined,
    1536, // embedding dimension
    { text: '' }, // empty query to get all messages
    { limit: 1000, offset: 0 },
    {
      timeRange: {
        start: startTime,
        end: endTime,
      },
    },
  )

  const allMessages = result.expect('Failed to fetch messages')

  // Map to simple format
  return allMessages.map(msg => ({
    fromName: msg.from_name,
    fromId: msg.from_id,
    content: msg.content || '',
  }))
}

/**
 * Generate summary using xsai streaming
 */
async function generateSummary(
  messages: Array<{ fromName?: string, fromId?: string, content: string }>,
  llmConfig: { apiKey: string, apiBase?: string, model?: string, temperature?: number, maxTokens?: number },
  onDelta: (delta: string) => void | Promise<void>,
): Promise<void> {
  const { streamText } = await import('xsai')

  // Build message content
  const content = messages
    .map((m) => {
      const name = m.fromName || (m.fromId ? `User ${m.fromId}` : 'Unknown')
      return `${name}: ${m.content}`
    })
    .join('\n')

  // Stream from LLM
  const { textStream } = streamText({
    baseURL: llmConfig.apiBase || 'https://api.openai.com/v1',
    model: llmConfig.model || 'gpt-4o-mini',
    apiKey: llmConfig.apiKey,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Summarize the following Telegram messages concisely in Chinese. Focus on key topics, important information, and main discussion points.',
      },
      {
        role: 'user',
        content,
      },
    ],
    temperature: llmConfig.temperature ?? 0.7,
    maxTokens: llmConfig.maxTokens ?? 2000,
  })

  const iterable = textStream as unknown as AsyncIterable<string>
  for await (const text of iterable) {
    await onDelta(text)
  }
}
