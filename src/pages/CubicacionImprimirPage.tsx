import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { contractService } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import type { ContractWithContractor } from '@/services/cubicationService'
import type { ContractPartida, ContractCorte, ContractAdelanto } from '@/types/database'

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', approved: 'Aprobado', paid: 'Pagado' }

export default function CubicacionImprimirPage() {
  const { projectId, contratoId } = useParams<{ projectId: string; contratoId: string }>()
  const [contrato, setContrato] = useState<ContractWithContractor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (contratoId) contractService.getById(contratoId).then(setContrato).finally(() => setLoading(false))
  }, [contratoId])

  if (loading) return <div className="p-8 text-sm">Cargando...</div>
  if (!contrato) return <div className="p-8 text-sm">Contrato no encontrado.</div>

  const partidas: ContractPartida[] = contrato.partidas ?? []
  const cortes: ContractCorte[] = contrato.cortes ?? []
  const adelantos: ContractAdelanto[] = contrato.adelantos ?? []

  const acordado = partidas.reduce((s, p) => s + p.agreed_quantity * p.unit_price, 0)
  const acumulado = cortes.reduce((s, c) => s + c.amount, 0)
  const retenido = cortes.reduce((s, c) => s + c.retention_amount, 0)
  const adelantosTotal = adelantos.reduce((s, a) => s + a.amount, 0)

  const printDate = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })

  function acumuladoPartida(pid: string) {
    return cortes.filter((c) => c.partida_id === pid).reduce((s, c) => s + c.amount, 0)
  }

  return (
    <div>
      {/* Controles — solo pantalla */}
      <div className="print:hidden flex items-center justify-between p-4 border-b border-app-border bg-app-surface sticky top-0 z-10">
        <Link to={`/proyectos/${projectId}/cubicaciones/${contratoId}`} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-text">
          <ArrowLeft className="w-4 h-4" /> Volver al contrato
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>

      {/* Documento */}
      <div className="max-w-4xl mx-auto p-8 print:p-6 space-y-6 text-sm">
        {/* Encabezado */}
        <div className="border-b-2 border-gray-800 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">CONTRATO DE AJUSTE</h1>
              <p className="text-gray-600 mt-1">Módulo de Cubicaciones — NominaAPP</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Impreso: {printDate}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
            <div><span className="text-gray-500">Contratista:</span><br /><strong className="text-gray-800">{contrato.contractor?.name}</strong></div>
            <div><span className="text-gray-500">Especialidad:</span><br /><strong className="text-gray-800">{contrato.contractor?.specialty}</strong></div>
            <div>
              <span className="text-gray-500">Retención:</span><br /><strong className="text-gray-800">{contrato.retention_percent}%</strong>
              {contrato.signed_date && <><br /><span className="text-gray-500">Firmado:</span> {new Date(contrato.signed_date).toLocaleDateString('es-DO')}</>}
            </div>
          </div>
          {contrato.notes && <p className="mt-2 text-xs text-gray-500 italic">{contrato.notes}</p>}
        </div>

        {/* Resumen ejecutivo */}
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { label: 'Acordado (A)', val: formatRD(acordado), cls: 'text-gray-800' },
            { label: 'Acumulado (B)', val: formatRD(acumulado), cls: 'text-blue-700' },
            { label: 'Pendiente (A-B)', val: formatRD(acordado - acumulado), cls: acordado - acumulado >= 0 ? 'text-green-700' : 'text-red-600' },
            { label: 'Retenido', val: formatRD(retenido), cls: 'text-amber-700' },
          ].map((k) => (
            <div key={k.label} className="border border-gray-200 rounded p-3">
              <p className="text-[10px] text-gray-500 uppercase">{k.label}</p>
              <p className={`text-lg font-bold mt-1 ${k.cls}`}>{k.val}</p>
            </div>
          ))}
        </div>

        {/* Partidas */}
        <div>
          <h2 className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">Partidas del contrato</h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-left">Descripción</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center">Unidad</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">P. Unit.</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">Cant. Acordada</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">Acordado (A)</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">Acumulado (B)</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">Pendiente</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => {
                const ac = acumuladoPartida(p.id)
                const pct = p.agreed_quantity * p.unit_price > 0 ? Math.min((ac / (p.agreed_quantity * p.unit_price)) * 100, 100) : 0
                return (
                  <tr key={p.id}>
                    <td className="border border-gray-300 px-2 py-1">{p.description}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{p.unit}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(p.unit_price)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{p.agreed_quantity}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatRD(p.agreed_quantity * p.unit_price)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(ac)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(p.agreed_quantity * p.unit_price - ac)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{pct.toFixed(0)}%</td>
                  </tr>
                )
              })}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">TOTAL</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(acordado)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(acumulado)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(acordado - acumulado)}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{acordado > 0 ? Math.min((acumulado / acordado) * 100, 100).toFixed(0) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cortes */}
        {cortes.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">Historial de cortes</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-center">#</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Fecha</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Partida</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">Cant.</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">Monto</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">Retención</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">Neto</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center">Estado</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Aprobado por</th>
                </tr>
              </thead>
              <tbody>
                {cortes.map((c) => {
                  const p = partidas.find((p) => p.id === c.partida_id)
                  return (
                    <tr key={c.id}>
                      <td className="border border-gray-300 px-2 py-1 text-center">{c.cut_number}</td>
                      <td className="border border-gray-300 px-2 py-1">{new Date(c.cut_date).toLocaleDateString('es-DO')}</td>
                      <td className="border border-gray-300 px-2 py-1">{p?.description || '—'}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{c.measured_quantity} {p?.unit}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(c.amount)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(c.retention_amount)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatRD(c.amount - c.retention_amount)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{STATUS_LABEL[c.status]}</td>
                      <td className="border border-gray-300 px-2 py-1">{c.approved_by || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Adelantos */}
        {adelantos.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">Adelantos entregados</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Fecha</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Descripción</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {adelantos.map((a) => (
                  <tr key={a.id}>
                    <td className="border border-gray-300 px-2 py-1">{new Date(a.advance_date).toLocaleDateString('es-DO')}</td>
                    <td className="border border-gray-300 px-2 py-1">{a.description || '—'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(a.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="border border-gray-300 px-2 py-1 text-right">TOTAL ADELANTOS</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(adelantosTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Firma */}
        <div className="pt-8 grid grid-cols-2 gap-16">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 text-xs text-gray-500">Empresa contratante</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 text-xs text-gray-500">{contrato.contractor?.name} — Contratista</div>
          </div>
        </div>
      </div>
    </div>
  )
}
