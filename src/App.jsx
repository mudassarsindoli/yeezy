import { useEffect, useState } from 'react'
import UploadScreen from './components/UploadScreen.jsx'
import Reader from './components/Reader.jsx'
import { extractPdf } from './lib/extractPdf.js'
import { cleanupText } from './lib/cleanup.js'
import { docKey, loadPrefs, savePrefs, mostRecentPosition } from './lib/storage.js'

export default function App() {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [doc, setDoc] = useState(null)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0, stage: '' })
  const [error, setError] = useState('')
  const [lastRead, setLastRead] = useState(() => mostRecentPosition())

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme
    savePrefs(prefs)
  }, [prefs])

  async function handleFile(file) {
    if (!file) return
    const isPdf =
      file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isPdf) {
      setError('That does not look like a PDF. Please choose a .pdf file.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    setProgress({ done: 0, total: 0, stage: 'Opening file' })
    try {
      const { pages, numPages } = await extractPdf(file, (done, total) =>
        setProgress({ done, total, stage: 'Reading pages' }),
      )
      setProgress({ done: numPages, total: numPages, stage: 'Cleaning up text' })
      // Let the "Cleaning up" stage paint before the (synchronous) cleanup work.
      await new Promise((r) => setTimeout(r, 16))
      const { blocks, stats } = cleanupText(pages)
      if (!blocks.length) {
        throw new Error(
          'No selectable text found in this PDF. Scanned or image-only PDFs need OCR, which is not supported yet.',
        )
      }
      setDoc({
        key: docKey(file),
        name: file.name.replace(/\.pdf$/i, ''),
        blocks,
        numPages,
        stats,
      })
      setStatus('ready')
    } catch (e) {
      const msg =
        e?.name === 'InvalidPDFException'
          ? 'This file could not be opened as a PDF. It may be corrupted or password-protected.'
          : e?.message || 'Something went wrong while reading this PDF.'
      setError(msg)
      setStatus('error')
    }
  }

  function backToUpload() {
    setStatus('idle')
    setError('')
    setLastRead(mostRecentPosition())
  }

  if (status === 'ready' && doc) {
    return (
      <Reader doc={doc} prefs={prefs} setPrefs={setPrefs} onBack={backToUpload} />
    )
  }

  return (
    <UploadScreen
      onFile={handleFile}
      status={status === 'loading' ? 'loading' : 'idle'}
      progress={progress}
      error={status === 'error' ? error : ''}
      lastRead={lastRead}
    />
  )
}
