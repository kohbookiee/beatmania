import { useState } from 'react'
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

  return (
    <div className={view === 'puzzle' ? 'app is-puzzle' : 'app'}>
      <Header view={view} onView={setView} />
      <div className="stage-switch">
        <div className={view === 'cube' ? 'view-pane' : 'view-pane is-hidden'}>
          <ControlPanel>
            <main className="stage">
              <div className="band" aria-hidden="true" />
              <section className="cube-stage" aria-label="Number cube">
                <CubeScene />
              </section>
              <ScaleMark />
              <section className="graphic-stage" aria-label="Circle graphic">
                <CircleGraphic />
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
