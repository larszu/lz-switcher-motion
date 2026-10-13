/**
 * One switcher connection — a real one over atem-connection, or a simulator
 * with the same surface so the app can be tried without hardware.
 */

import { EventEmitter } from 'node:events'
import { Atem, AtemConnectionStatus } from 'atem-connection'
import {
  EMPTY_SNAPSHOT,
  fromRawBox,
  fromRawDve,
  toRawBox,
  toRawDve,
  type Dve,
  type RawSsBox,
  type Snapshot,
  type SsBox,
} from '../shared/model'

export interface Switcher extends EventEmitter {
  snapshot(): Snapshot
  setBox(ssrc: number, box: number, props: Partial<SsBox>): Promise<void>
  setDve(me: number, keyer: number, props: Partial<Dve>): Promise<void>
  disconnect(): Promise<void>
}

const OFF_BOX: SsBox = {
  enabled: false,
  source: 0,
  x: 0,
  y: 0,
  size: 0.5,
  cropped: false,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
}

export class AtemSwitcher extends EventEmitter implements Switcher {
  private atem = new Atem()
  private status: Snapshot['status'] = 'connecting'

  constructor(private host: string) {
    super()
    this.atem.on('connected', () => {
      this.status = 'connected'
      this.emit('change')
    })
    this.atem.on('disconnected', () => {
      this.status = 'connecting'
      this.emit('change')
    })
    this.atem.on('stateChanged', () => this.emit('change'))
    this.atem.on('error', (e) => this.emit('log', String(e)))
    void this.atem.connect(host)
  }

  snapshot(): Snapshot {
    const s = this.atem.state
    if (!s || this.atem.status !== AtemConnectionStatus.CONNECTED) {
      return { ...EMPTY_SNAPSHOT, status: this.status, host: this.host }
    }
    const inputs = Object.values(s.inputs)
      .filter((i): i is NonNullable<typeof i> => !!i)
      .map((i) => ({ id: i.inputId, longName: i.longName, shortName: i.shortName }))
    const superSources = s.video.superSources
      .filter((ss): ss is NonNullable<typeof ss> => !!ss)
      .map((ss) => ss.boxes.map((b) => (b ? fromRawBox(b as RawSsBox) : { ...OFF_BOX })))
    const keyers: Snapshot['keyers'] = []
    s.video.mixEffects.forEach((me, meIdx) => {
      me?.upstreamKeyers.forEach((k, kIdx) => {
        if (k?.dveSettings) {
          keyers.push({ me: meIdx, keyer: kIdx, dve: fromRawDve(k.dveSettings), onAir: k.onAir })
        }
      })
    })
    return {
      status: 'connected',
      simulated: false,
      host: this.host,
      model: s.info.productIdentifier ?? '',
      inputs,
      superSources,
      keyers,
    }
  }

  async setBox(ssrc: number, box: number, props: Partial<SsBox>) {
    await this.atem.setSuperSourceBoxSettings(toRawBox(props), box, ssrc)
  }

  async setDve(me: number, keyer: number, props: Partial<Dve>) {
    await this.atem.setUpstreamKeyerDVESettings(toRawDve(props), me, keyer)
  }

  async disconnect() {
    await this.atem.disconnect().catch(() => undefined)
    await this.atem.destroy().catch(() => undefined)
  }
}

/** A 2 M/E-sized fake: two SuperSources, eight inputs, one keyer per M/E. */
export class SimSwitcher extends EventEmitter implements Switcher {
  private state: Snapshot

  constructor() {
    super()
    const inputs = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      longName: `Camera ${i + 1}`,
      shortName: `CAM${i + 1}`,
    }))
    inputs.push({ id: 3010, longName: 'Media Player 1', shortName: 'MP1' })
    const quad = (): SsBox[] =>
      [
        [-8, 4.5],
        [8, 4.5],
        [-8, -4.5],
        [8, -4.5],
      ].map(([x, y], i) => ({ ...OFF_BOX, enabled: true, source: i + 1, x, y, size: 0.5 }))
    this.state = {
      status: 'connected',
      simulated: true,
      host: 'simulator',
      model: 'Simulator (2 M/E)',
      inputs,
      superSources: [quad(), quad()],
      keyers: [0, 1].map((me) => ({
        me,
        keyer: 0,
        onAir: false,
        dve: { positionX: 8, positionY: 4.5, sizeX: 0.33, sizeY: 0.33, rotation: 0 },
      })),
    }
  }

  snapshot() {
    return structuredClone(this.state)
  }

  async setBox(ssrc: number, box: number, props: Partial<SsBox>) {
    const boxes = this.state.superSources[ssrc]
    if (!boxes?.[box]) return
    // Round-trip through the protocol units, as the real switcher would.
    const raw = toRawBox({ ...boxes[box], ...props }) as RawSsBox
    boxes[box] = fromRawBox(raw)
    this.emit('change')
  }

  async setDve(me: number, keyer: number, props: Partial<Dve>) {
    const k = this.state.keyers.find((x) => x.me === me && x.keyer === keyer)
    if (!k) return
    k.dve = fromRawDve(toRawDve({ ...k.dve, ...props }) as Dve)
    this.emit('change')
  }

  async disconnect() {}
}
