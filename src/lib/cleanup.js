export function cleanupText(pages) {
  const totalPages = pages.length
  const edgePatterns = detectEdgePatterns(pages)
  const cleaned = pages.map((p) => ({
    ...p,
    lines: p.lines.filter(
      (l) => !isPageNumberLine(l, p, totalPages) && !edgePatterns.has(edgeKey(l.text)),
    ),
  }))
  const introPages = countIntroPages(cleaned)
  const kept = cleaned.slice(introPages)

  const blocks = []
  for (const page of kept) {
    for (const stream of columnStreams(page)) {
      const pageBlocks = streamToBlocks(stream, page.medianSize)
      appendBlocks(blocks, pageBlocks)
    }
  }

  const finalBlocks = blocks
    .map((b) => ({ ...b, text: b.text.replace(/\s+/g, ' ').trim() }))
    .filter((b) => b.text.length > 1 || b.type === 'heading')

  const words = finalBlocks.reduce((sum, b) => {
    const w = b.text.split(' ').filter(Boolean).length
    return sum + w
  }, 0)

  return {
    blocks: finalBlocks,
    stats: {
      pagesRead: kept.length,
      introPagesDropped: introPages,
      boilerplateLines: edgePatterns.size,
      words,
    },
  }
}

/* ---------- headers / footers / page numbers ---------- */

function edgeKey(text) {
  return text
    .toLowerCase()
    .replace(/\d+/g, '0')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function detectEdgePatterns(pages) {
  const threshold = Math.max(3, Math.ceil(pages.length * 0.3))
  const topCounts = new Map()
  const bottomCounts = new Map()

  for (const p of pages) {
    const top = new Set()
    const bottom = new Set()
    for (const l of p.lines) {
      const t = l.text.trim()
      if (t.length < 2 || t.length > 120) continue
      const key = edgeKey(t)
      if (!key) continue
      if (l.yTop <= p.height * 0.14) top.add(key)
      else if (l.yTop >= p.height * 0.86) bottom.add(key)
    }
    for (const k of top) topCounts.set(k, (topCounts.get(k) || 0) + 1)
    for (const k of bottom) bottomCounts.set(k, (bottomCounts.get(k) || 0) + 1)
  }

  const drop = new Set()
  for (const [k, c] of topCounts) if (c >= threshold) drop.add(k)
  for (const [k, c] of bottomCounts) if (c >= threshold) drop.add(k)
  return drop
}

function isPageNumberLine(line, page, totalPages) {
  if (totalPages < 3) return false
  const t = line.text.trim()
  if (!t || t.length > 40) return false
  const nearTop = line.yTop <= page.height * 0.14
  const nearBottom = line.yTop >= page.height * 0.84
  if (!nearTop && !nearBottom) return false
  const pureNumber = /^[\s\[]\d{1,4}[\s\]]$|^\d{1,4}$/.test(t)
  const pageOf = /^page\s+\d+(\s*(of|\/)\s*\d+)?$/i.test(t)
  const romanNumeral = /^[\[\(]?[ivxlcdm]{1,7}[\]\)]?$/i.test(t) && /[ivxlcdm]/i.test(t)
  const ruleLine = /^[-–—·|/.\s]{3,}$/.test(t)
  return pureNumber || pageOf || romanNumeral || ruleLine
}

/* ---------- intro / title / copyright pages ---------- */

function countIntroPages(pages) {
  if (pages.length < 4) return 0
  let dropped = 0
  for (let i = 0; i < Math.min(3, pages.length); i++) {
    if (!isIntroPage(pages[i])) break
    dropped++
  }
  if (dropped > pages.length * 0.5) return 0
  return dropped
}

function isIntroPage(page) {
  const text = page.lines.map((l) => l.text).join(' ').trim()
  const lower = text.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean).length

  if (words < 20) return true

  const boilerplate =
    /(copyright|©|all rights reserved|isbn|printed in|published by|library of congress|no part of|licen[cs]e|disclaimer)/.test(
      lower,
    )
  if (boilerplate && words < 160) return true

  const dottedLeaders = page.lines.filter((l) => /_{2,}|\.{5,}|\u2026/.test(l.text)).length
  const isToc =
    (/(table of contents|contents|in this book|preface|introduction|acknowledg)/.test(lower) &&
      words < 180) ||
    dottedLeaders >= 4
  if (isToc) return true

  // Almost-blank page (cover art, divider).
  if (words < 30 && page.lines.length <= 8) return true

  return false
}

/* ---------- columns ---------- */

function columnStreams(page) {
  const lines = page.lines.slice().sort((a, b) => a.yTop - b.yTop || a.xStart - b.xStart)
  if (lines.length < 6) return [lines]

  const mid = page.width * 0.5

  // Preferred: rows were segmented at large gaps (shared baselines across columns).
  const multi = lines.filter((l) => l.segments && l.segments.length > 1)
  if (multi.length / lines.length >= 0.4) {
    const left = []
    const right = []
    for (const line of lines) {
      const parts = line.segments && line.segments.length > 1 ? line.segments : [line]
      for (const seg of parts) {
        const target = seg.xStart < mid ? left : right
        target.push(seg)
      }
    }
    if (left.length && right.length) {
      left.sort((a, b) => a.yTop - b.yTop)
      right.sort((a, b) => a.yTop - b.yTop)
      return [left, right]
    }
  }

  // Fallback: split by line start position (PDFs where each column is its own row).
  const left = lines.filter((l) => l.xStart < mid - page.width * 0.04)
  const right = lines.filter((l) => l.xStart >= mid - page.width * 0.04)
  const fullWidth = lines.filter((l) => l.xEnd - l.xStart > page.width * 0.7)

  const isTwoCol =
    left.length / lines.length >= 0.35 &&
    right.length / lines.length >= 0.3 &&
    fullWidth.length / lines.length < 0.2

  if (!isTwoCol) return [lines]
  return [left.sort((a, b) => a.yTop - b.yTop), right.sort((a, b) => a.yTop - b.yTop)]
}

/* ---------- lines -> paragraphs / headings ---------- */

function streamToBlocks(lines, pageMedian) {
  const blocks = []
  let buffer = []
  let prev = null

  const flush = () => {
    if (!buffer.length) return
    const text = joinBuffer(buffer)
    if (text) blocks.push({ type: 'p', text })
    buffer = []
  }

  for (const line of lines) {
    const text = line.text.trim()
    if (!text) continue

    const leading = prev ? line.yTop - prev.yTop : Infinity
    const bigGap = leading > Math.max(prev ? prev.size : line.size, 8) * 1.55
    const heading = isHeadingLine(line, pageMedian, prev, bigGap, leading)

    if (heading) {
      flush()
      blocks.push({
        type: 'heading',
        level: line.size >= pageMedian * 1.4 ? 2 : 3,
        text,
      })
      prev = line
      continue
    }

    if (prev && shouldBreakParagraph(prev, line, leading)) flush()
    buffer.push({ raw: text })
    prev = line
  }
  flush()
  return blocks
}

function shouldBreakParagraph(prevLine, line, leading) {
  if (leading > Math.max(prevLine.size, line.size, 8) * 1.55) return true
  const prevText = prevLine.text.trim()
  if (prevText.length && prevLine.size * 1.05 < line.size) return true
  return false
}

function isHeadingLine(line, median, prev, bigGap, leading) {
  const text = line.text.trim()
  const words = text.split(/\s+/).filter(Boolean).length
  const letters = text.replace(/[^a-zA-Z]/g, '')

  if (line.size >= median * 1.12 && text.length <= 100 && words <= 16) return true
  if (line.size >= median * 1.3 && text.length <= 140) return true

  // ALL-CAPS short line standing alone looks like a section title.
  const caps =
    letters.length >= 3 &&
    letters === letters.toUpperCase() &&
    words <= 8 &&
    text.length <= 60
  if (caps && bigGap) return true
  if (caps && leading > Math.max(prev ? prev.size : line.size, 8) * 1.4) return true

  return false
}

function joinBuffer(items) {
  let out = ''
  let prevRaw = ''
  for (const item of items) {
    const t = item.raw || item.text
    if (!out) {
      out = t
    } else if (/[-\u2010\u2011]$/.test(prevRaw) && /^[a-z]/.test(t)) {
      out = out.replace(/-$/, '') + t
    } else {
      out += ' ' + t
    }
    prevRaw = t
  }
  return out.trim()
}

/* ---------- merge across pages ---------- */

function appendBlocks(target, incoming) {
  for (const block of incoming) {
    if (!block.text) continue
    const last = target[target.length - 1]
    const joined =
      last &&
      last.type === 'p' &&
      block.type === 'p' &&
      last.text.length > 0 &&
      !/[.!?"'”’:;)]$/.test(last.text)

    if (joined) {
      const glue = /[-\u2010\u2011]$/.test(last.text) ? '' : ' '
      const text = /-$/.test(last.text)
        ? last.text.replace(/-$/, '') + block.text
        : last.text + glue + block.text
      target[target.length - 1] = { ...last, text }
      continue
    }
    if (
      last &&
      last.type === 'heading' &&
      block.type === 'heading' &&
      edgeKey(last.text) === edgeKey(block.text)
    ) {
      continue
    }
    target.push(block)
  }
}
