import * as Tone from 'tone'
import { getBpm } from './kit.js'
import { emitPulse } from './pulse.js'

const bus = new Tone.Compressor({ threshold: -14, ratio: 4, attack: 0.003, release: 0.1 })
const limiter = new Tone.Limiter(-1.5).toDestination()
bus.connect(limiter)

const growl = new Tone.Distortion(0.72)
const scream = new Tone.Distortion(0.48)
const crush = new Tone.BitCrusher(5)
growl.connect(bus)
scream.connect(bus)
crush.connect(bus)

const kick = new Tone.MembraneSynth({
  pitchDecay: 0.02,
  octaves: 7,
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.04 },
}).connect(bus)
kick.volume.value = -2

const kickClick = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.001, decay: 0.008, sustain: 0, release: 0.008 },
})
const clickFilter = new Tone.Filter(4500, 'highpass')
kickClick.connect(clickFilter)
clickFilter.connect(crush)
kickClick.volume.value = -14

const snareBody = new Tone.FMSynth({
  harmonicity: 4.2,
  modulationIndex: 8,
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.03 },
  modulation: { type: 'square' },
  modulationEnvelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
}).connect(scream)
snareBody.volume.value = -12

const snareNoise = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.03 },
})
const snareFilter = new Tone.Filter({ type: 'bandpass', frequency: 2400, Q: 1.4 })
snareNoise.connect(snareFilter)
snareFilter.connect(bus)
snareNoise.volume.value = -8

const pluck = new Tone.Synth({
  oscillator: { type: 'square' },
  envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.05 },
}).connect(bus)
pluck.volume.value = -6

const chord = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.006, decay: 0.2, sustain: 0.04, release: 0.14 },
}).connect(bus)
chord.volume.value = -10
chord.maxPolyphony = 6

const bass = new Tone.FMSynth({
  harmonicity: 0.7,
  modulationIndex: 28,
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.002, decay: 0.13, sustain: 0, release: 0.05 },
  modulation: { type: 'square' },
  modulationEnvelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
}).connect(growl)
bass.volume.value = -20

const stab = new Tone.FMSynth({
  harmonicity: 2.4,
  modulationIndex: 18,
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.002, decay: 0.11, sustain: 0, release: 0.05 },
  modulation: { type: 'square' },
  modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
}).connect(scream)
stab.volume.value = -18

const log = []
let loopId = null

function publish(entry) {
  log.push(entry)
  if (log.length > 48) log.shift()
  window.__CHILDREN_PLAY_SOUND__ = {
    context: Tone.context.state,
    last: entry,
    log: log.slice(),
  }
}

function trigger(hit, time) {
  const velocity = hit.prime ? 0.78 : 0.96
  if (hit.voice === 'KICK') {
    kick.triggerAttackRelease(hit.note, '16n', time, velocity)
    kickClick.triggerAttackRelease('64n', time, 0.55)
  } else if (hit.voice === 'SNARE') {
    snareBody.triggerAttackRelease(hit.prime ? 'G4' : 'C4', '32n', time, velocity)
    snareFilter.frequency.setValueAtTime(hit.prime ? 4200 : 2800, time)
    snareFilter.frequency.exponentialRampToValueAtTime(380, time + 0.07)
    snareNoise.triggerAttackRelease('32n', time, 0.85)
  } else if (hit.voice === 'PLUCK') {
    pluck.triggerAttackRelease(hit.note, hit.prime ? '8n' : '16n', time, 0.9)
  } else if (hit.voice === 'BASS') {
    const freq = Tone.Frequency(hit.note).toFrequency()
    bass.triggerAttackRelease(hit.note, '16n', time, velocity)
    bass.frequency.setValueAtTime(freq * (hit.prime ? 2 : 1.6), time)
    bass.frequency.exponentialRampToValueAtTime(Math.max(36, freq * 0.55), time + 0.12)
  } else if (hit.voice === 'CHORD') {
    const root = Tone.Frequency(hit.note)
    const tones = hit.prime
      ? [root.toNote(), root.transpose(3).toNote(), root.transpose(10).toNote()]
      : [root.toNote(), root.transpose(7).toNote(), root.transpose(12).toNote()]
    chord.triggerAttackRelease(tones, '8n', time, 0.72)
  } else {
    const freq = Tone.Frequency(hit.note).toFrequency()
    stab.triggerAttackRelease(hit.note, '16n', time, 0.75)
    stab.frequency.setValueAtTime(freq * 1.8, time)
    stab.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.7), time + 0.1)
  }
  publish({ notation: hit.notation, voice: hit.voice, note: hit.note })
  const delay = typeof time === 'number' ? Math.max(0, (time - Tone.now()) * 1000) : 0
  if (delay < 12) emitPulse(hit)
  else setTimeout(() => emitPulse(hit), delay)
}

export function unlockAudio() {
  if (Tone.context.state === 'running') return Promise.resolve()
  return Tone.start()
}

export function silence() {
  kick.triggerRelease()
  snareBody.triggerRelease()
  bass.triggerRelease()
  stab.triggerRelease()
  pluck.triggerRelease()
  chord.releaseAll()
}

export function playHit(hit, time) {
  if (!hit) return
  if (Tone.context.state !== 'running') {
    Tone.start().then(() => trigger(hit, Tone.now() + 0.02)).catch(() => {})
    return
  }
  trigger(hit, time ?? Tone.now() + 0.01)
}

export function followBpm(value) {
  if (loopId !== null) Tone.Transport.bpm.value = value
}

export function loopBeat() {
  if (loopId === null || Tone.Transport.state !== 'started') return -1
  return (Tone.Transport.seconds * Tone.Transport.bpm.value) / 60
}

export function stopLoop() {
  if (loopId !== null) {
    Tone.Transport.clear(loopId)
    loopId = null
  }
  Tone.Transport.stop()
  Tone.Transport.cancel()
  Tone.Transport.position = 0
}

export async function startLoop(pattern, onStep) {
  if (!pattern.length) return
  await unlockAudio()
  stopLoop()
  let step = 0
  Tone.Transport.bpm.value = getBpm()
  loopId = Tone.Transport.scheduleRepeat((time) => {
    const index = step % pattern.length
    step += 1
    trigger(pattern[index], time)
    Tone.getDraw().schedule(() => onStep(index), time)
  }, '4n', 0)
  Tone.Transport.start()
}
