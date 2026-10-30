let mod = null
let loading = null
let speaker = null
let speakerOpen = false

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

function ready() {
  if (!loading) {
    loading = import('./permutationSound.js').then((loaded) => {
      mod = loaded
      return loaded
    })
  }
  return loading
}

function unlockSpeaker() {
  if (typeof Audio === 'undefined') return
  if (!speaker) {
    speaker = new Audio(SILENT_WAV)
    speaker.playsInline = true
    speaker.setAttribute('playsinline', 'true')
    speaker.setAttribute('webkit-playsinline', 'true')
    speaker.preload = 'auto'
  }
  if (speakerOpen) return
  const pending = speaker.play()
  if (pending && typeof pending.then === 'function') {
    pending.then(() => { speakerOpen = true }).catch(() => {})
  } else {
    speakerOpen = true
  }
}

export function preloadAudio() {
  return ready()
}

export function unlockAudio() {
  unlockSpeaker()
  if (mod) return Promise.resolve(mod.unlockAudio())
  return ready().then((api) => api.unlockAudio())
}

export function playHit(hit, time) {
  unlockSpeaker()
  if (mod) return mod.playHit(hit, time)
  return ready().then((api) => api.playHit(hit, time))
}

export function silence() {
  if (mod) mod.silence()
  else ready().then((api) => api.silence())
}

export function followBpm(value) {
  if (mod) mod.followBpm(value)
  else ready().then((api) => api.followBpm(value))
}

export function loopBeat() {
  return mod ? mod.loopBeat() : -1
}

export function stopLoop() {
  if (mod) mod.stopLoop()
  else ready().then((api) => api.stopLoop())
}

export function startLoop(pattern, onStep) {
  return ready().then((api) => api.startLoop(pattern, onStep))
}
