import { useEffect, useState } from 'react'
import { preloadAudio, unlockAudio } from './audio/engine.js'
import CircleGraphic from './components/CircleGraphic.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import CubeScene from './components/CubeScene.jsx'
import Header from './components/Header.jsx'
import ScorePage from './components/ScorePage.jsx'
import { CubeProvider, useCube } from './cube/cubeState.jsx'

function ScaleMark() {
  const { caption } = useCube()
  return <p className="scale-mark">{caption}</p>
}

function Shell() {
  const [view, setView] = useState('cube')
  const cubeView = view === 'cube'

  useEffect(() => {
    const start = () => preloadAudio()
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(start, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const timer = window.setTimeout(start, 500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const unlock = () => { unlockAudio() }
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('touchstart', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('touchstart', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
    }
  }, [])

  useEffect(() => {
    const color = view === 'puzzle' ? '#ffffff' : '#000000'
    document.documentElement.style.background = color
    document.body.style.background = color
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', color)
  }, [view])

  return (
    <div className={view === 'puzzle' ? 'app is-puzzle' : 'app'}>
      <Header view={view} onView={setView} />
      <div className="stage-switch">
        <div className={view === 'cube' ? 'view-pane' : 'view-pane is-hidden'}>
          <ControlPanel>
            <main className="stage">
              <div className="band" aria-hidden="true" />
              <section className="cube-stage" aria-label="Number cube">
                <CubeScene active={cubeView} />
              </section>
              <ScaleMark />
              <section className="graphic-stage" aria-label="Circle graphic">
                <CircleGraphic active={cubeView} />
              </section>
            </main>
          </ControlPanel>
        </div>
        <div className={view === 'puzzle' ? 'view-pane' : 'view-pane is-hidden'}>
          <ScorePage active={view === 'puzzle'} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <CubeProvider>
      <Shell />
    </CubeProvider>
  )
}
