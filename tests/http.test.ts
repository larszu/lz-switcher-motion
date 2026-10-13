import { describe, expect, it } from 'vitest'
import { parseMove } from '../src/main/http'

describe('parseMove', () => {
  it('reads duration, rate and easing', () => {
    expect(parseMove(new URLSearchParams('duration=800&rate=25&easing=back-out'))).toEqual({
      durationMs: 800,
      rate: 25,
      easing: { family: 'back', direction: 'out' },
    })
  })
  it('ignores unknown curves and bad numbers', () => {
    expect(parseMove(new URLSearchParams('duration=x&easing=wobble-in'))).toEqual({})
  })
  it('defaults the direction to in-out', () => {
    expect(parseMove(new URLSearchParams('easing=sine')).easing).toEqual({ family: 'sine', direction: 'inOut' })
  })
})
