import * as THREE from 'three'

const cache = new Map()

export function getNumberTexture(number) {
  const existing = cache.get(number)
  if (existing) return existing

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  context.fillStyle = '#f4f4f1'
  context.fillRect(0, 0, size, size)
  context.fillStyle = '#111111'
  context.font = '700 148px Georgia, "Times New Roman", serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(number), size / 2, size / 2 + 8)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  cache.set(number, texture)
  return texture
}
