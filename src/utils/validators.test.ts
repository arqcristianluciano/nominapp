import { describe, it, expect } from 'vitest'
import { isCedula, isRNC, isPhone, isEmail } from './validators'

describe('isCedula', () => {
  it('acepta cédula con guiones', () => {
    expect(isCedula('001-1234567-8')).toBe(true)
  })

  it('acepta cédula sin guiones (11 dígitos)', () => {
    expect(isCedula('00112345678')).toBe(true)
  })

  it('rechaza cédula con menos de 11 dígitos', () => {
    expect(isCedula('001-123456-8')).toBe(false)
    expect(isCedula('0011234567')).toBe(false)
  })

  it('rechaza cédula con más de 11 dígitos', () => {
    expect(isCedula('001-12345678-9')).toBe(false)
    expect(isCedula('001123456789')).toBe(false)
  })

  it('rechaza string con letras', () => {
    expect(isCedula('001-ABC4567-8')).toBe(false)
  })

  it('rechaza string vacío', () => {
    expect(isCedula('')).toBe(false)
  })

  it('rechaza string solo con espacios', () => {
    expect(isCedula('   ')).toBe(false)
  })

  it('trim de espacios en bordes', () => {
    expect(isCedula(' 001-1234567-8 ')).toBe(true)
  })
})

describe('isRNC', () => {
  it('acepta RNC de 9 dígitos sin guiones', () => {
    expect(isRNC('123456789')).toBe(true)
  })

  it('acepta RNC de 9 dígitos con guiones (1-31-12345-1)', () => {
    expect(isRNC('1-31-12345-1')).toBe(true)
  })

  it('acepta RNC de 11 dígitos sin guiones', () => {
    expect(isRNC('12345678901')).toBe(true)
  })

  it('acepta RNC de 11 dígitos con guiones', () => {
    expect(isRNC('001-1234567-8')).toBe(true)
  })

  it('rechaza RNC con menos dígitos', () => {
    expect(isRNC('12345678')).toBe(false)
  })

  it('rechaza RNC con número intermedio (10 dígitos)', () => {
    expect(isRNC('1234567890')).toBe(false)
  })

  it('rechaza RNC con más de 11 dígitos', () => {
    expect(isRNC('123456789012')).toBe(false)
  })

  it('rechaza string con letras', () => {
    expect(isRNC('1234ABC56789')).toBe(false)
  })

  it('rechaza string vacío', () => {
    expect(isRNC('')).toBe(false)
  })
})

describe('isPhone', () => {
  it('acepta 10 dígitos sin formato', () => {
    expect(isPhone('8095550000')).toBe(true)
  })

  it('acepta formato XXX-XXX-XXXX', () => {
    expect(isPhone('809-555-0000')).toBe(true)
  })

  it('acepta formato con paréntesis (XXX) XXX-XXXX', () => {
    expect(isPhone('(809) 555-0000')).toBe(true)
  })

  it('acepta con prefijo +1', () => {
    expect(isPhone('+1 809-555-0000')).toBe(true)
    expect(isPhone('+18095550000')).toBe(true)
  })

  it('acepta con prefijo 1 sin +', () => {
    expect(isPhone('18095550000')).toBe(true)
  })

  it('rechaza menos de 10 dígitos', () => {
    expect(isPhone('809555000')).toBe(false)
  })

  it('rechaza más de 10 dígitos sin prefijo', () => {
    expect(isPhone('80955500001')).toBe(false)
  })

  it('rechaza letras', () => {
    expect(isPhone('809-CALL-NOW')).toBe(false)
  })

  it('rechaza string vacío', () => {
    expect(isPhone('')).toBe(false)
  })
})

describe('isEmail', () => {
  it('acepta email válido', () => {
    expect(isEmail('user@example.com')).toBe(true)
  })

  it('acepta email con subdominio', () => {
    expect(isEmail('user@mail.example.com')).toBe(true)
  })

  it('acepta email con + en local part', () => {
    expect(isEmail('user+tag@example.com')).toBe(true)
  })

  it('rechaza sin @', () => {
    expect(isEmail('userexample.com')).toBe(false)
  })

  it('rechaza sin dominio TLD', () => {
    expect(isEmail('user@example')).toBe(false)
  })

  it('rechaza sin local part', () => {
    expect(isEmail('@example.com')).toBe(false)
  })

  it('rechaza con espacios', () => {
    expect(isEmail('user @example.com')).toBe(false)
    expect(isEmail('user@exa mple.com')).toBe(false)
  })

  it('rechaza string vacío', () => {
    expect(isEmail('')).toBe(false)
  })

  it('rechaza con doble @', () => {
    expect(isEmail('user@@example.com')).toBe(false)
  })
})
