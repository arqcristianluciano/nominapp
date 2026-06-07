export const DOMINICAN_BANKS = [
  'Banco Popular Dominicano',
  'Banco de Reservas',
  'Banco BHD León',
  'Scotiabank RD',
  'Banco Santa Cruz',
  'Asociación Popular',
  'Banco Promerica',
  'Banco Caribe',
  'Banco López de Haro',
  'Banco Vimenca',
  'Banco ADOPEM',
  'Caja Chica',
] as const

/** Tipos de cuenta bancaria para proveedores (coincide con el CHECK de la BD). */
export const ACCOUNT_TYPES = [
  { value: 'ahorros', label: 'Ahorros' },
  { value: 'corriente', label: 'Corriente' },
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]['value']
