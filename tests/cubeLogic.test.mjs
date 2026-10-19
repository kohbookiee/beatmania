import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FACE_NAMES,
  MOVES,
  applyMove,
  applySequence,
  createSolvedCube,
  cubeSignature,
  findMove,
  formatGrid,
  generateScramble,
  getFaceGrids,
  inverseMove,
  moveFromDrag,
  stickerWorldNormal,
  validateCube,
} from '../src/cube/cubeLogic.js'

const SOLVED_ROWS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
]

function assertValid(cubies, label) {
  const errors = validateCube(cubies)
  assert.deepEqual(errors, [], `${label}: ${errors.join('; ')}`)
}

function assertSolved(cubies, label) {
  assert.equal(cubeSignature(cubies), cubeSignature(createSolvedCube()), label)
  for (const face of FACE_NAMES) {
    assert.deepEqual(getFaceGrids(cubies)[face], SOLVED_ROWS, `${label} face ${face}\n${formatGrid(getFaceGrids(cubies)[face])}`)
  }
}

test('solved cube has 26 cubies and ordered 1–9 faces', () => {
  const cubies = createSolvedCube()
  assertValid(cubies, 'solved')
  assertSolved(cubies, 'solved')
  const numbers = cubies.flatMap((cubie) => cubie.stickers.map((sticker) => sticker.n))
  for (let n = 1; n <= 9; n += 1) {
    assert.equal(numbers.filter((value) => value === n).length, 6)
  }
})

test('every axis, layer, and direction maps to one move', () => {
  for (const axis of ['x', 'y', 'z']) {
    for (const layer of [-1, 0, 1]) {
      for (const dir of [-1, 1]) {
        const notation = findMove(axis, layer, dir)
        assert.ok(notation, `${axis} ${layer} ${dir}`)
        assert.equal(MOVES[notation].axis, axis)
        assert.equal(MOVES[notation].layer, layer)
        assert.equal(MOVES[notation].dir, dir)
      }
    }
  }
})

test('each move four times, and each move followed by its inverse, returns to solved', () => {
  for (const notation of Object.keys(MOVES)) {
    let cubies = createSolvedCube()
    for (let i = 0; i < 4; i += 1) cubies = applyMove(cubies, notation)
    assertSolved(cubies, `${notation} × 4`)

    cubies = applyMove(applyMove(createSolvedCube(), notation), inverseMove(notation))
    assertSolved(cubies, `${notation} then ${inverseMove(notation)}`)
    assertValid(applyMove(createSolvedCube(), notation), notation)
  }
})

test('R cycles the right layer clockwise and carries stickers with the cubie', () => {
  const turned = applyMove(createSolvedCube(), 'R')
  const moved = turned.find((cubie) => cubie.id === '1,1,1')
  assert.deepEqual(moved.pos, [1, 1, -1])

  const untouched = turned.find((cubie) => cubie.id === '-1,1,1')
  assert.deepEqual(untouched.pos, [-1, 1, 1])
  assert.deepEqual(untouched.rot, [[1, 0, 0], [0, 1, 0], [0, 0, 1]])

  const grids = getFaceGrids(turned)
  assert.equal(grids.B[0][0], 9)
  assert.equal(grids.U[0][2], 3)
  assert.equal(grids.R[0][2], 1)

  const upNormal = stickerWorldNormal(moved, 'U')
  assert.deepEqual(upNormal, [0, 0, -1])
})

test('a long scramble stays legal and reverses to solved', () => {
  let seed = 20261019
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const sequence = generateScramble(80, random)
  const scrambled = applySequence(createSolvedCube(), sequence)
  assertValid(scrambled, 'scramble')
  assert.notEqual(cubeSignature(scrambled), cubeSignature(createSolvedCube()))

  const back = [...sequence].reverse().map(inverseMove)
  assertSolved(applySequence(scrambled, back), 'unscramble')
})

test('face drags select the layer under the pointer', () => {
  assert.equal(moveFromDrag([0, 0, 1], [0, 1, 0], [1, 0, 1]), 'R')
  assert.equal(moveFromDrag([0, 0, 1], [0, -1, 0], [1, 0, 1]), "R'")
  assert.equal(moveFromDrag([0, 0, 1], [1, 0, 0], [0, 1, 1]), "U'")
  assert.equal(moveFromDrag([0, 0, 1], [-1, 0, 0], [0, 1, 1]), 'U')
  assert.equal(moveFromDrag([1, 0, 0], [0, 1, 0], [1, 0, 1]), "F'")
  assert.equal(moveFromDrag([0, 0, 1], [1, 0, 0], [0, 0, 1]), 'E')
  assert.equal(moveFromDrag([0, 1, 0], [1, 0, 0], [0, 1, 0]), 'S')
  assert.equal(moveFromDrag([0, 0, 1], [0, 0, 1], [0, 0, 1]), null)
})
