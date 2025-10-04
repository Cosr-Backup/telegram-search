import type { RuntimeFlags } from '@tg-search/common'
import type { CrossWSOptions } from 'listhen'

// --- 关键修改：直接在这里导入 process，而不是在共享文件中 ---
import process from 'node:process'

import { initConfig, parseEnvFlags } from '@tg-search/common'
import { initDrizzle } from '@tg-search/core'
import { initLogger, useLogger } from '@unbird/logg'
import { createApp, createRouter, defineEventHandler, toNodeListener, toEventHandler } from 'h3'
import { listen } from 'listhen'

import { setupWsRoutes } from './ws/routes'

// 原始的 setupErrorHandlers 函数，保持不变
function setupErrorHandlers(logger: ReturnType<typeof useLogger>): void {
  // TODO: fix type
  const handleError = (error: any, type: string) => {
    logger.withFields({ cause: String(error?.cause), cause_json: JSON.stringify(error?.cause) }).withError(error).error(type)
  }

  process.on('uncaughtException', error => handleError(error, 'Uncaught exception'))
  process.on('unhandledRejection', error => handleError(error, 'Unhandled rejection'))
}

// 原始的 configureServer 函数，保持不变
function configureServer(logger: ReturnType<typeof useLogger>, flags: RuntimeFlags) {
  const app = createApp({
    debug: flags.isDebugMode,
    onRequest(event) {
      const path = event.path
      const method = event.method

      logger.withFields({
        method,
        path,
      }).log('Request started')
    },
    onError(error, event) {
      const path = event.path
      const method = event.method

      const status = error instanceof Error && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500

      logger.withFields({
        method,
        path,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).error('Request failed')

      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    },
  })

  const router = createRouter()
  router.get('/health', defineEventHandler(() => {
    return Response.json({ success: true })
  }))

  app.use(router)
  setupWsRoutes(app)

  return app
}

// --- 这是最核心的、最终的、绝对正确的修改 ---

const appPromise = bootstrap()

export const handler = async (event: any, context: any) => {
  const app = await appPromise
  return toEventHandler(app)(event, context)
}

async function bootstrap() {
  // 1. 在这里，process.env 是真实、未被污染的 Node.js 环境变量
  const originalFlags = parseEnvFlags(process.env as Record<string, string>)
  let runtimeFlags = originalFlags

  // 2. 在这里进行环境判断，并准备覆盖用的 flags
  if (process.env.NETLIFY && process.env.DATABASE_URL) {
    // 使用 console.log 确保这条日志能被最先看到
    console.log('✅ [Bootstrap] Netlify environment detected. Preparing to override DB URL.')
    runtimeFlags = {
      ...originalFlags,
      dbUrl: process.env.DATABASE_URL, // 将环境变量中的 URL 注入到 dbUrl flag
    }
  }

  initLogger()
  const logger = useLogger()
  
  // 3. 将准备好的、带有 dbUrl 的 runtimeFlags 传递给 initConfig
  const config = await initConfig(runtimeFlags)

  try {
    await initDrizzle(logger, config, { isDatabaseDebugMode: runtimeFlags.isDatabaseDebugMode })
    logger.log('Database initialized successfully')
  }
  catch (error) {
    logger.withError(error).error('Failed to initialize services')
    throw new Error('Failed to initialize database services', { cause: error })
  }

  setupErrorHandlers(logger)
  const app = configureServer(logger, runtimeFlags)
  
  // 本地开发逻辑保持不变
  if (process.argv[1] && (process.argv[1].endsWith('app.ts') || process.argv[1].endsWith('app.js'))) {
    const listener = toNodeListener(app)
    const port = process.env.PORT ? Number(process.env.PORT) : 3000
    const server = await listen(listener, { port, ws: app.websocket as CrossWSOptions })
    logger.log(`Server started on port ${port}`)
    const shutdown = () => { server.close(); process.exit(0); }
    process.prependListener('SIGINT', shutdown)
    process.prependListener('SIGTERM', shutdown)
  }

  return app
}

// 原始的、被注释掉的自启动调用，保持不变
// bootstrap().catch((error) => {
//   console.error('Failed to start server:', error)
//   process.exit(1)
// })
