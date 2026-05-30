import { useEffect, useState } from 'react'
import { ArrowLeft, Printer, Pencil, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRD } from '@/utils/currency'
import { Modal } from '@/components/ui/Modal'
import { SignatureCanvas } from '@/components/features/purchase-orders/SignatureCanvas'
import type { ContractWithContractor } from '@/services/cubicationService'
import type { ContractPartida } from '@/types/database'

export function ContratoFirmaTopBar({
  projectId,
  contratoId,
  ready = true,
}: {
  projectId: string
  contratoId: string
  ready?: boolean
}) {
  useEffect(() => {
    if (!ready) return
    // small delay para asegurar render
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [ready])

  return (
    <>
      {/* Top bar: stacks on mobile, inline on tablet+ */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-b border-app-border bg-app-surface sticky top-0 z-10">
        <Link
          to={`/proyectos/${projectId}/cubicaciones/${contratoId}`}
          className="inline-flex items-center gap-1 text-sm text-app-muted hover:text-app-text"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al contrato
        </Link>
        {/* Prominent print button — visible on every viewport */}
        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-transform shadow-sm"
        >
          <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Mobile floating action button — extra-prominent shortcut */}
      <button
        onClick={() => window.print()}
        className="print:hidden sm:hidden fixed bottom-5 right-5 z-20 inline-flex items-center gap-2 px-5 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-xl hover:bg-blue-700 active:scale-95 transition-transform"
        aria-label="Imprimir o guardar como PDF"
      >
        <Printer className="w-5 h-5" />
        <span>Imprimir</span>
      </button>
    </>
  )
}

function DigitalSignatureBlock({
  label,
  subtitle,
  signature,
  onOpen,
}: {
  label: string
  subtitle: string
  signature: string | null
  onOpen: () => void
}) {
  return (
    <div className="space-y-1 text-center">
      {signature ? (
        <div className="flex flex-col items-center">
          <img src={signature} alt={`Firma de ${label}`} className="h-14 sm:h-16 object-contain max-w-full" />
          <div className="w-full border-t-2 border-gray-700 pt-2">
            <p className="text-xs font-semibold text-gray-700 break-words">{label}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
            <button
              type="button"
              onClick={onOpen}
              className="print:hidden mt-2 inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-700 hover:text-blue-900"
            >
              <Pencil className="w-3 h-3" /> Editar firma
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="h-14 sm:h-16" aria-hidden="true" />
          <div className="border-t-2 border-gray-700 pt-2 sm:pt-3">
            <p className="text-xs font-semibold text-gray-700 break-words">{label}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
            <button
              type="button"
              onClick={onOpen}
              className="print:hidden mt-2 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-md transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Firmar digitalmente
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ContratoFirmaDocument({
  contrato,
  partidas,
  totalAcordado,
  printDate,
}: {
  contrato: ContractWithContractor
  partidas: ContractPartida[]
  totalAcordado: number
  printDate: string
}) {
  const retencionMonto = (totalAcordado * contrato.retention_percent) / 100
  const netoEstimado = totalAcordado - retencionMonto

  const [empresaSig, setEmpresaSig] = useState<string | null>(null)
  const [contratistaSig, setContratistaSig] = useState<string | null>(null)
  const [activeSigner, setActiveSigner] = useState<'empresa' | 'contratista' | null>(null)
  const [draftSig, setDraftSig] = useState<string | null>(null)

  function openSigner(who: 'empresa' | 'contratista') {
    setDraftSig(who === 'empresa' ? empresaSig : contratistaSig)
    setActiveSigner(who)
  }
  function closeSigner() {
    setActiveSigner(null)
    setDraftSig(null)
  }
  function confirmSigner() {
    if (activeSigner === 'empresa') setEmpresaSig(draftSig)
    if (activeSigner === 'contratista') setContratistaSig(draftSig)
    closeSigner()
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 sm:p-6 md:p-8 print:p-6 space-y-5 sm:space-y-6 md:space-y-7 text-sm font-sans text-gray-800">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 sm:pb-5">
        <h1 className="text-base sm:text-xl md:text-2xl font-bold uppercase tracking-wide sm:tracking-widest leading-tight">
          Contrato de Precios Acordados
        </h1>
        <p className="text-gray-500 text-[11px] sm:text-xs mt-1">Obra por destajo — NominaAPP</p>
      </div>

      {/* Parties: stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 text-xs">
        <div className="border border-gray-300 rounded p-3 space-y-1">
          <p className="font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Contratante</p>
          <p className="font-bold text-sm sm:text-base text-gray-800 break-words">La Empresa</p>
          <p className="text-gray-500">En su representación autorizada</p>
        </div>
        <div className="border border-gray-300 rounded p-3 space-y-1">
          <p className="font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Contratista / Trabajador</p>
          <p className="font-bold text-sm sm:text-base text-gray-800 break-words">{contrato.contractor?.name}</p>
          {contrato.contractor?.specialty && (
            <p className="text-gray-500 break-words">{contrato.contractor.specialty}</p>
          )}
          {contrato.contractor?.cedula && <p className="text-gray-500">Cédula: {contrato.contractor.cedula}</p>}
        </div>
      </div>

      {/* Clauses paragraph */}
      <div className="text-[11px] sm:text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded p-3 sm:p-4 space-y-2">
        <p>
          Las partes acuerdan libre y voluntariamente los precios unitarios y cantidades establecidos en el presente
          contrato para la ejecución de los trabajos descritos a continuación, bajo las condiciones de pago por avance
          verificado (cubicación). El pago se realizará según las mediciones aprobadas, con una retención del{' '}
          <strong>{contrato.retention_percent}%</strong> hasta la recepción final de los trabajos.
        </p>
        <p>
          Los precios acordados pueden diferir de los valores referenciados en el presupuesto del proyecto y constituyen
          el valor vinculante para el cálculo de pagos entre las partes.
        </p>
      </div>

      {/* Partidas section */}
      <div>
        <h2 className="font-bold text-gray-800 mb-3 text-xs sm:text-sm uppercase tracking-wide border-b border-gray-300 pb-1">
          Precios y cantidades acordadas
        </h2>

        {/* Mobile: card list (hidden when printing — table is used instead) */}
        <div className="sm:hidden print:hidden space-y-2.5">
          {partidas.map((partida, index) => (
            <div
              key={partida.id}
              className="border border-gray-200 rounded-lg p-3 bg-white space-y-2 text-xs shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 font-semibold text-[11px]">#{index + 1}</span>
                <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {partida.unit}
                </span>
              </div>
              <p className="font-medium text-gray-800 leading-snug break-words">{partida.description}</p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase">Precio</p>
                  <p className="font-semibold text-blue-800 text-[11px] truncate">{formatRD(partida.unit_price)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase">Cant.</p>
                  <p className="text-gray-700 text-[11px] truncate">
                    {partida.agreed_quantity.toLocaleString('es-DO')}
                  </p>
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase">Total</p>
                  <p className="font-bold text-[11px] truncate">
                    {formatRD(partida.agreed_quantity * partida.unit_price)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-gray-800 text-white font-bold rounded-lg px-3 py-3 flex items-center justify-between gap-2">
            <span className="uppercase tracking-wide text-[11px]">Total acordado</span>
            <span className="text-base">{formatRD(totalAcordado)}</span>
          </div>
        </div>

        {/* Tablet+ and print: classic table (scrollable on small viewports) */}
        <div className="hidden sm:block print:block -mx-3 sm:mx-0 overflow-x-auto">
          <table className="w-full text-[11px] sm:text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-2 sm:px-3 py-2 text-left font-semibold">#</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold">Descripción del trabajo</th>
                <th className="px-2 sm:px-3 py-2 text-center font-semibold">Unidad</th>
                <th className="px-2 sm:px-3 py-2 text-right font-semibold">Precio acordado</th>
                <th className="px-2 sm:px-3 py-2 text-right font-semibold">Cant. acordada</th>
                <th className="px-2 sm:px-3 py-2 text-right font-semibold">Total acordado</th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((partida, index) => (
                <tr key={partida.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-200 px-2 sm:px-3 py-2 text-gray-500">{index + 1}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-2 font-medium">{partida.description}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-2 text-center text-gray-600">{partida.unit}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-2 text-right font-semibold text-blue-800">
                    {formatRD(partida.unit_price)}
                  </td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-2 text-right text-gray-700">
                    {partida.agreed_quantity.toLocaleString('es-DO')}
                  </td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-2 text-right font-bold">
                    {formatRD(partida.agreed_quantity * partida.unit_price)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-800 text-white font-bold">
                <td colSpan={5} className="px-2 sm:px-3 py-2.5 text-right uppercase tracking-wide">
                  TOTAL ACORDADO
                </td>
                <td className="px-2 sm:px-3 py-2.5 text-right text-base sm:text-lg">{formatRD(totalAcordado)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards: 1 col mobile, 3 cols tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center text-xs print:grid-cols-3">
        <div className="border border-gray-300 rounded p-3 flex flex-row sm:flex-col items-center sm:items-stretch justify-between sm:justify-start gap-2 sm:gap-0 text-left sm:text-center">
          <p className="text-gray-500 uppercase text-[10px] tracking-wide">Total acordado</p>
          <p className="text-base sm:text-xl font-bold text-gray-800 sm:mt-1 whitespace-nowrap">
            {formatRD(totalAcordado)}
          </p>
        </div>
        <div className="border border-gray-300 rounded p-3 flex flex-row sm:flex-col items-center sm:items-stretch justify-between sm:justify-start gap-2 sm:gap-0 text-left sm:text-center">
          <p className="text-gray-500 uppercase text-[10px] tracking-wide">Retención ({contrato.retention_percent}%)</p>
          <p className="text-base sm:text-xl font-bold text-amber-700 sm:mt-1 whitespace-nowrap">
            {formatRD(retencionMonto)}
          </p>
        </div>
        <div className="border border-gray-300 rounded p-3 bg-gray-50 flex flex-row sm:flex-col items-center sm:items-stretch justify-between sm:justify-start gap-2 sm:gap-0 text-left sm:text-center">
          <p className="text-gray-500 uppercase text-[10px] tracking-wide">Neto a pagar (estimado)</p>
          <p className="text-base sm:text-xl font-bold text-green-700 sm:mt-1 whitespace-nowrap">
            {formatRD(netoEstimado)}
          </p>
        </div>
      </div>

      {/* Conditions */}
      <div className="text-[11px] sm:text-xs text-gray-600 space-y-1.5 sm:space-y-2 border-t border-gray-200 pt-4 leading-relaxed">
        <p>
          <strong>1.</strong> Los pagos se realizarán por cubicaciones (mediciones verificadas) aprobadas por la
          supervisión.
        </p>
        <p>
          <strong>2.</strong> La retención indicada se liberará al completar y aceptar la totalidad de los trabajos.
        </p>
        <p>
          <strong>3.</strong> Cualquier trabajo adicional no listado requiere acuerdo escrito previo.
        </p>
        <p>
          <strong>4.</strong> El contratista garantiza la calidad de los trabajos según especificaciones técnicas del
          proyecto.
        </p>
        <p>
          <strong>5.</strong> Fecha de emisión: <strong>{printDate}</strong>.
        </p>
      </div>

      {/* Signatures: stack on mobile (with breathing room), side-by-side tablet+ */}
      <div className="pt-6 sm:pt-10 grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12 md:gap-20 print:grid-cols-2 print:gap-20">
        <DigitalSignatureBlock
          label="La Empresa — Contratante"
          subtitle="Firma y sello"
          signature={empresaSig}
          onOpen={() => openSigner('empresa')}
        />
        <DigitalSignatureBlock
          label={contrato.contractor?.name ?? 'Contratista'}
          subtitle="Contratista — Firma y cédula"
          signature={contratistaSig}
          onOpen={() => openSigner('contratista')}
        />
      </div>

      <p className="text-center text-[10px] text-gray-400 pt-2 border-t border-gray-200">
        Documento generado por NominaAPP · {printDate}
      </p>

      {/* Extra spacer so mobile FAB doesn't overlap last content */}
      <div className="h-20 sm:h-0 print:hidden" aria-hidden="true" />

      {/* Signature modal — responsive (full-width on mobile via Modal width override) */}
      <Modal
        open={activeSigner !== null}
        onClose={closeSigner}
        title={activeSigner === 'empresa' ? 'Firma de la Empresa' : 'Firma del Contratista'}
        width="max-w-full sm:max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-app-muted leading-relaxed">
            Escriba su nombre completo para generar una firma digital. La firma quedará registrada en este documento.
          </p>
          <div className="w-full">
            <SignatureCanvas onChange={setDraftSig} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-app-border">
            <button
              type="button"
              onClick={closeSigner}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm rounded-lg border border-app-border text-app-text hover:bg-app-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmSigner}
              disabled={!draftSig}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Check className="w-4 h-4" /> Confirmar firma
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
