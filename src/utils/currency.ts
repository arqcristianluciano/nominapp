export function formatRD(amount: number): string {
  const safe = amount == null || !Number.isFinite(amount) ? 0 : amount
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)
}

export function formatUSD(amount: number): string {
  const safe = amount == null || !Number.isFinite(amount) ? 0 : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)
}

export function formatNumber(amount: number, decimals = 2): string {
  const safe = amount == null || !Number.isFinite(amount) ? 0 : amount
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe)
}

export function formatPercent(value: number): string {
  const safe = value == null || !Number.isFinite(value) ? 0 : value
  return `${safe.toFixed(1)}%`
}
