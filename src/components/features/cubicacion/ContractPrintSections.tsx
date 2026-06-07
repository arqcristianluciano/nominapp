import { useEffect, useRef } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRD } from '@/utils/currency'
import type { ContractPartida, ContractCorte, ContractAdelanto } from '@/types/database'
import type { ContractWithContractor } from '@/services/cubicationService'

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', approved: 'Aprobado', paid: 'Pagado' }

export function ContractPrintTopBar({
  projectId,
  contratoId,
  ready = true,
}: {
  projectId: string
  contratoId: string
  ready?: boolean
}) {
  const hasPrinted = useRef(false)
  useEffect(() => {
    if (!ready || hasPrinted.current) return
    hasPrinted.current = true
    // small delay para asegurar render
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [ready])

  return (
    <div className="print:hidden flex items-center justify-between p-4 border-b border-app-border bg-app-surface sticky top-0 z-10">
      <Link
        to={`/proyectos/${projectId}/cubicaciones/${contratoId}`}
        className="flex items-center gap-1 text-sm text-app-muted hover:text-app-text"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al contrato
      </Link>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
      >
        <Printer className="w-4 h-4" /> Imprimir
      </button>
    </div>
  )
}

export function ContractPrintHeader({ contrato, printDate }: { contrato: ContractWithContractor; printDate: string }) {
  return (
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
        <div>
          <span className="text-gray-500">Contratista:</span>
          <br />
          <strong className="text-gray-800">{contrato.contractor?.name}</strong>
        </div>
        <div>
          <span className="text-gray-500">Especialidad:</span>
          <br />
          <strong className="text-gray-800">{contrato.contractor?.specialty}</strong>
        </div>
        <div>
          <span className="text-gray-500">Retención:</span>
          <br />
          <strong className="text-gray-800">{contrato.retention_percent}%</strong>
          {contrato.signed_date && (
            <>
              <br />
              <span className="text-gray-500">Firmado:</span>{' '}
              {new Date(contrato.signed_date).toLocaleDateString('es-DO')}
            </>
          )}
        </div>
      </div>
      {contrato.notes && <p className="mt-2 text-xs text-gray-500 italic">{contrato.notes}</p>}
    </div>
  )
}

export function ContractPrintSummary({
  acordado,
  acumulado,
  retenido,
  adelantosTotal = 0,
}: {
  acordado: number
  acumulado: number
  retenido: number
  adelantosTotal?: number
}) {
  const pendienteRaw = acordado - acumulado - adelantosTotal
  const pendiente = pendienteRaw < 0 ? 0 : pendienteRaw
  return (
    <div className="grid grid-cols-4 gap-4 text-center">
      {[
        { label: 'Acordado (A)', val: formatRD(acordado), cls: 'text-gray-800' },
        { label: 'Acumulado (B)', val: formatRD(acumulado), cls: 'text-blue-700' },
        { label: 'Pendiente (A-B)', val: formatRD(pendiente), cls: pendiente >= 0 ? 'text-green-700' : 'text-red-600' },
        { label: 'Retenido', val: formatRD(retenido), cls: 'text-amber-700' },
      ].map((kpi) => (
        <div key={kpi.label} className="border border-gray-200 rounded p-3">
          <p className="text-[10px] text-gray-500 uppercase">{kpi.label}</p>
          <p className={`text-lg font-bold mt-1 ${kpi.cls}`}>{kpi.val}</p>
        </div>
      ))}
    </div>
  )
}

export function ContractPartidasTable({
  partidas,
  acumuladoPorPartida,
  acordado,
  acumulado,
}: {
  partidas: ContractPartida[]
  acumuladoPorPartida: (partidaId: string) => number
  acordado: number
  acumulado: number
}) {
  return (
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
          {partidas.map((partida) => {
            const acumuladoPartida = acumuladoPorPartida(partida.id)
            const totalPartida = partida.agreed_quantity * partida.unit_price
            const pct = totalPartida > 0 ? Math.min((acumuladoPartida / totalPartida) * 100, 100) : 0
            return (
              <tr key={partida.id}>
                <td className="border border-gray-300 px-2 py-1">{partida.description}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{partida.unit}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(partida.unit_price)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{partida.agreed_quantity}</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatRD(totalPartida)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(acumuladoPartida)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {formatRD(totalPartida - acumuladoPartida)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">{pct.toFixed(0)}%</td>
              </tr>
            )
          })}
          <tr className="bg-gray-50 font-bold">
            <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">
              TOTAL
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(acordado)}</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(acumulado)}</td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(acordado - acumulado)}</td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {acordado > 0 ? Math.min((acumulado / acordado) * 100, 100).toFixed(0) : 0}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function ContractCutsTable({ cortes, partidas }: { cortes: ContractCorte[]; partidas: ContractPartida[] }) {
  if (cortes.length === 0) return null
  return (
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
          {cortes.map((corte) => {
            const partida = partidas.find((value) => value.id === corte.partida_id)
            return (
              <tr key={corte.id}>
                <td className="border border-gray-300 px-2 py-1 text-center">{corte.cut_number}</td>
                <td className="border border-gray-300 px-2 py-1">
                  {new Date(corte.cut_date).toLocaleDateString('es-DO')}
                </td>
                <td className="border border-gray-300 px-2 py-1">{partida?.description || '—'}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {corte.measured_quantity} {partida?.unit}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(corte.amount)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(corte.retention_amount)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-medium">
                  {formatRD(corte.amount - corte.retention_amount)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">{STATUS_LABEL[corte.status]}</td>
                <td className="border border-gray-300 px-2 py-1">{corte.approved_by || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ContractAdvancesTable({ adelantos, total }: { adelantos: ContractAdelanto[]; total: number }) {
  if (adelantos.length === 0) return null
  return (
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
          {adelantos.map((adelanto) => (
            <tr key={adelanto.id}>
              <td className="border border-gray-300 px-2 py-1">
                {new Date(adelanto.advance_date).toLocaleDateString('es-DO')}
              </td>
              <td className="border border-gray-300 px-2 py-1">{adelanto.description || '—'}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(adelanto.amount)}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-bold">
            <td colSpan={2} className="border border-gray-300 px-2 py-1 text-right">
              TOTAL ADELANTOS
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right">{formatRD(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function ContractPrintSignatures({ contractorName }: { contractorName: string }) {
  return (
    <div className="pt-8 grid grid-cols-2 gap-16">
      <div className="text-center">
        <div className="border-t border-gray-400 pt-2 text-xs text-gray-500">Empresa contratante</div>
      </div>
      <div className="text-center">
        <div className="border-t border-gray-400 pt-2 text-xs text-gray-500">{contractorName} — Contratista</div>
      </div>
    </div>
  )
}
