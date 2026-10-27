import { useEffect, useState } from 'react'
import { loopBeat } from '../audio/permutationSound.js'

export default function SoundSequence({ events, playIndex = -1, playing = false }) {
  const columns = Math.max(events.length, 8)
  const [cursorLeft, setCursorLeft] = useState('2%')

  useEffect(() => {
    if (!playing || events.length === 0) {
      setCursorLeft('2%')
      return undefined
    }
    let frame = 0
    const tick = () => {
      const beat = loopBeat()
      const count = events.length
      const pos = beat < 0 ? 0 : ((beat % count) + count) % count
      setCursorLeft(`${((pos + 0.35) / columns) * 100}%`)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, events.length, columns])

  return (
    <section className="puzzle-sequence" aria-label="Music sequence">
      <header className="puzzle-caption">
        <strong>MUSIC SEQUENCE</strong>
        <span>{String(events.length).padStart(2, '0')}</span>
      </header>
      <div className="roll" role="list">
        {Array.from({ length: 8 }, (_, lane) => (
          <i key={lane} className="roll-lane" style={{ top: `${8 + lane * 11}%` }} />
        ))}
        <i className="roll-cursor" style={{ left: cursorLeft }} />
        {events.map((event) => (
          <b
            key={`${event.order}-${event.cellId}`}
            role="listitem"
            className={`roll-block ${event.order % 2 === 0 ? 'is-blue' : 'is-yellow'}${playIndex === event.order ? ' is-now' : ''}`}
            style={{
              left: `${((event.order + 0.35) / columns) * 100}%`,
              top: `${8 + event.lane * 11}%`,
            }}
            title={event.cellId}
            aria-label={event.cellId}
          />
        ))}
      </div>
    </section>
  )
}
