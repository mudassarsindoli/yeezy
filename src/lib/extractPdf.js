import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function extractPdf(file, onProgress) {
  const buffer = await file.arrayBuffer()
  const task = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
  })
  const pdf = await task.promise
  const pages = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      pages.push(buildPage(n, content.items, viewport.width, viewport.height))
      page.cleanup()
      onProgress?.(n, pdf.numPages)
      // Yield to the UI so the loading indicator stays responsive.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  } finally {
    try {
      await pdf.destroy()
    } catch {
      /* ignore */
    }
  }
  return { pages, numPages: pdf.numPages }
}

function buildPage(num, items, width, height) {
  const raw = []
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const tr = it.transform || [1, 0, 0, 1, 0, 0]
    const size = Math.abs(tr[3]) || Math.abs(it.height) || 10
    const x = tr[4]
    const yBaseline = tr[5]
    const w = it.width || 0
    raw.push({ str: it.str, x, yBaseline, yTop: height - yBaseline, size, xEnd: x + w })
  }
  // PDF y grows upward; reading order needs top of page first.
  raw.sort((a, b) => b.yBaseline - a.yBaseline || a.x - b.x)

  const clusters = []
  for (const r of raw) {
    const last = clusters[clusters.length - 1]
    const tol = last ? Math.max(2.5, last.size * 0.4) : 0
    if (last && Math.abs(r.yBaseline - last.yBaseline) <= tol) {
      last.items.push(r)
    } else {
      clusters.push({ yBaseline: r.yBaseline, size: r.size, items: [r] })
    }
  }

  const lines = []
  for (const c of clusters) {
    const items = c.items.sort((a, b) => a.x - b.x)
    const line = joinItems(items, height)
    if (line) lines.push(line)
  }

  const medianSize = weightedMedianSize(lines, width)
  return { num, width, height, lines, medianSize }
}

function joinItems(items, pageHeight) {
  // Split a visual row into segments when there is a large horizontal gap
  // (two-column layouts put both columns on the same baseline).
  const groups = []
  let cur = [items[0]]
  for (let i = 1; i < items.length; i++) {
    const it = items[i]
    const prev = items[i - 1]
    const gap = it.x - prev.xEnd
    if (gap > Math.max(10, prev.size * 1.2)) {
      groups.push(cur)
      cur = [it]
    } else {
      cur.push(it)
    }
  }
  groups.push(cur)

  const segments = groups.map((g) => makeSegment(g, pageHeight)).filter(Boolean)
  if (!segments.length) return null
  const text = segments.map((s) => s.text).join(' ')
  const size =
    weightedMedian(
      segments.map((s) => s.size),
      segments.map((s) => Math.max(1, s.text.length)),
    ) || 10
  return {
    text,
    yTop: pageHeight - items[0].yBaseline,
    size,
    xStart: Math.min(...segments.map((s) => s.xStart)),
    xEnd: Math.max(...segments.map((s) => s.xEnd)),
    segments,
  }
}

function makeSegment(items, pageHeight) {
  let text = ''
  let prev = null
  let xStart = Infinity
  let xEnd = -Infinity
  const sizes = []
  const weights = []
  for (const it of items) {
    if (prev) {
      const gap = it.x - prev.xEnd
      const hasSpace = /\s$/.test(text) || /^\s/.test(it.str)
      if (!hasSpace && gap > prev.size * 0.1) text += ' '
    }
    text += it.str
    xStart = Math.min(xStart, it.x)
    xEnd = Math.max(xEnd, it.xEnd)
    sizes.push(it.size)
    weights.push(Math.max(1, it.str.length))
    prev = it
  }
  text = text.replace(/\u00ad/g, '').replace(/[ \t]+/g, ' ').trim()
  if (!text) return null
  const size = weightedMedian(sizes, weights) || items[0].size || 10
  return { text, yTop: pageHeight - items[0].yBaseline, size, xStart, xEnd }
}

function weightedMedianSize(lines, pageWidth) {
  const values = []
  const weights = []
  for (const l of lines) {
    values.push(l.size)
    weights.push(
      Math.max(1, l.text.length) * (l.xEnd - l.xStart > pageWidth * 0.25 ? 1 : 0.2),
    )
  }
  return weightedMedian(values, weights) || 11
}

function weightedMedian(values, weights) {
  if (!values.length) return 0
  const pairs = values
    .map((value, i) => ({ value, weight: weights ? weights[i] : 1 }))
    .sort((a, b) => a.value - b.value)
  const total = pairs.reduce((sum, p) => sum + p.weight, 0)
  let acc = 0
  for (const p of pairs) {
    acc += p.weight
    if (acc >= total / 2) return p.value
  }
  return pairs[pairs.length - 1].value
}
