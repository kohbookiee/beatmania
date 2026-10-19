import { useEffect, useState } from 'react'
import * as THREE from 'three'

const tiles = new Map()
const waiters = new Set()
let loading = null

const placeholderCanvas = document.createElement('canvas')
placeholderCanvas.width = 8
placeholderCanvas.height = 8
const placeholderContext = placeholderCanvas.getContext('2d')
placeholderContext.fillStyle = '#d7d3cb'
placeholderContext.fillRect(0, 0, 8, 8)
const PLACEHOLDER = new THREE.CanvasTexture(placeholderCanvas)
PLACEHOLDER.colorSpace = THREE.SRGBColorSpace

function tileTexture(image, number) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const col = (number - 1) % 3
  const row = Math.floor((number - 1) / 3)
  const cell = image.width / 3
  context.drawImage(
    image,
    col * cell,
    row * cell,
    cell,
    cell,
    0,
    0,
    size,
    size,
  )
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function loadFacePhoto() {
  if (tiles.size === 9) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      for (let number = 1; number <= 9; number += 1) {
        tiles.set(number, tileTexture(image, number))
      }
      for (const waiter of waiters) waiter()
      resolve()
    }
    image.src = '/textures/face.jpg'
  })
  return loading
}

export function useFaceTexture(number) {
  const [ready, setReady] = useState(tiles.size === 9)
  useEffect(() => {
    if (tiles.size === 9) return undefined
    const update = () => setReady(true)
    waiters.add(update)
    loadFacePhoto()
    return () => waiters.delete(update)
  }, [])
  return ready ? tiles.get(number) || PLACEHOLDER : PLACEHOLDER
}
