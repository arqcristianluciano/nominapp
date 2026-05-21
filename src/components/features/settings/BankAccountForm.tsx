import { useState } from 'react'
import { DOMINICAN_BANKS } from '@/constants/banks'
import type { BankAccount } from '@/types/database'
import { isCedula, isRNC } from '@/utils/validators'

interface Props {
  initial?: BankAccount
  saving: boolean
  onSubmit: (data: Partial<BankAccount>) => void
  onCancel: () => void
}

export function BankAccountForm({ initial, saving, onSubmit, onCancel }: Props) {
  const [ownerName, setOwnerName] = useState(initial?.owner_name || '')
  const [bankName, setBankName] = useState(initial?.bank_name || '')
  const [accountNumber, setAccountNumber] = useState(initial?.account_number || '')
  const [accountType, setAccountType] = useState(initial?.account_type || '')
  const [cedulaRnc, setCedulaRnc] = useState(initial?.cedula_rnc || '')
  const [isInternal, setIsInternal] = useState(initial?.is_internal ?? true)
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const cedulaRncTrimmed = cedulaRnc.trim()
    if (cedulaRncTrimmed && !isCedula(cedulaRncTrimmed) && !isRNC(cedulaRncTrimmed)) {
      setFormError('Cédula/RNC inválido (cédula 11 dígitos, RNC 9 u 11 dígitos)')
      return
    }

    onSubmit({
      owner_name: ownerName,
      bank_name: bankName,
      account_number: accountNumber,
      account_type: accountType || null,
      cedula_rnc: cedulaRnc || null,
      is_internal: isInternal,
      project_id: null,
    })
  }

  const inputClass = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-app-muted mb-1 block">Titular</label>
          <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">Banco</label>
          <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} required>
            <option value="">Seleccionar...</option>
            {DOMINICAN_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">No. Cuenta</label>
          <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">Tipo de cuenta</label>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={inputClass}>
            <option value="">—</option>
            <option value="Ahorro">Ahorro</option>
            <option value="Corriente">Corriente</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">Cédula / RNC</label>
          <input type="text" value={cedulaRnc} onChange={(e) => setCedulaRnc(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded border-app-border" />
            <span className="text-sm text-app-muted">Cuenta interna (de la empresa)</span>
          </label>
        </div>
      </div>
      {formError && (
        <div className="text-xs text-red-600 dark:text-red-400" role="alert">{formError}</div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
