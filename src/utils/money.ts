import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN })

export type Money = Decimal
export type MoneyInput = number | string | Decimal

export function money(value: MoneyInput = 0): Decimal {
  return new Decimal(value || 0)
}

export function add(...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v || 0), new Decimal(0))
}

export function sub(a: MoneyInput, b: MoneyInput): Decimal {
  return new Decimal(a || 0).minus(b || 0)
}

export function mul(a: MoneyInput, b: MoneyInput): Decimal {
  return new Decimal(a || 0).times(b || 0)
}

export function div(a: MoneyInput, b: MoneyInput): Decimal {
  const divisor = new Decimal(b || 0)
  if (divisor.isZero()) return new Decimal(0)
  return new Decimal(a || 0).dividedBy(divisor)
}

export function pct(amount: MoneyInput, percent: MoneyInput): Decimal {
  return mul(amount, div(percent, 100))
}

export function toNumber(value: MoneyInput): number {
  return new Decimal(value || 0).toNumber()
}

export function round2(value: MoneyInput): number {
  return new Decimal(value || 0).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber()
}

export function sumBy<T>(items: T[], selector: (item: T) => MoneyInput): Decimal {
  return items.reduce<Decimal>((acc, item) => acc.plus(selector(item) || 0), new Decimal(0))
}
