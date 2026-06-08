/**
 * BarChart – gráfica de barras SVG nativa, sin dependencias.
 *
 * Props:
 *   series       – array de { label: string; value: number }
 *   height       – altura del área de trazado (default 160)
 *   color        – color CSS de las barras (default '#3b82f6')
 *   formatY      – función para formatear los valores del eje Y / tooltip
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

interface BarChartProps {
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

export function BarChart({
  series,
  height = 160,
  color = '#3b82f6',
  formatY = (v) => String(v),
  emptyMessage = 'Sin datos',
}: BarChartProps) {
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

  // Ancho de cada banda y de la barra (con separación).
  const band = innerW / series.length
  const barW = Math.max(2, band * 0.6)

  function handleMouseEnter(e: React.MouseEvent<SVGRectElement>, d: DataPoint) {
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

  const baseY = yScale(0)

  return (
    <div className="relative select-none" style={{ height: totalH }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${totalH}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        role="img"
        aria-label="Gráfica de barras"
      >
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

        {/* Bars + X labels */}
        {series.map((d, i) => {
          const cx = PAD_LEFT + i * band + band / 2
          const x = cx - barW / 2
          const y = yScale(d.value)
          const h = Math.max(0, baseY - y)
          const labelY = totalH - PAD_BOTTOM + 14
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2}
                fill={color}
                fillOpacity={0.85}
                onMouseEnter={(e) => handleMouseEnter(e, d)}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-crosshair"
              />
              <text x={cx} y={labelY} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.5}>
                {d.label.length > 6 ? d.label.slice(0, 6) : d.label}
              </text>
            </g>
          )
        })}

        {/* X axis baseline */}
        <line
          x1={PAD_LEFT}
          y1={baseY}
          x2={vbW - PAD_RIGHT}
          y2={baseY}
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
