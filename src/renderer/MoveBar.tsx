import { EASE_FAMILIES, ease, type EaseDirection, type Easing } from '../shared/easing'
import type { MoveOptions } from '../shared/model'
import { t } from './i18n'

const DIRS: [EaseDirection, string][] = [
  ['in', 'Ease in'],
  ['out', 'Ease out'],
  ['inOut', 'Ease in-out'],
]

/** The curve as a small graph, so overshoot (back, elastic) is visible. */
export function CurvePreview({ easing }: { easing: Easing }) {
  const W = 96
  const H = 56
  const PAD = 12
  const pts = Array.from({ length: 49 }, (_, i) => {
    const x = i / 48
    const y = ease(easing, x)
    return `${(x * W).toFixed(1)},${(PAD + (1 - y) * (H - 2 * PAD)).toFixed(1)}`
  })
  return (
    <svg className="curve" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line x1="0" x2={W} y1={H - PAD} y2={H - PAD} className="curve-base" />
      <line x1="0" x2={W} y1={PAD} y2={PAD} className="curve-base" />
      <polyline points={pts.join(' ')} className="curve-line" />
    </svg>
  )
}

export function MoveBar({ move, onChange }: { move: MoveOptions; onChange: (m: MoveOptions) => void }) {
  return (
    <section className="panel movebar" aria-label={t('Move')}>
      <h2 className="kicker">{t('Move')}</h2>
      <label className="field">
        <span>{t('Duration')}</span>
        <input
          type="number"
          min={0}
          max={10000}
          step={50}
          value={move.durationMs}
          onChange={(e) => onChange({ ...move, durationMs: Math.max(0, Number(e.target.value) || 0) })}
        />
        <em>ms</em>
      </label>
      <label className="field">
        <span>{t('Curve')}</span>
        <select
          value={move.easing.family}
          onChange={(e) => onChange({ ...move, easing: { ...move.easing, family: e.target.value as Easing['family'] } })}
        >
          {EASE_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <div className="seg" role="radiogroup" aria-label={t('Curve')}>
        {DIRS.map(([d, label]) => (
          <button
            key={d}
            role="radio"
            aria-checked={move.easing.direction === d}
            className="btn ghost"
            disabled={move.easing.family === 'linear'}
            onClick={() => onChange({ ...move, easing: { ...move.easing, direction: d } })}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <CurvePreview easing={move.easing} />
      <label className="field">
        <span>{t('Rate')}</span>
        <select value={move.rate} onChange={(e) => onChange({ ...move, rate: Number(e.target.value) })}>
          {[25, 30, 50, 60].map((r) => (
            <option key={r} value={r}>
              {r}/s
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
