import { describe, it, expect } from 'vitest'
import { add, sub, mul, div, pct, round2, sumBy, money } from './money'

describe('money', () => {
  describe('precisión float', () => {
    it('0.1 + 0.2 = 0.3 exacto', () => {
      expect(round2(add(0.1, 0.2))).toBe(0.3)
    })

    it('suma muchos decimales sin error de float', () => {
      const total = round2(add(...Array(10).fill(0.1)))
      expect(total).toBe(1)
    })

    it('multiplica con precisión exacta', () => {
      expect(round2(mul(0.1, 3))).toBe(0.3)
      expect(round2(mul(2.5, 1.1))).toBe(2.75)
    })

    it('IVA 18% sobre RD$1234.56', () => {
      expect(round2(pct(1234.56, 18))).toBe(222.22)
    })
  })

  describe('add', () => {
    it('suma múltiples valores', () => {
      expect(round2(add(100, 200, 300))).toBe(600)
    })

    it('ignora null/undefined/0', () => {
      expect(round2(add(100, 0, 200))).toBe(300)
    })

    it('retorna 0 sin args', () => {
      expect(round2(add())).toBe(0)
    })
  })

  describe('sub', () => {
    it('resta básica', () => {
      expect(round2(sub(1000, 250))).toBe(750)
    })

    it('resultado negativo', () => {
      expect(round2(sub(100, 250))).toBe(-150)
    })
  })

  describe('mul', () => {
    it('cantidad × precio unitario', () => {
      expect(round2(mul(12.5, 850))).toBe(10625)
    })

    it('multiplicación con 0', () => {
      expect(round2(mul(100, 0))).toBe(0)
    })
  })

  describe('div', () => {
    it('división normal', () => {
      expect(round2(div(1000, 4))).toBe(250)
    })

    it('división por cero retorna 0 (no NaN/Infinity)', () => {
      expect(round2(div(100, 0))).toBe(0)
    })

    it('división con decimales periódicos', () => {
      expect(round2(div(10, 3))).toBe(3.33)
    })
  })

  describe('pct', () => {
    it('porcentaje 10% de 5000', () => {
      expect(round2(pct(5000, 10))).toBe(500)
    })

    it('porcentaje fraccional 0.5%', () => {
      expect(round2(pct(10000, 0.5))).toBe(50)
    })

    it('costos indirectos: DT 10% + Admin 1% + Transporte 0.5% sobre 100000', () => {
      const base = 100000
      const dt = pct(base, 10)
      const admin = pct(base, 1)
      const transport = pct(base, 0.5)
      expect(round2(add(dt, admin, transport))).toBe(11500)
    })
  })

  describe('round2', () => {
    it('redondea a 2 decimales (banker rounding)', () => {
      expect(round2(2.345)).toBe(2.34)
      expect(round2(2.355)).toBe(2.36)
      expect(round2(123.456)).toBe(123.46)
    })

    it('preserva enteros', () => {
      expect(round2(100)).toBe(100)
    })
  })

  describe('sumBy', () => {
    it('suma con selector', () => {
      const items = [{ price: 100 }, { price: 200 }, { price: 300 }]
      expect(round2(sumBy(items, (i) => i.price))).toBe(600)
    })

    it('lista vacía retorna 0', () => {
      expect(round2(sumBy([], (i) => i))).toBe(0)
    })

    it('cantidad × precio en partidas', () => {
      const items = [
        { qty: 10, price: 25.5 },
        { qty: 7, price: 100 },
        { qty: 3.5, price: 200 },
      ]
      expect(round2(sumBy(items, (i) => mul(i.qty, i.price)))).toBe(1655)
    })
  })

  describe('money factory', () => {
    it('acepta string, number, Decimal', () => {
      expect(money(100).toNumber()).toBe(100)
      expect(money('250.75').toNumber()).toBe(250.75)
      expect(money(money(50)).toNumber()).toBe(50)
    })

    it('null/undefined retorna 0', () => {
      expect(money().toNumber()).toBe(0)
    })
  })
})
