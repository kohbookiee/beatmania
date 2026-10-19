import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useCube } from '../cube/cubeState.jsx'
import Cubie from './Cubie.jsx'

const AXIS = { x: 0, y: 1, z: 2 }
const AXIS_VECTOR = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function LayerTurn({ anim, onDone, onSpin, children }) {
  const group = useRef(null)
  const started = useRef(null)
  const finished = useRef(false)

  useFrame((state) => {
    if (!group.current || finished.current) return
    if (started.current == null) started.current = state.clock.elapsedTime
    const raw = Math.min(1, (state.clock.elapsedTime - started.current) / anim.duration)
    const progress = easeInOutCubic(raw)
    const angle = anim.dir * (Math.PI / 2) * progress
    group.current.quaternion.setFromAxisAngle(AXIS_VECTOR[anim.axis], angle)
    onSpin(anim.generation, anim.axis, anim.layer, anim.dir, progress)
    if (raw >= 1) {
      finished.current = true
      onDone(anim.id, anim.notation, anim.generation)
    }
  })

  return <group ref={group}>{children}</group>
}

export default function RubiksCube() {
  const { cubies, anim, finishAnimation, reportSpin } = useCube()
  const spinning = []
  const resting = []

  if (anim) {
    const axis = AXIS[anim.axis]
    for (const cubie of cubies) {
      if (cubie.pos[axis] === anim.layer) spinning.push(cubie)
      else resting.push(cubie)
    }
  }

  return (
    <group>
      {(anim ? resting : cubies).map((cubie) => (
        <Cubie key={cubie.id} cubie={cubie} />
      ))}
      {anim && (
        <LayerTurn key={anim.id} anim={anim} onDone={finishAnimation} onSpin={reportSpin}>
          {spinning.map((cubie) => (
            <Cubie key={cubie.id} cubie={cubie} />
          ))}
        </LayerTurn>
      )}
    </group>
  )
}
