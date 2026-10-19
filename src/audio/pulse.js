const listeners = new Set()

const PROFILE = {
  KICK: { decay: 0.2, squash: 0.085, push: 7, ripple: 0.15, rate: 22 },
  SNARE: { decay: 0.13, squash: 0.07, push: 5.5, ripple: 0.45, rate: 34 },
  PLUCK: { decay: 0.16, squash: 0.05, push: 3.2, ripple: 0.7, rate: 28 },
  BASS: { decay: 0.46, squash: 0.1, push: 11, ripple: 0.2, rate: 14 },
  SYNTH: { decay: 0.3, squash: 0.05, push: 4, ripple: 1, rate: 20 },
  CHORD: { decay: 0.34, squash: 0.06, push: 5, ripple: 0.85, rate: 12 },
}

export function axisFor(notation) {
  const face = notation[0]
  if (face === 'R' || face === 'L' || face === 'M') return 'x'
  if (face === 'U' || face === 'D' || face === 'E') return 'y'
  return 'z'
}

export function reactionProfile(voice) {
  return PROFILE[voice] || PROFILE.SYNTH
}

export function emitPulse(hit) {
  if (!hit?.notation) return
  const profile = reactionProfile(hit.voice)
  const event = {
    notation: hit.notation,
    voice: hit.voice,
    axis: axisFor(hit.notation),
    ...profile,
  }
  for (const listener of listeners) listener(event)
}

export function subscribePulse(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
