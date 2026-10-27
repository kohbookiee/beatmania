import assert from 'node:assert/strict'
import test from 'node:test'
import { MOVES, applyMove, createSolvedCube, getFaceGrids } from '../src/cube/cubeLogic.js'
import { cycleVoices, orbitAngle, ringTurn, spinSign } from '../src/cube/orbits.js'

function wrap(delta) {
  let value = delta
  while (value > Math.PI) value -= Math.PI * 2
  while (value <= -Math.PI) value += Math.PI * 2
  return value
}

test('a quarter turn slides every bead on that orbit by 90 degrees', () => {
  const solved = createSolvedCube()
  for (const notation of Object.keys(MOVES)) {
    const before = cycleVoices(solved, notation)
    const moved = applyMove(solved, notation)
    const move = MOVES[notation]
    const expected = spinSign(move.axis) * move.dir * (Math.PI / 2)
    assert.equal(before.length, 8, notation)
    for (const voice of before) {
      const cubie = moved.find((item) => item.id === voice.cubieId)
      const next = orbitAngle(cubie.pos, move.axis)
      const delta = wrap(next - voice.angle)
      assert.ok(Math.abs(delta - expected) < 1e-6, `${notation} ${voice.cubieId}`)
    }
  }
})

test('a face cycle sounds the eight numbered stickers around that face', () => {
  const solved = createSolvedCube()
  const grids = getFaceGrids(solved)
  for (const face of ['R', 'L', 'U', 'D', 'F', 'B']) {
    const voices = cycleVoices(solved, face)
    const numbers = new Set(grids[face].flat().filter((value) => value !== 5))
    assert.equal(voices.length, 8)
    assert.deepEqual(new Set(voices.map((voice) => voice.n)), numbers)
    assert.ok(voices.every((voice) => voice.local === face))
    const midi = voices.map((voice) => voice.midi)
    assert.equal(new Set(midi).size, 8)
  }
})

test('a clockwise drag on a ring turns that layer the same way as the cube', () => {
  assert.equal(ringTurn('y', 1, true), 'U')
  assert.equal(ringTurn('y', 1, false), "U'")
  assert.equal(ringTurn('y', 0, true), "E'")
  assert.equal(ringTurn('y', -1, true), "D'")
  assert.equal(ringTurn('x', 1, true), 'R')
  assert.equal(ringTurn('x', 1, false), "R'")
  assert.equal(ringTurn('x', 0, false), 'M')
  assert.equal(ringTurn('x', -1, false), 'L')
  assert.equal(ringTurn('z', 1, true), "F'")
  assert.equal(ringTurn('z', 1, false), 'F')
  assert.equal(ringTurn('z', 0, true), "S'")
  assert.equal(ringTurn('z', -1, true), 'B')
  assert.equal(ringTurn('z', 2, true), '')
})

test('the opposite turn reverses the order of the same cycle', () => {
  const solved = createSolvedCube()
  const forward = cycleVoices(solved, 'L').map((voice) => voice.cubieId)
  const back = cycleVoices(solved, "L'").map((voice) => voice.cubieId)
  assert.deepEqual(back, [...forward].reverse())
})
