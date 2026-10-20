import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import SettingsPanel from './SettingsPanel.jsx'
import { loadPosition, savePosition } from '../lib/storage.js'

export default function Reader({ doc, prefs, setPrefs, onBack }) {
  const [progress, setProgress] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const restoredRef = useRef(false)
  const saveTimer = useRef(null)

  const persist = useCallback(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const scrolled = window.scrollY
    const p = max > 0 ? scrolled / max : 0
    setProgress(p)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      savePosition(doc.key, { name: doc.name, progress: p, scrollTop: scrolled })
    }, 350)
  }, [doc.key, doc.name])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (restoredRef.current) persist()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [persist])

  useLayoutEffect(() => {
    restoredRef.current = false
    const saved = loadPosition(doc.key)
    const target = saved?.scrollTop || 0
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.scrollTo(0, target)
        setProgress(target > 0 && document.documentElement.scrollHeight > window.innerHeight
          ? target / (document.documentElement.scrollHeight - window.innerHeight)
          : 0)
        restoredRef.current = true
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [doc.key])

  const percent = Math.round(progress * 100)

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="fixed inset-x-0 top-0 z-20 bg-surface/95 backdrop-blur border-b border-line">
        <div
          className="h-0.5 w-full bg-line"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full bg-accent transition-[width] duration-100"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mx-auto flex max-w-[42rem] items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to file picker"
            className="shrink-0 rounded-full p-2 text-muted hover:text-ink hover:bg-line/60 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-xs text-muted leading-tight">{percent}% read</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Reading settings"
            className="shrink-0 rounded-full p-2 text-muted hover:text-ink hover:bg-line/60 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h10M16.5 7.5H21M3 16.5h3.5M10 16.5h11" />
              <circle cx="14.75" cy="7.5" r="1.75" />
              <circle cx="8.25" cy="16.5" r="1.75" />
            </svg>
          </button>
        </div>
      </header>

      <article
        className="mx-auto w-full max-w-[42rem] px-5 pb-24 pt-16 sm:px-6"
        style={{ fontSize: `${prefs.fontSize}px`, lineHeight: prefs.lineHeight }}
      >
        {doc.blocks.map((block, i) =>
          block.type === 'heading' ? (
            block.level === 2 ? (
              <h2
                key={i}
                className="mt-10 mb-4 font-semibold tracking-tight first:mt-4"
                style={{ fontSize: '1.45em', lineHeight: 1.25 }}
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={i}
                className="mt-8 mb-3 font-semibold tracking-tight first:mt-4"
                style={{ fontSize: '1.18em', lineHeight: 1.3 }}
              >
                {block.text}
              </h3>
            )
          ) : (
            <p
              key={i}
              className="mb-[0.9em] hyphens-auto text-pretty"
              lang="en"
            >
              {block.text}
            </p>
          ),
        )}
        <p className="mt-12 text-center text-sm text-muted">
          End — {doc.stats.words.toLocaleString()} words from{' '}
          {doc.stats.pagesRead} pages
          {doc.stats.introPagesDropped > 0
            ? ` (${doc.stats.introPagesDropped} intro page${
                doc.stats.introPagesDropped > 1 ? 's' : ''
              } skipped)`
            : ''}
        </p>
      </article>

      <SettingsPanel
        open={settingsOpen}
        prefs={prefs}
        setPrefs={setPrefs}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
