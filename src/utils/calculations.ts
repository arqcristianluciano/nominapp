import type { CustomIndirect, LaborLineItem, MaterialInvoice, Project } from '@/types/database'
import { BANK_COMMISSION_PERCENT } from '@/constants/indirectCosts'
import { add, mul, pct, round2, sumBy } from './money'

type CustomIndirectResult = CustomIndirect & { amount: number }

export function calcLaborTotal(items: LaborLineItem[]): number {
  return round2(sumBy(items, (item) => mul(item.quantity, item.unit_price)))
}

export function calcContractorSubtotal(items: LaborLineItem[], contractorId: string): number {
  const subset = items.filter((i) => i.contractor_id === contractorId)
  return round2(sumBy(subset, (item) => mul(item.quantity, item.unit_price)))
}

export function calcMaterialsTotal(invoices: MaterialInvoice[]): number {
  return round2(sumBy(invoices, (inv) => inv.amount))
}

export function calcIndirectCosts(
  laborTotal: number,
  materialsTotal: number,
  project: Pick<Project, 'dt_percent' | 'admin_percent' | 'transport_percent' | 'planning_fee' | 'custom_indirects'>
) {
  const base = add(laborTotal, materialsTotal)
  const dt = pct(base, project.dt_percent)
  const admin = pct(base, project.admin_percent)
  const transport = pct(base, project.transport_percent)
  const planning = project.planning_fee || 0

  const customs: CustomIndirectResult[] = (project.custom_indirects || []).map((c) => ({
    ...c,
    amount: round2(c.type === 'percent' ? pct(base, c.value) : c.value),
  }))
  const customsTotal = sumBy(customs, (c) => c.amount)

  return {
    base: round2(base),
    direction_technique: { amount: round2(dt), percent: project.dt_percent },
    administration: { amount: round2(admin), percent: project.admin_percent },
    transport: { amount: round2(transport), percent: project.transport_percent },
    planning: { amount: round2(planning) },
    customs,
    total: round2(add(dt, admin, transport, planning, customsTotal)),
  }
}

export function calcBankCommission(amount: number): number {
  return round2(pct(amount, BANK_COMMISSION_PERCENT))
}

export function calcGrandTotal(labor: number, materials: number, indirect: number): number {
  return round2(add(labor, materials, indirect))
}

export type IndirectCostRow = {
  type: string
  description: string
  percentage: number
  base_amount: number
  calculated_amount: number
}

export function buildIndirectCostRows(
  project: Pick<Project, 'dt_percent' | 'admin_percent' | 'transport_percent' | 'planning_fee'>,
  indirect: ReturnType<typeof calcIndirectCosts>
): IndirectCostRow[] {
  const rows: IndirectCostRow[] = [
    { type: 'direction_technique', description: `Dirección técnica ${project.dt_percent}%`, percentage: project.dt_percent, base_amount: indirect.base, calculated_amount: indirect.direction_technique.amount },
    { type: 'administration', description: `Administración ${project.admin_percent}%`, percentage: project.admin_percent, base_amount: indirect.base, calculated_amount: indirect.administration.amount },
    { type: 'transport', description: `Transporte ${project.transport_percent}%`, percentage: project.transport_percent, base_amount: indirect.base, calculated_amount: indirect.transport.amount },
  ]
  if (project.planning_fee > 0) {
    rows.push({ type: 'planning', description: 'Planificación de proyecto', percentage: 0, base_amount: 0, calculated_amount: project.planning_fee })
  }
  for (const c of indirect.customs) {
    const isPercent = c.type === 'percent'
    rows.push({
      type: `custom:${c.id}`,
      description: isPercent ? `${c.name} ${c.value}%` : c.name,
      percentage: isPercent ? c.value : 0,
      base_amount: isPercent ? indirect.base : 0,
      calculated_amount: c.amount,
    })
  }
  return rows
}
