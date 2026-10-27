export default function SoundPath({ events, playing, bpm, solving = false, onPlay, onClear, onSolve }) {
  const chain = events.map((event) => event.cellId).join(' → ')
  const length = String(events.length).padStart(2, '0')

  return (
    <section className={playing ? 'puzzle-path is-live' : 'puzzle-path'} aria-label="Sound path">
      <header className="path-head">
        <span>SOUND PATH</span>
        <div className="path-actions">
          <button
            type="button"
            className={playing ? 'puzzle-play is-on' : 'puzzle-play'}
            onClick={onPlay}
            disabled={solving || (!playing && events.length === 0)}
            aria-pressed={playing}
          >
            {playing ? 'STOP' : 'PLAY'}
          </button>
          <button type="button" className="puzzle-clear" onClick={onClear} disabled={solving || events.length === 0}>
            CLEAR
          </button>
          <button
            type="button"
            className={solving ? 'puzzle-play is-on' : 'puzzle-play'}
            onClick={onSolve}
            disabled={solving}
            aria-pressed={solving}
          >
            SOLVE PUZZLE
          </button>
        </div>
      </header>
      <p className="path-chain">{chain || '—'}</p>
      <div className="path-meta">
        <article>
          <span>PATH LENGTH</span>
          <b>{length}</b>
          <em>steps</em>
        </article>
        <article>
          <span>BPM</span>
          <b>{bpm}</b>
          <em>bpm</em>
        </article>
      </div>
    </section>
  )
}
