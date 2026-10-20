const PREFS_KEY = 'Yeezypdf:prefs'
const POSITIONS_KEY = 'Yeezypdf:positions'

export const DEFAULT_PREFS = {
  theme: 'light',
  fontSize: 18,
  lineHeight: 1.7,
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    const theme = ['light', 'dark', 'sepia'].includes(parsed.theme)
      ? parsed.theme
      : DEFAULT_PREFS.theme
    const fontSize = clamp(Number(parsed.fontSize), 14, 30, DEFAULT_PREFS.fontSize)
    const lineHeight = clamp(Number(parsed.lineHeight), 1.3, 2.2, DEFAULT_PREFS.lineHeight)
    return { theme, fontSize, lineHeight }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable */
  }
}

export function docKey(file) {
  return `${file.name}::${file.size}`
}

function readPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadPosition(key) {
  return readPositions()[key] || null
}

export function savePosition(key, { name, progress, scrollTop }) {
  try {
    const all = readPositions()
    all[key] = {
      name,
      progress: Math.max(0, Math.min(1, progress)),
      scrollTop: Math.max(0, scrollTop),
      updatedAt: Date.now(),
    }
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(all))
  } catch {
    /* quota exceeded or storage unavailable */
  }
}

export function mostRecentPosition() {
  const all = Object.entries(readPositions())
  if (!all.length) return null
  all.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
  const [key, value] = all[0]
  return { key, ...value }
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
