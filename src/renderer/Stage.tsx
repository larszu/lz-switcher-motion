/**
 * The programme frame as an editable picture: boxes are dragged to move and
 * resized from their corner. Coordinates are switcher units (frame −16…16 ×
 * −9…9, y up); the stage shows a margin around the frame so boxes parked
 * off-screen stay reachable.
 */

import { useRef } from 'react'
import { FRAME_H, FRAME_W } from '../shared/model'

export interface StageRect {
  key: string
  label: string
  sub?: string
  left: number
  top: number
  width: number
  height: number
  enabled: boolean
}

interface Props {
  rects: StageRect[]
  selected: string | null
  onSelect: (key: string) => void
  /** dx, dy in frame units since drag start; `resize` drags the corner. */
  onDrag: (key: string, mode: 'move' | 'resize', dx: number, dy: number, free: boolean) => void
  onDragEnd?: () => void
}

/** Visible area: the frame plus a margin of half a frame width each side. */
const VIEW_W = FRAME_W * 1.5
const VIEW_H = FRAME_H * 1.5

export function Stage({ rects, selected, onSelect, onDrag, onDragEnd }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const pct = (x: number, y: number) => ({
    left: `${((x + VIEW_W / 2) / VIEW_W) * 100}%`,
    top: `${((VIEW_H / 2 - y) / VIEW_H) * 100}%`,
  })

  function start(e: React.PointerEvent, key: string, mode: 'move' | 'resize') {
    e.stopPropagation()
    e.preventDefault()
    onSelect(key)
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const unit = box.width / VIEW_W
    const x0 = e.clientX
    const y0 = e.clientY
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) =>
      onDrag(key, mode, (ev.clientX - x0) / unit, -(ev.clientY - y0) / unit, ev.altKey)
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      onDragEnd?.()
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const frame = pct(-FRAME_W / 2, FRAME_H / 2)

  return (
    <div className="stage" ref={ref}>
      <div
        className="stage-frame"
        style={{ ...frame, width: `${(FRAME_W / VIEW_W) * 100}%`, height: `${(FRAME_H / VIEW_H) * 100}%` }}
      >
        <div className="stage-cross" />
      </div>
      {/* Drawn back to front: box 1 is front-most on the switcher. */}
      {[...rects].reverse().map((r) => {
        const p = pct(r.left, r.top)
        return (
          <div
            key={r.key}
            className="stage-box"
            data-selected={selected === r.key || undefined}
            data-off={!r.enabled || undefined}
            style={{
              ...p,
              width: `${(r.width / VIEW_W) * 100}%`,
              height: `${(r.height / VIEW_H) * 100}%`,
            }}
            onPointerDown={(e) => start(e, r.key, 'move')}
            role="button"
            tabIndex={0}
            aria-label={r.label}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 1 : 0.1
              const m: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, step],
                ArrowDown: [0, -step],
              }
              const d = m[e.key]
              if (!d) return
              e.preventDefault()
              onSelect(r.key)
              onDrag(r.key, 'move', d[0], d[1], true)
              onDragEnd?.()
            }}
          >
            <span className="stage-label">
              {r.label}
              {r.sub && <small>{r.sub}</small>}
            </span>
            <span className="stage-handle" onPointerDown={(e) => start(e, r.key, 'resize')} />
          </div>
        )
      })}
    </div>
  )
}
