// 原始文件顶部所有的 import
import type { RuntimeFlags } from '@tg-search/common'
import type { CrossWSOptions } from 'listhen'
import process from 'node:process'
import { initConfig, parseEnvFlags } from '@tg-search/common'
import { initDrizzle } from '@tg-search/core'
import { initLogger, useLogger } from '@unbird/logg'
// --- 修改：在 h3 的 import 中加入 toEventHandler ---
import { createApp, createRouter, defineEventHandler, toNodeListener, toEventHandler } from 'h3'
import { listen } from 'listhen'
import { setupWsRoutes } from './ws/routes'

// 原始的 setupErrorHandlers 函数，保持不变
function setupErrorHandlers(logger: ReturnType<typeof useLogger>): void {
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
      logger.withFields({ method: event.method, path: event.path }).log('Request started')
    },
    onError(error, event) {
      const status = error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500
      logger.withFields({ method: event.method, path: event.path, status, error: error instanceof Error ? error.message : 'Unknown error' }).error('Request failed')
      return Response.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    },
  })
  const router = createRouter()
  router.get('/health', defineEventHandler(() => Response.json({ success: true })))
  app.use(router)
  setupWsRoutes(app)
  return app
}

// --- 这是最核心的修改部分 ---

// 1. 将 bootstrap 逻辑包装起来，创建一个全局的 Promise
const appPromise = bootstrap()

// 2. 导出 Netlify 需要的 handler
export const handler = async (event: any, context: any) => {
  const app = await appPromise
  return toEventHandler(app)(event, context)
}

// 3. 修改原始的 bootstrap 函数
async function bootstrap() {
  const flags = parseEnvFlags(process.env as Record<string, string>)
  initLogger()
  const logger = useLogger()
  const config = await initConfig(flags)

  try {
    // 这里的数据库配置将由 Netlify 的环境变量提供
    await initDrizzle(logger, config, { isDatabaseDebugMode: flags.isDatabaseDebugMode })
    logger.log('Database initialized successfully')
  }
  catch (error) {
    logger.withError(error).error('Failed to initialize services')
    // 在 serverless 环境中，不能退出进程，而是要抛出错误
    throw new Error('Failed to initialize database services', { cause: error })
  }

  setupErrorHandlers(logger)
  const app = configureServer(logger, flags)
  
  // 4. 添加一个判断，只在本地开发时才启动服务器
  if (process.argv[1] && (process.argv[1].endsWith('app.ts') || process.argv[1].endsWith('app.js'))) {
    const listener = toNodeListener(app)
    const port = process.env.PORT ? Number(process.env.PORT) : 3000
    const server = await listen(listener, { port, ws: app.websocket as CrossWSOptions })
    logger.log(`Server started on port ${port}`)

    const shutdown = () => {
      logger.log('Shutting down server gracefully...')
      server.close()
      process.exit(0)
    }
    process.prependListener('SIGINT', shutdown)
    process.prependListener('SIGTERM', shutdown)
  }

  // 总是返回 app 实例
  return app
}

// 5. 移除或注释掉文件末尾的自启动调用
// bootstrap().catch((error) => {
//   console.error('Failed to start server:', error)
//   process.exit(1)
// })
