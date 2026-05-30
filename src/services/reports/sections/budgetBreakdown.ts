import type { Content, TableCell } from 'pdfmake/interfaces'

export interface BudgetBreakdownItem {
  code: string
  name: string
  budgeted: number
  actual: number
}

export interface BudgetBreakdownCategory {
  code: string
  name: string
  budgeted: number
  actual: number
  items: BudgetBreakdownItem[]
}

export interface BudgetBreakdownInput {
  categories: BudgetBreakdownCategory[]
}

type VarianceState = 'over' | 'under' | 'on-track'

interface ComputedRow {
  variance: number
  variancePct: number
  state: VarianceState
}

function computeVariance(budgeted: number, actual: number): ComputedRow {
  const variance = actual - budgeted
  const variancePct = budgeted === 0 ? 0 : (variance / budgeted) * 100
  let state: VarianceState
  if (variancePct > 10) {
    state = 'over'
  } else if (variance < 0) {
    state = 'under'
  } else {
    state = 'on-track'
  }
  return { variance, variancePct, state }
}

function stateLabel(state: VarianceState): string {
  switch (state) {
    case 'over':
      return 'Sobre presupuesto'
    case 'under':
      return 'Bajo presupuesto'
    case 'on-track':
      return 'En linea'
  }
}

function stateColor(state: VarianceState): string | undefined {
  switch (state) {
    case 'over':
      return '#c0392b'
    case 'under':
      return '#27ae60'
    case 'on-track':
      return undefined
  }
}

function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function buildCategoryRow(category: BudgetBreakdownCategory): TableCell[] {
  const { variance, variancePct, state } = computeVariance(category.budgeted, category.actual)
  const color = stateColor(state)
  return [
    { text: category.code, bold: true, color },
    { text: category.name, bold: true, color },
    { text: formatCurrency(category.budgeted), bold: true, alignment: 'right', color },
    { text: formatCurrency(category.actual), bold: true, alignment: 'right', color },
    { text: formatCurrency(variance), bold: true, alignment: 'right', color },
    { text: formatPercent(variancePct), bold: true, alignment: 'right', color },
    { text: stateLabel(state), bold: true, color },
  ]
}

function buildItemRow(item: BudgetBreakdownItem): TableCell[] {
  const { variance, variancePct, state } = computeVariance(item.budgeted, item.actual)
  const color = stateColor(state)
  return [
    { text: item.code, color, margin: [12, 0, 0, 0] },
    { text: item.name, color, margin: [12, 0, 0, 0] },
    { text: formatCurrency(item.budgeted), alignment: 'right', color },
    { text: formatCurrency(item.actual), alignment: 'right', color },
    { text: formatCurrency(variance), alignment: 'right', color },
    { text: formatPercent(variancePct), alignment: 'right', color },
    { text: stateLabel(state), color },
  ]
}

function buildTotalsRow(input: BudgetBreakdownInput): TableCell[] {
  const totals = input.categories.reduce(
    (acc, cat) => {
      acc.budgeted += cat.budgeted
      acc.actual += cat.actual
      return acc
    },
    { budgeted: 0, actual: 0 },
  )
  const { variance, variancePct, state } = computeVariance(totals.budgeted, totals.actual)
  const color = stateColor(state)
  return [
    { text: '', fillColor: '#ecf0f1' },
    { text: 'TOTAL', bold: true, fillColor: '#ecf0f1', color },
    {
      text: formatCurrency(totals.budgeted),
      bold: true,
      alignment: 'right',
      fillColor: '#ecf0f1',
      color,
    },
    {
      text: formatCurrency(totals.actual),
      bold: true,
      alignment: 'right',
      fillColor: '#ecf0f1',
      color,
    },
    {
      text: formatCurrency(variance),
      bold: true,
      alignment: 'right',
      fillColor: '#ecf0f1',
      color,
    },
    {
      text: formatPercent(variancePct),
      bold: true,
      alignment: 'right',
      fillColor: '#ecf0f1',
      color,
    },
    { text: stateLabel(state), bold: true, fillColor: '#ecf0f1', color },
  ]
}

export function buildBudgetBreakdownSection(input: BudgetBreakdownInput): Content {
  const headerRow: TableCell[] = [
    { text: 'Codigo', bold: true, fillColor: '#34495e', color: '#ffffff' },
    { text: 'Nombre', bold: true, fillColor: '#34495e', color: '#ffffff' },
    {
      text: 'Presupuestado',
      bold: true,
      alignment: 'right',
      fillColor: '#34495e',
      color: '#ffffff',
    },
    {
      text: 'Real',
      bold: true,
      alignment: 'right',
      fillColor: '#34495e',
      color: '#ffffff',
    },
    {
      text: 'Variance ($)',
      bold: true,
      alignment: 'right',
      fillColor: '#34495e',
      color: '#ffffff',
    },
    {
      text: 'Variance (%)',
      bold: true,
      alignment: 'right',
      fillColor: '#34495e',
      color: '#ffffff',
    },
    { text: 'Estado', bold: true, fillColor: '#34495e', color: '#ffffff' },
  ]

  const body: TableCell[][] = [headerRow]

  for (const category of input.categories) {
    body.push(buildCategoryRow(category))
    for (const item of category.items) {
      body.push(buildItemRow(item))
    }
  }

  body.push(buildTotalsRow(input))

  return {
    stack: [
      {
        text: 'Desglose por capitulo/partida',
        style: 'sectionTitle',
        bold: true,
        fontSize: 14,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body,
        },
        layout: 'lightHorizontalLines',
      },
    ],
    margin: [0, 0, 0, 12],
  }
}
