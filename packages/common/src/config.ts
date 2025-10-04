import type { Config, ProxyConfig } from './config-schema'
import type { RuntimeFlags } from './flags'

import { useLogger } from '@unbird/logg'
import { isBrowser } from '@unbird/logg/utils'
import { useLocalStorage } from '@vueuse/core'
import defu from 'defu'
import { safeParse } from 'valibot'

import { configSchema, generateDefaultConfig } from './config-schema'
import { parseProxyUrl } from './proxy-url-parser'

let config: Config
const logger = useLogger('common:config')
const CONFIG_STORAGE_KEY = 'settings/config'

export function getDatabaseDSN(config: Config): string {
  const { database } = config
  return database.url || `postgres://${database.user}:${database.password}@${database.host}:${database.port}/${database.database}`
}

function validateAndMergeConfig(newConfig: Partial<Config>, baseConfig?: Config): Config {
  const mergedConfig = defu({}, newConfig, baseConfig || generateDefaultConfig())
  const validatedConfig = safeParse(configSchema, mergedConfig)

  if (!validatedConfig.success) {
    logger.withFields({ issues: validatedConfig.issues }).error('Failed to validate config')
    throw new Error('Failed to validate config')
  }

  return validatedConfig.output
}

function applyTelegramOverrides(config: Config, flags?: RuntimeFlags): void {
  if (flags?.telegramApiId || flags?.telegramApiHash) {
    config.api = config.api || {}
    const currentTelegram = config.api.telegram || {}
    config.api.telegram = {
      ...currentTelegram,
      ...(flags.telegramApiId && { apiId: flags.telegramApiId }),
      ...(flags.telegramApiHash && { apiHash: flags.telegramApiHash }),
    }
  }
}

function applyEmbeddingOverrides(config: Config, flags?: RuntimeFlags): void {
  if (
    flags?.embeddingProvider
    || flags?.embeddingModel
    || flags?.embeddingDimension
    || flags?.embeddingApiKey
    || flags?.embeddingApiBase
  ) {
    config.api = config.api || {}
    const currentEmbedding = config.api.embedding || {}
    config.api.embedding = {
      ...currentEmbedding,
      ...(flags.embeddingProvider && { provider: flags.embeddingProvider }),
      ...(flags.embeddingModel && { model: flags.embeddingModel }),
      ...(flags.embeddingDimension && { dimension: flags.embeddingDimension }),
      ...(flags.embeddingApiKey && { apiKey: flags.embeddingApiKey }),
      ...(flags.embeddingApiBase && { apiBase: flags.embeddingApiBase }),
    }
  }
}

function applyProxyOverrides(config: Config, flags?: RuntimeFlags): void {
  config.api = config.api || {}
  const currentTelegram = config.api.telegram || {}
  let proxyConfig = currentTelegram.proxy

  if (flags?.proxyUrl) {
    const parsedFromUrl = parseProxyUrl(flags.proxyUrl)
    if (parsedFromUrl) {
      proxyConfig = parsedFromUrl
    }
  }
  else if (currentTelegram.proxy?.proxyUrl) {
    const parsedFromUrl = parseProxyUrl(currentTelegram.proxy.proxyUrl)
    if (parsedFromUrl) {
      proxyConfig = parsedFromUrl
    }
  }
  else {
    const proxyFlags = {
      ip: flags?.proxyIp,
      port: flags?.proxyPort,
      MTProxy: flags?.proxyMTProxy,
      secret: flags?.proxySecret,
      socksType: flags?.proxySocksType,
      timeout: flags?.proxyTimeout,
      username: flags?.proxyUsername,
      password: flags?.proxyPassword,
    }
    const definedProxyFlags = Object.fromEntries(
      Object.entries(proxyFlags).filter(([, value]) => value !== undefined),
    )
    if (Object.keys(definedProxyFlags).length > 0) {
      proxyConfig = defu(definedProxyFlags, currentTelegram.proxy) as ProxyConfig
    }
  }

  if (proxyConfig && proxyConfig.ip && proxyConfig.port) {
    config.api.telegram = {
      ...currentTelegram,
      proxy: proxyConfig,
    }
  }
}

export async function initConfig(flags?: RuntimeFlags) {
  if (isBrowser()) {
    const configStorage = useLocalStorage(CONFIG_STORAGE_KEY, generateDefaultConfig())
    const savedConfig = configStorage.value
    if (savedConfig) {
      try {
        config = validateAndMergeConfig(savedConfig)
        return config
      }
      catch {}
    }
    config = generateDefaultConfig()
    return config
  }

  // --- 这是在原始代码基础上，唯一需要修改的地方 ---
  // 1. 动态导入 process
  const process = await import('node:process')

  // 2. 在服务器端，检查 Netlify 的环境变量
  if (process.env.NETLIFY && process.env.DATABASE_URL) {
    logger.log('✅ Netlify environment detected. Overriding database URL from environment variable.')
    // 创建一个临时的 flags 对象，只包含 dbUrl
    const netlifyFlags: RuntimeFlags = { ...flags, dbUrl: process.env.DATABASE_URL }
    // 调用原始的服务器端加载逻辑，但传入我们伪造的 flags
    return await loadNodeConfig(netlifyFlags)
  }
  // 如果不是 Netlify 环境，或者环境变量不存在，则执行原始逻辑
  return await loadNodeConfig(flags)
  // --- 修改结束 ---
}

// 将原始的服务器端加载逻辑，封装到一个新的函数中
async function loadNodeConfig(flags?: RuntimeFlags) {
    const { useConfigPath } = await import('./node/path')
    const { readFileSync } = await import('node:fs')
    const { parse } = await import('yaml')

    const configPath = await useConfigPath()

    const configData = readFileSync(configPath, 'utf-8')
    const configParsedData = parse(configData)

    const validatedConfig = validateAndMergeConfig(configParsedData)
    const runtimeConfig = applyRuntimeOverrides(validatedConfig, flags)

    config = runtimeConfig

    logger.withFields(config).log('Config loaded')
    return config
}


function applyRuntimeOverrides(baseConfig: Config, flags?: RuntimeFlags): Config {
  const runtimeConfig: Config = {
    ...baseConfig,
    database: { ...baseConfig.database },
  }

  if (baseConfig.api) {
    runtimeConfig.api = { ...baseConfig.api }
  }

  runtimeConfig.database.type = flags?.dbProvider || runtimeConfig.database.type
  runtimeConfig.database.url = flags?.dbUrl || runtimeConfig.database.url || getDatabaseDSN(runtimeConfig)

  applyTelegramOverrides(runtimeConfig, flags)
  applyEmbeddingOverrides(runtimeConfig, flags)
  applyProxyOverrides(runtimeConfig, flags)

  return runtimeConfig
}

export async function updateConfig(newConfig: Partial<Config>) {
  if (isBrowser()) {
    const configStorage = useLocalStorage(CONFIG_STORAGE_KEY, generateDefaultConfig())
    const validatedConfig = validateAndMergeConfig(newConfig, config)
    logger.withFields({ config: validatedConfig }).log('Updating config')
    config = validatedConfig
    configStorage.value = config
    return config
  }

  const { useConfigPath } = await import('./node/path')
  const { writeFileSync } = await import('node:fs')
  const { stringify } = await import('yaml')

  const configPath = await useConfigPath()

  const validatedConfig = validateAndMergeConfig(newConfig, config)
  validatedConfig.database.url = getDatabaseDSN(validatedConfig)

  logger.withFields({ config: validatedConfig }).log('Updating config')
  writeFileSync(configPath, stringify(validatedConfig))

  config = validatedConfig
  return config
}

export function useConfig(): Config {
  if (!config) {
    throw new Error('Config not initialized')
  }

  return config
}
