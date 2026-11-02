let mod = null
let loading = null
let speaker = null
let speakerOpen = false

function ready() {
  if (!loading) {
    loading = import('./permutationSound.js').then((loaded) => {
      mod = loaded
      return loaded
    })
  }
  return loading
}

function silentWavUrl() {
  const rate = 8000
  const samples = rate
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i += 1) view.setInt16(44 + i * 2, i % 200 === 0 ? 1 : 0, true)
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

function unlockSpeaker() {
  if (typeof Audio === 'undefined') return
  if (!speaker) {
    speaker = document.createElement('audio')
    speaker.src = silentWavUrl()
    speaker.loop = true
    speaker.playsInline = true
    speaker.setAttribute('playsinline', 'true')
    speaker.setAttribute('webkit-playsinline', 'true')
    speaker.preload = 'auto'
    speaker.setAttribute('aria-hidden', 'true')
    speaker.style.display = 'none'
    if (document.body) document.body.appendChild(speaker)
  }
  if (speakerOpen && !speaker.paused) return
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
