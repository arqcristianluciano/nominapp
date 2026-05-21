import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
  /**
   * Accessible label used when `title` is empty (e.g. ConfirmModal renders its
   * own heading inside `children`). Sets `aria-label` on the dialog container.
   */
  ariaLabel?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden')) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  // offsetParent is null for elements with display:none (except fixed elements)
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  // Width/height check catches additional cases
  if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects().length === 0) {
    return false
  }
  return true
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter(isVisible)
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg', ariaLabel }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const hasTitle = title.trim().length > 0

  // Lock body scroll while modal is open, preserving any previous overflow value.
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Escape key handler (cleaned up on close/unmount).
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // Focus management: save the previously focused element, focus the first
  // focusable element inside the modal, and restore focus on close.
  useEffect(() => {
    if (!open) return
    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const dialog = dialogRef.current
    if (dialog) {
      const focusables = getFocusableElements(dialog)
      const target = focusables[0] ?? dialog
      // Defer to ensure the element is in the DOM and visible.
      window.requestAnimationFrame(() => {
        target.focus()
      })
    }

    return () => {
      const previous = previousActiveElementRef.current
      if (previous && document.contains(previous)) {
        previous.focus()
      }
      previousActiveElementRef.current = null
    }
  }, [open])

  // Focus trap: cycle Tab/Shift+Tab within the dialog.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = getFocusableElements(dialog)
      if (focusables.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last || !dialog.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-[8vh] overflow-y-auto"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-label={!hasTitle && ariaLabel ? ariaLabel : undefined}
        tabIndex={-1}
        className={`bg-app-surface rounded-2xl shadow-2xl w-full ${width} animate-in fade-in slide-in-from-bottom-4 duration-200 outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {hasTitle && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
            <h2 id={titleId} className="text-base font-semibold text-app-text">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-app-subtle hover:text-app-text hover:bg-app-hover transition-colors"
              title="Cerrar (Escape)"
              aria-label="Cerrar (Escape)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
