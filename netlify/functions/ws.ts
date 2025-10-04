import type { Config, Handler } from '@netlify/functions'

import { initLogger, useLogger } from '@unbird/logg'

// Initialize logger
initLogger()
const logger = useLogger('netlify:ws')

// In-memory store for events (limited, for demonstration purposes)
// In production, you'd want to use a proper message queue or database
const eventStore = new Map<string, Array<{ type: string, data: any, timestamp: number }>>()
const MAX_EVENTS_PER_SESSION = 100
const EVENT_TTL = 300000 // 5 minutes

// Clean up old events periodically
setInterval(() => {
  const now = Date.now()
  eventStore.forEach((events, sessionId) => {
    const filtered = events.filter(e => now - e.timestamp < EVENT_TTL)
    if (filtered.length === 0) {
      eventStore.delete(sessionId)
    } else {
      eventStore.set(sessionId, filtered)
    }
  })
}, 60000) // Clean every minute

export const handler: Handler = async (event, context) => {
  try {
    logger.withFields({
      path: event.path,
      method: event.httpMethod,
    }).log('WebSocket/polling request received')

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

    // Extract sessionId from query parameters
    const sessionId = event.queryStringParameters?.sessionId || 'default'

    // Handle GET requests - polling for events
    if (event.httpMethod === 'GET') {
      const events = eventStore.get(sessionId) || []
      const lastEventId = event.queryStringParameters?.lastEventId ? 
        parseInt(event.queryStringParameters.lastEventId) : 0

      // Filter events after lastEventId
      const newEvents = events.filter(e => e.timestamp > lastEventId)

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          events: newEvents,
          lastEventId: newEvents.length > 0 ? newEvents[newEvents.length - 1].timestamp : lastEventId,
          pollingInfo: {
            message: 'WebSocket not supported in Netlify. Using HTTP polling for real-time updates.',
            recommendedInterval: 2000, // Poll every 2 seconds
          },
        }),
      }
    }

    // Handle POST requests - sending events from client
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      
      logger.withFields({
        sessionId,
        eventType: body.type,
      }).log('Client event received')

      // Store response events for this session
      const responseEvent = {
        type: 'server:connected',
        data: { sessionId, connected: true },
        timestamp: Date.now(),
      }

      const sessionEvents = eventStore.get(sessionId) || []
      sessionEvents.push(responseEvent)
      
      // Keep only the latest events
      if (sessionEvents.length > MAX_EVENTS_PER_SESSION) {
        sessionEvents.splice(0, sessionEvents.length - MAX_EVENTS_PER_SESSION)
      }
      
      eventStore.set(sessionId, sessionEvents)

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          message: 'Event received',
          sessionId,
        }),
      }
    }

    // For WebSocket upgrade attempts, provide guidance
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'WebSocket not supported in Netlify serverless environment.',
        alternative: {
          method: 'HTTP polling',
          pollingEndpoint: '/.netlify/functions/ws?sessionId=YOUR_SESSION_ID',
          sendEndpoint: '/.netlify/functions/ws',
          instructions: 'Use GET requests to poll for events and POST to send events',
        },
      }),
    }
  }
  catch (error) {
    logger.withError(error).error('WebSocket/polling request failed')

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
