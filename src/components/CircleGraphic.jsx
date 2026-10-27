import { useEffect, useRef } from 'react'
import { subscribePulse } from '../audio/pulse.js'
import { useCube } from '../cube/cubeState.jsx'
import { layoutOrbitDots, ringTurn } from '../cube/orbits.js'

const RADII = [
  { layer: 1, radius: 122 },
  { layer: 0, radius: 110 },
  { layer: -1, radius: 98 },
]

const CIRCLES = [
  { axis: 'y', cx: 240, cy: 146 },
  { axis: 'x', cx: 164, cy: 274 },
  { axis: 'z', cx: 316, cy: 274 },
]

const SVG_NS = 'http://www.w3.org/2000/svg'
const AXES = ['x', 'y', 'z']

function deform(cx, cy, centroid, squash, push) {
  const dx = cx - centroid.x
  const dy = cy - centroid.y
  const len = Math.hypot(dx, dy) || 1
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const sx = 1 + squash
  const sy = 1 - squash * 0.72
  const ox = cx + (dx / len) * push
  const oy = cy + (dy / len) * push
  return `translate(${ox.toFixed(2)} ${oy.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) rotate(${(-angle).toFixed(2)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`
}

export default function CircleGraphic({ scale = 1, spread = 1, active = true }) {
  const { spinRef, cubiesRef, cubies, enqueue, playing } = useCube()
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const playingRef = useRef(playing)
  const activeRef = useRef(active)
  const wakeRef = useRef(() => {})
  playingRef.current = playing
  activeRef.current = active
  const hitsRef = useRef([])
  const shift = (spread - 1) * 16
  const circles = CIRCLES.map((circle, index) => ({
    ...circle,
    cx: circle.cx + (index === 1 ? -shift : index === 2 ? shift : 0),
    cy: circle.cy + (index === 0 ? -shift : shift * 0.35),
  }))

  useEffect(() => subscribePulse((hit) => {
    hitsRef.current.push({ ...hit, t0: performance.now() })
    if (hitsRef.current.length > 12) hitsRef.current.shift()
    wakeRef.current()
  }), [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const orbits = [...svg.querySelectorAll('[data-orbit]')]
    const echoes = [...svg.querySelectorAll('[data-echo]')]
    const rings = [...svg.querySelectorAll('[data-ring]')]
    const lamp = svg.querySelector('[data-lamp]')
    const layers = new Map(AXES.map((axis) => [axis, svg.querySelector(`[data-dots="${axis}"]`)]))
    const nodes = new Map()
    const centroid = orbits.reduce((sum, node) => ({
      x: sum.x + Number(node.dataset.cx),
      y: sum.y + Number(node.dataset.cy),
    }), { x: 0, y: 0 })
    centroid.x /= orbits.length || 1
    centroid.y /= orbits.length || 1
    let frame = 0
    let running = false
    let paintedRing = null

    const draw = () => {
      const cube = cubiesRef.current
      if (!cube) return false
      const now = performance.now()
      hitsRef.current = hitsRef.current.filter((hit) => now - hit.t0 < 1400)
      const energy = { x: { env: 0, squash: 0, push: 0, ripple: 0 }, y: { env: 0, squash: 0, push: 0, ripple: 0 }, z: { env: 0, squash: 0, push: 0, ripple: 0 } }
      for (const hit of hitsRef.current) {
        const age = (now - hit.t0) / 1000
        const env = Math.exp(-age / hit.decay)
        const slot = energy[hit.axis]
        slot.env = Math.min(1, slot.env + env)
        slot.squash = Math.max(slot.squash, env * hit.squash)
        slot.push = Math.max(slot.push, env * hit.push)
        slot.ripple = Math.max(slot.ripple, Math.abs(Math.sin(age * hit.rate)) * env * hit.ripple)
      }

      for (const node of orbits) {
        const axis = node.dataset.orbit
        const self = energy[axis]
        const shove = Math.max(...AXES.filter((item) => item !== axis).map((item) => energy[item].push)) * 0.52
        const squash = self.squash
        const push = self.push + shove
        if (squash < 0.002 && push < 0.15) node.removeAttribute('transform')
        else node.setAttribute('transform', deform(Number(node.dataset.cx), Number(node.dataset.cy), centroid, squash, push))
      }

      for (const echo of echoes) {
        const slot = energy[echo.dataset.echo]
        const radius = Number(echo.dataset.radius) * (1 + slot.ripple * 0.045)
        echo.setAttribute('r', radius.toFixed(2))
        echo.setAttribute('opacity', slot.env > 0.02 ? slot.env.toFixed(3) : '0')
      }

      if (lamp) {
        const peak = Math.max(energy.x.env, energy.y.env, energy.z.env)
        lamp.setAttribute('r', (2.3 + peak * 6.5).toFixed(2))
        lamp.setAttribute('fill', peak > 0.05 ? '#ff4fd0' : '#ffff00')
        lamp.setAttribute('opacity', peak > 0.05 ? (0.55 + peak * 0.45).toFixed(3) : '0.85')
      }

      const partial = spinRef.current.partial
      const activeRing = partial ? `${partial.axis}:${partial.layer}` : ''
      if (activeRing !== paintedRing) {
        paintedRing = activeRing
        for (const ring of rings) {
          const active = ring.dataset.ring === activeRing
          ring.setAttribute('stroke', active ? '#fff4a3' : '#ffff00')
          ring.setAttribute('stroke-width', active ? '2.8' : '1.55')
          ring.setAttribute('opacity', active ? '1' : '0.78')
        }
      }

      const seen = new Set()
      for (const dot of layoutOrbitDots(cube, partial)) {
        seen.add(dot.id)
        let node = nodes.get(dot.id)
        const layer = layers.get(dot.axis)
        if (!layer) continue
        if (!node) {
          node = document.createElementNS(SVG_NS, 'circle')
          node.setAttribute('data-id', dot.id)
          node.setAttribute('stroke', '#111111')
          node.setAttribute('stroke-width', '0.7')
          nodes.set(dot.id, node)
        }
        if (node.parentNode !== layer) layer.appendChild(node)
        const cx = dot.x.toFixed(1)
        const cy = dot.y.toFixed(1)
        const radius = dot.active ? '5.1' : '4.15'
        if (node._cx !== cx) {
          node._cx = cx
          node.setAttribute('cx', cx)
        }
        if (node._cy !== cy) {
          node._cy = cy
          node.setAttribute('cy', cy)
        }
        if (node._r !== radius) {
          node._r = radius
          node.setAttribute('r', radius)
        }
        if (node._fill !== dot.color) {
          node._fill = dot.color
          node.setAttribute('fill', dot.color)
        }
      }
      for (const [id, node] of nodes) {
        if (seen.has(id)) continue
        node.remove()
        nodes.delete(id)
      }
      return Boolean(partial) || hitsRef.current.length > 0
    }

    const tick = () => {
      if (!activeRef.current) {
        running = false
        return
      }
      if (draw()) frame = requestAnimationFrame(tick)
      else running = false
    }

    const wake = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(tick)
    }

    wakeRef.current = wake
    spinRef.current.onChange = wake
    wake()
    return () => {
      running = false
      cancelAnimationFrame(frame)
      if (spinRef.current.onChange === wake) spinRef.current.onChange = null
      if (wakeRef.current === wake) wakeRef.current = () => {}
    }
  }, [cubiesRef, spinRef])

  useEffect(() => {
    if (active) wakeRef.current()
  }, [cubies, active])

  function localPoint(event) {
    const svg = svgRef.current
    if (!svg) return null
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const local = point.matrixTransform(matrix.inverse())
    return { x: local.x, y: local.y }
  }

  function nearestRing(x, y) {
    const svg = svgRef.current
    if (!svg) return null
    let best = null
    for (const node of svg.querySelectorAll('[data-ring]')) {
      const cx = Number(node.getAttribute('cx'))
      const cy = Number(node.getAttribute('cy'))
      const radius = Number(node.getAttribute('r'))
      const gap = Math.abs(Math.hypot(x - cx, y - cy) - radius)
      if (!best || gap < best.gap) best = { gap, cx, cy, ring: node.dataset.ring }
    }
    if (!best || best.gap > 14) return null
    const [axis, layer] = best.ring.split(':')
    return { axis, layer: Number(layer), cx: best.cx, cy: best.cy }
  }

  function onPointerDown(event) {
    if (event.button !== 0 || playingRef.current) return
    const point = localPoint(event)
    const ring = point && nearestRing(point.x, point.y)
    const wrap = wrapRef.current
    if (!ring || !wrap) return
    dragRef.current = {
      ...ring,
      pointer: event.pointerId,
      angle: Math.atan2(point.y - ring.cy, point.x - ring.cx),
      accum: 0,
      turned: false,
    }
    wrap.classList.add('is-dragging')
    try {
      wrap.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is unavailable until the browser trusts the gesture.
    }
  }

  function onPointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.turned || event.pointerId !== drag.pointer || playingRef.current) return
    const point = localPoint(event)
    if (!point) return
    const angle = Math.atan2(point.y - drag.cy, point.x - drag.cx)
    let delta = angle - drag.angle
    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2
    drag.angle = angle
    drag.accum += delta
    if (Math.abs(drag.accum) < 0.28) return
    const notation = ringTurn(drag.axis, drag.layer, drag.accum > 0)
    drag.turned = true
    if (notation) enqueue(notation)
  }

  function onPointerUp(event) {
    const drag = dragRef.current
    if (drag && event.pointerId !== drag.pointer) return
    dragRef.current = null
    wrapRef.current?.classList.remove('is-dragging')
  }

  return (
    <div
      ref={wrapRef}
      className="circles-wrap"
      style={scale === 1 ? undefined : { transform: `scale(${scale})` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg
        ref={svgRef}
        className="circles"
        viewBox="0 0 480 430"
        role="img"
        aria-label="Scale circles. Press a ring and drag to turn that layer."
      >
        {circles.map((circle) => (
          <g key={circle.axis} data-orbit={circle.axis} data-cx={circle.cx} data-cy={circle.cy}>
            {RADII.map((ring) => (
              <circle
                key={`ring-${ring.layer}`}
                data-ring={`${circle.axis}:${ring.layer}`}
                cx={circle.cx}
                cy={circle.cy}
                r={ring.radius}
                fill="none"
                stroke="#ffff00"
                strokeWidth="1.55"
                opacity="0.78"
              />
            ))}
            {RADII.map((ring) => (
              <circle
                key={`echo-${ring.layer}`}
                data-echo={circle.axis}
                data-radius={ring.radius}
                cx={circle.cx}
                cy={circle.cy}
                r={ring.radius}
                fill="none"
                stroke="#ff4fd0"
                strokeWidth="1.7"
                opacity="0"
              />
            ))}
            <g data-dots={circle.axis} />
          </g>
        ))}
        <circle data-lamp="" cx="240" cy="231" r="2.3" fill="#ffff00" />
      </svg>
    </div>
  )
}
