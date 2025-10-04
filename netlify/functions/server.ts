import type { Config, Handler } from '@netlify/functions'

import { initConfig, parseEnvFlags } from '@tg-search/common'
import { initDrizzle } from '@tg-search/core'
import { initLogger, useLogger } from '@unbird/logg'

// Initialize logger
const flags = parseEnvFlags(process.env as Record<string, string>)
initLogger()
const logger = useLogger('netlify:server')

// Initialize database on cold start
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      logger.log('Initializing database...')
      const config = await initConfig(flags)
      
      // Force PGlite for Netlify environment
      config.database.type = 'pglite'
      
      await initDrizzle(logger, config, { 
        isDatabaseDebugMode: flags.isDatabaseDebugMode 
      })
      
      dbInitialized = true
      logger.log('Database initialized successfully')
    }
    catch (error) {
      logger.withError(error).error('Failed to initialize database')
      throw error
    }
  }
}

export const handler: Handler = async (event, context) => {
  try {
    logger.withFields({
      path: event.path,
      method: event.httpMethod,
    }).log('Request received')

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

    // Health check endpoint
    if (event.path.includes('/health')) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-Requested-With',
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Server is running',
          dbInitialized,
          timestamp: new Date().toISOString(),
        }),
      }
    }

    // Return a default response for other endpoints
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'API endpoint',
        path: event.path,
        method: event.httpMethod,
      }),
    }
  }
  catch (error) {
    logger.withError(error).error('Request failed')

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
  path: '/api/*',
}
