import { useLayoutEffect, useRef } from 'react'

const TITLE = 'rhythm mania'

export default function Header({ view, onView }) {
  const titleRef = useRef(null)

  useLayoutEffect(() => {
    const title = titleRef.current
    if (!title) return undefined
    let cancelled = false
    let played = false
    let queued = false
    let settleTimer = 0
    const animations = []
    const easing = 'cubic-bezier(0.45, 0.05, 0.55, 0.95)'

    const clearMotion = () => {
      animations.splice(0).forEach((anim) => anim.cancel())
      title.style.visibility = ''
      title.style.transform = ''
      title.style.transformStyle = ''
      title.style.willChange = ''
    }

    const settle = () => {
      clearMotion()
      title.classList.remove('is-arriving', 'is-intro')
      title.textContent = TITLE
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settle()
      return undefined
    }

    // Keep the resting title off the first paint. iOS otherwise shows the
    // finished pose and drops the transition that was queued during load.
    title.style.visibility = 'hidden'

    const ensureLetters = () => {
      if (title.querySelector('.title-letter')) return
      title.classList.add('is-arriving')
      title.textContent = ''
      for (const letter of TITLE) {
        const span = document.createElement('span')
        span.className = letter === ' ' ? 'title-space' : 'title-letter'
        span.textContent = letter === ' ' ? '\u00A0' : letter
        title.appendChild(span)
      }
    }

    const play = () => {
      if (cancelled || played || !title.isConnected) return
      played = true
      ensureLetters()
      const letters = [...title.querySelectorAll('.title-letter')]
      title.classList.add('is-arriving')
      title.style.transform = 'none'
      title.style.transformStyle = 'flat'
      void title.offsetWidth
      const to = title.getBoundingClientRect()
      if (to.width < 1) {
        settle()
        return
      }
      const fit = (window.innerWidth * 0.86) / to.width
      const scale = Math.min(2.7, fit)
      const dx = window.innerWidth / 2 - (to.left + to.width / 2)
      const dy = window.innerHeight / 2 - (to.top + to.height / 2)
      const fromTransform = `translate(${dx}px, ${dy}px) scale(${scale})`
      title.style.willChange = 'transform'
      title.style.transform = fromTransform
      title.style.visibility = 'visible'

      const begin = () => {
        if (cancelled || !title.isConnected) return
        try {
          const move = title.animate(
            [{ transform: fromTransform }, { transform: 'translate(0px, 0px) scale(1)' }],
            { duration: 1800, easing, fill: 'forwards' },
          )
          animations.push(move)
          letters.forEach((letter, index) => {
            const turn = index % 2 === 0 ? 180 : -180
            animations.push(letter.animate(
              [
                { transform: 'rotateY(0deg)' },
                { transform: `rotateY(${turn}deg)`, offset: 0.5 },
                { transform: `rotateY(${turn * 2}deg)` },
              ],
              { duration: 1800, easing },
            ))
          })
        } catch {
          settle()
          return
        }
        requestAnimationFrame(() => {
          for (const anim of animations) {
            if (anim.playState === 'finished' || anim.currentTime > 80) {
              anim.currentTime = 0
              anim.play()
            }
          }
        })
        settleTimer = window.setTimeout(settle, 1900)
      }

      requestAnimationFrame(() => requestAnimationFrame(begin))
    }

    const arm = () => {
      if (cancelled || played || queued) return
      queued = true
      requestAnimationFrame(() => requestAnimationFrame(() => {
        queued = false
        play()
      }))
    }

    const onPageShow = (event) => {
      if (cancelled) return
      if (event.persisted) {
        played = false
        queued = false
        window.clearTimeout(settleTimer)
        clearMotion()
        ensureLetters()
        title.style.visibility = 'hidden'
      }
      arm()
    }

    window.addEventListener('pageshow', onPageShow)
    if (document.readyState === 'complete') arm()
    else window.addEventListener('load', arm, { once: true })
    const safety = window.setTimeout(arm, 600)

    return () => {
      cancelled = true
      window.clearTimeout(settleTimer)
      window.clearTimeout(safety)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('load', arm)
      clearMotion()
      if (!title.isConnected || !title.querySelector('.title-letter')) return
      title.classList.add('is-arriving')
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
