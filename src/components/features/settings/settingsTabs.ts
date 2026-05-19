export type SettingsTab = 'bancos' | 'condiciones' | 'categorias' | 'notificaciones' | 'sistema'

export const SETTINGS_TABS: Array<{ key: SettingsTab; label: string }> = [
  { key: 'bancos', label: 'Cuentas bancarias' },
  { key: 'condiciones', label: 'Condiciones de pago' },
  { key: 'categorias', label: 'Categorías presupuestarias' },
  { key: 'notificaciones', label: 'Notificaciones' },
  { key: 'sistema', label: 'Sistema' },
]
