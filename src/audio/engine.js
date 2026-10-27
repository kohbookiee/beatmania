let mod = null
let loading = null

function ready() {
  if (!loading) {
    loading = import('./permutationSound.js').then((loaded) => {
      mod = loaded
      return loaded
    })
  }
  return loading
}

export function preloadAudio() {
  return ready()
}

export function unlockAudio() {
  return ready().then((api) => api.unlockAudio())
}

export function playHit(hit, time) {
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
