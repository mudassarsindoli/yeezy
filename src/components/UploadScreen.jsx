import { useRef, useState } from 'react'

export default function UploadScreen({
  onFile,
  status,
  progress,
  error,
  lastRead,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const loading = status === 'loading'

  function onSelect(e) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <main className="min-h-dvh bg-surface text-ink flex flex-col">
      <div className="flex-1 w-full max-w-lg mx-auto px-5 py-10 flex flex-col justify-center">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Yeezy</h1>
          <p className="mt-2 text-muted text-[15px] leading-relaxed">
            Turn any text-based PDF into a clean, uninterrupted reading view.
            Everything runs in your browser — nothing is uploaded.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 px-4 py-3 text-sm leading-relaxed"
          >
            {error}
          </div>
        )}

        {loading ? (
          <section
            aria-live="polite"
            className="rounded-2xl border border-line bg-surface px-6 py-10 text-center"
          >
            <div
              className="mx-auto mb-4 h-9 w-9 rounded-full border-2 border-line border-t-accent animate-spin"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">{progress.stage || 'Working'}</p>
            {progress.total > 0 ? (
              <>
                <p className="mt-1 text-sm text-muted">
                  Page {progress.done} of {progress.total}
                </p>
                <div className="mt-4 h-1.5 w-full rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-200"
                    style={{
                      width: `${Math.round((progress.done / progress.total) * 100)}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">This can take a moment…</p>
            )}
          </section>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) onFile(file)
            }}
            aria-label="Choose a PDF file, or drop one here"
            className={`w-full rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer
              ${
                dragging
                  ? 'border-accent bg-accent/5'
                  : 'border-line hover:border-accent/60 hover:bg-accent/[0.03]'
              }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto h-10 w-10 text-muted"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V4.5m0 0L7.5 9M12 4.5 16.5 9M4.5 15.75v1.9a2.85 2.85 0 0 0 2.85 2.85h9.3a2.85 2.85 0 0 0 2.85-2.85v-1.9"
              />
            </svg>
            <span className="mt-3 block text-[15px] font-medium">
              Tap to choose a PDF
            </span>
            <span className="mt-1 block text-sm text-muted">or drop one here</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onSelect}
          className="sr-only"
          tabIndex={-1}
        />

        {lastRead && !loading && (
          <section className="mt-6 rounded-2xl border border-line bg-surface px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Last session
            </p>
            <p className="mt-1.5 text-sm truncate" title={lastRead.name}>
              {lastRead.name}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {Math.round((lastRead.progress || 0) * 100)}% read — choose the same
              file again to pick up where you left off.
            </p>
          </section>
        )}

        <footer className="mt-10 text-xs leading-relaxed text-muted">
          <ul className="list-disc list-inside space-y-1">
            <li>Text-based PDFs only (no scanned images, no OCR)</li>
            <li>Headers, footers and page numbers are cleaned up automatically</li>
            <li>Your reading position and preferences are saved on this device</li>
            <li>Designed & developed with ❤️ & AI by <a className='text-blue-600 font-bold underline' target='_blank' href="https://mudassar-sindoli.vercel.app/">mudassar.sindoli</a></li>
          </ul>
        </footer>
      </div>
    </main>
  )
}
