import { Plus, Search } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { LoanForm } from '@/components/features/loans/LoanForm'
import type { BankAccount, Contractor, ContractorLoan, LoanFrecuencia } from '@/types/database'

export function LoansHeader({
  totalLoans,
  activeLoans,
  onCreate,
}: {
  totalLoans: number
  activeLoans: number
  onCreate: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Préstamos</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-app-muted">{totalLoans} registrados</span>
          {activeLoans > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-full">
              {activeLoans} activos
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"
      >
        <Plus className="w-4 h-4" /> Nuevo préstamo
      </button>
    </div>
  )
}

export function LoansSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
      <input
        type="text"
        placeholder="Buscar por contratista..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

type CreateValues = {
  contractor_id: string
  principal: number
  interest_rate: number
  installments: number
  disbursed_date: string
  first_installment_date?: string | null
  frecuencia: LoanFrecuencia
  disbursement_account_id?: string | null
  notes?: string
}

type EditValues = {
  principal?: number
  interest_rate?: number
  installments?: number
  frecuencia?: LoanFrecuencia
  disbursed_date?: string
  first_installment_date?: string | null
  disbursement_account_id?: string | null
  notes?: string | null
}

export function LoansModals({
  showForm,
  contractors,
  bankAccounts,
  saving,
  cancelTargetId,
  editLoan,
  hasPaidInstallments,
  onCloseForm,
  onSubmitForm,
  onSubmitEdit,
  onConfirmCancel,
  onCancelConfirm,
  onCloseEdit,
}: {
  showForm: boolean
  contractors: Contractor[]
  bankAccounts: BankAccount[]
  saving: boolean
  cancelTargetId: string | null
  editLoan: ContractorLoan | null
  hasPaidInstallments: boolean
  onCloseForm: () => void
  onSubmitForm: (values: CreateValues) => Promise<void>
  onSubmitEdit: (values: EditValues) => Promise<void>
  onConfirmCancel: (loanId: string) => Promise<void>
  onCancelConfirm: () => void
  onCloseEdit: () => void
}) {
  return (
    <>
      {/* Modal: Nuevo préstamo */}
      <Modal open={showForm} onClose={onCloseForm} title="Nuevo préstamo">
        <LoanForm
          contractors={contractors}
          bankAccounts={bankAccounts}
          saving={saving}
          onSubmit={onSubmitForm}
          onCancel={onCloseForm}
        />
      </Modal>

      {/* Modal: Editar préstamo */}
      <Modal open={!!editLoan} onClose={onCloseEdit} title="Editar préstamo">
        {editLoan && (
          <>
            {hasPaidInstallments && (
              <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                Aviso: este préstamo ya tiene cuotas pagadas. Si cambias el monto, las cuotas o la frecuencia, solo se
                regenerarán las cuotas pendientes. Las ya pagadas se mantienen.
              </div>
            )}
            <LoanForm
              contractors={contractors}
              bankAccounts={bankAccounts}
              saving={saving}
              editMode
              initialValues={{
                principal: editLoan.principal,
                interest_rate: editLoan.interest_rate,
                installments: editLoan.installments,
                disbursed_date: editLoan.disbursed_date,
                first_installment_date: editLoan.first_installment_date ?? '',
                frecuencia: editLoan.frecuencia ?? 'mensual',
                disbursement_account_id: editLoan.disbursement_account_id ?? '',
                notes: editLoan.notes ?? '',
              }}
              onSubmit={onSubmitEdit}
              onCancel={onCloseEdit}
            />
          </>
        )}
      </Modal>

      {/* Modal: Confirmar cancelación */}
      <ConfirmModal
        open={!!cancelTargetId}
        title="Cancelar préstamo"
        message="¿Cancelar este préstamo? El saldo pendiente quedará sin efecto."
        confirmLabel="Cancelar préstamo"
        variant="warning"
        onConfirm={() => cancelTargetId && onConfirmCancel(cancelTargetId)}
        onCancel={onCancelConfirm}
      />
    </>
  )
}
