/**
 * LineChart – gráfica de línea SVG nativa, sin dependencias.
 *
 * Props:
 *   series      – array de { label: string; value: number }
 *   height      – altura del área de trazado (default 160)
 *   color       – color CSS de la línea/punto (default '#3b82f6')
 *   formatY     – función para formatear los valores del eje Y / tooltip
 *   emptyMessage – texto cuando no hay datos
 */

import { useRef, useState } from 'react'

export interface DataPoint {
  label: string
  value: number
}

interface TooltipState {
  x: number
  y: number
  label: string
  value: string
}

interface LineChartProps {
  series: DataPoint[]
  height?: number
  color?: string
  formatY?: (v: number) => string
  emptyMessage?: string
}

const PAD_LEFT = 56
const PAD_RIGHT = 12
const PAD_TOP = 12
const PAD_BOTTOM = 36

export function LineChart({
  series,
  height = 160,
  color = '#3b82f6',
  formatY = (v) => String(v),
  emptyMessage = 'Sin datos',
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const totalH = height + PAD_TOP + PAD_BOTTOM
  const vbW = 800
  const innerW = vbW - PAD_LEFT - PAD_RIGHT

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-app-muted" style={{ height: totalH }}>
        {emptyMessage}
      </div>
    )
  }

  const maxVal = Math.max(...series.map((d) => d.value), 0)
  const yMax = maxVal === 0 ? 1 : maxVal * 1.1

  const TICK_COUNT = 4
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (yMax * i) / TICK_COUNT)

  const yScale = (v: number) => PAD_TOP + height - (v / yMax) * height
  const xScale = (i: number) =>
    series.length <= 1 ? PAD_LEFT + innerW / 2 : PAD_LEFT + (i / (series.length - 1)) * innerW

  // Build polyline points string
  const points = series.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ')

  // Build area (filled path below line)
  const areaPath =
    series.length > 0
      ? `M${xScale(0)},${yScale(0)} ` +
        series.map((d, i) => `L${xScale(i)},${yScale(d.value)}`).join(' ') +
        ` L${xScale(series.length - 1)},${yScale(0)} Z`
      : ''

  function handleMouseEnter(e: React.MouseEvent<SVGCircleElement>, d: DataPoint) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 40,
      label: d.label,
      value: formatY(d.value),
    })
  }

  return (
    <div className="relative select-none" style={{ height: totalH }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${totalH}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        role="img"
        aria-label="Gráfica de línea"
      >
        <defs>
          <linearGradient id="line-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Grid lines + Y-axis labels */}
        {ticks.map((t, i) => {
          const cy = yScale(t)
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                y1={cy}
                x2={vbW - PAD_RIGHT}
                y2={cy}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 4} y={cy + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.45}>
                {formatY(t)}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#line-area-grad)" />}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points + X labels */}
        {series.map((d, i) => {
          const cx = xScale(i)
          const cy = yScale(d.value)
          const labelY = totalH - PAD_BOTTOM + 14
          return (
            <g key={i}>
              {/* Invisible larger hit area */}
              <circle
                cx={cx}
                cy={cy}
                r={12}
                fill="transparent"
                onMouseEnter={(e) => handleMouseEnter(e, d)}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-crosshair"
              />
              {/* Visible dot */}
              <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />
              {/* X-axis label */}
              <text x={cx} y={labelY} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.5}>
                {d.label.length > 6 ? d.label.slice(0, 6) : d.label}
              </text>
            </g>
          )
        })}

        {/* X axis baseline */}
        <line
          x1={PAD_LEFT}
          y1={yScale(0)}
          x2={vbW - PAD_RIGHT}
          y2={yScale(0)}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-app-text/90 px-2.5 py-1.5 text-[11px] text-white shadow-md"
          style={{ left: tooltip.x + 8, top: tooltip.y }}
        >
          <span className="font-medium">{tooltip.label}</span>
          <br />
          <span>{tooltip.value}</span>
        </div>
      )}
    </div>
  )
}
