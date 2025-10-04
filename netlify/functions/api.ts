import type { Config, Handler } from '@netlify/functions'

import { DatabaseType, initConfig, parseEnvFlags } from '@tg-search/common'
import { createCoreInstance, initDrizzle } from '@tg-search/core'
import { initLogger, useLogger } from '@unbird/logg'

// Initialize logger
const flags = parseEnvFlags(process.env as Record<string, string>)
initLogger()
const logger = useLogger('netlify:api')

// Store core instances per session
const coreInstances = new Map<string, any>()

// Initialize database on cold start
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      logger.log('Initializing database for API...')
      const config = await initConfig(flags)
      
      // Use PostgreSQL if DATABASE_URL is set, otherwise use PGlite
      if (process.env.DATABASE_URL || process.env.DATABASE_TYPE === 'postgres') {
        logger.log('Using PostgreSQL database')
        config.database.type = DatabaseType.POSTGRES
        if (process.env.DATABASE_URL) {
          config.database.url = process.env.DATABASE_URL
        }
      } else {
        logger.log('Using PGlite database (browser-only mode)')
        config.database.type = DatabaseType.PGLITE
      }
      
      await initDrizzle(logger, config, { 
        isDatabaseDebugMode: flags.isDatabaseDebugMode 
      })
      
      dbInitialized = true
      logger.log('Database initialized successfully for API')
    }
    catch (error) {
      logger.withError(error).error('Failed to initialize database for API')
      throw error
    }
  }
}

function getCoreInstance(sessionId: string) {
  if (!coreInstances.has(sessionId)) {
    const config = initConfig(flags)
    // Note: This is simplified. In production, you'd need proper async handling
    const instance = createCoreInstance(config as any)
    coreInstances.set(sessionId, instance)
  }
  return coreInstances.get(sessionId)
}

export const handler: Handler = async (event, context) => {
  try {
    logger.withFields({
      path: event.path,
      method: event.httpMethod,
    }).log('API request received')

    // Handle OPTIONS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      }
    }

    // Ensure database is initialized
    await ensureDbInitialized()

    // Extract sessionId from query parameters or body
    const sessionId = event.queryStringParameters?.sessionId || 'default'

    // Parse the path to determine the action
    const pathParts = event.path.split('/').filter(Boolean)
    const action = pathParts[pathParts.length - 1]

    logger.withFields({ action, sessionId }).log('Processing API action')

    // Handle different API actions
    switch (action) {
      case 'auth-status': {
        // Return authentication status
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: true,
            authenticated: false,
            message: 'Auth status endpoint',
          }),
        }
      }

      case 'sessions': {
        // List sessions
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: true,
            sessions: Array.from(coreInstances.keys()),
          }),
        }
      }

      default: {
        // Unknown action
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: `Unknown action: ${action}`,
            availableActions: ['auth-status', 'sessions'],
          }),
        }
      }
    }
  }
  catch (error) {
    logger.withError(error).error('API request failed')

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    }
  }
}

export const config: Config = {
  path: '/api/v1/*',
}
