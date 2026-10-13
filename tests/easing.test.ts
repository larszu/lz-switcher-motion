import { describe, expect, it } from 'vitest'
import { EASE_DIRECTIONS, EASE_FAMILIES, ease } from '../src/shared/easing'

describe('easing', () => {
  it('every curve starts at 0 and ends at 1', () => {
    for (const family of EASE_FAMILIES)
      for (const direction of EASE_DIRECTIONS) {
        expect(ease({ family, direction }, 0)).toBeCloseTo(0, 6)
        expect(ease({ family, direction }, 1)).toBeCloseTo(1, 6)
      }
  })

  it('in-out is symmetric around the middle', () => {
    for (const family of EASE_FAMILIES) {
      const e = { family, direction: 'inOut' as const }
      expect(ease(e, 0.5)).toBeCloseTo(0.5, 6)
      expect(ease(e, 0.2) + ease(e, 0.8)).toBeCloseTo(1, 6)
    }
  })

  it('quadratic ease-in matches t²', () => {
    expect(ease({ family: 'quad', direction: 'in' }, 0.5)).toBeCloseTo(0.25)
    expect(ease({ family: 'quad', direction: 'out' }, 0.5)).toBeCloseTo(0.75)
  })

  it('back overshoots, cubic does not', () => {
    const back = Array.from({ length: 101 }, (_, i) => ease({ family: 'back', direction: 'out' }, i / 100))
    expect(Math.max(...back)).toBeGreaterThan(1)
    const cubic = Array.from({ length: 101 }, (_, i) => ease({ family: 'cubic', direction: 'out' }, i / 100))
    expect(Math.max(...cubic)).toBeLessThanOrEqual(1)
  })

  it('clamps progress outside 0…1', () => {
    expect(ease({ family: 'linear', direction: 'in' }, -1)).toBe(0)
    expect(ease({ family: 'linear', direction: 'in' }, 2)).toBe(1)
  })
})
