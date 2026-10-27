import { useEffect, useRef, useState } from 'react'
import { BPM_MAX, BPM_MIN, getBpm, hitFor, setBpm, subscribeBpm } from '../audio/kit.js'
import { followBpm } from '../audio/engine.js'
import { FACE_BUTTONS } from '../cube/cubeLogic.js'
import { useCube } from '../cube/cubeState.jsx'

const TEMPO_MARKS = [600, 480, 360, 240, 140, 80]

const PITCH_COLOR = {
  C: '#ff5b4a',
  'C#': '#ff8a3d',
  D: '#f0d12e',
  'D#': '#b6e84a',
  E: '#3dffa6',
  F: '#3de0ff',
  'F#': '#4a7dff',
  G: '#8d6bff',
  'G#': '#d24aff',
  A: '#ff4ad2',
  'A#': '#ff4a86',
  B: '#f4f1ea',
}

function pitchClass(note) {
  return String(note || '').replace(/\d+$/, '')
}

function pitchColor(note) {
  return PITCH_COLOR[pitchClass(note)] || '#d8d8d8'
}

const READOUT_IDS = ['TEMPO', 'PHASE', 'NOTES', 'VOICE', 'BEAT']

const CUE = {
  shuffle: 'Click SHUFFLE. The cube turns, and every move becomes a note.',
  watch: 'Watch the cube. Each face plays one note.',
  play: 'Press PLAY to hear that song again.',
}

function MeterCard({ label, value, detail, live }) {
  return (
    <article className={live ? 'meter-card is-live' : 'meter-card'}>
      <span>{label}</span>
      <b>{value}</b>
      <em>{detail}</em>
    </article>
  )
}

export function TempoRail({ bpm, onChange }) {
  const railRef = useRef(null)
  const scaleRef = useRef(null)
  const dragRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const rail = railRef.current
    const scale = scaleRef.current
    if (!rail || !scale) return undefined

    function fromPointer(event) {
      const box = scale.getBoundingClientRect()
      const t = Math.min(1, Math.max(0, (event.clientY - box.top) / Math.max(1, box.height)))
      onChangeRef.current(BPM_MAX - t * (BPM_MAX - BPM_MIN))
    }

    function onPointerDown(event) {
      if (event.button !== 0) return
      dragRef.current = true
      scale.classList.add('is-dragging')
      try {
        scale.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture is unavailable until the browser trusts the gesture.
      }
      fromPointer(event)
    }

    function onPointerMove(event) {
      if (!dragRef.current) return
      fromPointer(event)
    }

    function onPointerUp() {
      dragRef.current = false
      scale.classList.remove('is-dragging')
    }

    function onWheel(event) {
      event.preventDefault()
      const step = event.deltaY > 0 ? -10 : event.deltaY < 0 ? 10 : 0
      if (step) onChangeRef.current(getBpm() + step)
    }

    scale.addEventListener('pointerdown', onPointerDown)
    scale.addEventListener('pointermove', onPointerMove)
    scale.addEventListener('pointerup', onPointerUp)
    scale.addEventListener('pointercancel', onPointerUp)
    rail.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      scale.removeEventListener('pointerdown', onPointerDown)
      scale.removeEventListener('pointermove', onPointerMove)
      scale.removeEventListener('pointerup', onPointerUp)
      scale.removeEventListener('pointercancel', onPointerUp)
      rail.removeEventListener('wheel', onWheel)
    }
  }, [])

  const needle = ((BPM_MAX - bpm) / (BPM_MAX - BPM_MIN)) * 100

  return (
    <div className="bpm-rail" ref={railRef}>
      <span className="bpm-name">BPM</span>
      <p className="bpm-hint">Scroll to increase or decrease the BPM.</p>
      <div
        ref={scaleRef}
        className="bpm-scale"
        role="slider"
        aria-label="BPM"
        aria-valuemin={BPM_MIN}
        aria-valuemax={BPM_MAX}
        aria-valuenow={bpm}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') onChange(bpm + 10)
          if (event.key === 'ArrowDown') onChange(bpm - 10)
        }}
      >
        {TEMPO_MARKS.map((mark) => (
          <span key={mark} className="bpm-tick" style={{ top: `${((BPM_MAX - mark) / (BPM_MAX - BPM_MIN)) * 100}%` }}>
            <b>{mark}</b>
            <i />
          </span>
        ))}
        <span className="bpm-thumb" style={{ top: `${needle}%` }}>
          <b>{bpm}</b>
          <i />
        </span>
      </div>
    </div>
  )
}

export default function ControlPanel({ children }) {
  const { cubies, history, anim, playing, playStep, solving, enqueue, play, stop, reset, shuffle, playAnswer } = useCube()
  const [bpm, setTempo] = useState(getBpm)
  const [order, setOrder] = useState(READOUT_IDS)
  const [focus, setFocus] = useState(null)
  const [guide, setGuide] = useState('shuffle')
  const sawShuffle = useRef(false)
  const bpmSeen = useRef(bpm)
  const handsOn = Boolean(anim) && !playing
  const played = playing && playStep >= 0 ? history[playStep] : null
  const live = handsOn ? hitFor(anim.notation, cubies) : null
  const shown = played || live || history[history.length - 1]

  function bringForward(ids) {
    setOrder((current) => [...ids, ...current.filter((id) => !ids.includes(id))])
    setFocus(ids[0])
  }

  useEffect(() => subscribeBpm(setTempo), [])

  useEffect(() => {
    if (bpmSeen.current === bpm) return
    bpmSeen.current = bpm
    bringForward(['TEMPO'])
  }, [bpm])

  useEffect(() => {
    if (!handsOn && !playing) return
    const current = handsOn ? live?.note : played?.note
    const previous = handsOn
      ? history[history.length - 1]?.note
      : playStep > 0 ? history[playStep - 1]?.note : ''
    const same = pitchClass(current) !== '' && pitchClass(current) === pitchClass(previous)
    if (same) bringForward(['VOICE', 'PHASE', 'NOTES', 'BEAT'])
    else bringForward(['PHASE', 'NOTES', 'VOICE', 'BEAT'])
  }, [handsOn, playing, anim?.notation, playStep, history, live?.note, played?.note])

  useEffect(() => {
    if (guide !== 'watch') return undefined
    if (anim) sawShuffle.current = true
    if (sawShuffle.current && !anim) setGuide('play')
    return undefined
  }, [guide, anim])

  useEffect(() => {
    if (guide === 'play' && history.length === 0 && !anim) setGuide('shuffle')
  }, [guide, history.length, anim])

  function onShuffle() {
    if (playing || solving || anim) return
    if (guide === 'shuffle') {
      sawShuffle.current = false
      setGuide('watch')
    }
    shuffle()
  }

  function onPlay() {
    if (playing) {
      stop()
      return
    }
    if (guide === 'play') setGuide('done')
    play()
  }

  function onReset() {
    reset()
    if (guide !== 'done') {
      sawShuffle.current = false
      setGuide('shuffle')
    }
  }

  function changeBpm(value) {
    const next = setBpm(value)
    followBpm(next)
  }

  const beatItems = history.map((entry, index) => ({ entry, index, live: false }))
  if (handsOn) beatItems.push({ entry: { notation: anim.notation, note: live?.note || 'LIVE', order: 'live' }, index: -1, live: true })
  const beatGroups = []
  for (const item of beatItems) {
    const pitch = String(item.entry.note || '').replace(/\d+$/, '')
    const last = beatGroups[beatGroups.length - 1]
    if (last && pitch && last.pitch === pitch) last.items.unshift(item)
    else beatGroups.push({ pitch, items: [item] })
  }

  function readoutFor(id) {
    if (id === 'TEMPO') return { label: 'TEMPO', value: String(bpm), detail: 'bpm' }
    if (id === 'PHASE') return { label: 'PHASE', value: shown?.notation || '—', detail: shown?.prime ? 'CCW' : shown ? 'CW' : 'idle' }
    if (id === 'NOTES') return { label: 'NOTES', value: shown?.note || '—', detail: 'pitch' }
    if (id === 'VOICE') return { label: 'VOICE', value: shown?.voice || '—', detail: 'kit' }
    return {
      label: 'BEAT',
      value: playing ? String(playStep + 1).padStart(2, '0') : String(history.length).padStart(2, '0'),
      detail: 'now',
    }
  }

  return (
    <div className="workspace">
      <TempoRail bpm={bpm} onChange={changeBpm} />

      <div className="workspace-center">
        {children}
      </div>

      <aside className="side-stack">
        <div className="readout-stack" aria-label="Patch readout">
          {order.map((id) => (
            <MeterCard key={id} {...readoutFor(id)} live={id === focus} />
          ))}
        </div>
        <aside className="pad-dock">
        <footer className="panel" aria-label="MIDI controller">
          <section className="patch-core">
            <header className="patch-title">
              <strong>MIDI CONTROLLER</strong>
              <i className="midi-led" aria-hidden="true" />
            </header>
            <div className="move-grid">
              {FACE_BUTTONS.map((notation) => (
                <button
                  key={notation}
                  type="button"
                  className={anim?.notation === notation ? 'move-btn is-hot' : 'move-btn'}
                  onClick={() => enqueue(notation)}
                  aria-keyshortcuts={notation.includes("'") ? `Shift+${notation[0]}` : notation}
                >
                  {notation}
                </button>
              ))}
            </div>
          </section>
        </footer>
        <div className="action-bar">
          {guide !== 'done' && <p className="shuffle-cue">{CUE[guide]}</p>}
          <button
            type="button"
            className={playing ? 'action-btn play-btn is-on' : guide === 'play' ? 'action-btn play-btn is-cue' : 'action-btn play-btn'}
            onClick={onPlay}
            disabled={!playing && history.length === 0}
            aria-pressed={playing}
          >
            {playing ? 'STOP' : 'PLAY'}
          </button>
          <button type="button" className="action-btn" onClick={onReset}>
            RESET
          </button>
          <button
            type="button"
            className={guide === 'shuffle' ? 'action-btn is-cue' : 'action-btn'}
            onClick={onShuffle}
          >
            SHUFFLE
          </button>
          <button
            type="button"
            className={solving ? 'action-btn answer-btn is-on' : 'action-btn answer-btn'}
            onClick={playAnswer}
            disabled={playing || solving}
            aria-pressed={solving}
          >
            SOLVE CUBE
          </button>
        </div>
        </aside>
      </aside>

      <div className="score-dock">
        <div className="score-tape">
        <ol aria-label="Recorded beats">
          {beatGroups.length === 0 && <li className="beat beat-empty">NO BEATS</li>}
          {beatGroups.map((group) => (
            <li key={group.items[group.items.length - 1].entry.order} className="beat-stack">
              {group.items.map((item) => (
                <div
                  key={item.entry.order}
                  className={`beat is-drop${item.live ? ' is-live' : ''}${playStep === item.index ? ' is-on' : ''}`}
                  style={{ color: pitchColor(item.entry.note) }}
                  aria-current={playStep === item.index ? 'step' : undefined}
                >
                  <b>{item.entry.notation}</b>
                  <span>{item.entry.note}</span>
                </div>
              ))}
            </li>
          ))}
        </ol>
        </div>
      </div>
    </div>
  )
}
