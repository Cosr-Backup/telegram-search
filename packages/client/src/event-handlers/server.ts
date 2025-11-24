import type { ClientRegisterEventHandler } from '.'

import { toast } from 'vue-sonner'

import { useBridgeStore } from '../composables/useBridge'

export function registerServerEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  registerEventHandler('server:connected', (data) => {
    // server:connected carries the authoritative connection state for a
    // specific sessionId. We update that slot directly without creating
    // any new accounts.
    useBridgeStore().updateSessionMetadataById(data.sessionId, { isConnected: data.connected })
  })

  registerEventHandler('server:error', ({ error }) => {
    // TODO: move it to view layer
    toast.error(String(error))
  })
}
