import type { ClientRegisterEventHandler } from '.'

import { toast } from 'vue-sonner'

import { useBridgeStore } from '../composables/useBridge'
import { useAuthStore } from '../stores/useAuth'

export function registerBasicEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  registerEventHandler('auth:code:needed', () => {
    useAuthStore().auth.needCode = true
  })

  registerEventHandler('auth:password:needed', () => {
    useAuthStore().auth.needPassword = true
  })

  registerEventHandler('auth:connected', () => {
    useBridgeStore().getActiveSession()!.isConnected = true
  })

  registerEventHandler('auth:disconnected', () => {
    useBridgeStore().getActiveSession()!.isConnected = false
  })

  // Core forwards updated StringSession to the client; let bridge store decide
  // whether to update current account or create a new slot (add-account flow).
  registerEventHandler('session:update', ({ session }) => {
    // session:update always applies to the currently active slot. The
    // auth flow is responsible for selecting the correct active account
    // before initiating login.
    const bridgeStore = useBridgeStore()
    bridgeStore.updateActiveSessionMetadata({ session })
  })

  registerEventHandler('auth:error', ({ error }) => {
    // TODO better toast error message
    toast.error(JSON.stringify(error))
    useAuthStore().auth.isLoading = false
  })
}
