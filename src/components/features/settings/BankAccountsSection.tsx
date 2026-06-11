import { Modal } from '@/components/ui/Modal'
import { BankAccountForm } from '@/components/features/settings/BankAccountForm'
import { BankAccountsPanel } from '@/components/features/settings/SettingsPanels'
import type { BankAccount } from '@/types/database'
import { useAppRoles } from '@/hooks/useAppRoles'

interface BankAccountsSectionProps {
  loading: boolean
  saving: boolean
  accounts: BankAccount[]
  showForm: boolean
  editing?: BankAccount
  onCreate: () => void
  onEdit: (account: BankAccount) => void
  onCloseForm: () => void
  onSubmit: (data: Partial<BankAccount>, saldoInicial?: number) => void
}

export function BankAccountsSection({
  loading,
  saving,
  accounts,
  showForm,
  editing,
  onCreate,
  onEdit,
  onCloseForm,
  onSubmit,
}: BankAccountsSectionProps) {
  const { canWriteBankAccounts } = useAppRoles()
  return (
    <div className="space-y-4">
      {canWriteBankAccounts && (
        <div className="flex justify-end">
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            + Nueva cuenta
          </button>
        </div>
      )}

      <BankAccountsPanel loading={loading} accounts={accounts} onEdit={canWriteBankAccounts ? onEdit : undefined} />

      <Modal open={showForm} onClose={onCloseForm} title={editing ? 'Editar cuenta' : 'Nueva cuenta bancaria'}>
        <BankAccountForm initial={editing} saving={saving} onSubmit={onSubmit} onCancel={onCloseForm} />
      </Modal>
    </div>
  )
}
