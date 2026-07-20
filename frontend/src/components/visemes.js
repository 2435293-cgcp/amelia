const CHAR_VISEME = {
  b: 0, m: 0, p: 0,
  e: 1, i: 1, y: 1,
  a: 2, h: 2,
  o: 3, u: 3, w: 3, q: 3,
  f: 4, v: 4, s: 4, z: 4, x: 4,
}
const DEFAULT_VISEME = 2

export function wordToVisemes(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!clean.length) return [0]
  const out = []
  for (let i = 0; i < clean.length; i++) {
    const two = clean.slice(i, i + 2)
    if (['th', 'sh', 'ch'].includes(two)) { out.push(4); i++; continue }
    if (two === 'wh') { out.push(3); i++; continue }
    out.push(CHAR_VISEME[clean[i]] ?? DEFAULT_VISEME)
  }
  return out
}
