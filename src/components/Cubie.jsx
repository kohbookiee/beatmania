import { useMemo } from 'react'
import * as THREE from 'three'
import { SPACING } from '../cube/constants.js'
import { useFaceTexture } from './photoTexture.js'

const matrix = new THREE.Matrix4()
const quaternion = new THREE.Quaternion()

const STICKER_LAYOUT = {
  R: { position: [0.462, 0, 0], rotation: [0, Math.PI / 2, 0] },
  L: { position: [-0.462, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  U: { position: [0, 0.462, 0], rotation: [-Math.PI / 2, 0, 0] },
  D: { position: [0, -0.462, 0], rotation: [Math.PI / 2, 0, 0] },
  F: { position: [0, 0, 0.462], rotation: [0, 0, 0] },
  B: { position: [0, 0, -0.462], rotation: [0, Math.PI, 0] },
}

const RODS = []
const ROD_THICKNESS = 0.03
const OUTER = 1
const ROD_CENTER = OUTER / 2 - ROD_THICKNESS / 2
for (const y of [-ROD_CENTER, ROD_CENTER]) {
  for (const z of [-ROD_CENTER, ROD_CENTER]) {
    RODS.push({ position: [0, y, z], args: [OUTER, ROD_THICKNESS, ROD_THICKNESS] })
  }
}
for (const x of [-ROD_CENTER, ROD_CENTER]) {
  for (const z of [-ROD_CENTER, ROD_CENTER]) {
    RODS.push({ position: [x, 0, z], args: [ROD_THICKNESS, OUTER, ROD_THICKNESS] })
  }
}
for (const x of [-ROD_CENTER, ROD_CENTER]) {
  for (const y of [-ROD_CENTER, ROD_CENTER]) {
    RODS.push({ position: [x, y, 0], args: [ROD_THICKNESS, ROD_THICKNESS, OUTER] })
  }
}

function rotationToQuaternion(rot) {
  matrix.set(
    rot[0][0], rot[1][0], rot[2][0], 0,
    rot[0][1], rot[1][1], rot[2][1], 0,
    rot[0][2], rot[1][2], rot[2][2], 0,
    0, 0, 0, 1,
  )
  quaternion.setFromRotationMatrix(matrix)
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}

function Sticker({ sticker }) {
  const layout = STICKER_LAYOUT[sticker.local]
  const texture = useFaceTexture(sticker.n)
  return (
    <mesh position={layout.position} rotation={layout.rotation} castShadow={false}>
      <planeGeometry args={[0.9, 0.9]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  )
}

export default function Cubie({ cubie }) {
  const orientation = useMemo(() => rotationToQuaternion(cubie.rot), [cubie.rot])
  const position = [cubie.pos[0] * SPACING, cubie.pos[1] * SPACING, cubie.pos[2] * SPACING]

  return (
    <group position={position} quaternion={orientation} userData={{ cubieId: cubie.id }}>
      <mesh>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshLambertMaterial color="#e7e7e4" />
      </mesh>
      {RODS.map((rod, index) => (
        <mesh key={index} position={rod.position}>
          <boxGeometry args={rod.args} />
          <meshBasicMaterial color="#ffff00" toneMapped={false} />
        </mesh>
      ))}
      {cubie.stickers.map((sticker) => (
        <Sticker key={sticker.local} sticker={sticker} />
      ))}
    </group>
  )
}
