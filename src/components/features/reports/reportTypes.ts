export interface ProjectReport {
  id: string
  name: string
  code: string
  totalIncurrido: number
  presupuesto: number
  cxp: number
  cashDisponible: number
  avance: number
  acordado: number
  acumulado: number
  pendiente: number
  avgCompletion: number
}

export interface ReportTotals {
  totalIncurrido: number
  presupuesto: number
  cxp: number
  cashDisponible: number
}
