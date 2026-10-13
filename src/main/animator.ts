/**
 * Runs moves frame by frame. One running move per target (a SuperSource box
 * or a keyer); starting a new move on a target stops the old one where it is,
 * so a quick second click carries on from the current position instead of
 * jumping.
 */

import type { Dve, MoveOptions, SsBox } from '../shared/model'
import { diff, frameCount, frameProgress, tweenBox, tweenDve } from '../shared/tween'

export interface Clock {
  now(): number
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(h: unknown): void
}

export const realClock: Clock = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
}

interface Running {
  timer: unknown
  current: object
  resolve: () => void
}

export class Animator {
  private running = new Map<string, Running>()

  constructor(private clock: Clock = realClock) {}

  isRunning(key: string) {
    return this.running.has(key)
  }

  /** Last value sent for a target while a move runs (to continue from). */
  current<T>(key: string): T | undefined {
    return this.running.get(key)?.current as T | undefined
  }

  stop(key: string) {
    const r = this.running.get(key)
    if (!r) return
    this.clock.clearTimeout(r.timer)
    this.running.delete(key)
    r.resolve()
  }

  stopAll() {
    for (const key of [...this.running.keys()]) this.stop(key)
  }

  moveBox(key: string, from: SsBox, to: SsBox, opt: MoveOptions, send: (p: Partial<SsBox>) => unknown) {
    return this.run(key, from, to, opt, tweenBox, send)
  }

  moveDve(key: string, from: Dve, to: Dve, opt: MoveOptions, send: (p: Partial<Dve>) => unknown) {
    return this.run(key, from, to, opt, tweenDve, send)
  }

  private run<T extends object>(
    key: string,
    fromIn: T,
    to: T,
    opt: MoveOptions,
    tween: (a: T, b: T, k: number, last: boolean) => T,
    send: (p: Partial<T>) => unknown,
  ): Promise<void> {
    const from = this.current<T>(key) ?? fromIn
    this.stop(key)
    const n = frameCount(opt.durationMs, opt.rate)
    let prev = from
    return new Promise<void>((resolve) => {
      const r: Running = { timer: undefined, current: from, resolve }
      this.running.set(key, r)
      const start = this.clock.now()
      const frameMs = 1000 / opt.rate
      let i = 0
      const step = () => {
        if (this.running.get(key) !== r) return
        // Frames follow the clock, not a counter: a late timer skips ahead
        // instead of stretching the move.
        i = n === 0 ? 0 : Math.min(n, Math.max(i + 1, Math.round((this.clock.now() - start) / frameMs)))
        const last = i >= n
        const next = tween(from, to, frameProgress(i, n, opt.easing), last)
        const d = diff(prev, next)
        if (Object.keys(d).length) void Promise.resolve(send(d)).catch(() => undefined)
        prev = next
        r.current = next
        if (last) {
          this.running.delete(key)
          resolve()
          return
        }
        const due = start + (i + 1) * frameMs
        r.timer = this.clock.setTimeout(step, Math.max(0, due - this.clock.now()))
      }
      step()
    })
  }
}
