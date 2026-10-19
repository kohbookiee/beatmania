import { cycleVoices } from '../cube/orbits.js'

export const BPM = 150
export const COMPOSITION_TITLE = 'MY FIRST COMPOSITION'

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

export function hitFor(notation, cubies) {
  const voice = VOICE[notation] || 'SYNTH'
  const prime = notation.endsWith("'")
  const cycle = cubies ? cycleVoices(cubies, notation) : []
  const step = cycle[0]?.n ?? 1
  let note = 'C2'

  if (voice === 'KICK') note = prime ? 'G1' : 'C1'
  else if (voice === 'SNARE') note = prime ? 'F2' : 'D2'
  else if (voice === 'PLUCK') note = noteName(72 + DEGREE[step - 1])
  else if (voice === 'BASS') note = prime ? 'G1' : 'C2'
  else if (voice === 'CHORD') note = noteName(60 + DEGREE[step - 1])
  else note = noteName(60 + DEGREE[step - 1])

  return { notation, voice, note, prime }
}
