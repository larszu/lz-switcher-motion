import { useEffect, useMemo, useRef, useState } from 'react'
import {
  boxRect,
  clampBox,
  clampDve,
  dveRect,
  EMPTY_SNAPSHOT,
  FRAME_H,
  FRAME_W,
  type Dve,
  type DvePreset,
  type MoveOptions,
  type Preset,
  type Snapshot,
  type SsBox,
  type SsPreset,
} from '../shared/model'
import { DEFAULT_EASING } from '../shared/easing'
import { getLang, setLang, t } from './i18n'
import { applyLayout, LAYOUTS } from './layouts'
import { MoveBar } from './MoveBar'
import { Stage } from './Stage'

interface Settings {
  host: string
  move: MoveOptions
  httpPort: number
}

interface Api {
  init(): Promise<{ snapshot: Snapshot; presets: Preset[]; settings: Settings; version: string }>
  connect(host: string): Promise<void>
  disconnect(): Promise<void>
  setBox(ssrc: number, box: number, p: Partial<SsBox>): Promise<void>
  setDve(me: number, keyer: number, p: Partial<Dve>): Promise<void>
  moveSuperSource(ssrc: number, boxes: SsBox[], opt?: MoveOptions): Promise<void>
  moveDve(me: number, keyer: number, dve: Dve, opt?: MoveOptions): Promise<void>
  savePreset(p: Preset): Promise<void>
  deletePreset(id: string): Promise<void>
  setMove(m: MoveOptions): Promise<void>
  setHttpPort(p: number): Promise<void>
  onSnapshot(fn: (s: Snapshot) => void): () => void
  onPresets(fn: (p: Preset[]) => void): () => void
  onLog(fn: (m: string) => void): () => void
}

const api = (window as unknown as { lzsm: Api }).lzsm

const snap = (v: number, free: boolean, step = 0.25) => (free ? v : Math.round(v / step) * step)
const newId = () => Math.random().toString(36).slice(2, 10)
const fmt = (v: number, d = 2) => Number(v.toFixed(d))

/** Batches edits to one request per animation frame per target. */
function useFrameSender<T>(send: (key: string, patch: Partial<T>) => void) {
  const pending = useRef(new Map<string, Partial<T>>())
  const raf = useRef(0)
  return (key: string, patch: Partial<T>) => {
    pending.current.set(key, { ...pending.current.get(key), ...patch })
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      for (const [k, p] of pending.current) send(k, p)
      pending.current.clear()
    })
  }
}

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [presets, setPresets] = useState<Preset[]>([])
  const [settings, setSettings] = useState<Settings>({
    host: '',
    move: { durationMs: 1000, rate: 50, easing: DEFAULT_EASING },
    httpPort: 0,
  })
  const [version, setVersion] = useState('')
  const [tab, setTab] = useState<'ss' | 'dve' | 'settings'>('ss')
  const [host, setHost] = useState('')
  const [, rerender] = useState(0)

  useEffect(() => {
    void api.init().then((r) => {
      setSnapshot(r.snapshot)
      setPresets(r.presets)
      setSettings(r.settings)
      setHost(r.settings.host === 'simulator' ? '' : r.settings.host)
      setVersion(r.version)
    })
    const a = api.onSnapshot(setSnapshot)
    const b = api.onPresets(setPresets)
    return () => {
      a()
      b()
    }
  }, [])

  const setMove = (m: MoveOptions) => {
    setSettings((s) => ({ ...s, move: m }))
    void api.setMove(m)
  }

  const statusText =
    snapshot.status === 'connected'
      ? `${t('Connected')} · ${snapshot.model || snapshot.host}`
      : snapshot.status === 'connecting'
        ? t('Connecting…')
        : t('Not connected')

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>LZ Switcher Motion</strong>
          <span className="meta">{version && `v${version}`}</span>
        </div>
        <nav className="tabs" role="tablist">
          {(
            [
              ['ss', 'SuperSource'],
              ['dve', 'Key DVE'],
              ['settings', 'Settings'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>
              {t(label)}
            </button>
          ))}
        </nav>
        <form
          className="connect"
          onSubmit={(e) => {
            e.preventDefault()
            if (host.trim()) void api.connect(host.trim())
          }}
        >
          <span className="status" data-status={snapshot.status}>
            {statusText}
          </span>
          <input
            aria-label={t('Switcher address')}
            placeholder="192.168.10.240"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
          <button className="btn primary" type="submit">
            {t('Connect')}
          </button>
          <button className="btn" type="button" onClick={() => void api.connect('simulator')}>
            {t('Simulator')}
          </button>
          {snapshot.status !== 'disconnected' && (
            <button className="btn ghost" type="button" onClick={() => void api.disconnect()}>
              {t('Disconnect')}
            </button>
          )}
        </form>
      </header>

      {tab === 'settings' ? (
        <SettingsView
          settings={settings}
          onHttp={(p) => {
            setSettings((s) => ({ ...s, httpPort: p }))
            void api.setHttpPort(p)
          }}
          onLang={(l) => {
            setLang(l)
            rerender((x) => x + 1)
          }}
        />
      ) : snapshot.status !== 'connected' ? (
        <div className="empty">
          <p className="kicker">LZ Switcher Motion</p>
          <p>{t('Connect to a switcher or start the simulator.')}</p>
          <button className="btn primary" onClick={() => void api.connect('simulator')}>
            {t('Simulator')}
          </button>
        </div>
      ) : tab === 'ss' ? (
        <SuperSourceView snapshot={snapshot} presets={presets} move={settings.move} onMove={setMove} />
      ) : (
        <DveView snapshot={snapshot} presets={presets} move={settings.move} onMove={setMove} />
      )}
    </div>
  )
}

// ── SuperSource ─────────────────────────────────────────────────────────

function SuperSourceView({
  snapshot,
  presets,
  move,
  onMove,
}: {
  snapshot: Snapshot
  presets: Preset[]
  move: MoveOptions
  onMove: (m: MoveOptions) => void
}) {
  const [ssrc, setSsrc] = useState(0)
  const [selected, setSelected] = useState(0)
  const [draft, setDraft] = useState<Record<number, SsBox>>({})
  const origin = useRef<SsBox | null>(null)
  const send = useFrameSender<SsBox>((key, p) => void api.setBox(ssrc, Number(key), p))

  const live = snapshot.superSources[ssrc]
  if (!live) return <div className="empty">{t('No SuperSource on this switcher.')}</div>
  const boxes = live.map((b, i) => draft[i] ?? b)
  const box = boxes[selected]
  const inputName = (id: number) => snapshot.inputs.find((i) => i.id === id)?.shortName ?? String(id)
  const ssPresets = presets.filter((p): p is SsPreset => p.kind === 'supersource')

  const edit = (i: number, patch: Partial<SsBox>) => {
    const next = clampBox({ ...boxes[i], ...patch })
    setDraft((d) => ({ ...d, [i]: next }))
    send(String(i), patch)
  }

  const onDrag = (key: string, mode: 'move' | 'resize', dx: number, dy: number, free: boolean) => {
    const i = Number(key)
    const o = (origin.current ??= boxes[i])
    if (mode === 'move') {
      edit(i, { x: snap(o.x + dx, free), y: snap(o.y + dy, free) })
      return
    }
    // Resize from the bottom-right corner, top-left corner stays put.
    const r = boxRect(o)
    const scale = Math.max(0.05, (r.width + dx) / Math.max(r.width, 0.01))
    const size = Math.min(1, Math.max(0.07, free ? o.size * scale : Math.round(o.size * scale * 100) / 100))
    const c = o.cropped ? o : { cropLeft: 0, cropTop: 0 }
    const x = r.left - (-FRAME_W / 2 + c.cropLeft) * size
    const y = r.top - (FRAME_H / 2 - c.cropTop) * size
    edit(i, { size, x, y })
  }

  const endDrag = () => {
    origin.current = null
    // Keep the draft until the switcher's answer has arrived.
    setTimeout(() => setDraft({}), 120)
  }

  const savePreset = (name: string) =>
    api.savePreset({ id: newId(), kind: 'supersource', name, boxes: live })

  return (
    <main className="workspace">
      <section className="stage-wrap">
        <div className="stage-head">
          <h2 className="kicker">SuperSource</h2>
          {snapshot.superSources.length > 1 && (
            <select aria-label="SuperSource" value={ssrc} onChange={(e) => setSsrc(Number(e.target.value))}>
              {snapshot.superSources.map((_, i) => (
                <option key={i} value={i}>
                  SuperSource {i + 1}
                </option>
              ))}
            </select>
          )}
          <span className="meta">{t('Drag a box to move it, drag its corner to resize.')}</span>
        </div>
        <Stage
          rects={boxes.map((b, i) => ({
            key: String(i),
            label: `${t('Box')} ${i + 1}`,
            sub: inputName(b.source),
            enabled: b.enabled,
            ...boxRect(b),
          }))}
          selected={String(selected)}
          onSelect={(k) => setSelected(Number(k))}
          onDrag={onDrag}
          onDragEnd={endDrag}
        />
        <div className="chips" aria-label={t('Layouts')}>
          <span className="kicker">{t('Layouts')}</span>
          {LAYOUTS.map((l) => (
            <button
              key={l.name}
              className="btn"
              onClick={(e) =>
                void api.moveSuperSource(ssrc, applyLayout(live, l.boxes), e.shiftKey ? { ...move, durationMs: 0 } : move)
              }
            >
              {t(l.name)}
            </button>
          ))}
        </div>
      </section>

      <aside className="side">
        <section className="panel">
          <div className="box-tabs" role="tablist">
            {boxes.map((b, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={selected === i}
                className="tab"
                data-off={!b.enabled || undefined}
                onClick={() => setSelected(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={box.enabled} onChange={(e) => edit(selected, { enabled: e.target.checked })} />
            {t('On')}
          </label>
          <label className="field">
            <span>{t('Source')}</span>
            <select value={box.source} onChange={(e) => edit(selected, { source: Number(e.target.value) })}>
              {snapshot.inputs.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.longName}
                </option>
              ))}
            </select>
          </label>
          <NumField label="X" value={box.x} step={0.1} onChange={(v) => edit(selected, { x: v })} />
          <NumField label="Y" value={box.y} step={0.1} onChange={(v) => edit(selected, { y: v })} />
          <NumField label={t('Size')} value={box.size} step={0.01} onChange={(v) => edit(selected, { size: v })} />
          <label className="check">
            <input type="checkbox" checked={box.cropped} onChange={(e) => edit(selected, { cropped: e.target.checked })} />
            {t('Crop')}
          </label>
          {box.cropped && (
            <>
              <NumField label={t('Top')} value={box.cropTop} step={0.1} onChange={(v) => edit(selected, { cropTop: v })} />
              <NumField label={t('Bottom')} value={box.cropBottom} step={0.1} onChange={(v) => edit(selected, { cropBottom: v })} />
              <NumField label={t('Left')} value={box.cropLeft} step={0.1} onChange={(v) => edit(selected, { cropLeft: v })} />
              <NumField label={t('Right')} value={box.cropRight} step={0.1} onChange={(v) => edit(selected, { cropRight: v })} />
            </>
          )}
        </section>

        <PresetList
          presets={ssPresets}
          onRecall={(p, cut) => void api.moveSuperSource(ssrc, p.boxes, cut ? { ...move, durationMs: 0 } : move)}
          onSave={savePreset}
          onUpdate={(p) => void api.savePreset({ ...p, boxes: live })}
          hint={t('Recall moves the boxes with the curve below. Shift-click cuts.')}
        />
        <MoveBar move={move} onChange={onMove} />
      </aside>
    </main>
  )
}

// ── Key DVE ─────────────────────────────────────────────────────────────

function DveView({
  snapshot,
  presets,
  move,
  onMove,
}: {
  snapshot: Snapshot
  presets: Preset[]
  move: MoveOptions
  onMove: (m: MoveOptions) => void
}) {
  const [sel, setSel] = useState(0)
  const [draft, setDraft] = useState<Dve | null>(null)
  const origin = useRef<Dve | null>(null)
  const k = snapshot.keyers[sel]
  const send = useFrameSender<Dve>((_key, p) => k && void api.setDve(k.me, k.keyer, p))
  const dvePresets = useMemo(() => presets.filter((p): p is DvePreset => p.kind === 'dve'), [presets])

  if (!k) return <div className="empty">{t('No keyer with DVE on this switcher.')}</div>
  const dve = draft ?? k.dve

  const edit = (patch: Partial<Dve>) => {
    setDraft(clampDve({ ...dve, ...patch }))
    send('k', patch)
  }

  const onDrag = (_key: string, mode: 'move' | 'resize', dx: number, dy: number, free: boolean) => {
    const o = (origin.current ??= dve)
    if (mode === 'move') {
      edit({ positionX: snap(o.positionX + dx, free), positionY: snap(o.positionY + dy, free) })
      return
    }
    const r = dveRect(o)
    const scale = Math.max(0.01, (r.width + dx) / Math.max(r.width, 0.01))
    const sizeX = free ? o.sizeX * scale : Math.round(o.sizeX * scale * 100) / 100
    const sizeY = o.sizeX ? (sizeX * o.sizeY) / o.sizeX : sizeX
    const w = FRAME_W * sizeX
    const h = FRAME_H * sizeY
    edit({ sizeX, sizeY, positionX: r.left + w / 2, positionY: r.top - h / 2 })
  }

  return (
    <main className="workspace">
      <section className="stage-wrap">
        <div className="stage-head">
          <h2 className="kicker">{t('Key DVE')}</h2>
          <select aria-label={t('Keyer')} value={sel} onChange={(e) => setSel(Number(e.target.value))}>
            {snapshot.keyers.map((x, i) => (
              <option key={i} value={i}>
                M/E {x.me + 1} · {t('Keyer')} {x.keyer + 1}
                {x.onAir ? ' · ON AIR' : ''}
              </option>
            ))}
          </select>
          <span className="meta">{t('Drag a box to move it, drag its corner to resize.')}</span>
        </div>
        <Stage
          rects={[{ key: 'k', label: `${t('Keyer')} ${k.keyer + 1}`, enabled: true, ...dveRect(dve) }]}
          selected="k"
          onSelect={() => undefined}
          onDrag={onDrag}
          onDragEnd={() => {
            origin.current = null
            setTimeout(() => setDraft(null), 120)
          }}
        />
      </section>
      <aside className="side">
        <section className="panel">
          <h2 className="kicker">{t('Position')}</h2>
          <NumField label="X" value={dve.positionX} step={0.1} onChange={(v) => edit({ positionX: v })} />
          <NumField label="Y" value={dve.positionY} step={0.1} onChange={(v) => edit({ positionY: v })} />
          <NumField label={`${t('Size')} X`} value={dve.sizeX} step={0.01} onChange={(v) => edit({ sizeX: v })} />
          <NumField label={`${t('Size')} Y`} value={dve.sizeY} step={0.01} onChange={(v) => edit({ sizeY: v })} />
          <NumField label={t('Rotation')} value={dve.rotation} step={1} onChange={(v) => edit({ rotation: v })} />
        </section>
        <PresetList
          presets={dvePresets}
          onRecall={(p, cut) => void api.moveDve(k.me, k.keyer, p.dve, cut ? { ...move, durationMs: 0 } : move)}
          onSave={(name) => void api.savePreset({ id: newId(), kind: 'dve', name, dve: k.dve })}
          onUpdate={(p) => void api.savePreset({ ...p, dve: k.dve })}
          hint={t('Recall moves the boxes with the curve below. Shift-click cuts.')}
        />
        <MoveBar move={move} onChange={onMove} />
      </aside>
    </main>
  )
}

// ── Shared pieces ───────────────────────────────────────────────────────

function NumField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={fmt(value, step < 0.1 ? 3 : 2)}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onChange(v)
        }}
      />
    </label>
  )
}

function PresetList<P extends Preset>({
  presets,
  onRecall,
  onSave,
  onUpdate,
  hint,
}: {
  presets: P[]
  onRecall: (p: P, cut: boolean) => void
  onSave: (name: string) => void
  onUpdate: (p: P) => void
  hint: string
}) {
  const [name, setName] = useState('')
  return (
    <section className="panel">
      <h2 className="kicker">{t('Presets')}</h2>
      {presets.length === 0 ? (
        <p className="meta">{t('No presets yet. Arrange the boxes and save the layout.')}</p>
      ) : (
        <>
          <ul className="presets">
            {presets.map((p) => (
              <li key={p.id}>
                <button className="btn recall" onClick={(e) => onRecall(p, e.shiftKey)} title={hint}>
                  {p.name}
                </button>
                <button className="btn ghost" onClick={() => onUpdate(p)} aria-label={`${t('Save')} ${p.name}`}>
                  {t('Save')}
                </button>
                <button
                  className="btn ghost danger"
                  onClick={() => void api.deletePreset(p.id)}
                  aria-label={`${t('Delete')} ${p.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="meta">{hint}</p>
        </>
      )}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onSave(name.trim())
          setName('')
        }}
      >
        <input aria-label={t('Preset name')} placeholder={t('Preset name')} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit" disabled={!name.trim()}>
          {t('Save as preset')}
        </button>
      </form>
    </section>
  )
}

function SettingsView({
  settings,
  onHttp,
  onLang,
}: {
  settings: Settings
  onHttp: (p: number) => void
  onLang: (l: 'en' | 'de') => void
}) {
  const [port, setPort] = useState(settings.httpPort || 4194)
  return (
    <main className="settings">
      <section className="panel">
        <h2 className="kicker">{t('HTTP control')}</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.httpPort > 0}
            onChange={(e) => onHttp(e.target.checked ? port : 0)}
          />
          {settings.httpPort > 0 ? `127.0.0.1:${settings.httpPort}` : t('Off')}
        </label>
        <label className="field">
          <span>{t('Port')}</span>
          <input
            type="number"
            min={1024}
            max={65535}
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            onBlur={() => settings.httpPort > 0 && onHttp(port)}
          />
        </label>
        <pre className="code">
          {`GET /recall?preset=Quad&ssrc=0&duration=800&easing=cubic-inOut
GET /recall?preset=Corner&me=0&keyer=0
GET /presets`}
        </pre>
      </section>
      <section className="panel">
        <h2 className="kicker">{t('Language')}</h2>
        <div className="seg" role="radiogroup">
          {(['en', 'de'] as const).map((l) => (
            <button key={l} role="radio" aria-checked={getLang() === l} className="btn ghost" onClick={() => onLang(l)}>
              {l === 'en' ? 'English' : 'Deutsch'}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
