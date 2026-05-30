import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useQualityControlPage } from '@/hooks/useQualityControlPage'
import { QualityStatsCards } from '@/components/features/quality/QualityStatsCards'
import { QualityRecordsTable } from '@/components/features/quality/QualityRecordsTable'
import {
  QualityControlPageHeader,
  QualityControlPageModals,
} from '@/components/features/quality/QualityControlPageSections'
import type { QualityControl } from '@/types/database'

type StatusFilter = 'all' | 'passed' | 'failed' | 'pending'

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'passed', label: 'Aprobados' },
  { value: 'failed', label: 'Fallidos' },
  { value: 'pending', label: 'Pendientes' },
]

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function buildCsv(records: QualityControl[]): string {
  const headers = [
    'Elemento',
    'Fecha colada',
    'Edad ensayo',
    'Fecha ensayo',
    'Resistencia esperada (kg/cm²)',
    'Resistencia real (kg/cm²)',
    'Proveedor hormigón',
    'Laboratorio',
    'Estado',
    'Notas',
  ]
  const statusLabel = (status: QualityControl['status']): string => {
    if (status === 'passed') return 'Aprobado'
    if (status === 'failed') return 'Fallido'
    return 'Pendiente'
  }
  const rows = records.map((record) => [
    record.element,
    record.pour_date,
    record.test_age ?? '',
    record.test_date ?? '',
    record.expected_resistance ?? '',
    record.actual_resistance ?? '',
    record.concrete_supplier ?? '',
    record.laboratory ?? '',
    statusLabel(record.status),
    record.notes ?? '',
  ])
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
}

function downloadCsv(filename: string, csv: string): void {
  // BOM UTF-8 explicito (Excel detecta el encoding correctamente).
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function QualityControlPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const quality = useQualityControlPage(projectId)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const summary = useMemo(() => {
    const total = quality.records.length
    const completed = quality.records.filter((record) => record.status !== null)
    const passedCount = completed.filter((record) => record.status === 'passed').length
    const passedPercent = completed.length > 0 ? (passedCount / completed.length) * 100 : 0
    const withResistances = quality.records.filter(
      (record) => record.actual_resistance !== null && record.expected_resistance !== null,
    )
    const avgActual =
      withResistances.length > 0
        ? withResistances.reduce((sum, record) => sum + (record.actual_resistance ?? 0), 0) / withResistances.length
        : 0
    const avgExpected =
      withResistances.length > 0
        ? withResistances.reduce((sum, record) => sum + (record.expected_resistance ?? 0), 0) / withResistances.length
        : 0
    return { total, passedPercent, avgActual, avgExpected, hasResistances: withResistances.length > 0 }
  }, [quality.records])

  const filteredRecords = useMemo(() => {
    if (statusFilter === 'all') return quality.records
    if (statusFilter === 'pending') return quality.records.filter((record) => record.status === null)
    return quality.records.filter((record) => record.status === statusFilter)
  }, [quality.records, statusFilter])

  if (!projectId) return null

  const handleExport = () => {
    if (quality.records.length === 0) return
    const csv = buildCsv(quality.records)
    const safeName = (quality.projectName || 'proyecto').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()
    const datePart = new Date().toISOString().slice(0, 10)
    downloadCsv(`calidad_${safeName}_${datePart}.csv`, csv)
  }

  return (
    <div className="space-y-5">
      <QualityControlPageHeader
        projectId={projectId}
        projectName={quality.projectName}
        onCreate={() => quality.setShowCreate(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-app-surface border border-app-border rounded-xl p-3 sm:p-4">
          <p className="text-xs text-app-muted">Total ensayos</p>
          <p className="text-xl sm:text-2xl font-bold text-app-text mt-1">{summary.total}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-3 sm:p-4">
          <p className="text-xs text-app-muted">% Aprobados</p>
          <p className="text-xl sm:text-2xl font-bold text-app-text mt-1">{summary.passedPercent.toFixed(1)}%</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-3 sm:p-4">
          <p className="text-xs text-app-muted">Promedio resistencia (real / esperada)</p>
          <p className="text-lg sm:text-2xl font-bold text-app-text mt-1 break-words">
            {summary.hasResistances
              ? `${summary.avgActual.toFixed(0)} / ${summary.avgExpected.toFixed(0)} kg/cm²`
              : '—'}
          </p>
        </div>
      </div>

      <QualityStatsCards passed={quality.stats.passed} failed={quality.stats.failed} pending={quality.stats.pending} />

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-app-muted uppercase w-full sm:w-auto">Filtrar:</span>
          {FILTER_OPTIONS.map((option) => {
            const isActive = statusFilter === option.value
            return (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium border transition ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-app-surface border-app-border text-app-muted hover:bg-app-hover'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={handleExport}
          disabled={quality.records.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 min-h-[44px] text-xs font-medium text-app-text hover:bg-app-hover disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      </div>

      <QualityRecordsTable
        loading={quality.loading}
        records={filteredRecords}
        onCreate={() => quality.setShowCreate(true)}
        onEdit={quality.setEditing}
        onDelete={quality.setDeletingId}
      />

      <QualityControlPageModals
        projectId={projectId}
        showCreate={quality.showCreate}
        editing={quality.editing}
        deletingId={quality.deletingId}
        saving={quality.saving}
        onSubmit={quality.submitRecord}
        onCloseCreate={() => quality.setShowCreate(false)}
        onCloseEdit={() => quality.setEditing(undefined)}
        onConfirmDelete={quality.confirmDelete}
        onCancelDelete={() => quality.setDeletingId(null)}
      />
    </div>
  )
}
