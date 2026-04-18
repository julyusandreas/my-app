'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'

type RectState = {
  top: number
  left: number
  width: number
  height: number
}

type PanelPosition = {
  top: number
  left: number
  placement: 'top' | 'bottom'
}

type WalkthroughOverlayProps = {
  open: boolean
  stepLabel: string
  title: string
  description: string
  targetElement: HTMLElement | null
  onClose: () => void
  onNext?: () => void
  onBack?: () => void
  showNext?: boolean
  showBack?: boolean
  nextLabel?: string
  blockTargetClick?: boolean
  primaryActionLabel?: string
  onPrimaryAction?: () => void
}

const PANEL_WIDTH = 360
const PANEL_MARGIN = 16
const TARGET_GAP = 14

export default function WalkthroughOverlay({
  open,
  stepLabel,
  title,
  description,
  targetElement,
  onClose,
  onNext,
  onBack,
  showNext = true,
  showBack = true,
  nextLabel = 'Next',
  blockTargetClick = false,
  primaryActionLabel,
  onPrimaryAction,
}: WalkthroughOverlayProps) {
  const [rect, setRect] = useState<RectState | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelSize, setPanelSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!open) return

    function updateMeasurements() {
      if (typeof window !== 'undefined') {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }

      if (targetElement) {
        const r = targetElement.getBoundingClientRect()
        setRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        })
      } else {
        setRect(null)
      }

      if (panelRef.current) {
        const p = panelRef.current.getBoundingClientRect()
        setPanelSize({
          width: p.width,
          height: p.height,
        })
      }
    }

    updateMeasurements()

    const raf1 = requestAnimationFrame(() => {
      updateMeasurements()
      requestAnimationFrame(() => {
        updateMeasurements()
      })
    })

    window.addEventListener('resize', updateMeasurements)
    window.addEventListener('scroll', updateMeasurements, true)

    const intervalId = window.setInterval(updateMeasurements, 150)

    return () => {
      cancelAnimationFrame(raf1)
      window.removeEventListener('resize', updateMeasurements)
      window.removeEventListener('scroll', updateMeasurements, true)
      window.clearInterval(intervalId)
    }
  }, [
    open,
    targetElement,
    stepLabel,
    title,
    description,
    primaryActionLabel,
    showNext,
    showBack,
  ])

  const spotlightStyle = useMemo(() => {
    if (!rect) return undefined

    const padding = 10

    return {
      top: Math.max(rect.top - padding, 8),
      left: Math.max(rect.left - padding, 8),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    }
  }, [rect])

  const computedPanelWidth = useMemo(() => {
    if (!viewport.width) return PANEL_WIDTH
    return Math.min(PANEL_WIDTH, viewport.width - PANEL_MARGIN * 2)
  }, [viewport.width])

  const panelPosition = useMemo<PanelPosition | null>(() => {
    if (!viewport.width || !viewport.height) return null

    const panelWidth = panelSize.width || computedPanelWidth
    const panelHeight = panelSize.height || 260

    if (!rect) {
      return {
        top: Math.max(PANEL_MARGIN, viewport.height - panelHeight - 24),
        left: Math.max(PANEL_MARGIN, (viewport.width - panelWidth) / 2),
        placement: 'bottom',
      }
    }

    const targetCenterX = rect.left + rect.width / 2

    let left = targetCenterX - panelWidth / 2
    const maxLeft = viewport.width - panelWidth - PANEL_MARGIN
    left = Math.max(PANEL_MARGIN, Math.min(left, maxLeft))

    const spaceBelow = viewport.height - (rect.top + rect.height)
    const spaceAbove = rect.top

    const shouldPlaceBelow =
      spaceBelow >= panelHeight + TARGET_GAP || spaceBelow >= spaceAbove

    let top: number
    let placement: 'top' | 'bottom'

    if (shouldPlaceBelow) {
      top = rect.top + rect.height + TARGET_GAP
      placement = 'bottom'
    } else {
      top = rect.top - panelHeight - TARGET_GAP
      placement = 'top'
    }

    top = Math.max(
      PANEL_MARGIN,
      Math.min(top, viewport.height - panelHeight - PANEL_MARGIN)
    )

    return { top, left, placement }
  }, [rect, viewport, panelSize, computedPanelWidth])

  const arrowStyle = useMemo(() => {
    if (!rect || !panelPosition) return undefined

    const panelWidth = panelSize.width || computedPanelWidth
    const targetCenterX = rect.left + rect.width / 2
    const relativeLeft = targetCenterX - panelPosition.left - 10

    return {
      left: Math.max(18, Math.min(relativeLeft, panelWidth - 30)),
    }
  }, [rect, panelPosition, panelSize, computedPanelWidth])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className={`absolute inset-0 bg-slate-900/60 ${
          blockTargetClick ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      />

      {spotlightStyle && (
        <div
          className="pointer-events-none absolute rounded-[28px] border-2 border-emerald-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.58)] transition-all duration-200"
          style={spotlightStyle}
        />
      )}

      {panelPosition && (
        <div
          className="pointer-events-none absolute z-[95]"
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            width: computedPanelWidth,
          }}
        >
          <div
            ref={panelRef}
            className="pointer-events-auto relative rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_60px_rgba(16,24,40,0.18)]"
          >
            {rect && panelPosition.placement === 'bottom' && arrowStyle && (
              <div
                className="absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-white/80 bg-white"
                style={arrowStyle}
              />
            )}

            {rect && panelPosition.placement === 'top' && arrowStyle && (
              <div
                className="absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-white/80 bg-white"
                style={arrowStyle}
              />
            )}

            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  {stepLabel}
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-sm leading-6 text-slate-500">{description}</p>

            {primaryActionLabel && onPrimaryAction && (
              <button
                onClick={onPrimaryAction}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3 text-sm font-semibold text-white"
              >
                {primaryActionLabel}
              </button>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="text-sm font-semibold text-slate-500"
              >
                Skip
              </button>

              <div className="flex items-center gap-2">
                {showBack && (
                  <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </button>
                )}

                {showNext && (
                  <button
                    onClick={onNext}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {nextLabel}
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}