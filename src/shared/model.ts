/**
 * The app's model, in the units the switcher's own control software shows.
 *
 * The protocol carries integers (SuperSource x in hundredths, size in
 * thousandths, DVE position in thousandths …). Presets and the UI keep the
 * human values so a preset file stays readable; conversion happens only at
 * the edge, in `toRaw*` / `fromRaw*`.
 *
 * Frame geometry: the visible picture spans x −16…16 and y −9…9, y pointing
 * up. A SuperSource box of size 1 fills the picture (32 × 18 units). Crop is
 * measured on the source picture at full size: top/bottom 0…18, left/right
 * 0…32.
 */

import type { Easing } from './easing'

export const FRAME_W = 32
export const FRAME_H = 18

export interface SsBox {
  enabled: boolean
  source: number
  x: number
  y: number
  size: number
  cropped: boolean
  cropTop: number
  cropBottom: number
  cropLeft: number
  cropRight: number
}

export interface Dve {
  positionX: number
  positionY: number
  sizeX: number
  sizeY: number
  rotation: number
}

export const LIMITS = {
  ssX: [-48, 48],
  ssY: [-27, 27],
  ssSize: [0.07, 1],
  cropV: [0, 18],
  cropH: [0, 32],
  dvePos: [-1000, 1000],
  dveSize: [0, 99.99],
  dveRot: [-3600, 3600],
} as const

export function clamp(v: number, [lo, hi]: readonly [number, number]): number {
  return Math.min(hi, Math.max(lo, v))
}

export function clampBox(b: SsBox): SsBox {
  return {
    ...b,
    x: clamp(b.x, LIMITS.ssX),
    y: clamp(b.y, LIMITS.ssY),
    size: clamp(b.size, LIMITS.ssSize),
    cropTop: clamp(b.cropTop, LIMITS.cropV),
    cropBottom: clamp(b.cropBottom, LIMITS.cropV),
    cropLeft: clamp(b.cropLeft, LIMITS.cropH),
    cropRight: clamp(b.cropRight, LIMITS.cropH),
  }
}

export function clampDve(d: Dve): Dve {
  return {
    positionX: clamp(d.positionX, LIMITS.dvePos),
    positionY: clamp(d.positionY, LIMITS.dvePos),
    sizeX: clamp(d.sizeX, LIMITS.dveSize),
    sizeY: clamp(d.sizeY, LIMITS.dveSize),
    rotation: clamp(d.rotation, LIMITS.dveRot),
  }
}

// ── Raw protocol units (atem-connection) ────────────────────────────────

export interface RawSsBox {
  enabled: boolean
  source: number
  x: number
  y: number
  size: number
  cropped: boolean
  cropTop: number
  cropBottom: number
  cropLeft: number
  cropRight: number
}

export function toRawBox(b: Partial<SsBox>): Partial<RawSsBox> {
  const r: Partial<RawSsBox> = {}
  if (b.enabled !== undefined) r.enabled = b.enabled
  if (b.source !== undefined) r.source = b.source
  if (b.cropped !== undefined) r.cropped = b.cropped
  if (b.x !== undefined) r.x = Math.round(b.x * 100)
  if (b.y !== undefined) r.y = Math.round(b.y * 100)
  if (b.size !== undefined) r.size = Math.round(b.size * 1000)
  if (b.cropTop !== undefined) r.cropTop = Math.round(b.cropTop * 1000)
  if (b.cropBottom !== undefined) r.cropBottom = Math.round(b.cropBottom * 1000)
  if (b.cropLeft !== undefined) r.cropLeft = Math.round(b.cropLeft * 1000)
  if (b.cropRight !== undefined) r.cropRight = Math.round(b.cropRight * 1000)
  return r
}

export function fromRawBox(r: RawSsBox): SsBox {
  return {
    enabled: r.enabled,
    source: r.source,
    cropped: r.cropped,
    x: r.x / 100,
    y: r.y / 100,
    size: r.size / 1000,
    cropTop: r.cropTop / 1000,
    cropBottom: r.cropBottom / 1000,
    cropLeft: r.cropLeft / 1000,
    cropRight: r.cropRight / 1000,
  }
}

export function toRawDve(d: Partial<Dve>): Partial<Dve> {
  const r: Partial<Dve> = {}
  if (d.positionX !== undefined) r.positionX = Math.round(d.positionX * 1000)
  if (d.positionY !== undefined) r.positionY = Math.round(d.positionY * 1000)
  if (d.sizeX !== undefined) r.sizeX = Math.round(d.sizeX * 1000)
  if (d.sizeY !== undefined) r.sizeY = Math.round(d.sizeY * 1000)
  if (d.rotation !== undefined) r.rotation = Math.round(d.rotation * 10)
  return r
}

export function fromRawDve(r: Dve): Dve {
  return {
    positionX: r.positionX / 1000,
    positionY: r.positionY / 1000,
    sizeX: r.sizeX / 1000,
    sizeY: r.sizeY / 1000,
    rotation: r.rotation / 10,
  }
}

// ── Geometry for drawing ────────────────────────────────────────────────

/** Visible rectangle of a box in frame units (left, top, width, height; y up). */
export function boxRect(b: SsBox): { left: number; top: number; width: number; height: number } {
  const s = b.size
  const c = b.cropped
    ? b
    : { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 }
  const left = b.x + (-FRAME_W / 2 + c.cropLeft) * s
  const right = b.x + (FRAME_W / 2 - c.cropRight) * s
  const top = b.y + (FRAME_H / 2 - c.cropTop) * s
  const bottom = b.y + (-FRAME_H / 2 + c.cropBottom) * s
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, top - bottom) }
}

/** DVE picture rectangle in frame units. */
export function dveRect(d: Dve): { left: number; top: number; width: number; height: number } {
  const w = FRAME_W * d.sizeX
  const h = FRAME_H * d.sizeY
  return { left: d.positionX - w / 2, top: d.positionY + h / 2, width: w, height: h }
}

// ── Switcher snapshot sent to the UI ────────────────────────────────────

export interface InputInfo {
  id: number
  longName: string
  shortName: string
}

export interface KeyerRef {
  me: number
  keyer: number
}

export interface Snapshot {
  status: 'disconnected' | 'connecting' | 'connected'
  simulated: boolean
  host: string
  model: string
  inputs: InputInfo[]
  /** One entry per SuperSource, four boxes each. */
  superSources: SsBox[][]
  /** Upstream keyers with their DVE settings, flattened. */
  keyers: (KeyerRef & { dve: Dve; onAir: boolean })[]
}

export const EMPTY_SNAPSHOT: Snapshot = {
  status: 'disconnected',
  simulated: false,
  host: '',
  model: '',
  inputs: [],
  superSources: [],
  keyers: [],
}

// ── Presets and moves ───────────────────────────────────────────────────

export interface SsPreset {
  id: string
  kind: 'supersource'
  name: string
  boxes: SsBox[]
}

export interface DvePreset {
  id: string
  kind: 'dve'
  name: string
  dve: Dve
}

export type Preset = SsPreset | DvePreset

export interface MoveOptions {
  durationMs: number
  easing: Easing
  /** Updates per second sent to the switcher. */
  rate: number
}

export const DEFAULT_MOVE: Omit<MoveOptions, 'easing'> = { durationMs: 1000, rate: 50 }
