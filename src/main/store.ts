/** Presets and settings as one JSON file in the user data folder. */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DEFAULT_EASING, type Easing } from '../shared/easing'
import { DEFAULT_MOVE, type MoveOptions, type Preset } from '../shared/model'

export interface Settings {
  host: string
  move: MoveOptions
  /** Local HTTP control (for Companion / Stream Deck); 0 = off. */
  httpPort: number
}

export interface StoreData {
  settings: Settings
  presets: Preset[]
}

export const DEFAULT_DATA: StoreData = {
  settings: { host: '', move: { ...DEFAULT_MOVE, easing: DEFAULT_EASING as Easing }, httpPort: 0 },
  presets: [],
}

export class Store {
  data: StoreData = structuredClone(DEFAULT_DATA)
  private file: string
  private writing: Promise<void> = Promise.resolve()

  constructor(dir: string) {
    this.file = path.join(dir, 'lz-switcher-motion.json')
  }

  async load() {
    try {
      const raw = JSON.parse(await fs.readFile(this.file, 'utf8')) as Partial<StoreData>
      this.data = {
        settings: { ...DEFAULT_DATA.settings, ...raw.settings },
        presets: Array.isArray(raw.presets) ? raw.presets : [],
      }
    } catch {
      // First start or unreadable file: keep the defaults.
    }
  }

  save() {
    const json = JSON.stringify(this.data, null, 2)
    this.writing = this.writing.then(async () => {
      const tmp = `${this.file}.tmp`
      await fs.mkdir(path.dirname(this.file), { recursive: true })
      await fs.writeFile(tmp, json)
      await fs.rename(tmp, this.file)
    })
    return this.writing
  }
}
