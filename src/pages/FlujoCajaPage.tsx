import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Plus, TrendingUp, X } from 'lucide-react'
import { cashFlowService, type ExpectedInflow, type MonthlyCashFlowRow } from '@/services/cashFlowService'
import { exportToExcel } from '@/utils/excelExport'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { formatRD } from '@/utils/currency'

interface InflowForm {
  expected_date: string
  amount: number
  concept: string
}

const EMPTY_INFLOW: InflowForm = {
  expected_date: new Date().toISOString().split('T')[0],
  amount: 0,
  concept: '',
}

export default function FlujoCajaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const user = useAuthStore((s) => s.user)

  const [rows, setRows] = useState<MonthlyCashFlowRow[]>([])
  const [inflows, setInflows] = useState<ExpectedInflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<InflowForm>(EMPTY_INFLOW)
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [proj, inf] = await Promise.all([
        cashFlowService.getMonthlyProjection(projectId),
        cashFlowService.listExpectedInflows(projectId),
      ])
      setRows(proj)
      setInflows(inf)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAddInflow() {
    if (!projectId || !form.concept.trim() || form.amount <= 0) return
    setSaving(true)
    try {
      await cashFlowService.addExpectedInflow({
        project_id: projectId,
        expected_date: form.expected_date,
        amount: form.amount,
        concept: form.concept.trim(),
        source: 'manual',
        external_ref: null,
        notes: null,
        created_by: user?.displayName ?? null,
      })
      setForm(EMPTY_INFLOW)
      setShowForm(false)
      success('Ingreso esperado registrado')
      await load()
    } catch {
      error('No se pudo registrar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteInflow(id: string) {
    await cashFlowService.deleteExpectedInflow(id)
    await load()
  }

  async function handleExport() {
    try {
      await exportToExcel(`flujo_caja_${project?.code ?? projectId}`, [
        {
          name: 'Flujo de caja mensual',
          rows: rows.map((r) => ({
            Mes: r.month,
            'Egreso planificado': formatRD(r.planned_outflow),
            'Egreso real': formatRD(r.actual_outflow),
            'Ingreso planificado': formatRD(r.planned_inflow),
            'Ingreso real': formatRD(r.actual_inflow),
            'Neto planificado': formatRD(r.net_planned),
            'Neto real': formatRD(r.net_actual),
          })),
        },
        {
          name: 'Ingresos esperados',
          rows: inflows.map((i) => ({
            Fecha: i.expected_date,
            Concepto: i.concept,
            'Monto (DOP)': formatRD(i.amount),
            Origen: i.source,
            'Ref. externa': i.external_ref ?? '',
          })),
        },
      ])
      success('Exportado')
    } catch {
      error('No se pudo exportar')
    }
  }

  const input =
    'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">
            Flujo de caja {project?.name && `— ${project.name}`}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Ingreso esperado
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-app-muted block mb-1">Fecha esperada *</label>
              <input
                type="date"
                value={form.expected_date}
                onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: +e.target.value })}
                className={input}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Concepto *</label>
              <input
                value={form.concept}
                onChange={(e) => setForm({ ...form, concept: e.target.value })}
                placeholder="Cuota inicial unidad 301"
                className={input}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddInflow}
              disabled={saving || !form.concept.trim() || form.amount <= 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Calculando proyección...</div>
      ) : (
        <>
          <section>
            <h2 className="text-base font-semibold text-app-text mb-2">Proyección mensual</h2>
            <div className="bg-app-surface border border-app-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-app-chip text-app-muted text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Mes</th>
                    <th className="px-3 py-2 text-right">Egr. plan</th>
                    <th className="px-3 py-2 text-right">Egr. real</th>
                    <th className="px-3 py-2 text-right">Ing. plan</th>
                    <th className="px-3 py-2 text-right">Ing. real</th>
                    <th className="px-3 py-2 text-right">Neto plan</th>
                    <th className="px-3 py-2 text-right">Neto real</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-app-muted">
                        Sin datos. Define fechas en las partidas del presupuesto y/o registra ingresos.
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.month} className="border-t border-app-border">
                      <td className="px-3 py-2 font-mono text-xs">{r.month}</td>
                      <td className="px-3 py-2 text-right">{formatRD(r.planned_outflow)}</td>
                      <td className="px-3 py-2 text-right">{formatRD(r.actual_outflow)}</td>
                      <td className="px-3 py-2 text-right">{formatRD(r.planned_inflow)}</td>
                      <td className="px-3 py-2 text-right">{formatRD(r.actual_inflow)}</td>
                      <td className={`px-3 py-2 text-right ${r.net_planned >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatRD(r.net_planned)}
                      </td>
                      <td className={`px-3 py-2 text-right ${r.net_actual >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatRD(r.net_actual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-app-text mb-2">Ingresos esperados</h2>
            <div className="bg-app-surface border border-app-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-app-chip text-app-muted text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Concepto</th>
                    <th className="px-3 py-2 text-left">Origen</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {inflows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-app-muted">
                        Sin ingresos esperados registrados.
                      </td>
                    </tr>
                  )}
                  {inflows.map((i) => (
                    <tr key={i.id} className="border-t border-app-border">
                      <td className="px-3 py-2">{i.expected_date}</td>
                      <td className="px-3 py-2">{i.concept}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-app-chip text-app-muted px-2 py-0.5 rounded">{i.source}</span>
                      </td>
                      <td className="px-3 py-2 text-right">{formatRD(i.amount)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDeleteInflow(i.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
