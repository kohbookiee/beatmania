import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getNet } from '../cube/net.js'
import { useCube } from '../cube/cubeState.jsx'

const PHOTO = `${import.meta.env.BASE_URL}textures/face.jpg`
const CROSS = [
  { face: 'U', column: 2, row: 1 },
  { face: 'L', column: 1, row: 2 },
  { face: 'F', column: 2, row: 2 },
  { face: 'R', column: 3, row: 2 },
  { face: 'B', column: 4, row: 2 },
  { face: 'D', column: 2, row: 3 },
]

function curve(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const bend = Math.min(36, length * 0.28)
  const cx = (from.x + to.x) / 2 + (-dy / length) * bend
  const cy = (from.y + to.y) / 2 + (dx / length) * bend
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

function findCell(faces, id) {
  for (const cells of Object.values(faces)) {
    const cell = cells.find((item) => item?.cellId === id)
    if (cell) return cell
  }
  return null
}

export default function CubeNet({ path, activeId = '', onPath }) {
  const { cubies, swapPieces } = useCube()
  const faces = getNet(cubies)
  const facesRef = useRef(faces)
  const boardRef = useRef(null)
  const dragging = useRef(false)
  const pathRef = useRef(path)
  const [points, setPoints] = useState([])
  const [pointer, setPointer] = useState(null)
  facesRef.current = faces
  pathRef.current = path

  function locate(ids, point) {
    const board = boardRef.current
    if (!board) return []
    const origin = board.getBoundingClientRect()
    const next = ids.map((id) => {
      const el = board.querySelector(`[data-cell="${id}"]`)
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return {
        id,
        x: rect.left + rect.width / 2 - origin.left,
        y: rect.top + rect.height / 2 - origin.top,
      }
    }).filter(Boolean)
    if (point) {
      next.push({
        id: 'pointer',
        x: point.x - origin.left,
        y: point.y - origin.top,
      })
    }
    return next
  }

  useEffect(() => {
    setPoints(locate(path, null))
  }, [path, cubies])

  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) return undefined
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      let minAvail = Infinity
      board.querySelectorAll('.net-slot').forEach((slot) => {
        const name = slot.querySelector('.net-face-name')
        if (!name) return
        const slotBox = slot.getBoundingClientRect()
        const nameBox = name.getBoundingClientRect()
        const gap = parseFloat(getComputedStyle(slot).rowGap) || 0
        minAvail = Math.min(minAvail, slotBox.width, slotBox.height - nameBox.height - gap)
      })
      if (!Number.isFinite(minAvail) || minAvail < 16) return
      const cell = Math.floor(((minAvail - 4) * dpr) / 3) / dpr
      board.style.setProperty('--cell', String(cell))
      board.querySelectorAll('.net-face').forEach((face) => {
        face.style.translate = '0px 0px'
      })
      board.querySelectorAll('.net-face').forEach((face) => {
        const box = face.getBoundingClientRect()
        const dx = Math.round(box.left * dpr) / dpr - box.left
        const dy = Math.round(box.top * dpr) / dpr - box.top
        face.style.translate = `${dx}px ${dy}px`
      })
      setPoints(locate(pathRef.current, null))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(board)
    fit()
    return () => observer.disconnect()
  }, [])

  function cellAt(event) {
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    return hit?.closest('[data-cell]')?.dataset.cell || ''
  }

  function onPointerDown(event) {
    const id = event.target.closest('[data-cell]')?.dataset.cell
    if (!id) return
    dragging.current = true
    pathRef.current = [id]
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* synthetic pointers have no capture */
    }
    onPath([id])
    setPointer({ x: event.clientX, y: event.clientY })
    setPoints(locate([id], { x: event.clientX, y: event.clientY }))
  }

  function onPointerMove(event) {
    if (!dragging.current) return
    const id = cellAt(event)
    const point = { x: event.clientX, y: event.clientY }
    const current = pathRef.current
    const next = id && !current.includes(id) ? [...current, id] : current
    if (next !== current) {
      pathRef.current = next
      onPath(next)
    }
    setPointer(point)
    setPoints(locate(next, point))
  }

  function onPointerUp() {
    if (!dragging.current) return
    dragging.current = false
    const ids = pathRef.current
    const cells = ids.map((id) => findCell(facesRef.current, id)).filter(Boolean)
    const sameFace = cells.length >= 2 && cells.every((cell) => cell.face === cells[0].face)
    if (sameFace) swapPieces(cells[0], cells[cells.length - 1])
    setPointer(null)
    setPoints(locate(ids, null))
  }

  const drawing = pointer ? points : points.filter((point) => point.id !== 'pointer')

  return (
    <section className="puzzle-net" aria-label="Cube net">
      <div
        className="net-board"
        ref={boardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {CROSS.map(({ face, column, row }) => (
          <div key={face} className="net-slot" style={{ gridColumn: column, gridRow: row }}>
            <span className="net-face-name">{face}</span>
            <div className="net-face" data-face={face}>
              {faces[face].map((cell) => {
                const tileCol = (cell.n - 1) % 3
                const tileRow = Math.floor((cell.n - 1) / 3)
                return (
                  <button
                    key={cell.cellId}
                    type="button"
                    className={`net-cell${path.includes(cell.cellId) ? ' is-on' : ''}${activeId === cell.cellId ? ' is-live' : ''}`}
                    data-cell={cell.cellId}
                    aria-label={cell.cellId}
                    aria-pressed={path.includes(cell.cellId)}
                  >
                    <span
                      className="net-photo"
                      style={{
                        backgroundImage: `url(${PHOTO})`,
                        backgroundPosition: `${tileCol * 50}% ${tileRow * 50}%`,
                        transform: `rotate(${((cell.turn + cell.spin) % 4) * 90}deg)`,
                      }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <svg className="net-draw" aria-hidden="true">
          {drawing.slice(1).map((point, index) => (
            <path key={`${drawing[index].id}-${point.id}`} d={curve(drawing[index], point)} />
          ))}
        </svg>
      </div>
      <p className="net-hint">Drag a piece to another to create a composition</p>
    </section>
  )
}
