import { useEffect, useMemo, useRef, useState } from 'react'
import { getBpm, hitForFace, setBpm, subscribeBpm } from '../audio/kit.js'
import { followBpm, playHit, silence, startLoop, stopLoop, unlockAudio } from '../audio/permutationSound.js'
import { FACE_NAMES } from '../cube/cubeLogic.js'
import { getNet, pathEvent } from '../cube/net.js'
import { useCube } from '../cube/cubeState.jsx'
import { TempoRail } from './ControlPanel.jsx'
import CubeNet from './CubeNet.jsx'
import GeneratedScore from './GeneratedScore.jsx'
import SoundPath from './SoundPath.jsx'
import SoundSequence from './SoundSequence.jsx'

export default function ScorePage({ active = true }) {
  const { cubies, history, solving, playAnswer, playing: cubePlaying } = useCube()
  const [path, setPath] = useState([])
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(-1)
  const [bpm, setTempo] = useState(getBpm)
  const [song, setSong] = useState(null)
  const pathRef = useRef(path)
  const playingRef = useRef(false)
  const toggleRef = useRef(() => {})
  const armed = useRef(false)
  const cells = useMemo(() => {
    const faces = getNet(cubies)
    return new Map(Object.values(faces).flat().map((cell) => [cell.cellId, cell]))
  }, [cubies])
  const dragEvents = path.flatMap((id, order) => {
    const cell = cells.get(id)
    if (!cell) return []
    const hit = hitForFace(cell.face, cell.n)
    return [{ ...pathEvent(cell, order), note: hit.note, voice: hit.voice, prime: false }]
  })
  const events = song ?? dragEvents

  function playCell(id) {
    const cell = cells.get(id)
    if (!cell) return
    unlockAudio()
    playHit(hitForFace(cell.face, cell.n))
  }

  function stopScore() {
    playingRef.current = false
    stopLoop()
    silence()
    setPlaying(false)
    setStep(-1)
  }

  function changePath(next) {
    armed.current = false
    setSong(null)
    const current = pathRef.current
    const resolved = typeof next === 'function' ? next(current) : next
    let added = null
    if (resolved.length > current.length) added = resolved[resolved.length - 1]
    else if (resolved.length === 1 && (current.length !== 1 || current[0] !== resolved[0])) added = resolved[0]
    if (playingRef.current) stopScore()
    pathRef.current = resolved
    setPath(resolved)
    if (added) playCell(added)
  }

  async function togglePlay() {
    if (playingRef.current) {
      stopScore()
      return
    }
    const pattern = events.map((event) => ({
      notation: event.face,
      voice: event.voice,
      note: event.note,
      prime: Boolean(event.prime),
    }))
    if (!pattern.length) return
    playingRef.current = true
    setPlaying(true)
    setStep(0)
    await startLoop(pattern, (index) => {
      if (!playingRef.current) return
      setStep(index)
    })
    if (!playingRef.current) stopLoop()
  }

  function solvePuzzle() {
    if (solving || cubePlaying) return
    stopScore()
    armed.current = true
    setSong([])
    pathRef.current = []
    setPath([])
    playAnswer()
  }

  useEffect(() => {
    if (!armed.current) return undefined
    setSong(history.map((entry, index) => ({
      order: index,
      cellId: entry.notation,
      face: entry.face,
      note: entry.note,
      voice: entry.voice,
      prime: entry.prime,
      index: 5,
      lane: (FACE_NAMES.indexOf(entry.face) * 2 + 1) % 8,
    })))
    if (solving && history.length) setStep(history.length - 1)
    if (!solving) {
      armed.current = false
      setStep(-1)
    }
    return undefined
  }, [history, solving])

  toggleRef.current = togglePlay

  useEffect(() => subscribeBpm(setTempo), [])

  function changeBpm(value) {
    followBpm(setBpm(value))
  }

  useEffect(() => {
    if (!active) {
      stopScore()
      return undefined
    }
    function onKey(event) {
      if (event.code !== 'Space' || event.repeat) return
      if (event.target.closest('button, a, input, textarea, select, [role="slider"]')) return
      event.preventDefault()
      toggleRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  useEffect(() => () => {
    playingRef.current = false
    stopLoop()
    silence()
  }, [])

  const activeId = step >= 0 ? events[step]?.cellId : ''

  return (
    <div className="puzzle">
      <TempoRail bpm={bpm} onChange={changeBpm} />
      <GeneratedScore events={events} playIndex={step} playing={playing} onToggle={() => toggleRef.current()} />
      <CubeNet path={path} activeId={activeId} onPath={changePath} />
      <SoundPath
        events={events}
        playing={playing}
        bpm={bpm}
        solving={solving && armed.current}
        onPlay={togglePlay}
        onClear={() => changePath([])}
        onSolve={solvePuzzle}
      />
      <SoundSequence events={events} playIndex={step} playing={playing} />
    </div>
  )
}
