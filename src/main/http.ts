/**
 * Local HTTP control so Bitfocus Companion (Generic HTTP) or any script can
 * trigger presets:
 *
 *   GET /recall?preset=<name|id>&ssrc=0
 *   GET /recall?preset=<name|id>&me=0&keyer=0&duration=800&easing=cubic-inOut
 *   GET /presets
 *
 * Listens on 127.0.0.1 only unless the user binds it wider in the settings.
 */

import http from 'node:http'
import { EASE_DIRECTIONS, EASE_FAMILIES, type EaseDirection, type EaseFamily } from '../shared/easing'
import type { MoveOptions } from '../shared/model'
import type { Control } from './control'

export function parseMove(q: URLSearchParams): Partial<MoveOptions> {
  const o: Partial<MoveOptions> = {}
  const d = Number(q.get('duration'))
  if (q.has('duration') && Number.isFinite(d) && d >= 0) o.durationMs = Math.min(d, 60000)
  const r = Number(q.get('rate'))
  if (q.has('rate') && Number.isFinite(r) && r >= 1) o.rate = Math.min(r, 100)
  const e = q.get('easing')
  if (e) {
    const [family, direction = 'inOut'] = e.split('-') as [EaseFamily, EaseDirection?]
    if (EASE_FAMILIES.includes(family) && EASE_DIRECTIONS.includes(direction)) {
      o.easing = { family, direction }
    }
  }
  return o
}

const int = (v: string | null) => (v === null ? undefined : Number.parseInt(v, 10) || 0)

export function startHttp(control: Control, port: number, host = '127.0.0.1') {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const reply = (code: number, body: unknown) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (url.pathname === '/presets') {
      return reply(
        200,
        control.store.data.presets.map((p) => ({ id: p.id, name: p.name, kind: p.kind })),
      )
    }
    if (url.pathname === '/recall') {
      const ref = url.searchParams.get('preset')
      if (!ref) return reply(400, { error: 'preset missing' })
      if (!control.findPreset(ref)) return reply(404, { error: 'unknown preset' })
      const q = url.searchParams
      void control.recall(ref, { ssrc: int(q.get('ssrc')), me: int(q.get('me')), keyer: int(q.get('keyer')) }, parseMove(q))
      return reply(200, { ok: true })
    }
    reply(404, { error: 'not found' })
  })
  server.listen(port, host)
  return server
}
