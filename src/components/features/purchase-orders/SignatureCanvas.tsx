import { useEffect, useRef, useState } from 'react'

interface SignatureCanvasProps {
  onChange: (dataUrl: string | null) => void
}

const FONT_SIZE = 42
const CANVAS_W = 500
const CANVAS_H = 120
const FONT_FAMILY = '"Brush Script MT", "Dancing Script", cursive'

function renderToCanvas(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  if (!text.trim()) return

  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`
  ctx.fillStyle = '#1e3a5f'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2)
}

export function SignatureCanvas({ onChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderToCanvas(canvas, text)
    onChange(text.trim() ? canvas.toDataURL('image/png') : null)
  }, [text, onChange])

  return (
    <div className="space-y-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escriba su nombre completo"
        className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="border-2 border-dashed border-app-border rounded-lg bg-app-bg overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full"
        />
        {!text.trim() && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-app-subtle pointer-events-none">
            Vista previa de firma
          </p>
        )}
      </div>
      {text.trim() && (
        <button
          type="button"
          onClick={() => setText('')}
          className="text-xs text-app-muted hover:text-app-text"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
