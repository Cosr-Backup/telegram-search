import type { Config, Handler } from '@netlify/functions'

import { initLogger, useLogger } from '@unbird/logg'

// Initialize logger
initLogger()
const logger = useLogger('netlify:ws')

export const handler: Handler = async (event, context) => {
  try {
    logger.withFields({
      path: event.path,
      method: event.httpMethod,
    }).log('WebSocket request received')

    // Netlify Functions don't support WebSocket directly
    // Return a response indicating the client should use browser-only mode
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'WebSocket not supported in serverless environment. Please use browser-only mode.',
        useBrowserMode: true,
      }),
    }
  }
  catch (error) {
    logger.withError(error).error('WebSocket request failed')

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
  path: '/ws',
}
