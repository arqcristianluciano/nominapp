import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('Error → message', () => {
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom')
  })

  it('string → mismo string', () => {
    expect(getErrorMessage('plain')).toBe('plain')
  })

  it('objeto con message → message', () => {
    expect(getErrorMessage({ message: 'supabase failed' })).toBe('supabase failed')
  })

  it('null/undefined → string vacío representativo', () => {
    expect(getErrorMessage(null)).toBe('null')
    expect(getErrorMessage(undefined)).toBe('undefined')
  })

  it('número → string', () => {
    expect(getErrorMessage(404)).toBe('404')
  })
})
