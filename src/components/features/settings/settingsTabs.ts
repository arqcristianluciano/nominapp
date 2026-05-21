export type SettingsTab =
  | 'bancos'
  | 'condiciones'
  | 'categorias'
  | 'empresas'
  | 'notificaciones'
  | 'exportar'
  | 'sistema'

export interface SettingsTabDef {
  key: SettingsTab
  label: string
  /** Si true, solo se muestra a usuarios con isDirector */
  directorOnly?: boolean
}

export const SETTINGS_TABS: SettingsTabDef[] = [
  { key: 'bancos', label: 'Cuentas bancarias' },
  { key: 'condiciones', label: 'Condiciones de pago' },
  { key: 'categorias', label: 'Categorías presupuestarias' },
  { key: 'empresas', label: 'Empresas', directorOnly: true },
  { key: 'notificaciones', label: 'Notificaciones' },
  { key: 'exportar', label: 'Exportar', directorOnly: true },
  { key: 'sistema', label: 'Sistema' },
]
