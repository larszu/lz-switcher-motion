import { describe, expect, it } from 'vitest'
import { Animator, type Clock } from '../src/main/animator'
import type { SsBox } from '../src/shared/model'
import { tweenBox } from '../src/shared/tween'

/** A clock that only moves when the test says so. */
function fakeClock() {
  let now = 0
  let queue: { at: number; fn: () => void; id: number }[] = []
  let nextId = 1
  const clock: Clock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = nextId++
      queue.push({ at: now + ms, fn, id })
      return id
    },
    clearTimeout: (h) => {
      queue = queue.filter((q) => q.id !== h)
    },
  }
  const advance = (ms: number) => {
    const end = now + ms
    for (;;) {
      queue.sort((a, b) => a.at - b.at)
      const q = queue[0]
      if (!q || q.at > end) break
      queue.shift()
      now = q.at
      q.fn()
    }
    now = end
  }
  return { clock, advance }
}

const A: SsBox = {
  enabled: true, source: 1, x: 0, y: 0, size: 0.5,
  cropped: false, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
}
const B: SsBox = { ...A, x: 10, size: 1 }
const linear = { family: 'linear', direction: 'in' } as const

describe('Animator', () => {
  it('sends one update per frame and ends exactly on the target', async () => {
    const { clock, advance } = fakeClock()
    const sent: Partial<SsBox>[] = []
    const done = new Animator(clock).moveBox('b', A, B, { durationMs: 100, rate: 50, easing: linear }, (p) => sent.push(p))
    advance(200)
    await done
    expect(sent).toHaveLength(5)
    expect(sent[0]).toEqual({ x: 2, size: 0.6 })
    expect(sent.at(-1)).toEqual({ x: 10, size: 1 })
  })

  it('duration 0 is a cut', async () => {
    const { clock } = fakeClock()
    const sent: Partial<SsBox>[] = []
    await new Animator(clock).moveBox('b', A, B, { durationMs: 0, rate: 50, easing: linear }, (p) => sent.push(p))
    expect(sent).toEqual([{ x: 10, size: 1 }])
  })

  it('a late timer skips frames instead of stretching the move', async () => {
    const { clock, advance } = fakeClock()
    const sent: Partial<SsBox>[] = []
    const done = new Animator(clock).moveBox('b', A, B, { durationMs: 1000, rate: 50, easing: linear }, (p) => sent.push(p))
    advance(1000)
    await done
    expect(sent.at(-1)).toMatchObject({ x: 10 })
  })

  it('a second move continues from where the first one stopped', async () => {
    const { clock, advance } = fakeClock()
    const anim = new Animator(clock)
    const sent: Partial<SsBox>[] = []
    void anim.moveBox('b', A, B, { durationMs: 100, rate: 50, easing: linear }, (p) => sent.push(p))
    advance(40) // frames 1 and 2: x = 2, 4
    const back = anim.moveBox('b', B, A, { durationMs: 40, rate: 50, easing: linear }, (p) => sent.push(p))
    advance(100)
    await back
    // From x = 4 (not from B's x = 10) back to 0 in two frames.
    expect(sent.slice(2).map((p) => p.x)).toEqual([2, 0])
  })

  it('stop() halts a move', async () => {
    const { clock, advance } = fakeClock()
    const anim = new Animator(clock)
    const sent: unknown[] = []
    const p = anim.moveBox('b', A, B, { durationMs: 100, rate: 50, easing: linear }, (x) => sent.push(x))
    anim.stop('b')
    advance(200)
    await p
    expect(sent).toHaveLength(1)
    expect(anim.isRunning('b')).toBe(false)
  })
})

describe('tweenBox', () => {
  it('shows a box on the first frame and hides it on the last', () => {
    const off = { ...A, enabled: false }
    expect(tweenBox(off, A, 0.1, false).enabled).toBe(true)
    expect(tweenBox(A, off, 0.9, false).enabled).toBe(true)
    expect(tweenBox(A, off, 1, true).enabled).toBe(false)
  })

  it('grows a crop from zero when crop switches on', () => {
    const cropped = { ...A, cropped: true, cropLeft: 8 }
    const mid = tweenBox({ ...A, cropLeft: 5 }, cropped, 0.5, false)
    expect(mid.cropped).toBe(true)
    expect(mid.cropLeft).toBe(4)
  })
})
