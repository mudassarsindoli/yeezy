import { useEffect } from 'react'
import { DEFAULT_PREFS } from '../lib/storage.js'

const THEMES = [
  {
    id: 'light',
    label: 'Light',
    swatch: ['#ffffff', '#1f2328', '#2563eb'],
  },
  {
    id: 'dark',
    label: 'Dark',
    swatch: ['#101318', '#e5e7eb', '#7da7ff'],
  },
  {
    id: 'sepia',
    label: 'Sepia',
    swatch: ['#f6ecd9', '#4f4132', '#a05a2c'],
  },
]

export default function SettingsPanel({ open, prefs, setPrefs, onClose }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Reading settings">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[42rem] rounded-t-2xl border-t border-line bg-surface px-5 pb-8 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold">Reading settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:text-ink hover:bg-line/60 transition-colors"
            aria-label="Close settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium">Theme</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => {
              const active = prefs.theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPrefs((p) => ({ ...p, theme: t.id }))}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'border-accent bg-accent/10 font-medium'
                      : 'border-line hover:bg-line/40'
                  }`}
                >
                  <span
                    className="inline-flex h-5 w-5 overflow-hidden rounded-full border border-line"
                    aria-hidden="true"
                  >
                    {t.swatch.map((c) => (
                      <span key={c} className="h-full w-1/3" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  {t.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="font-size" className="text-sm font-medium">
              Font size
            </label>
            <span className="text-sm tabular-nums text-muted">{prefs.fontSize}px</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Decrease font size"
              onClick={() =>
                setPrefs((p) => ({ ...p, fontSize: Math.max(14, p.fontSize - 1) }))
              }
              className="h-9 w-9 shrink-0 rounded-lg border border-line text-base hover:bg-line/40"
            >
              A−
            </button>
            <input
              id="font-size"
              type="range"
              min={14}
              max={30}
              step={1}
              value={prefs.fontSize}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, fontSize: Number(e.target.value) }))
              }
              className="w-full accent-accent"
            />
            <button
              type="button"
              aria-label="Increase font size"
              onClick={() =>
                setPrefs((p) => ({ ...p, fontSize: Math.min(30, p.fontSize + 1) }))
              }
              className="h-9 w-9 shrink-0 rounded-lg border border-line text-base hover:bg-line/40"
            >
              A+
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="line-height" className="text-sm font-medium">
              Line spacing
            </label>
            <span className="text-sm tabular-nums text-muted">
              {prefs.lineHeight.toFixed(2)}
            </span>
          </div>
          <input
            id="line-height"
            type="range"
            min={1.3}
            max={2.2}
            step={0.05}
            value={prefs.lineHeight}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, lineHeight: Number(e.target.value) }))
            }
            className="w-full accent-accent"
          />
        </div>

        <button
          type="button"
          onClick={() => setPrefs({ ...DEFAULT_PREFS })}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
