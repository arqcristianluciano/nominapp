export type MercadoCategory = 'AJUSTES' | 'EQUIPOS' | 'MANO_DE_OBRA' | 'MATERIALES'

export const CUBICABLE_CATEGORIES: MercadoCategory[] = ['AJUSTES', 'MANO_DE_OBRA']

export const CATEGORY_LABELS: Record<MercadoCategory, string> = {
  AJUSTES: 'Ajustes',
  EQUIPOS: 'Equipos',
  MANO_DE_OBRA: 'Mano de Obra',
  MATERIALES: 'Materiales',
}

export const CATEGORY_COLORS: Record<MercadoCategory, string> = {
  AJUSTES: 'text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300',
  EQUIPOS: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300',
  MANO_DE_OBRA: 'text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-300',
  MATERIALES: 'text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300',
}

export interface MercadoBudget {
  id: string
  project_id: string
  file_name: string
  imported_at: string
  total_ajustes: number
  total_equipos: number
  total_mano_obra: number
  total_materiales: number
}

export interface MercadoBudgetLine {
  id: string
  budget_id: string
  category: MercadoCategory
  code: string | null
  description: string
  unit: string
  budgeted_quantity: number
  budgeted_unit_price: number
  budgeted_total: number
  sort_order: number
  contract_id: string | null
  agreed_quantity: number | null
  agreed_unit_price: number | null
}

export type ParsedMercadoLine = Omit<
  MercadoBudgetLine,
  'id' | 'budget_id' | 'contract_id' | 'agreed_quantity' | 'agreed_unit_price'
>
