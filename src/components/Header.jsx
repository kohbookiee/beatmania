import { useLayoutEffect, useRef } from 'react'

const TITLE = 'rhythm mania'

export default function Header({ view, onView }) {
  const titleRef = useRef(null)

  useLayoutEffect(() => {
    const title = titleRef.current
    if (!title) return undefined
    let letters = [...title.querySelectorAll('.title-letter')]
    let cancelled = false
    let hold = 0
    let settleTimer = 0

    const settle = () => {
      title.style.transition = ''
      title.style.transform = ''
      title.classList.remove('is-arriving', 'is-intro')
      title.textContent = TITLE
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      settle()
      return undefined
    }

    const reset = () => {
      title.style.transition = 'none'
      title.style.transform = ''
      letters.forEach((letter) => {
        letter.style.transition = 'none'
        letter.style.animation = 'none'
        letter.style.transform = 'none'
      })
    }

    const play = () => {
      if (cancelled || !title.isConnected) return
      letters = [...title.querySelectorAll('.title-letter')]
      reset()
      title.classList.add('is-arriving')
      title.classList.add('is-intro')
      const from = title.getBoundingClientRect()
      title.classList.remove('is-intro')
      const to = title.getBoundingClientRect()
      const dx = from.left + from.width / 2 - (to.left + to.width / 2)
      const dy = from.top + from.height / 2 - (to.top + to.height / 2)
      const room = (window.innerWidth * 0.86) / Math.max(1, to.width)
      const scale = Math.min(from.width / Math.max(1, to.width), room)
      const fromTransform = `translate(${dx}px, ${dy}px) scale(${scale})`
      title.style.transition = 'none'
      title.style.transform = fromTransform
      void title.offsetWidth

      const begin = () => {
        if (cancelled || !title.isConnected) return
        title.style.transition = 'transform 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95)'
        title.style.transform = 'translate(0px, 0px) scale(1)'
        letters.forEach((letter, index) => {
          const spin = index % 2 === 0 ? 'title-spin-pos' : 'title-spin-neg'
          letter.style.animation = 'none'
          void letter.offsetWidth
          letter.style.animation = `${spin} 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) both`
        })
        settleTimer = window.setTimeout(settle, 1920)
      }

      // iOS paints a reloaded page after queued animation frames, so a short
      // timeout is what actually leaves the opening pose on screen.
      hold = window.setTimeout(begin, 50)
    }

    const ready = document.fonts?.load?.('400 16px "Inktera Demo"') ?? Promise.resolve()
    ready.then(play, play)

    const onPageShow = (event) => {
      if (!event.persisted || cancelled) return
      window.clearTimeout(hold)
      window.clearTimeout(settleTimer)
      if (!title.querySelector('.title-letter')) {
        title.classList.add('is-arriving')
        title.textContent = ''
        TITLE.split('').forEach((letter) => {
          const span = document.createElement('span')
          span.className = letter === ' ' ? 'title-space' : 'title-letter'
          span.textContent = letter === ' ' ? '\u00A0' : letter
          title.appendChild(span)
        })
      }
      play()
    }
    window.addEventListener('pageshow', onPageShow)

    return () => {
      cancelled = true
      window.clearTimeout(hold)
      window.clearTimeout(settleTimer)
      window.removeEventListener('pageshow', onPageShow)
      if (!title.isConnected || !title.querySelector('.title-letter')) return
      title.classList.add('is-arriving')
      reset()
      title.classList.remove('is-intro')
    }
  }, [])

  return (
    <header className="header">
      <h1 className="title is-arriving" ref={titleRef} aria-label={TITLE}>
        {TITLE.split('').map((letter, index) => (
          letter === ' '
            ? <span key={index} className="title-space">{'\u00A0'}</span>
            : <span key={index} className="title-letter">{letter}</span>
        ))}
      </h1>
      <nav className="view-nav" aria-label="View mode">
        <button
          type="button"
          className={view === 'cube' ? 'view-tab is-active' : 'view-tab'}
          aria-pressed={view === 'cube'}
          onClick={() => onView('cube')}
        >
          3D CUBE
        </button>
        <button
          type="button"
          className={view === 'puzzle' ? 'view-tab is-active' : 'view-tab'}
          aria-pressed={view === 'puzzle'}
          onClick={() => onView('puzzle')}
        >
          2D PUZZLE
        </button>
      </nav>
    </header>
  )
}
