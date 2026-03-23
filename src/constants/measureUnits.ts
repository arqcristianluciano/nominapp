export const MEASURE_UNITS = [
  { value: 'M2', label: 'M²' },
  { value: 'ML', label: 'ML' },
  { value: 'MT2', label: 'MT²' },
  { value: 'MT3', label: 'MT³' },
  { value: 'M3', label: 'M³' },
  { value: 'UD', label: 'Unidad' },
  { value: 'PA', label: 'Partida alzada' },
  { value: 'DIA', label: 'Día' },
  { value: 'SEMANAS', label: 'Semanas' },
  { value: 'QUINCENA', label: 'Quincena' },
  { value: 'AVANCE', label: 'Avance' },
  { value: 'AVANZADO', label: 'Avanzado' },
  { value: 'SALDO', label: 'Saldo' },
  { value: 'FACTURA', label: 'Factura' },
  { value: 'VISITAS', label: 'Visitas' },
  { value: 'TOTAL', label: 'Total' },
] as const

export type MeasureUnit = typeof MEASURE_UNITS[number]['value']
