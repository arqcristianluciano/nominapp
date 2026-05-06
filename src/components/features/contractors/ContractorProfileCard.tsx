import { CreditCard, Phone } from 'lucide-react'
import type { Contractor } from '@/types/database'
import { PAYMENT_METHOD_LABEL } from './detailTypes'

export function ContractorProfileCard({ contractor }: { contractor: Contractor }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {contractor.cedula && <div><p className="text-xs text-app-subtle mb-0.5">Cédula</p><p className="font-medium text-app-text">{contractor.cedula}</p></div>}
        {contractor.phone && <div><p className="text-xs text-app-subtle mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</p><p className="font-medium text-app-text">{contractor.phone}</p></div>}
        <div><p className="text-xs text-app-subtle mb-0.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Forma de pago</p><p className="font-medium text-app-text">{PAYMENT_METHOD_LABEL[contractor.payment_method]}</p></div>
        {contractor.bank_name && (
          <div>
            <p className="text-xs text-app-subtle mb-0.5">Banco</p>
            <p className="font-medium text-app-text">{contractor.bank_name}</p>
            {contractor.bank_account && <p className="text-xs text-app-muted">{contractor.bank_account}</p>}
          </div>
        )}
      </div>
      {contractor.notes && <p className="mt-3 text-xs text-app-muted bg-app-bg rounded-lg px-3 py-2">{contractor.notes}</p>}
    </div>
  )
}
