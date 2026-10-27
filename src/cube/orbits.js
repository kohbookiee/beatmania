import { MOVES, stickerWorldNormal } from './cubeLogic.js'

export const GROUPS = {
  y: { cx: 240, cy: 146 },
  x: { cx: 164, cy: 274 },
  z: { cx: 316, cy: 274 },
}

const RING_RADIUS = { 1: 122, 0: 110, '-1': 98 }
const AXIS_INDEX = { x: 0, y: 1, z: 2 }

export const STICKER_COLOR = {
  R: '#e23d32',
  L: '#ef8c28',
  U: '#f7f7f4',
  D: '#f0d12e',
  F: '#3caf49',
  B: '#3a6fe8',
}

const DEGREE = [0, 2, 4, 5, 7, 9, 11, 12, 14]
const BASE = { '-1': 48, 0: 60, 1: 72 }

export function spinSign(axis) {
  return axis === 'z' ? 1 : -1
}

export function orbitAngle(pos, axis) {
  const [x, y, z] = pos
  if (axis === 'x') return Math.atan2(y, z)
  if (axis === 'y') return Math.atan2(z, x)
  return Math.atan2(y, x)
}

export function isHub(pos, axis) {
  const [x, y, z] = pos
  if (axis === 'x') return y === 0 && z === 0
  if (axis === 'y') return x === 0 && z === 0
  return x === 0 && y === 0
}

export function stickerOnAxis(cubie, axis) {
  const index = AXIS_INDEX[axis]
  for (const sticker of cubie.stickers) {
    const normal = stickerWorldNormal(cubie, sticker.local)
    const ax = Math.abs(normal[0])
    const ay = Math.abs(normal[1])
    const az = Math.abs(normal[2])
    const dominant = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2
    if (dominant === index) return sticker
  }
  return cubie.stickers[0]
}

export function displayAngle(pos, axis, partial) {
  let angle = orbitAngle(pos, axis)
  if (
    partial
    && partial.axis === axis
    && pos[AXIS_INDEX[axis]] === partial.layer
    && !isHub(pos, axis)
  ) {
    angle += spinSign(axis) * partial.dir * partial.progress * (Math.PI / 2)
  }
  return angle
}

function pushDot(dots, cubie, axis, partial, refreshColor) {
  if (isHub(cubie.pos, axis)) return
  const layer = cubie.pos[AXIS_INDEX[axis]]
  const angle = displayAngle(cubie.pos, axis, partial)
  const group = GROUPS[axis]
  const radius = RING_RADIUS[layer]
  let dot = dots[dots.length]
  if (!dot) {
    dot = { id: `${cubie.id}:${axis}` }
    dots.push(dot)
  }
  if (refreshColor || dot.color == null) {
    const sticker = stickerOnAxis(cubie, axis)
    dot.n = sticker.n
    dot.local = sticker.local
    dot.color = STICKER_COLOR[sticker.local]
  }
  dot.cubieId = cubie.id
  dot.axis = axis
  dot.layer = layer
  dot.angle = angle
  dot.x = group.cx + Math.cos(angle) * radius
  dot.y = group.cy + Math.sin(angle) * radius
  dot.active = Boolean(partial && partial.axis === axis && layer === partial.layer)
}

export function orbitDots(cubies, partial) {
  const dots = []
  for (const cubie of cubies) {
    for (const axis of ['x', 'y', 'z']) pushDot(dots, cubie, axis, partial, true)
  }
  return dots
}

const liveDots = []
let coloredCube = null

export function layoutOrbitDots(cubies, partial) {
  const refreshColor = cubies !== coloredCube
  let index = 0
  for (const cubie of cubies) {
    for (const axis of ['x', 'y', 'z']) {
      if (isHub(cubie.pos, axis)) continue
      const layer = cubie.pos[AXIS_INDEX[axis]]
      const angle = displayAngle(cubie.pos, axis, partial)
      const group = GROUPS[axis]
      const radius = RING_RADIUS[layer]
      let dot = liveDots[index]
      if (!dot) {
        dot = {}
        liveDots[index] = dot
      }
      dot.id = `${cubie.id}:${axis}`
      dot.axis = axis
      if (refreshColor || dot.color == null) {
        const sticker = stickerOnAxis(cubie, axis)
        dot.color = STICKER_COLOR[sticker.local]
      }
      dot.x = group.cx + Math.cos(angle) * radius
      dot.y = group.cy + Math.sin(angle) * radius
      dot.active = Boolean(partial && partial.axis === axis && layer === partial.layer)
      index += 1
    }
  }
  liveDots.length = index
  if (refreshColor) coloredCube = cubies
  return liveDots
}

const RING_TURN = {
  x: { 1: ['R', "R'"], 0: ["M'", 'M'], '-1': ["L'", 'L'] },
  y: { 1: ['U', "U'"], 0: ["E'", 'E'], '-1': ["D'", 'D'] },
  z: { 1: ["F'", 'F'], 0: ["S'", 'S'], '-1': ['B', "B'"] },
}

export function ringTurn(axis, layer, clockwise) {
  const pair = RING_TURN[axis]?.[layer]
  if (!pair) return ''
  return clockwise ? pair[0] : pair[1]
}

export function midiFor(voice) {
  return BASE[String(voice.layer)] + DEGREE[voice.n - 1]
}

export function cycleVoices(cubies, notation) {
  const move = MOVES[notation]
  if (!move) return []
  const sign = spinSign(move.axis) * move.dir
  const voices = []
  for (const cubie of cubies) {
    if (cubie.pos[AXIS_INDEX[move.axis]] !== move.layer) continue
    if (isHub(cubie.pos, move.axis)) continue
    const sticker = stickerOnAxis(cubie, move.axis)
    voices.push({
      cubieId: cubie.id,
      n: sticker.n,
      local: sticker.local,
      angle: orbitAngle(cubie.pos, move.axis),
      axis: move.axis,
      layer: move.layer,
    })
  }
  voices.sort((a, b) => (sign >= 0 ? a.angle - b.angle : b.angle - a.angle))
  return voices.map((voice) => ({ ...voice, midi: midiFor(voice) }))
}
