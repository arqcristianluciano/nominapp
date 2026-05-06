export type SettingsTab = 'bancos' | 'condiciones' | 'categorias' | 'sistema'

export const SETTINGS_TABS: Array<{ key: SettingsTab; label: string }> = [
  { key: 'bancos', label: 'Cuentas bancarias' },
  { key: 'condiciones', label: 'Condiciones de pago' },
  { key: 'categorias', label: 'Categorías presupuestarias' },
  { key: 'sistema', label: 'Sistema' },
]
