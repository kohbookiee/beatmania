import { useEffect, useRef, useState } from 'react'
import { loopBeat } from '../audio/engine.js'

const LETTER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }

function diatonic(note) {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note || '')
  if (!match) return { step: 6, accidental: '' }
  let step = LETTER[match[1]] + (Number(match[3]) - 4) * 7
  while (step > 11) step -= 7
  while (step < -1) step += 7
  return { step, accidental: match[2] }
}

function xAt(slot, count, width) {
  const start = 78
  const end = Math.max(start + 48, width - 28)
  if (count <= 1) return (start + end) / 2
  return start + (slot / count) * (end - start)
}

function placeNotes(events, width, height) {
  const top = 14
  const bottom = 28
  const inner = Math.max(48, height - top - bottom)
  const gap = inner / 7
  const mid = top + inner * 0.46
  const count = Math.max(events.length, 1)
  const pitch = Math.max(16, width - 78 - 28) / count
  const head = Math.min(gap * 0.36, pitch * 0.28)
  const notes = events.map((event, index) => {
    const { step, accidental } = diatonic(event.note)
    return {
      id: `${event.cellId}-${index}`,
      x: xAt(index, events.length || 1, width),
      y: mid - (step - 6) * (gap / 2),
      step,
      accidental,
      stemUp: step < 6,
      head,
    }
  })
  return { notes, mid, gap, count }
}

function yForStep(step, mid, gap) {
  return mid - (step - 6) * (gap / 2)
}

export default function GeneratedScore({ events, playIndex = -1, playing = false, onToggle }) {
  const svgRef = useRef(null)
  const [size, setSize] = useState({ width: 1440, height: 180 })
  const playheadRef = useRef(null)
  const placed = placeNotes(events, size.width, size.height)
  const staff = [2, 4, 6, 8, 10].map((step) => yForStep(step, placed.mid, placed.gap))

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const host = svg.parentElement
    const measure = () => {
      const width = host?.clientWidth || svg.clientWidth || 1440
      const height = host?.clientHeight || svg.clientHeight || 180
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (host) observer.observe(host)
    return () => observer.disconnect()
  }, [events.length])

  useEffect(() => {
    const line = playheadRef.current
    if (!line) return undefined
    if (!playing || events.length === 0) {
      line.setAttribute('x1', '18')
      line.setAttribute('x2', '18')
      return undefined
    }
    let frame = 0
    const tick = () => {
      const beat = loopBeat()
      const count = events.length
      const pos = beat < 0 ? 0 : ((beat % count) + count) % count
      const index = Math.floor(pos)
      const frac = pos - index
      const from = xAt(index, count, size.width)
      const to = xAt(index + 1, count, size.width)
      const x = String(from + (to - from) * frac)
      line.setAttribute('x1', x)
      line.setAttribute('x2', x)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, events.length, size.width])

  return (
    <section className="puzzle-score" aria-label="Score" onClick={onToggle}>
      <svg
        ref={svgRef}
        className="score-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Score"
      >
        <rect width={size.width} height={size.height} fill="#000" />
        {staff.map((y) => (
          <line key={y} x1="0" y1={y} x2={size.width} y2={y} stroke="#d8d8d8" strokeWidth="1" />
        ))}
        <line x1="18" y1={staff[0]} x2="18" y2={staff[4]} stroke="#d8d8d8" strokeWidth="1.5" />
        {placed.notes.map((note, index) => (
          <Note key={note.id} note={note} active={playIndex === index} mid={placed.mid} gap={placed.gap} />
        ))}
        <line ref={playheadRef} x1="18" y1={staff[0]} x2="18" y2={staff[4]} stroke="#ffe500" strokeWidth="1.5" />
      </svg>
      <p className="score-hint">Press space or click to play/pause</p>
    </section>
  )
}

function Note({ note, active, mid, gap }) {
  const ledgers = []
  if (note.step <= 0) {
    for (let step = 0; step >= note.step; step -= 2) ledgers.push(step)
  }
  if (note.step >= 12) {
    for (let step = 12; step <= note.step; step += 2) ledgers.push(step)
  }
  const rx = note.head
  const ry = note.head * 0.68
  const stemX = note.stemUp ? rx * 0.82 : -rx * 0.82
  const stemY = note.stemUp ? -note.head * 3.3 : note.head * 3.3
  const fill = active ? '#2d6bff' : '#d8d8d8'

  return (
    <g transform={`translate(${note.x} ${note.y})`}>
      {ledgers.map((step) => (
        <line
          key={step}
          x1={-rx * 1.7}
          x2={rx * 1.7}
          y1={yForStep(step, mid, gap) - note.y}
          y2={yForStep(step, mid, gap) - note.y}
          stroke="#d8d8d8"
          strokeWidth="1.4"
        />
      ))}
      <g transform={`scale(${rx / 12})`}>
        <Accidental kind={note.accidental} />
      </g>
      <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={fill} transform="rotate(-22)" />
      <line x1={stemX} y1="0" x2={stemX} y2={stemY} stroke={fill} strokeWidth={Math.max(0.7, rx * 0.16)} />
    </g>
  )
}

function Accidental({ kind }) {
  if (kind === '#') {
    return (
      <g transform="translate(-20 0)" stroke="#d8d8d8" strokeWidth="1.15" fill="none">
        <line x1="3" y1="-9" x2="3" y2="9" />
        <line x1="8" y1="-9" x2="8" y2="9" />
        <line x1="0.5" y1="-2.5" x2="10.5" y2="-4.5" />
        <line x1="0.5" y1="4.5" x2="10.5" y2="2.5" />
      </g>
    )
  }
  if (kind === 'b') {
    return (
      <path
        d="M -16 -11 v 20 c 5 0 8 -3 8 -7 c 0 -5 -3 -6 -8 -6"
        fill="none"
        stroke="#d8d8d8"
        strokeWidth="1.2"
      />
    )
  }
  return null
}
