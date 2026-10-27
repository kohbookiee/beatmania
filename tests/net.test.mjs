import assert from 'node:assert/strict'
import test from 'node:test'
import { applyMove, createSolvedCube, getFaceGrids } from '../src/cube/cubeLogic.js'
import { getNet } from '../src/cube/net.js'

test('a solved net shows each photo upright in its home cell', () => {
  const faces = getNet(createSolvedCube())
  for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
    assert.equal(faces[face].length, 9)
    faces[face].forEach((cell, index) => {
      assert.equal(cell.n, index + 1)
      assert.equal(cell.local, face)
      assert.equal(cell.turn, 0)
      assert.equal(cell.cellId, `${face}-${String(index + 1).padStart(2, '0')}`)
      assert.equal(cell.stickerId, cell.cellId)
    })
  }
  const ids = Object.values(faces).flat().map((cell) => cell.stickerId)
  assert.equal(new Set(ids).size, 54)
})

test('a face turn moves the same stickers onto the net', () => {
  const turned = applyMove(createSolvedCube(), 'R')
  const grids = getFaceGrids(turned)
  const faces = getNet(turned)
  for (const face of Object.keys(grids)) {
    const numbers = faces[face].map((cell) => cell.n)
    assert.deepEqual(numbers, grids[face].flat())
    for (const cell of faces[face]) assert.ok(cell.turn >= 0 && cell.turn <= 3)
  }
  const moved = faces.B.find((cell) => cell.cubieId === '1,1,1')
  assert.ok(moved)
  assert.notEqual(moved.local, 'B')
})
