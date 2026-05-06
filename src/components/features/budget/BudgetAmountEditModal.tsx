export function BudgetAmountEditModal({
  open,
  value,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-app-surface rounded-xl shadow-xl p-5 w-72 space-y-3">
        <p className="text-sm font-semibold text-app-text">Editar monto presupuestado</p>
        <input
          type="number"
          step="any"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onClose() }}
          className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-[10px] text-app-subtle">O agrega subpartidas para que el total se calcule automáticamente.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
          <button onClick={onSave} className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700">Guardar</button>
        </div>
      </div>
    </div>
  )
}
