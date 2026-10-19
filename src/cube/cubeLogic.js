/**
 * Logical 3×3×3 cube.
 *
 * Coordinates: +X right, +Y up, +Z front. Positions are -1, 0, or 1.
 * A move's `dir` is a right-hand 90° turn around the positive axis.
 * Clockwise face turns (looking at that face from outside) are stored
 * explicitly on each move, because that direction is not the same sign
 * for every axis.
 *
 * Stickers live on cubies in local space. Rotating a layer moves the
 * cubie and its orientation; numbers are never rewritten.
 */

export const FACE_NAMES = ['R', 'L', 'U', 'D', 'F', 'B']

const AXIS_INDEX = { x: 0, y: 1, z: 2 }

export const MOVES = {
  R: { axis: 'x', layer: 1, dir: -1, clockwise: true, face: 'R' },
  "R'": { axis: 'x', layer: 1, dir: 1, clockwise: false, face: 'R' },
  L: { axis: 'x', layer: -1, dir: 1, clockwise: true, face: 'L' },
  "L'": { axis: 'x', layer: -1, dir: -1, clockwise: false, face: 'L' },
  U: { axis: 'y', layer: 1, dir: -1, clockwise: true, face: 'U' },
  "U'": { axis: 'y', layer: 1, dir: 1, clockwise: false, face: 'U' },
  D: { axis: 'y', layer: -1, dir: 1, clockwise: true, face: 'D' },
  "D'": { axis: 'y', layer: -1, dir: -1, clockwise: false, face: 'D' },
  F: { axis: 'z', layer: 1, dir: -1, clockwise: true, face: 'F' },
  "F'": { axis: 'z', layer: 1, dir: 1, clockwise: false, face: 'F' },
  B: { axis: 'z', layer: -1, dir: 1, clockwise: true, face: 'B' },
  "B'": { axis: 'z', layer: -1, dir: -1, clockwise: false, face: 'B' },
  M: { axis: 'x', layer: 0, dir: 1, clockwise: true, face: 'M' },
  "M'": { axis: 'x', layer: 0, dir: -1, clockwise: false, face: 'M' },
  E: { axis: 'y', layer: 0, dir: 1, clockwise: true, face: 'E' },
  "E'": { axis: 'y', layer: 0, dir: -1, clockwise: false, face: 'E' },
  S: { axis: 'z', layer: 0, dir: -1, clockwise: true, face: 'S' },
  "S'": { axis: 'z', layer: 0, dir: 1, clockwise: false, face: 'S' },
}

export const FACE_BUTTONS = [
  'R', "R'", 'L', "L'",
  'U', "U'", 'D', "D'",
  'F', "F'", 'B', "B'",
]

const WORLD_NORMALS = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

export function rotateVector(vector, axis, dir) {
  const x = vector[0]
  const y = vector[1]
  const z = vector[2]
  if (axis === 'x') return dir === 1 ? [x, -z, y] : [x, z, -y]
  if (axis === 'y') return dir === 1 ? [z, y, -x] : [-z, y, x]
  return dir === 1 ? [-y, x, z] : [y, -x, z]
}

export function stickerNumber(face, x, y, z) {
  let row = 0
  let col = 0
  if (face === 'F') {
    row = 1 - y
    col = x + 1
  } else if (face === 'B') {
    row = 1 - y
    col = 1 - x
  } else if (face === 'U') {
    row = z + 1
    col = x + 1
  } else if (face === 'D') {
    row = 1 - z
    col = x + 1
  } else if (face === 'R') {
    row = 1 - y
    col = 1 - z
  } else if (face === 'L') {
    row = 1 - y
    col = z + 1
  }
  return row * 3 + col + 1
}

function stickersFor(x, y, z) {
  const stickers = []
  if (x === 1) stickers.push({ local: 'R', n: stickerNumber('R', x, y, z) })
  if (x === -1) stickers.push({ local: 'L', n: stickerNumber('L', x, y, z) })
  if (y === 1) stickers.push({ local: 'U', n: stickerNumber('U', x, y, z) })
  if (y === -1) stickers.push({ local: 'D', n: stickerNumber('D', x, y, z) })
  if (z === 1) stickers.push({ local: 'F', n: stickerNumber('F', x, y, z) })
  if (z === -1) stickers.push({ local: 'B', n: stickerNumber('B', x, y, z) })
  return stickers
}

export function createSolvedCube() {
  const cubies = []
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue
        cubies.push({
          id: `${x},${y},${z}`,
          pos: [x, y, z],
          rot: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          stickers: stickersFor(x, y, z),
        })
      }
    }
  }
  return cubies
}

export function applyMove(cubies, notation) {
  const move = MOVES[notation]
  if (!move) throw new Error(`Unknown move: ${notation}`)
  const axisIndex = AXIS_INDEX[move.axis]
  return cubies.map((cubie) => {
    if (cubie.pos[axisIndex] !== move.layer) return cubie
    return {
      id: cubie.id,
      pos: rotateVector(cubie.pos, move.axis, move.dir),
      rot: cubie.rot.map((axis) => rotateVector(axis, move.axis, move.dir)),
      stickers: cubie.stickers,
    }
  })
}

export function inverseMove(notation) {
  return notation.endsWith("'") ? notation.slice(0, -1) : `${notation}'`
}

export function findMove(axis, layer, dir) {
  const found = Object.entries(MOVES).find(([, move]) => (
    move.axis === axis && move.layer === layer && move.dir === dir
  ))
  return found ? found[0] : null
}

export function describeMove(notation) {
  const move = MOVES[notation]
  if (!move) throw new Error(`Unknown move: ${notation}`)
  return {
    notation,
    face: move.face,
    direction: move.clockwise ? 'CW' : 'CCW',
    clockwise: move.clockwise,
    axis: move.axis,
    layer: move.layer,
    angle: move.dir * 90,
  }
}

function dominantUnit(vector) {
  if (!vector) return null
  const ax = Math.abs(vector[0])
  const ay = Math.abs(vector[1])
  const az = Math.abs(vector[2])
  const max = Math.max(ax, ay, az)
  if (max < 1e-6) return null
  if (ax === max) return [vector[0] >= 0 ? 1 : -1, 0, 0]
  if (ay === max) return [0, vector[1] >= 0 ? 1 : -1, 0]
  return [0, 0, vector[2] >= 0 ? 1 : -1]
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/**
 * Face drag → layer turn.
 * `normal` points out of the grabbed face, `drag` is the in-plane drag,
 * `position` is the grabbed cubie's grid coordinate.
 * Positive rotation is applied around (normal × drag).
 */
export function moveFromDrag(normal, drag, position) {
  const n = dominantUnit(normal)
  const d = dominantUnit(drag)
  if (!n || !d || dot(n, d) !== 0) return null
  const axisVector = cross(n, d)
  const axis = axisVector[0] !== 0 ? 'x' : axisVector[1] !== 0 ? 'y' : 'z'
  const sign = axisVector[AXIS_INDEX[axis]]
  if (!sign) return null
  const layer = position[AXIS_INDEX[axis]]
  return findMove(axis, layer, sign > 0 ? 1 : -1)
}

export function stickerWorldNormal(cubie, local) {
  const rot = cubie.rot
  if (local === 'R') return [...rot[0]]
  if (local === 'L') return [-rot[0][0], -rot[0][1], -rot[0][2]]
  if (local === 'U') return [...rot[1]]
  if (local === 'D') return [-rot[1][0], -rot[1][1], -rot[1][2]]
  if (local === 'F') return [...rot[2]]
  return [-rot[2][0], -rot[2][1], -rot[2][2]]
}

export function cellOnFace(face, pos) {
  const [x, y, z] = pos
  if (face === 'F') return { row: 1 - y, col: x + 1 }
  if (face === 'B') return { row: 1 - y, col: 1 - x }
  if (face === 'U') return { row: z + 1, col: x + 1 }
  if (face === 'D') return { row: 1 - z, col: x + 1 }
  if (face === 'R') return { row: 1 - y, col: 1 - z }
  return { row: 1 - y, col: z + 1 }
}

function sameVector(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function getFaceGrids(cubies) {
  const grids = {
    U: [[null, null, null], [null, null, null], [null, null, null]],
    D: [[null, null, null], [null, null, null], [null, null, null]],
    F: [[null, null, null], [null, null, null], [null, null, null]],
    B: [[null, null, null], [null, null, null], [null, null, null]],
    R: [[null, null, null], [null, null, null], [null, null, null]],
    L: [[null, null, null], [null, null, null], [null, null, null]],
  }
  for (const cubie of cubies) {
    for (const sticker of cubie.stickers) {
      const normal = stickerWorldNormal(cubie, sticker.local)
      const face = FACE_NAMES.find((name) => sameVector(WORLD_NORMALS[name], normal))
      if (!face) continue
      const { row, col } = cellOnFace(face, cubie.pos)
      grids[face][row][col] = sticker.n
    }
  }
  return grids
}

export function cloneCube(cubies) {
  return cubies.map((cubie) => ({
    id: cubie.id,
    pos: [...cubie.pos],
    rot: cubie.rot.map((axis) => [...axis]),
    stickers: cubie.stickers.map((sticker) => ({ ...sticker })),
  }))
}

export function cubeSignature(cubies) {
  return cubies
    .map((cubie) => [
      cubie.id,
      cubie.pos.join(','),
      cubie.rot.map((axis) => axis.join(',')).join(';'),
      cubie.stickers.map((sticker) => `${sticker.local}${sticker.n}`).join(''),
    ].join('|'))
    .sort()
    .join('\n')
}

export function validateCube(cubies) {
  const errors = []
  if (cubies.length !== 26) errors.push(`expected 26 cubies, got ${cubies.length}`)

  const positions = new Set()
  let stickerCount = 0
  for (const cubie of cubies) {
    const key = cubie.pos.join(',')
    if (positions.has(key)) errors.push(`duplicate position ${key}`)
    positions.add(key)
    if (cubie.pos[0] === 0 && cubie.pos[1] === 0 && cubie.pos[2] === 0) {
      errors.push('core cubie exists')
    }
    for (const value of cubie.pos) {
      if (value !== -1 && value !== 0 && value !== 1) errors.push(`bad position ${key}`)
    }
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        const product = cubie.rot[i][0] * cubie.rot[j][0]
          + cubie.rot[i][1] * cubie.rot[j][1]
          + cubie.rot[i][2] * cubie.rot[j][2]
        const expected = i === j ? 1 : 0
        if (product !== expected) errors.push(`orientation not orthonormal on ${cubie.id}`)
      }
    }
    for (const sticker of cubie.stickers) {
      stickerCount += 1
      const normal = stickerWorldNormal(cubie, sticker.local)
      const axis = normal[0] !== 0 ? 0 : normal[1] !== 0 ? 1 : 2
      if (cubie.pos[axis] !== normal[axis]) {
        errors.push(`sticker ${sticker.local}${sticker.n} on ${cubie.id} does not face outward`)
      }
    }
  }

  if (stickerCount !== 54) errors.push(`expected 54 stickers, got ${stickerCount}`)

  const grids = getFaceGrids(cubies)
  for (const face of FACE_NAMES) {
    const values = grids[face].flat()
    if (values.some((value) => value == null)) errors.push(`hole on face ${face}`)
  }
  return errors
}

export function generateScramble(length = 20, random = Math.random) {
  const sequence = []
  let previous = null
  while (sequence.length < length) {
    const face = FACE_NAMES[Math.floor(random() * FACE_NAMES.length)]
    if (face === previous) continue
    previous = face
    sequence.push(random() < 0.5 ? `${face}'` : face)
  }
  return sequence
}

export function applySequence(cubies, sequence) {
  return sequence.reduce((state, notation) => applyMove(state, notation), cubies)
}

export function formatGrid(grid) {
  return grid.map((row) => row.map((value) => value ?? '·').join(' ')).join('\n')
}
