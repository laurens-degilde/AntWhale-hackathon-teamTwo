export default function Footer() {
  return (
    <footer style={{
      background: '#111a10',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 64px 64px' }}>

        {/* Top — brand + links */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '80px',
          flexWrap: 'wrap',
          gap: '48px',
        }}>

          {/* Brand */}
          <div style={{ maxWidth: '280px' }}>
            <div style={{
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#f0eee6',
              marginBottom: '16px',
            }}>
              Wildcross
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.82rem',
              color: 'rgba(240,238,230,0.38)',
              lineHeight: 1.7,
              margin: 0,
            }}>
              Wildlife corridor intelligence.<br />
              Open source · MIT License · 2026
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
            {[
              { heading: 'Open Data', links: [
                { label: 'Circuitscape', href: 'https://circuitscape.org/' },
                { label: 'GBIF', href: 'https://www.gbif.org/' },
                { label: 'Waarneming.nl', href: 'https://waarneming.nl/' },
              ]},
              { heading: 'Science', links: [
                { label: 'IUCN Guidelines', href: 'https://portals.iucn.org/library/sites/library/files/documents/PAG-030-En.pdf' },
                { label: 'IENE Network', href: 'https://www.iene.info/' },
                { label: 'Conservation Corridors', href: 'https://conservationcorridor.org/' },
              ]},
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div style={{
                  fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                  fontSize: '0.6rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(240,238,230,0.28)',
                  marginBottom: '20px',
                }}>
                  {heading}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {links.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.85rem',
                        color: 'rgba(240,238,230,0.5)',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f0eee6')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,238,230,0.5)')}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — quote + copyright */}
        <div style={{
          paddingTop: '40px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '32px',
        }}>
          <p style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: 'clamp(0.78rem, 1.1vw, 0.95rem)',
            fontStyle: 'normal',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'rgba(240,238,230,0.22)',
            maxWidth: '600px',
            lineHeight: 1.6,
            margin: 0,
          }}>
            "Many of them aren't human. We have the seat. We have the tools. Build for them."
          </p>
          <div style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            color: 'rgba(240,238,230,0.2)',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            © 2026 Wildcross
          </div>
        </div>

      </div>
    </footer>
  )
}
