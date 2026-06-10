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

  it('traduce violaciones de RLS a un mensaje claro de permisos', () => {
    const msg = getErrorMessage({
      message: 'new row violates row-level security policy for table "bank_accounts"',
      code: '42501',
    })
    expect(msg).toContain('no tiene permiso')
    expect(msg).not.toContain('row-level security')
  })

  it('traduce "permission denied" a un mensaje claro de permisos', () => {
    expect(getErrorMessage(new Error('permission denied for table contractor_loans'))).toContain('no tiene permiso')
  })
})
