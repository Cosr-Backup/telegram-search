import type { CoreContext } from '../context'
import type { MessageResolverService } from '../services/message-resolver'

import { useLogger } from '@guiiai/logg'
import { newQueue } from '@henrygd/queue'

import { MESSAGE_RESOLVER_QUEUE_SIZE } from '../constants'

export function registerMessageResolverEventHandlers(ctx: CoreContext) {
  const { emitter } = ctx
  const logger = useLogger('core:message-resolver:event')

  return (messageResolverService: MessageResolverService) => {
    const queue = newQueue(MESSAGE_RESOLVER_QUEUE_SIZE)

    // TODO: debounce, background tasks
    emitter.on('message:process', ({ messages, isTakeout = false, syncOptions }) => {
      if (!isTakeout) {
        messageResolverService.processMessages(messages, { takeout: isTakeout, syncOptions }).catch((error) => {
          logger.withError(error).warn('Failed to process messages')
        })

        return
      }

      // Only use queue for takeout mode to avoid overwhelming the system.
      void queue.add(async () => {
        messageResolverService.processMessages(messages, { takeout: isTakeout, syncOptions }).catch((error) => {
          logger.withError(error).warn('Failed to process messages')
        })
      })
    })
  }
}
