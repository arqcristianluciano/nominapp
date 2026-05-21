import { useState, type ReactNode } from 'react'
import { BankAccountsSection } from '@/components/features/settings/BankAccountsSection'
import { CompaniesSection } from '@/components/features/settings/CompaniesSection'
import {
  BudgetCategoriesPanel,
  PaymentConditionsPanel,
  SystemPanel,
} from '@/components/features/settings/SettingsPanels'
import { PushNotificationsSection } from '@/components/features/settings/PushNotificationsSection'
import { SettingsTabsBar } from '@/components/features/settings/SettingsTabsBar'
import { type SettingsTab } from '@/components/features/settings/settingsTabs'
import { useSettingsBankAccounts } from '@/hooks/useSettingsBankAccounts'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('bancos')
  const bankAccounts = useSettingsBankAccounts()

  const panelByTab: Record<SettingsTab, ReactNode> = {
    bancos: (
      <BankAccountsSection
        loading={bankAccounts.loading}
        saving={bankAccounts.saving}
        accounts={bankAccounts.accounts}
        showForm={bankAccounts.showForm}
        editing={bankAccounts.editing}
        onCreate={bankAccounts.openCreate}
        onEdit={bankAccounts.openEdit}
        onCloseForm={bankAccounts.closeForm}
        onSubmit={bankAccounts.saveAccount}
      />
    ),
    condiciones: <PaymentConditionsPanel />,
    categorias: <BudgetCategoriesPanel />,
    empresas: <CompaniesSection />,
    notificaciones: <PushNotificationsSection />,
    sistema: <SystemPanel />,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Configuración</h1>
        <p className="text-sm text-app-muted mt-1">Tablas maestras y ajustes del sistema</p>
      </div>

      <SettingsTabsBar activeTab={activeTab} onChange={setActiveTab} />
      {panelByTab[activeTab]}
    </div>
  )
}
