import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { contractService } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import type { ContractWithContractor } from '@/services/cubicationService'
import type { ContractPartida } from '@/types/database'

export default function ContratoFirmaPage() {
  const { projectId, contratoId } = useParams<{ projectId: string; contratoId: string }>()
  const [contrato, setContrato] = useState<ContractWithContractor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (contratoId) contractService.getById(contratoId).then(setContrato).finally(() => setLoading(false))
  }, [contratoId])

  if (loading) return <div className="p-8 text-sm">Cargando...</div>
  if (!contrato) return <div className="p-8 text-sm">Contrato no encontrado.</div>

  const partidas: ContractPartida[] = contrato.partidas ?? []
  const totalAcordado = partidas.reduce((s, p) => s + p.agreed_quantity * p.unit_price, 0)
  const printDate = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div>
      {/* Controles pantalla */}
      <div className="print:hidden flex items-center justify-between p-4 border-b border-app-border bg-app-surface sticky top-0 z-10">
        <Link to={`/proyectos/${projectId}/cubicaciones/${contratoId}`} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-text">
          <ArrowLeft className="w-4 h-4" /> Volver al contrato
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>

      {/* Documento imprimible */}
      <div className="max-w-4xl mx-auto p-8 print:p-6 space-y-7 text-sm font-sans text-gray-800">

        {/* Encabezado */}
        <div className="text-center border-b-2 border-gray-800 pb-5">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Contrato de Precios Acordados</h1>
          <p className="text-gray-500 text-xs mt-1">Obra por destajo — NominaAPP</p>
        </div>

        {/* Partes */}
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div className="border border-gray-300 rounded p-3 space-y-1">
            <p className="font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Contratante</p>
            <p className="font-bold text-base text-gray-800">La Empresa</p>
            <p className="text-gray-500">En su representación autorizada</p>
          </div>
          <div className="border border-gray-300 rounded p-3 space-y-1">
            <p className="font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Contratista / Trabajador</p>
            <p className="font-bold text-base text-gray-800">{contrato.contractor?.name}</p>
            {contrato.contractor?.specialty && <p className="text-gray-500">{contrato.contractor.specialty}</p>}
            {contrato.contractor?.cedula && <p className="text-gray-500">Cédula: {contrato.contractor.cedula}</p>}
          </div>
        </div>

        {/* Cláusula */}
        <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded p-4 space-y-2">
          <p>
            Las partes acuerdan libre y voluntariamente los precios unitarios y cantidades establecidos en el
            presente contrato para la ejecución de los trabajos descritos a continuación, bajo las condiciones de
            pago por avance verificado (cubicación). El pago se realizará según las mediciones aprobadas, con una
            retención del <strong>{contrato.retention_percent}%</strong> hasta la recepción final de los trabajos.
          </p>
          <p>
            Los precios acordados pueden diferir de los valores referenciados en el presupuesto del proyecto
            y constituyen el valor vinculante para el cálculo de pagos entre las partes.
          </p>
        </div>

        {/* Tabla de partidas */}
        <div>
          <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide border-b border-gray-300 pb-1">
            Precios y cantidades acordadas
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Descripción del trabajo</th>
                <th className="px-3 py-2 text-center font-semibold">Unidad</th>
                <th className="px-3 py-2 text-right font-semibold">Precio acordado</th>
                <th className="px-3 py-2 text-right font-semibold">Cant. acordada</th>
                <th className="px-3 py-2 text-right font-semibold">Total acordado</th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 px-3 py-2 font-medium">{p.description}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{p.unit}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-blue-800">{formatRD(p.unit_price)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-gray-700">{p.agreed_quantity.toLocaleString('es-DO')}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-bold">{formatRD(p.agreed_quantity * p.unit_price)}</td>
                </tr>
              ))}
              <tr className="bg-gray-800 text-white font-bold">
                <td colSpan={5} className="px-3 py-2.5 text-right uppercase tracking-wide">TOTAL ACORDADO</td>
                <td className="px-3 py-2.5 text-right text-lg">{formatRD(totalAcordado)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Resumen retención */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div className="border border-gray-300 rounded p-3">
            <p className="text-gray-500 uppercase text-[10px] tracking-wide">Total acordado</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{formatRD(totalAcordado)}</p>
          </div>
          <div className="border border-gray-300 rounded p-3">
            <p className="text-gray-500 uppercase text-[10px] tracking-wide">Retención ({contrato.retention_percent}%)</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatRD(totalAcordado * contrato.retention_percent / 100)}</p>
          </div>
          <div className="border border-gray-300 rounded p-3 bg-gray-50">
            <p className="text-gray-500 uppercase text-[10px] tracking-wide">Neto a pagar (estimado)</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatRD(totalAcordado * (1 - contrato.retention_percent / 100))}</p>
          </div>
        </div>

        {/* Condiciones generales */}
        <div className="text-[11px] text-gray-600 space-y-1.5 border-t border-gray-200 pt-4">
          <p><strong>1.</strong> Los pagos se realizarán por cubicaciones (mediciones verificadas) aprobadas por la supervisión.</p>
          <p><strong>2.</strong> La retención indicada se liberará al completar y aceptar la totalidad de los trabajos.</p>
          <p><strong>3.</strong> Cualquier trabajo adicional no listado requiere acuerdo escrito previo.</p>
          <p><strong>4.</strong> El contratista garantiza la calidad de los trabajos según especificaciones técnicas del proyecto.</p>
          <p><strong>5.</strong> Fecha de emisión: <strong>{printDate}</strong>.</p>
        </div>

        {/* Firmas */}
        <div className="pt-10 grid grid-cols-2 gap-20">
          <div className="space-y-1 text-center">
            <div className="border-t-2 border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-700">La Empresa — Contratante</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Firma y sello</p>
            </div>
          </div>
          <div className="space-y-1 text-center">
            <div className="border-t-2 border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-700">{contrato.contractor?.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Contratista — Firma y cédula</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 pt-2 border-t border-gray-200">
          Documento generado por NominaAPP · {printDate}
        </p>
      </div>
    </div>
  )
}
