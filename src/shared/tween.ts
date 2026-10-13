/**
 * Frame-by-frame moves between two states.
 *
 * Numbers are interpolated; switches that cannot be interpolated follow one
 * rule: whatever makes the box visible happens on the first frame (enable,
 * new source, crop on), whatever hides it happens on the last (disable, crop
 * off). So a box flying in is visible from the start and a box flying out
 * stays visible until it has left.
 */

import { ease, type Easing } from './easing'
import type { Dve, SsBox } from './model'

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

const BOX_NUMS = ['x', 'y', 'size', 'cropTop', 'cropBottom', 'cropLeft', 'cropRight'] as const
const DVE_NUMS = ['positionX', 'positionY', 'sizeX', 'sizeY', 'rotation'] as const

export function tweenBox(from: SsBox, to: SsBox, k: number, last: boolean): SsBox {
  const out = { ...from }
  for (const key of BOX_NUMS) out[key] = last ? to[key] : lerp(from[key], to[key], k)
  out.enabled = last ? to.enabled : from.enabled || to.enabled
  out.source = to.source
  out.cropped = last ? to.cropped : from.cropped || to.cropped
  // Crop off at the start but on at the end: animate from zero crop.
  if (!from.cropped && to.cropped && !last) {
    out.cropTop = lerp(0, to.cropTop, k)
    out.cropBottom = lerp(0, to.cropBottom, k)
    out.cropLeft = lerp(0, to.cropLeft, k)
    out.cropRight = lerp(0, to.cropRight, k)
  } else if (from.cropped && !to.cropped && !last) {
    out.cropTop = lerp(from.cropTop, 0, k)
    out.cropBottom = lerp(from.cropBottom, 0, k)
    out.cropLeft = lerp(from.cropLeft, 0, k)
    out.cropRight = lerp(from.cropRight, 0, k)
  }
  return out
}

export function tweenDve(from: Dve, to: Dve, k: number, last: boolean): Dve {
  const out = { ...from }
  for (const key of DVE_NUMS) out[key] = last ? to[key] : lerp(from[key], to[key], k)
  return out
}

/** Only the fields that differ, so each frame sends the least possible. */
export function diff<T extends object>(prev: T, next: T): Partial<T> {
  const d: Partial<T> = {}
  for (const k of Object.keys(next) as (keyof T)[]) if (prev[k] !== next[k]) d[k] = next[k]
  return d
}

/** Eased progress for frame i of n (i = n is the last frame, exactly 1). */
export function frameProgress(i: number, n: number, e: Easing): number {
  return n <= 0 ? 1 : ease(e, i / n)
}

export function frameCount(durationMs: number, rate: number): number {
  return Math.max(0, Math.round((durationMs / 1000) * rate))
}
