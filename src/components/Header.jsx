export default function Header() {
  return (
    <header className="header">
      <h1 className="title">beat mania</h1>
      <nav className="view-nav" aria-label="View mode">
        <button type="button" className="view-tab is-active" aria-pressed="true">
          3D CUBE
        </button>
        <button type="button" className="view-tab" disabled>
          2D PUZZLE
        </button>
      </nav>
    </header>
  )
}
