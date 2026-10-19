import { useEffect, useRef } from 'react'
import { BPM, COMPOSITION_TITLE } from '../audio/kit.js'
import { FACE_BUTTONS } from '../cube/cubeLogic.js'
import { useCube } from '../cube/cubeState.jsx'

const RULER = ['000', '020', '040', '060', '080', '100', '120', '140', '160', '180', '200']

export default function ControlPanel() {
  const { history, anim, moveCount, playing, playStep, enqueue, play, stop, reset, shuffle } = useCube()
  const logRef = useRef(null)

  useEffect(() => {
    const node = logRef.current
    if (!node) return
    if (playStep >= 0) {
      node.querySelector('.is-on')?.scrollIntoView({ block: 'nearest' })
      return
    }
    node.scrollTop = node.scrollHeight
  }, [history, playStep])

  return (
    <footer className="panel">
      <span className="screw screw-a" aria-hidden="true" />
      <span className="screw screw-b" aria-hidden="true" />
      <span className="screw screw-c" aria-hidden="true" />
      <span className="screw screw-d" aria-hidden="true" />
      <div className="board-ruler board-ruler-top" aria-hidden="true">
        {RULER.map((mark) => <span key={mark}>{mark}</span>)}
      </div>
      <div className="tick-ruler" aria-hidden="true" />

      <section className="module launch-module">
        <h2>
          <i className="led on" />
          LAUNCHPAD
        </h2>
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

      <section className="module">
        <h2>
          <i className={playing ? 'led on' : 'led'} />
          COMPOSITION
        </h2>
        <div className="score-head">
          <div className="score-name">
            <strong>{COMPOSITION_TITLE}</strong>
            <span>{BPM} BPM</span>
          </div>
          <button
            type="button"
            className={playing ? 'action-btn play-btn is-on' : 'action-btn play-btn'}
            onClick={() => (playing ? stop() : play())}
            disabled={!playing && history.length === 0}
            aria-pressed={playing}
          >
            {playing ? 'STOP' : 'PLAY'}
          </button>
        </div>
        <ol className="move-log score-list" ref={logRef} aria-label="Composition">
          {history.length === 0 && <li className="log-empty">NO MOVES</li>}
          {history.map((entry, index) => (
            <li key={entry.order} className={playStep === index ? 'is-on' : undefined} aria-current={playStep === index ? 'step' : undefined}>
              <b>{entry.notation}</b>
              <span>{entry.voice}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="module system-module">
        <h2>
          <i className="led on" />
          SYSTEM
        </h2>
        <div className="system-actions">
          <button type="button" className="action-btn" onClick={reset}>
            RESET
          </button>
          <button type="button" className="action-btn" onClick={shuffle}>
            SHUFFLE
          </button>
        </div>
        <div className="view-mode">
          <span className="view-mode-label">VIEW MODE</span>
          <div className="view-mode-options">
            <button type="button" className="mode-pill is-active" aria-pressed="true">
              <i className="led on" />
              3D
            </button>
            <button type="button" className="mode-pill" disabled>
              <i className="led" />
              2D
              <small>SOON</small>
            </button>
          </div>
        </div>
        <div className="move-count">
          <span>MOVE COUNT</span>
          <strong>{String(moveCount).padStart(3, '0')}</strong>
        </div>
      </section>
      <div className="board-ruler board-ruler-bottom" aria-hidden="true">
        {RULER.map((mark) => <span key={mark}>{mark}</span>)}
      </div>
    </footer>
  )
}
