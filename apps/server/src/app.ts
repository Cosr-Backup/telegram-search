import type { RuntimeFlags } from '@tg-search/common'
import type { CrossWSOptions } from 'listhen'

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

import { initConfig, parseEnvFlags } from '@tg-search/common'
import { initDrizzle } from '@tg-search/core'
import { initLogger, useLogger } from '@unbird/logg'
import { createApp, createRouter, defineEventHandler, serveStatic, toNodeListener } from 'h3'
import { listen } from 'listhen'

import { setupWsRoutes } from './ws/routes'

function setupErrorHandlers(logger: ReturnType<typeof useLogger>): void {
  // TODO: fix type
  const handleError = (error: any, type: string) => {
    logger.withFields({ cause: String(error?.cause), cause_json: JSON.stringify(error?.cause) }).withError(error).error(type)
  }

  process.on('uncaughtException', error => handleError(error, 'Uncaught exception'))
  process.on('unhandledRejection', error => handleError(error, 'Unhandled rejection'))
}

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

  // app.use(eventHandler((event) => {
  //   setResponseHeaders(event, {
  //     'Access-Control-Allow-Origin': 'http://localhost:3333',
  //     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  //     'Access-Control-Allow-Credentials': 'true',
  //     'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-Requested-With',
  //   })

  //   if (event.method === 'OPTIONS') {
  //     setResponseHeaders(event, {
  //       'Access-Control-Max-Age': '86400',
  //     })
  //     return null
  //   }
  // }))

  const router = createRouter()
  router.get('/api/health', defineEventHandler(() => {
    return Response.json({ success: true })
  }))

  app.use(router)
  setupWsRoutes(app)

  // Serve static files from web build in production
  const distPath = resolve(import.meta.dirname, '../../web/dist')
  if (existsSync(distPath)) {
    logger.log(`Serving static files from: ${distPath}`)

    // Serve static assets from /assets
    app.use('/assets/**', defineEventHandler((event) => {
      return serveStatic(event, {
        getContents: id => import('node:fs').then(fs => fs.readFileSync(join(distPath, id))),
        getMeta: async (id) => {
          const stats = await import('node:fs/promises').then(fs => fs.stat(join(distPath, id)).catch(() => null))
          if (!stats || !stats.isFile()) {
            return
          }
          return {
            size: stats.size,
            mtime: stats.mtimeMs,
          }
        },
      })
    }))

    // Serve other static files (favicon, etc)
    app.use(defineEventHandler((event) => {
      const path = event.path
      // Don't interfere with API routes or WebSocket
      if (path.startsWith('/api') || path.startsWith('/ws')) {
        return
      }

      // Try to serve static file, otherwise serve index.html for SPA routing
      return serveStatic(event, {
        getContents: (id) => {
          const filePath = id === '/' ? 'index.html' : id
          const fullPath = join(distPath, filePath)

          return import('node:fs').then((fs) => {
            // If file doesn't exist, serve index.html for SPA routing
            if (!fs.existsSync(fullPath)) {
              return fs.readFileSync(join(distPath, 'index.html'))
            }
            return fs.readFileSync(fullPath)
          })
        },
        getMeta: async (id) => {
          const filePath = id === '/' ? 'index.html' : id
          const fullPath = join(distPath, filePath)

          const stats = await import('node:fs/promises').then(fs =>
            fs.stat(fullPath).catch(() =>
              // If file doesn't exist, use index.html stats for SPA routing
              fs.stat(join(distPath, 'index.html')).catch(() => null),
            ),
          )

          if (!stats || !stats.isFile()) {
            return
          }

          return {
            size: stats.size,
            mtime: stats.mtimeMs,
          }
        },
      })
    }))
  }
  else {
    logger.log('Static files not found, serving API only')
  }

  return app
}

async function bootstrap() {
  const flags = parseEnvFlags(process.env as Record<string, string>)
  initLogger()
  const logger = useLogger()
  const config = await initConfig(flags)

  try {
    await initDrizzle(logger, config, { isDatabaseDebugMode: flags.isDatabaseDebugMode })
    logger.log('Database initialized successfully')
  }
  catch (error) {
    logger.withError(error).error('Failed to initialize services')
    process.exit(1)
  }

  setupErrorHandlers(logger)

  const app = configureServer(logger, flags)
  const listener = toNodeListener(app)

  const port = process.env.PORT ? Number(process.env.PORT) : 3000
  // const { handleUpgrade } = wsAdapter(app.websocket as NodeOptions)
  const server = await listen(listener, { port, ws: app.websocket as CrossWSOptions })
  // const server = createServer(listener).listen(port)
  // server.on('upgrade', handleUpgrade)

  logger.log('Server started')

  const shutdown = () => {
    logger.log('Shutting down server gracefully...')
    server.close()
    process.exit(0)
  }
  process.prependListener('SIGINT', shutdown)
  process.prependListener('SIGTERM', shutdown)

  return app
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
