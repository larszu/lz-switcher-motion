/**
 * What the app does, independent of Electron: holds the connection, the
 * presets and the running moves. The IPC layer and the HTTP control both
 * call into this.
 */

import { EventEmitter } from 'node:events'
import type { Dve, DvePreset, MoveOptions, Preset, SsBox, SsPreset } from '../shared/model'
import { Animator } from './animator'
import type { Store } from './store'
import { AtemSwitcher, SimSwitcher, type Switcher } from './switcher'
import { EMPTY_SNAPSHOT } from '../shared/model'

export class Control extends EventEmitter {
  switcher: Switcher | null = null
  readonly animator: Animator

  constructor(
    readonly store: Store,
    animator = new Animator(),
    private makeSwitcher = (host: string): Switcher =>
      host === 'simulator' ? new SimSwitcher() : new AtemSwitcher(host),
  ) {
    super()
    this.animator = animator
  }

  snapshot() {
    return this.switcher?.snapshot() ?? EMPTY_SNAPSHOT
  }

  async connect(host: string) {
    await this.disconnect()
    const sw = this.makeSwitcher(host)
    this.switcher = sw
    sw.on('change', () => this.emit('change'))
    sw.on('log', (m: string) => this.emit('log', m))
    this.store.data.settings.host = host
    void this.store.save()
    this.emit('change')
  }

  async disconnect() {
    this.animator.stopAll()
    const sw = this.switcher
    this.switcher = null
    if (sw) {
      sw.removeAllListeners()
      await sw.disconnect()
    }
    this.emit('change')
  }

  /** Direct set from the editor; cancels a move running on that box. */
  async setBox(ssrc: number, box: number, props: Partial<SsBox>) {
    this.animator.stop(boxKey(ssrc, box))
    await this.switcher?.setBox(ssrc, box, props)
  }

  async setDve(me: number, keyer: number, props: Partial<Dve>) {
    this.animator.stop(dveKey(me, keyer))
    await this.switcher?.setDve(me, keyer, props)
  }

  /** Move all four boxes of a SuperSource to a layout. */
  async moveSuperSource(ssrc: number, boxes: SsBox[], opt: MoveOptions = this.store.data.settings.move) {
    const sw = this.switcher
    const current = sw?.snapshot().superSources[ssrc]
    if (!sw || !current) return
    await Promise.all(
      boxes.slice(0, 4).map((to, i) =>
        this.animator.moveBox(boxKey(ssrc, i), current[i], to, opt, (p) => sw.setBox(ssrc, i, p)),
      ),
    )
  }

  async moveDve(me: number, keyer: number, to: Dve, opt: MoveOptions = this.store.data.settings.move) {
    const sw = this.switcher
    const current = sw?.snapshot().keyers.find((k) => k.me === me && k.keyer === keyer)
    if (!sw || !current) return
    await this.animator.moveDve(dveKey(me, keyer), current.dve, to, opt, (p) => sw.setDve(me, keyer, p))
  }

  /** Recall a preset by id or by name (names are what Companion sends). */
  async recall(ref: string, target: { ssrc?: number; me?: number; keyer?: number }, opt?: Partial<MoveOptions>) {
    const p = this.findPreset(ref)
    if (!p) return false
    const o = { ...this.store.data.settings.move, ...opt }
    if (p.kind === 'supersource') await this.moveSuperSource(target.ssrc ?? 0, p.boxes, o)
    else await this.moveDve(target.me ?? 0, target.keyer ?? 0, p.dve, o)
    return true
  }

  findPreset(ref: string): Preset | undefined {
    const ps = this.store.data.presets
    const lower = ref.toLowerCase()
    return ps.find((p) => p.id === ref) ?? ps.find((p) => p.name.toLowerCase() === lower)
  }

  savePreset(p: SsPreset | DvePreset) {
    const ps = this.store.data.presets
    const i = ps.findIndex((x) => x.id === p.id)
    if (i >= 0) ps[i] = p
    else ps.push(p)
    void this.store.save()
    this.emit('presets')
  }

  deletePreset(id: string) {
    this.store.data.presets = this.store.data.presets.filter((p) => p.id !== id)
    void this.store.save()
    this.emit('presets')
  }

  setMove(m: MoveOptions) {
    this.store.data.settings.move = m
    void this.store.save()
  }
}

export const boxKey = (ssrc: number, box: number) => `ss:${ssrc}:${box}`
export const dveKey = (me: number, keyer: number) => `dve:${me}:${keyer}`
