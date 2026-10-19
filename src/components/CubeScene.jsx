import { Preload } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { moveFromDrag } from '../cube/cubeLogic.js'
import { useCube } from '../cube/cubeState.jsx'
import RubiksCube from './RubiksCube.jsx'

const FOV = 30
const HOME = new THREE.Vector3(-3.9, 2.95, 5.05)
const HOME_SPHERICAL = new THREE.Spherical().setFromVector3(HOME)
const spherical = new THREE.Spherical()

function fitRadius(aspect) {
  const tan = Math.tan((FOV * Math.PI) / 180 / 2)
  const span = aspect >= 1 ? 7.15 : 7.15 / aspect
  return span / (2 * tan)
}

function snapOutward(vector) {
  const ax = Math.abs(vector.x)
  const ay = Math.abs(vector.y)
  const az = Math.abs(vector.z)
  if (ax >= ay && ax >= az) return [Math.sign(vector.x) || 1, 0, 0]
  if (ay >= az) return [0, Math.sign(vector.y) || 1, 0]
  return [0, 0, Math.sign(vector.z) || 1]
}

function CameraRig({ orbitRef }) {
  const { camera, size } = useThree()
  useFrame(() => {
    const aspect = size.width / Math.max(1, size.height)
    const { theta, phi, zoom } = orbitRef.current
    spherical.set(fitRadius(aspect) * zoom, phi, theta)
    camera.position.setFromSpherical(spherical)
    camera.lookAt(0, 0, 0)
  })
  return null
}

function PointerRig({ cubeRef, orbitRef }) {
  const { camera, gl } = useThree()
  const { cubies, anim, enqueue } = useCube()
  const cubiesRef = useRef(cubies)
  const animRef = useRef(anim)
  cubiesRef.current = cubies
  animRef.current = anim

  useEffect(() => {
    const element = gl.domElement
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const gesture = {
      mode: null,
    }

    function setPointer(event) {
      const rect = element.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    function pick(event) {
      if (!cubeRef.current) return null
      setPointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObject(cubeRef.current, true)
      if (!hits.length) return null
      const hit = hits[0]
      let object = hit.object
      let cubieId = null
      while (object) {
        if (object.userData?.cubieId) {
          cubieId = object.userData.cubieId
          break
        }
        object = object.parent
      }
      if (!cubieId || !object) return null
      const center = new THREE.Vector3()
      object.getWorldPosition(center)
      const outward = hit.point.clone().sub(center)
      return {
        cubieId,
        normal: snapOutward(outward),
        point: hit.point.clone(),
      }
    }

    function dragVector(event) {
      setPointer(event)
      raycaster.setFromCamera(pointer, camera)
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        new THREE.Vector3(...gesture.normal),
        gesture.point,
      )
      const point = new THREE.Vector3()
      if (!raycaster.ray.intersectPlane(plane, point)) return null
      return point.sub(gesture.point)
    }

    function onPointerDown(event) {
      if (event.button !== 0) return
      const hit = pick(event)
      if (hit && !animRef.current) {
        gesture.mode = 'pending-twist'
        gesture.x = event.clientX
        gesture.y = event.clientY
        gesture.cubieId = hit.cubieId
        gesture.normal = hit.normal
        gesture.point = hit.point
      } else if (!hit) {
        gesture.mode = 'orbit'
        gesture.x = event.clientX
        gesture.y = event.clientY
        gesture.theta = orbitRef.current.theta
        gesture.phi = orbitRef.current.phi
      } else {
        gesture.mode = null
      }
      if (gesture.mode) element.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event) {
      if (!gesture.mode) {
        const hit = pick(event)
        element.style.cursor = hit ? 'pointer' : 'grab'
      }
      if (gesture.mode === 'orbit') {
        const dx = event.clientX - gesture.x
        const dy = event.clientY - gesture.y
        orbitRef.current.theta = gesture.theta - dx * 0.0052
        const nextPhi = gesture.phi + dy * 0.0052
        orbitRef.current.phi = Math.min(Math.PI - 0.16, Math.max(0.16, nextPhi))
        element.style.cursor = 'grabbing'
        return
      }
      if (gesture.mode !== 'pending-twist') return
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      if (dx * dx + dy * dy < 81) return
      const drag = dragVector(event)
      const cubie = cubiesRef.current.find((item) => item.id === gesture.cubieId)
      gesture.mode = 'done'
      if (!drag || !cubie || animRef.current) return
      const notation = moveFromDrag(gesture.normal, [drag.x, drag.y, drag.z], cubie.pos)
      if (notation) enqueue(notation)
    }

    function onPointerUp() {
      gesture.mode = null
    }

    function onWheel(event) {
      event.preventDefault()
      const direction = event.deltaY > 0 ? 1.07 : 0.935
      orbitRef.current.zoom = Math.min(1.45, Math.max(0.86, orbitRef.current.zoom * direction))
    }

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
      element.removeEventListener('wheel', onWheel)
    }
  }, [camera, cubeRef, enqueue, gl, orbitRef])

  return null
}

export default function CubeScene() {
  const cubeRef = useRef(null)
  const orbitRef = useRef({
    theta: HOME_SPHERICAL.theta,
    phi: HOME_SPHERICAL.phi,
    zoom: 1,
  })

  useEffect(() => {
    window.__CHILDREN_PLAY_CAMERA__ = {
      look(position) {
        const next = new THREE.Spherical().setFromVector3(new THREE.Vector3(...position))
        orbitRef.current.theta = next.theta
        orbitRef.current.phi = Math.min(Math.PI - 0.16, Math.max(0.16, next.phi))
      },
      home() {
        orbitRef.current.theta = HOME_SPHERICAL.theta
        orbitRef.current.phi = HOME_SPHERICAL.phi
        orbitRef.current.zoom = 1
      },
      get() {
        return { ...orbitRef.current }
      },
    }
    return () => {
      delete window.__CHILDREN_PLAY_CAMERA__
    }
  }, [])

  return (
    <>
      <div className="cube-viewport">
        <Canvas
          camera={{ position: [HOME.x, HOME.y, HOME.z], fov: FOV, near: 0.1, far: 100 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0)
            gl.toneMapping = THREE.NoToneMapping
          }}
        >
          <ambientLight intensity={0.78} />
          <directionalLight position={[5, 7, 4]} intensity={0.72} />
          <directionalLight position={[-4, 2, -3]} intensity={0.28} />
          <group ref={cubeRef} scale={1.3}>
            <RubiksCube />
          </group>
          <CameraRig orbitRef={orbitRef} />
          <PointerRig cubeRef={cubeRef} orbitRef={orbitRef} />
          <Preload all />
        </Canvas>
      </div>
    </>
  )
}
