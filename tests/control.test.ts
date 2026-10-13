import { describe, expect, it } from 'vitest'
import { Animator } from '../src/main/animator'
import { Control } from '../src/main/control'
import { Store } from '../src/main/store'
import { SimSwitcher } from '../src/main/switcher'

const cut = { durationMs: 0, rate: 50, easing: { family: 'linear', direction: 'in' } as const }

function setup() {
  const store = new Store('/nonexistent')
  store.save = async () => {}
  const control = new Control(store, new Animator(), () => new SimSwitcher())
  return { control, store }
}

describe('Control with the simulator', () => {
  it('moves a SuperSource to a saved preset by name', async () => {
    const { control } = setup()
    await control.connect('simulator')
    const boxes = control.snapshot().superSources[0].map((b) => ({ ...b, x: b.x + 1 }))
    control.savePreset({ id: 'p1', kind: 'supersource', name: 'Shifted', boxes })
    expect(await control.recall('shifted', { ssrc: 0 }, cut)).toBe(true)
    expect(control.snapshot().superSources[0].map((b) => b.x)).toEqual(boxes.map((b) => b.x))
  })

  it('moves a keyer DVE', async () => {
    const { control } = setup()
    await control.connect('simulator')
    await control.moveDve(1, 0, { positionX: -5, positionY: 2, sizeX: 0.5, sizeY: 0.5, rotation: 0 }, cut)
    expect(control.snapshot().keyers[1].dve.positionX).toBe(-5)
  })

  it('reports an unknown preset', async () => {
    const { control } = setup()
    await control.connect('simulator')
    expect(await control.recall('nope', {})).toBe(false)
  })
})
