import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
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

const ROD_THICKNESS = 0.02
const OUTER = 1
const ROD_CENTER = OUTER / 2 - ROD_THICKNESS / 2

function rodGeometry() {
  const parts = []
  const add = (x, y, z, w, h, d) => {
    const box = new THREE.BoxGeometry(w, h, d)
    box.translate(x, y, z)
    parts.push(box)
  }
  for (const y of [-ROD_CENTER, ROD_CENTER]) {
    for (const z of [-ROD_CENTER, ROD_CENTER]) add(0, y, z, OUTER, ROD_THICKNESS, ROD_THICKNESS)
  }
  for (const x of [-ROD_CENTER, ROD_CENTER]) {
    for (const z of [-ROD_CENTER, ROD_CENTER]) add(x, 0, z, ROD_THICKNESS, OUTER, ROD_THICKNESS)
  }
  for (const x of [-ROD_CENTER, ROD_CENTER]) {
    for (const y of [-ROD_CENTER, ROD_CENTER]) add(x, y, 0, ROD_THICKNESS, ROD_THICKNESS, OUTER)
  }
  const merged = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  return merged
}

const BODY_GEO = new THREE.BoxGeometry(0.9, 0.9, 0.9)
const STICKER_GEO = new THREE.PlaneGeometry(0.9, 0.9)
const ROD_GEO = rodGeometry()
const BODY_MATERIAL = new THREE.MeshLambertMaterial({ color: '#e7e7e4' })
const ROD_MATERIAL = new THREE.MeshBasicMaterial({ color: '#ffff00', toneMapped: false })

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
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }), [texture])
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh
      position={layout.position}
      rotation={layout.rotation}
      geometry={STICKER_GEO}
      material={material}
    />
  )
}

export default function Cubie({ cubie }) {
  const orientation = useMemo(() => rotationToQuaternion(cubie.rot), [cubie.rot])
  const position = [cubie.pos[0] * SPACING, cubie.pos[1] * SPACING, cubie.pos[2] * SPACING]

  return (
    <group position={position} quaternion={orientation} userData={{ cubieId: cubie.id }}>
      <mesh geometry={BODY_GEO} material={BODY_MATERIAL} />
      <mesh geometry={ROD_GEO} material={ROD_MATERIAL} />
      {cubie.stickers.map((sticker) => (
        <Sticker key={sticker.local} sticker={sticker} />
      ))}
    </group>
  )
}
