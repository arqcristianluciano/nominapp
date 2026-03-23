import type { LaborLineItem, MaterialInvoice, Project } from '@/types/database'
import { BANK_COMMISSION_PERCENT } from '@/constants/indirectCosts'

export function calcLaborTotal(items: LaborLineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
}

export function calcContractorSubtotal(items: LaborLineItem[], contractorId: string): number {
  return items
    .filter((i) => i.contractor_id === contractorId)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
}

export function calcMaterialsTotal(invoices: MaterialInvoice[]): number {
  return invoices.reduce((sum, inv) => sum + inv.amount, 0)
}

export function calcIndirectCosts(
  laborTotal: number,
  materialsTotal: number,
  project: Pick<Project, 'dt_percent' | 'admin_percent' | 'transport_percent' | 'planning_fee'>
) {
  const base = laborTotal + materialsTotal
  const dt = base * (project.dt_percent / 100)
  const admin = base * (project.admin_percent / 100)
  const transport = base * (project.transport_percent / 100)
  const planning = project.planning_fee || 0

  return {
    base,
    direction_technique: { amount: dt, percent: project.dt_percent },
    administration: { amount: admin, percent: project.admin_percent },
    transport: { amount: transport, percent: project.transport_percent },
    planning: { amount: planning },
    total: dt + admin + transport + planning,
  }
}

export function calcBankCommission(amount: number): number {
  return amount * (BANK_COMMISSION_PERCENT / 100)
}

export function calcGrandTotal(labor: number, materials: number, indirect: number): number {
  return labor + materials + indirect
}
