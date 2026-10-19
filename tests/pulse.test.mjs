import assert from 'node:assert/strict'
import test from 'node:test'
import { axisFor, reactionProfile } from '../src/audio/pulse.js'

test('each face plays its own circle', () => {
  assert.equal(axisFor('R'), 'x')
  assert.equal(axisFor("L'"), 'x')
  assert.equal(axisFor('D'), 'y')
  assert.equal(axisFor('U'), 'y')
  assert.equal(axisFor('F'), 'z')
  assert.equal(axisFor('B'), 'z')
})

test('bass pushes longer and harder than a pluck', () => {
  const bass = reactionProfile('BASS')
  const pluck = reactionProfile('PLUCK')
  assert.ok(bass.decay > pluck.decay * 2)
  assert.ok(bass.push > pluck.push * 2)
  assert.ok(bass.squash > pluck.squash)
})
