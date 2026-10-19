import assert from 'node:assert/strict'
import test from 'node:test'
import { hitFor } from '../src/audio/kit.js'
import { createSolvedCube } from '../src/cube/cubeLogic.js'

test('the example composition maps each turn to an electronic voice', () => {
  const solved = createSolvedCube()
  const sequence = ['R', 'U', 'F', 'L', "R'", 'B']
  const voices = ['KICK', 'PLUCK', 'SYNTH', 'SNARE', 'KICK', 'CHORD']
  sequence.forEach((notation, index) => {
    const hit = hitFor(notation, solved)
    assert.equal(hit.voice, voices[index], notation)
    assert.equal(hit.notation, notation)
  })
})

test('every face has a kit voice and melodic hits carry a note', () => {
  const solved = createSolvedCube()
  const expected = { D: 'BASS', "D'": 'BASS', "U'": 'PLUCK', "F'": 'SYNTH', "B'": 'CHORD', "L'": 'SNARE' }
  for (const [notation, voice] of Object.entries(expected)) {
    const hit = hitFor(notation, solved)
    assert.equal(hit.voice, voice)
    assert.match(hit.note, /^[A-G]#?\d$/)
  }
  const forward = hitFor('F', solved)
  const back = hitFor("F'", solved)
  assert.notEqual(forward.note, back.note)
})
