import CircleGraphic from './components/CircleGraphic.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import CubeScene from './components/CubeScene.jsx'
import Header from './components/Header.jsx'
import { CubeProvider, useCube } from './cube/cubeState.jsx'

function ScaleMark() {
  const { caption } = useCube()
  return <p className="scale-mark">{caption}</p>
}

export default function App() {
  return (
    <CubeProvider>
      <div className="app">
        <Header />
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
        <ControlPanel />
      </div>
    </CubeProvider>
  )
}
