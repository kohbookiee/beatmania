import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { hitFor, stepSeconds } from '../audio/kit.js'
import { playHit, silence, startLoop, stopLoop, unlockAudio } from '../audio/engine.js'
import {
  MOVES,
  applyMove,
  applySequence,
  cloneCube,
  createSolvedCube,
  cubeSignature,
  describeMove,
  generateScramble,
  inverseMove,
  getFaceGrids,
  validateCube,
} from './cubeLogic.js'

const CubeContext = createContext(null)

const TURN_DURATION = 0.34
const SHUFFLE_LENGTH = 20
const QUEUE_LIMIT = 24

function dealPuzzle() {
  const moves = generateScramble(SHUFFLE_LENGTH)
  return { cube: applySequence(createSolvedCube(), moves), moves }
}

export function CubeProvider({ children }) {
  const [deal] = useState(dealPuzzle)
  const puzzle = deal.cube
  const answerMoves = useMemo(() => deal.moves.slice().reverse().map(inverseMove), [deal])
  const [cubies, setCubies] = useState(() => cloneCube(puzzle))
  const [history, setHistory] = useState([])
  const [anim, setAnim] = useState(null)
  const [caption, setCaption] = useState('')
  const [playing, setPlaying] = useState(false)
  const [playStep, setPlayStep] = useState(-1)
  const [solving, setSolving] = useState(false)

  const cubiesRef = useRef(cubies)
  const historyRef = useRef(history)
  const queueRef = useRef([])
  const animatingRef = useRef(false)
  const generationRef = useRef(0)
  const idRef = useRef(0)
  const pendingRef = useRef(null)
  const playingRef = useRef(false)
  const solvingRef = useRef(false)
  const finishRef = useRef(() => {})
  const patternRef = useRef([])
  const spinRef = useRef({
    base: { x: 0, y: 0, z: 0 },
    partial: null,
    notation: '',
  })

  cubiesRef.current = cubies
  historyRef.current = history

  const startNext = useCallback(() => {
    if (animatingRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    animatingRef.current = true
    idRef.current += 1
    const hit = hitFor(next.notation, cubiesRef.current)
    spinRef.current.notation = next.notation
    setCaption(next.notation)
    if (!next.silent) playHit(hit)
    pendingRef.current = next.record === false ? null : { id: idRef.current, hit }
    const animId = idRef.current
    const generation = generationRef.current
    const notation = next.notation
    setAnim({
      id: animId,
      generation,
      notation,
      duration: next.duration,
      axis: MOVES[notation].axis,
      layer: MOVES[notation].layer,
      dir: MOVES[notation].dir,
    })
    window.setTimeout(() => {
      finishRef.current(animId, notation, generation)
    }, Math.max(0, next.duration) * 1000 + 40)
  }, [])

  const enqueue = useCallback((notation, duration = TURN_DURATION, options = {}) => {
    if (solvingRef.current) return
    if (!MOVES[notation]) return
    if (playingRef.current && options.record !== false) return
    if (queueRef.current.length >= QUEUE_LIMIT) return
    unlockAudio()
    queueRef.current.push({
      notation,
      duration,
      silent: Boolean(options.silent),
      record: options.record !== false,
    })
    startNext()
  }, [startNext])

  const notifySpin = () => {
    spinRef.current.onChange?.()
  }

  const reportSpin = useCallback((generation, axis, layer, dir, progress) => {
    if (generation !== generationRef.current) return
    spinRef.current.partial = { axis, layer, dir, progress }
    notifySpin()
  }, [])

  const finishAnimation = useCallback((id, notation, generation) => {
    if (generation !== generationRef.current) return
    if (!animatingRef.current || id !== idRef.current) return
    const move = MOVES[notation]
    spinRef.current.base[move.axis] += move.dir * 90
    spinRef.current.partial = null
    const nextCube = applyMove(cubiesRef.current, notation)
    const pending = pendingRef.current
    pendingRef.current = null
    cubiesRef.current = nextCube
    animatingRef.current = false
    notifySpin()
    setCubies(nextCube)
    if (pending && pending.id === id) {
      const record = {
        order: historyRef.current.length + 1,
        ...describeMove(notation),
        voice: pending.hit.voice,
        note: pending.hit.note,
        prime: pending.hit.prime,
        cube: cloneCube(nextCube),
      }
      const nextHistory = [...historyRef.current, record]
      historyRef.current = nextHistory
      setHistory(nextHistory)
    }
    if (queueRef.current.length === 0) {
      setAnim(null)
      if (solvingRef.current) {
        solvingRef.current = false
        setSolving(false)
      }
    }
    startNext()
  }, [startNext])

  finishRef.current = finishAnimation

  const clearSpin = () => {
    spinRef.current.base.x = 0
    spinRef.current.base.y = 0
    spinRef.current.base.z = 0
    spinRef.current.partial = null
    spinRef.current.notation = ''
    notifySpin()
  }

  const rewind = useCallback(() => {
    generationRef.current += 1
    queueRef.current = []
    animatingRef.current = false
    pendingRef.current = null
    clearSpin()
    setCaption('')
    const solved = createSolvedCube()
    cubiesRef.current = solved
    setCubies(solved)
    setAnim(null)
  }, [])

  const stop = useCallback(() => {
    playingRef.current = false
    solvingRef.current = false
    setSolving(false)
    stopLoop()
    silence()
    generationRef.current += 1
    queueRef.current = []
    animatingRef.current = false
    pendingRef.current = null
    clearSpin()
    setCaption('')
    const last = historyRef.current[historyRef.current.length - 1]
    if (last?.cube) {
      const restored = cloneCube(last.cube)
      cubiesRef.current = restored
      setCubies(restored)
    }
    setAnim(null)
    setPlayStep(-1)
    setPlaying(false)
  }, [])

  const onPlaybackStep = useCallback((index) => {
    if (!playingRef.current) return
    const hit = patternRef.current[index]
    if (!hit) return
    if (index === 0) rewind()
    setPlayStep(index)
    setCaption(hit.notation)
    enqueue(hit.notation, stepSeconds(), { silent: true, record: false })
  }, [enqueue, rewind])

  const play = useCallback(() => {
    if (playingRef.current || solvingRef.current) return
    if (historyRef.current.length === 0) return
    if (animatingRef.current || queueRef.current.length > 0) return
    patternRef.current = historyRef.current.map((entry) => ({
      notation: entry.notation,
      voice: entry.voice,
      note: entry.note,
      prime: entry.prime,
    }))
    playingRef.current = true
    setPlaying(true)
    unlockAudio()
    startLoop(patternRef.current, onPlaybackStep)
  }, [onPlaybackStep])

  const reset = useCallback(() => {
    playingRef.current = false
    solvingRef.current = false
    setSolving(false)
    stopLoop()
    silence()
    generationRef.current += 1
    queueRef.current = []
    animatingRef.current = false
    pendingRef.current = null
    clearSpin()
    setCaption('')
    setPlayStep(-1)
    setPlaying(false)
    const restored = cloneCube(puzzle)
    cubiesRef.current = restored
    historyRef.current = []
    setCubies(restored)
    setHistory([])
    setAnim(null)
  }, [puzzle])

  const playAnswer = useCallback(() => {
    if (playingRef.current || solvingRef.current) return
    if (animatingRef.current || queueRef.current.length > 0) return
    stopLoop()
    silence()
    generationRef.current += 1
    queueRef.current = []
    animatingRef.current = false
    pendingRef.current = null
    clearSpin()
    setCaption('')
    setPlayStep(-1)
    setPlaying(false)
    const restored = cloneCube(puzzle)
    cubiesRef.current = restored
    historyRef.current = []
    setCubies(restored)
    setHistory([])
    setAnim(null)
    solvingRef.current = true
    setSolving(true)
    unlockAudio()
    for (const notation of answerMoves) {
      queueRef.current.push({ notation, duration: stepSeconds() })
    }
    startNext()
  }, [answerMoves, puzzle, startNext])

  const shuffle = useCallback(() => {
    if (playingRef.current || solvingRef.current) return
    if (animatingRef.current || queueRef.current.length > 0) return
    unlockAudio()
    const sequence = generateScramble(SHUFFLE_LENGTH)
    for (const notation of sequence) {
      queueRef.current.push({ notation, duration: stepSeconds() })
    }
    startNext()
  }, [startNext])

  useEffect(() => {
    const keys = { r: 'R', l: 'L', u: 'U', d: 'D', f: 'F', b: 'B' }
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const face = keys[event.key.toLowerCase()]
      if (!face) return
      event.preventDefault()
      enqueue(event.shiftKey ? `${face}'` : face)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enqueue])

  useEffect(() => {
    window.__CHILDREN_PLAY__ = {
      snapshot() {
        return {
          grids: getFaceGrids(cubiesRef.current),
          history: historyRef.current.map((entry) => ({
            order: entry.order,
            notation: entry.notation,
            face: entry.face,
            direction: entry.direction,
            voice: entry.voice,
            note: entry.note,
            hasState: Array.isArray(entry.cube) && entry.cube.length === 26,
          })),
          count: historyRef.current.length,
          playing: playingRef.current,
          playStep,
          signature: cubeSignature(cubiesRef.current),
          busy: animatingRef.current || queueRef.current.length > 0,
          errors: validateCube(cubiesRef.current),
        }
      },
      turn(notation, duration) {
        enqueue(notation, duration)
      },
      play,
      stop,
      reset,
      shuffle,
      playAnswer,
    }
    return () => {
      delete window.__CHILDREN_PLAY__
    }
  }, [enqueue, play, playAnswer, playStep, reset, shuffle, stop])

  const swapPieces = useCallback((from, to) => {
    if (!from || !to || (from.cubieId === to.cubieId && from.local === to.local)) return
    const next = cloneCube(cubiesRef.current)
    const stickerA = next.find((cubie) => cubie.id === from.cubieId)?.stickers.find((sticker) => sticker.local === from.local)
    const stickerB = next.find((cubie) => cubie.id === to.cubieId)?.stickers.find((sticker) => sticker.local === to.local)
    if (!stickerA || !stickerB) return
    const number = stickerA.n
    stickerA.n = stickerB.n
    stickerB.n = number
    const lookA = from.turn + (from.spin || 0)
    const lookB = to.turn + (to.spin || 0)
    stickerA.spin = ((lookB - from.turn) % 4 + 4) % 4
    stickerB.spin = ((lookA - to.turn) % 4 + 4) % 4
    cubiesRef.current = next
    setCubies(next)
  }, [])

  const value = useMemo(() => ({
    cubies,
    history,
    anim,
    moveCount: history.length,
    cubiesRef,
    spinRef,
    caption,
    playing,
    playStep,
    enqueue,
    reportSpin,
    finishAnimation,
    play,
    stop,
    reset,
    shuffle,
    solving,
    playAnswer,
    swapPieces,
  }), [cubies, history, anim, caption, playing, playStep, solving, enqueue, reportSpin, finishAnimation, play, stop, reset, shuffle, playAnswer, swapPieces])

  return (
    <CubeContext.Provider value={value}>
      {children}
    </CubeContext.Provider>
  )
}

export function useCube() {
  const value = useContext(CubeContext)
  if (!value) throw new Error('useCube must be used within CubeProvider')
  return value
}
