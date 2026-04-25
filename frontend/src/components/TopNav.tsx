export function TopNav() {
  return (
    <nav className="topnav" aria-label="Primary">
      <a className="topnav-brand" href="#mission">
        <span className="topnav-dot" aria-hidden="true" /> Corridor
      </a>
      <ul className="topnav-links">
        <li><a href="#how">How it works</a></li>
        <li><a href="#map">Data</a></li>
        <li><a href="#plan">Action plan</a></li>
        <li><a href="#partners">NGOs</a></li>
        <li><a href="#faq">FAQ</a></li>
      </ul>
      <a className="topnav-donate" href="#donate">Donate</a>
    </nav>
  )
}
