import { describe, expect, it } from 'vitest'
import { boxRect, clampBox, fromRawBox, fromRawDve, toRawBox, toRawDve, type SsBox } from '../src/shared/model'

const box: SsBox = {
  enabled: true, source: 1, x: -8, y: 4.5, size: 0.5,
  cropped: false, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
}

describe('protocol units', () => {
  it('converts SuperSource boxes both ways', () => {
    const raw = toRawBox(box)
    expect(raw).toMatchObject({ x: -800, y: 450, size: 500 })
    expect(fromRawBox(raw as never)).toEqual(box)
  })

  it('sends only the fields given', () => {
    expect(toRawBox({ x: 1.234 })).toEqual({ x: 123 })
  })

  it('converts DVE values both ways', () => {
    const d = { positionX: 8, positionY: -4.5, sizeX: 0.33, sizeY: 0.33, rotation: 45 }
    expect(toRawDve(d)).toEqual({ positionX: 8000, positionY: -4500, sizeX: 330, sizeY: 330, rotation: 450 })
    expect(fromRawDve(toRawDve(d) as never)).toEqual(d)
  })
})

describe('geometry', () => {
  it('a quad box fills the top-left quarter', () => {
    expect(boxRect(box)).toEqual({ left: -16, top: 9, width: 16, height: 9 })
  })

  it('crop narrows the visible rectangle', () => {
    const r = boxRect({ ...box, x: -8, y: 0, size: 1, cropped: true, cropLeft: 8, cropRight: 8 })
    expect(r).toEqual({ left: -16, top: 9, width: 16, height: 18 })
  })

  it('crop values are ignored while crop is off', () => {
    expect(boxRect({ ...box, cropLeft: 8 }).width).toBe(16)
  })

  it('clamps to the switcher limits', () => {
    const c = clampBox({ ...box, size: 3, x: 99, cropTop: -1 })
    expect(c).toMatchObject({ size: 1, x: 48, cropTop: 0 })
  })
})
