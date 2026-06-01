import { useState } from 'react'
import { Building2, X } from 'lucide-react'
import type { Supplier } from '@/types/database'
import { supplierService } from '@/services/supplierService'
import { isRNC, isPhone } from '@/utils/validators'
import { findSupplierByName } from '@/utils/supplierMatch'

const NEW_SUPPLIER_VALUE = '__NEW__'

interface Props {
  /** Lista de proveedores conocidos (desde el padre). */
  suppliers: Supplier[]
  /** Id del proveedor seleccionado ('' si ninguno). */
  value: string
  /** Notifica el id seleccionado. '' cuando se está creando uno nuevo. */
  onChange: (supplierId: string) => void
  /** Opcional: avisa al padre cuando se crea un proveedor (para refrescar su lista). */
  onSupplierCreated?: (supplier: Supplier) => void
  required?: boolean
  disabled?: boolean
  /** Clases del <select>, para igualar el estilo de cada pantalla. */
  selectClassName?: string
  /** Texto de la opción vacía. */
  placeholder?: string
  /** id del <select> (para asociarlo a un <label htmlFor>). */
  id?: string
}

const panelInputCls =
  'w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/**
 * Selector de proveedor reutilizable con alta rápida ("＋ Agregar proveedor")
 * incrustada: permite crear un proveedor (nombre, RNC, teléfono y banco) sin
 * salir de la pantalla, evita duplicados y valida RNC/teléfono.
 *
 * Mantiene internamente los proveedores creados en esta sesión para que
 * aparezcan y queden seleccionados aunque el padre no refresque su lista.
 */
export function SupplierSelect({
  suppliers,
  value,
  onChange,
  onSupplierCreated,
  required,
  disabled,
  selectClassName,
  placeholder = 'Seleccionar proveedor...',
  id,
}: Props) {
  const [created, setCreated] = useState<Supplier[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRnc, setNewRnc] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBank, setNewBank] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)

  // Mezcla proveedores del padre + creados localmente, sin duplicar por id.
  const known = (() => {
    const byId = new Map<string, Supplier>()
    for (const s of [...created, ...suppliers]) {
      if (!byId.has(s.id)) byId.set(s.id, s)
    }
    return [...byId.values()]
  })()

  function handleSelect(selected: string) {
    if (selected === NEW_SUPPLIER_VALUE) {
      setShowNew(true)
      onChange('')
    } else {
      setShowNew(false)
      onChange(selected)
    }
  }

  function cancelNew() {
    setShowNew(false)
    setNewName('')
    setNewRnc('')
    setNewPhone('')
    setNewBank('')
    setNewError(null)
  }

  async function handleCreate() {
    if (savingNew || !newName.trim()) return
    setNewError(null)
    // Evita crear un proveedor que ya existe (ignorando mayúsculas y espacios).
    const duplicate = findSupplierByName(known, newName)
    if (duplicate) {
      setNewError(
        duplicate.is_active
          ? `Ya existe un proveedor llamado "${duplicate.name}". Selecciónalo en la lista de arriba.`
          : `Ya existe un proveedor llamado "${duplicate.name}", pero está inactivo. Reactívalo desde Proveedores.`,
      )
      return
    }
    const rncTrimmed = newRnc.trim()
    if (rncTrimmed && !isRNC(rncTrimmed)) {
      setNewError('RNC inválido (9 u 11 dígitos)')
      return
    }
    const phoneTrimmed = newPhone.trim()
    if (phoneTrimmed && !isPhone(phoneTrimmed)) {
      setNewError('Teléfono inválido (10 dígitos)')
      return
    }
    setSavingNew(true)
    try {
      const supplier = await supplierService.create({
        name: newName.trim().toUpperCase(),
        rnc: rncTrimmed || undefined,
        contact_phone: phoneTrimmed || undefined,
        bank_name: newBank.trim() || undefined,
      })
      // Garantiza que aparezca como activo en la lista local aunque el backend
      // simulado no devuelva el valor por defecto.
      const activeSupplier: Supplier = { ...supplier, is_active: supplier.is_active ?? true }
      setCreated((prev) => [activeSupplier, ...prev])
      onSupplierCreated?.(activeSupplier)
      onChange(activeSupplier.id)
      setShowNew(false)
      setNewName('')
      setNewRnc('')
      setNewPhone('')
      setNewBank('')
    } catch (err) {
      console.warn('[SupplierSelect] handleCreate failed', err)
      setNewError('No se pudo crear el proveedor. Intenta de nuevo.')
    } finally {
      setSavingNew(false)
    }
  }

  return (
    <div>
      <select
        id={id}
        value={showNew ? NEW_SUPPLIER_VALUE : value}
        onChange={(e) => handleSelect(e.target.value)}
        required={required && !showNew}
        disabled={disabled}
        className={selectClassName}
      >
        <option value="">{placeholder}</option>
        {known
          .filter((s) => s.is_active)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        <option value={NEW_SUPPLIER_VALUE}>＋ Agregar proveedor</option>
      </select>

      {showNew && (
        <div className="mt-2 p-3 border border-blue-500/40 bg-blue-500/5 rounded-lg space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-400 flex items-center gap-1">
              <Building2 size={12} /> Nuevo proveedor
            </span>
            <button type="button" onClick={cancelNew} className="text-app-muted hover:text-app-text">
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre *"
            className={panelInputCls}
          />
          <input
            type="text"
            value={newRnc}
            onChange={(e) => setNewRnc(e.target.value)}
            placeholder="RNC (opcional)"
            className={panelInputCls}
          />
          <input
            type="text"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            className={panelInputCls}
          />
          <input
            type="text"
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
            placeholder="Banco (opcional)"
            className={panelInputCls}
          />
          {newError && (
            <div className="text-xs text-red-600 dark:text-red-400" role="alert">
              {newError}
            </div>
          )}
          <button
            type="button"
            onClick={handleCreate}
            disabled={savingNew || !newName.trim()}
            aria-busy={savingNew}
            className="w-full py-2 sm:py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingNew ? 'Creando...' : 'Crear y seleccionar'}
          </button>
        </div>
      )}
    </div>
  )
}
