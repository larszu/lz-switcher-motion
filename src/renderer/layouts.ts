/**
 * Built-in SuperSource layouts. They set geometry only and keep each box's
 * source, so a layout works with whatever is already routed. Box 1 is
 * front-most on the switcher, so a picture-in-picture uses box 1 as the inset.
 */

import type { SsBox } from '../shared/model'

type Geo = Pick<SsBox, 'enabled' | 'x' | 'y' | 'size' | 'cropped'> &
  Partial<Pick<SsBox, 'cropTop' | 'cropBottom' | 'cropLeft' | 'cropRight'>>

const off = (x: number, y: number): Geo => ({ enabled: false, x, y, size: 0.5, cropped: false })
const on = (x: number, y: number, size: number): Geo => ({ enabled: true, x, y, size, cropped: false })

export const LAYOUTS: { name: string; boxes: Geo[] }[] = [
  { name: 'Quad', boxes: [on(-8, 4.5, 0.5), on(8, 4.5, 0.5), on(-8, -4.5, 0.5), on(8, -4.5, 0.5)] },
  {
    name: 'Side by side',
    // Two half-width pictures, cropped left and right to keep 16:9 sources
    // at full height inside half the frame.
    boxes: [
      { ...on(-8, 0, 1), cropped: true, cropTop: 0, cropBottom: 0, cropLeft: 8, cropRight: 8 },
      { ...on(8, 0, 1), cropped: true, cropTop: 0, cropBottom: 0, cropLeft: 8, cropRight: 8 },
      off(-8, -4.5),
      off(8, -4.5),
    ],
  },
  { name: 'PiP top right', boxes: [on(10.4, 5.85, 0.3), on(0, 0, 1), off(-8, -4.5), off(8, -4.5)] },
  {
    name: 'One plus three',
    boxes: [on(-5.4, 0, 0.66), on(10.88, 6, 0.32), on(10.88, 0, 0.32), on(10.88, -6, 0.32)],
  },
  {
    name: 'Fly out',
    boxes: [on(-40, 4.5, 0.5), on(40, 4.5, 0.5), on(-40, -4.5, 0.5), on(40, -4.5, 0.5)],
  },
]

export function applyLayout(current: SsBox[], geo: Geo[]): SsBox[] {
  return current.map((b, i) => {
    const g = geo[i]
    if (!g) return b
    return {
      ...b,
      ...g,
      cropTop: g.cropTop ?? b.cropTop,
      cropBottom: g.cropBottom ?? b.cropBottom,
      cropLeft: g.cropLeft ?? b.cropLeft,
      cropRight: g.cropRight ?? b.cropRight,
    }
  })
}
