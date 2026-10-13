import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Every t('…') literal in the renderer needs a German entry.
describe('German translation', () => {
  it('covers every UI string', () => {
    const dir = join(__dirname, '../src/renderer')
    const i18n = readFileSync(join(dir, 'i18n.ts'), 'utf8')
    const keys = new Set([...i18n.matchAll(/^\s+'?([^':]+?)'?:\s*$|^\s+'?([^':\n]+?)'?: '/gm)].map((m) => m[1] ?? m[2]))
    const missing: string[] = []
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.tsx') || f === 'layouts.ts')) {
      const src = readFileSync(join(dir, f), 'utf8')
      for (const m of src.matchAll(/\bt\('([^']+)'\)/g)) if (!keys.has(m[1])) missing.push(`${f}: ${m[1]}`)
      if (f === 'layouts.ts') for (const m of src.matchAll(/name: '([^']+)'/g)) if (!keys.has(m[1])) missing.push(`${f}: ${m[1]}`)
    }
    expect(missing).toEqual([])
  })
})
