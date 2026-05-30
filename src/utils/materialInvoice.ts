import { round2, sumBy } from '@/utils/money'

/**
 * Helpers puros para las facturas de materiales con varios items.
 *
 * Una factura agrupa varios items (descripcion + monto). En la base de datos
 * el TOTAL de la factura se guarda denormalizado en `material_invoices.amount`
 * y un resumen legible en `material_invoices.description`, para que reportes,
 * impresion y export sigan funcionando sin leer la tabla de items.
 */

export interface MaterialInvoiceItemDraft {
  description: string
  amount: number
}

/** Suma de los montos de los items, redondeada a 2 decimales. */
export function sumInvoiceItems(items: { amount: number }[]): number {
  return round2(sumBy(items, (it) => it.amount || 0))
}

/**
 * Resumen de la factura a partir de las descripciones de sus items.
 * Se guarda en `material_invoices.description`. Se trunca a `maxLen` para no
 * desbordar columnas/celdas en reportes e impresion.
 */
export function buildInvoiceSummary(items: { description: string }[], maxLen = 200): string {
  const summary = items
    .map((it) => it.description.trim())
    .filter(Boolean)
    .join(', ')
  if (summary.length <= maxLen) return summary
  return `${summary.slice(0, maxLen - 1).trimEnd()}…`
}
