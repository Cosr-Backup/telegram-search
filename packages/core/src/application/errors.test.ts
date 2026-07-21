import { describe, expect, it } from 'vitest'

import { toAppError } from './errors'

describe('telegram application error classification', () => {
  it('preserves Telegram flood waits without retrying them immediately', () => {
    const error = toAppError({
      code: 420,
      errorMessage: 'FLOOD_WAIT_298',
      message: 'A wait of 298 seconds is required (caused by auth.SendCode)',
    })

    expect(error).toMatchObject({
      code: 'TELEGRAM_FLOOD_WAIT',
      retryable: true,
      retryAfterSeconds: 298,
    })
  })

  it('preserves Telegram takeout delays', () => {
    const error = toAppError({
      code: 420,
      errorMessage: 'TAKEOUT_INIT_DELAY_86400',
      message: '420: TAKEOUT_INIT_DELAY_86400',
    })

    expect(error).toMatchObject({
      code: 'TAKEOUT_INIT_DELAY',
      retryable: true,
      retryAfterSeconds: 86400,
    })
  })

  it('marks Telegram server failures as transient', () => {
    const error = toAppError({
      code: 500,
      errorMessage: 'RPC_CALL_FAIL',
      message: '500: RPC_CALL_FAIL',
    })

    expect(error).toMatchObject({ code: 'TELEGRAM_TRANSIENT', retryable: true })
    expect(error.retryAfterSeconds).toBeUndefined()
  })

  it('does not retry deterministic Telegram request errors', () => {
    const error = toAppError({
      code: 400,
      errorMessage: 'PHONE_NUMBER_INVALID',
      message: '400: PHONE_NUMBER_INVALID',
    })

    expect(error).toMatchObject({ code: 'TELEGRAM_RPC_ERROR', retryable: false })
  })
})
