import { cycleVoices } from '../cube/orbits.js'

export const BPM = 600
export const BPM_MIN = 80
export const BPM_MAX = 600
export const STEP_SECONDS = 60 / BPM
export const COMPOSITION_TITLE = 'MY FIRST COMPOSITION'

const tempoListeners = new Set()
let bpm = BPM

export function getBpm() {
  return bpm
}

export function stepSeconds() {
  return 60 / bpm
}

export function setBpm(value) {
  const next = Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, Number(value) || BPM_MIN)))
  if (next === bpm) return bpm
  bpm = next
  for (const listener of tempoListeners) listener(bpm)
  return bpm
}

export function subscribeBpm(listener) {
  tempoListeners.add(listener)
  return () => tempoListeners.delete(listener)
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const DEGREE = [0, 2, 3, 5, 7, 8, 10, 12, 15]

export const VOICE = {
  R: 'KICK',
  "R'": 'KICK',
  L: 'SNARE',
  "L'": 'SNARE',
  U: 'PLUCK',
  "U'": 'PLUCK',
  D: 'BASS',
  "D'": 'BASS',
  F: 'SYNTH',
  "F'": 'SYNTH',
  B: 'CHORD',
  "B'": 'CHORD',
  M: 'KICK',
  "M'": 'KICK',
  E: 'PLUCK',
  "E'": 'PLUCK',
  S: 'SYNTH',
  "S'": 'SYNTH',
}

function noteName(midi) {
  const pitch = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return `${NAMES[pitch]}${octave}`
}

export function hitForFace(face, step = 1, prime = false) {
  const notation = prime ? `${face}'` : face
  const voice = VOICE[notation] || 'SYNTH'
  const degree = DEGREE[Math.min(DEGREE.length, Math.max(1, step)) - 1] ?? 0
  let note = 'C2'

  if (voice === 'KICK') note = prime ? 'G1' : 'C1'
  else if (voice === 'SNARE') note = prime ? 'F2' : 'D2'
  else if (voice === 'PLUCK') note = noteName(72 + degree)
  else if (voice === 'BASS') note = prime ? 'G1' : 'C2'
  else if (voice === 'CHORD') note = noteName(60 + degree)
  else note = noteName(60 + degree)

  return { notation, voice, note, prime, face, step }
}

export function hitFor(notation, cubies) {
  const prime = notation.endsWith("'")
  const face = notation.replace("'", '')
  const cycle = cubies ? cycleVoices(cubies, notation) : []
  const step = cycle[0]?.n ?? 1
  const hit = hitForFace(face, step, prime)
  return { notation, voice: hit.voice, note: hit.note, prime }
}
