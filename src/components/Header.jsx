import { useLayoutEffect, useRef } from 'react'

const TITLE = 'Rhythm mania'

export default function Header({ view, onView }) {
  const titleRef = useRef(null)

  useLayoutEffect(() => {
    const title = titleRef.current
    if (!title) return undefined
    const letters = [...title.querySelectorAll('.title-letter')]
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

    let frame = 0
    let timer = 0

    const reset = () => {
      title.style.transition = 'none'
      title.style.transform = ''
      letters.forEach((letter) => {
        letter.style.transition = 'none'
        letter.style.animation = 'none'
        letter.style.transform = 'none'
      })
    }

    reset()
    title.classList.add('is-intro')
    const from = title.getBoundingClientRect()
    title.classList.remove('is-intro')
    const to = title.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    const room = (window.innerWidth * 0.86) / Math.max(1, to.width)
    const scale = Math.min(from.width / Math.max(1, to.width), room)
    title.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`

    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const timing = 'transform 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95)'
        title.style.transition = timing
        title.style.transform = 'translate(0px, 0px) scale(1)'
        letters.forEach((letter, index) => {
          const spin = index % 2 === 0 ? 'title-spin-pos' : 'title-spin-neg'
          letter.style.animation = `${spin} 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) both`
        })
      })
    })
    timer = window.setTimeout(settle, 1920)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
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
