import { FACE_NAMES, cellOnFace, stickerWorldNormal } from './cubeLogic.js'

const FACE_AXES = {
  F: { right: [1, 0, 0], up: [0, 1, 0] },
  B: { right: [-1, 0, 0], up: [0, 1, 0] },
  U: { right: [1, 0, 0], up: [0, 0, -1] },
  D: { right: [1, 0, 0], up: [0, 0, 1] },
  R: { right: [0, 0, -1], up: [0, 1, 0] },
  L: { right: [0, 0, 1], up: [0, 1, 0] },
}

const STICKER_AXES = {
  F: { right: [1, 0, 0], up: [0, 1, 0] },
  B: { right: [-1, 0, 0], up: [0, 1, 0] },
  R: { right: [0, 0, -1], up: [0, 1, 0] },
  L: { right: [0, 0, 1], up: [0, 1, 0] },
  U: { right: [1, 0, 0], up: [0, 0, -1] },
  D: { right: [1, 0, 0], up: [0, 0, 1] },
}

function sameVector(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function worldAxis(rot, local) {
  return [
    local[0] * rot[0][0] + local[1] * rot[1][0] + local[2] * rot[2][0],
    local[0] * rot[0][1] + local[1] * rot[1][1] + local[2] * rot[2][1],
    local[0] * rot[0][2] + local[1] * rot[1][2] + local[2] * rot[2][2],
  ]
}

function quarterTurn(up, faceRight, faceUp) {
  const x = dot(up, faceRight)
  const y = dot(up, faceUp)
  if (y > 0.5 && Math.abs(x) < 0.5) return 0
  if (x > 0.5 && Math.abs(y) < 0.5) return 1
  if (y < -0.5 && Math.abs(x) < 0.5) return 2
  if (x < -0.5 && Math.abs(y) < 0.5) return 3
  return 0
}

export function cellCode(face, index) {
  return `${face}-${String(index).padStart(2, '0')}`
}

export function stickerCode(local, number) {
  return `${local}-${String(number).padStart(2, '0')}`
}

const WORLD_NORMALS = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

export function getNet(cubies) {
  const faces = {}
  for (const face of FACE_NAMES) {
    faces[face] = Array.from({ length: 9 }, () => null)
  }

  for (const cubie of cubies) {
    for (const sticker of cubie.stickers) {
      const normal = stickerWorldNormal(cubie, sticker.local)
      const face = FACE_NAMES.find((name) => sameVector(WORLD_NORMALS[name], normal))
      if (!face) continue
      const { row, col } = cellOnFace(face, cubie.pos)
      const index = row * 3 + col + 1
      const up = worldAxis(cubie.rot, STICKER_AXES[sticker.local].up)
      faces[face][index - 1] = {
        cellId: cellCode(face, index),
        stickerId: stickerCode(sticker.local, sticker.n),
        face,
        index,
        row,
        col,
        n: sticker.n,
        local: sticker.local,
        cubieId: cubie.id,
        turn: quarterTurn(up, FACE_AXES[face].right, FACE_AXES[face].up),
        spin: sticker.spin || 0,
      }
    }
  }

  return faces
}

export function pathEvent(cell, order) {
  const lane = (FACE_NAMES.indexOf(cell.face) * 2 + (cell.index % 4)) % 8
  return {
    order,
    cellId: cell.cellId,
    stickerId: cell.stickerId,
    face: cell.face,
    index: cell.index,
    cubieId: cell.cubieId,
    note: null,
    lane,
  }
}
