import { useEffect, useRef, useState } from 'react'

interface NGO {
  name: string
  country: 'NL' | 'EU'
  focus: string
  note: string
}

const NL_NGOS: NGO[] = [
  { name: 'Natuurmonumenten',   country: 'NL', focus: 'Nature reserves + connectivity', note: '370+ reserves, actively doing corridor work' },
  { name: 'Zoogdiervereniging', country: 'NL', focus: 'Mammals & road-kill data',       note: 'Owns road-kill data & badger/otter expertise' },
  { name: 'ARK Rewilding',      country: 'NL', focus: 'Rewilding corridors',             note: 'Landscape-scale connectivity & rewilding' },
  { name: 'Landschappen NL',    country: 'NL', focus: 'Provincial landscape trusts',     note: 'Umbrella for 12 provincial trusts' },
]

const EU_NGOS: NGO[] = [
  { name: 'Rewilding Europe',       country: 'EU', focus: 'Large-scale rewilding',      note: '10+ large rewilding landscapes' },
  { name: 'WWF European Policy',    country: 'EU', focus: 'Nature Restoration Law',     note: 'EU NRL implementation lead' },
  { name: 'EuroNatur',              country: 'EU', focus: 'Green Belt corridor',         note: 'Balkan & Iron Curtain corridor advocacy' },
  { name: 'Wetlands International', country: 'EU', focus: 'Wetland connectivity',        note: 'Otters, amphibians, waterbirds' },
]

function NGORow({ ngo, index, offset = 0 }: { ngo: NGO; index: number; offset?: number }) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: '1px solid rgba(0,0,0,0.09)',
        padding: '20px 0',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.55s ${(index + offset) * 0.07}s, transform 0.55s ${(index + offset) * 0.07}s`,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem',
          color: 'rgba(0,0,0,0.28)',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}>
          {String(index + 1 + offset).padStart(2, '0')}
        </span>
        <span style={{
          fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
          fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: hovered ? '#2a4020' : '#111',
          transition: 'color 0.2s',
        }}>
          {ngo.name}
        </span>
      </div>
      <div style={{ paddingLeft: '32px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.62rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#2a4020',
          opacity: 0.7,
          marginBottom: '3px',
        }}>
          {ngo.focus}
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.8rem',
          color: 'rgba(0,0,0,0.45)',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          {ngo.note}
        </div>
      </div>
    </div>
  )
}

export default function NGOSection() {
  return (
    <section
      id="partners"
      className="light-section"
      style={{ borderTop: '1px solid rgba(0,0,0,0.09)', padding: '100px 0 0' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: '72px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.32)',
            marginBottom: '20px',
          }}>
            Target Users
          </div>
          <div style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 0.9,
            color: '#1a2818',
          }}>
            <div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)' }}>Who needs</div>
            <div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)', color: '#2a4020' }}>this now.</div>
          </div>
          <p style={{
            marginTop: '28px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.95rem',
            color: 'rgba(0,0,0,0.52)',
            lineHeight: 1.8,
            maxWidth: '520px',
          }}>
            Small NGOs, provinces, and water boards cannot afford €50–150k
            ecological consultancy studies. WildCross gives them infrastructure
            previously only available to well-funded institutions.
          </p>
        </div>

        {/* Two-column NGO list */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px' }}>

          {/* Netherlands */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '4px',
              paddingBottom: '16px',
            }}>
              <span style={{
                fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#2a4020',
              }}>
                Netherlands
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(42,64,32,0.2)' }} />
            </div>
            {NL_NGOS.map((ngo, i) => (
              <NGORow key={ngo.name} ngo={ngo} index={i} />
            ))}
          </div>

          {/* Europe */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '4px',
              paddingBottom: '16px',
            }}>
              <span style={{
                fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#2a4020',
              }}>
                Europe
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(42,64,32,0.2)' }} />
            </div>
            {EU_NGOS.map((ngo, i) => (
              <NGORow key={ngo.name} ngo={ngo} index={i} offset={4} />
            ))}
          </div>
        </div>

        {/* Donate banner */}
        <div style={{
          marginTop: '80px',
          padding: '56px 64px',
          background: '#1a2818',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '40px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#f0eee6',
              lineHeight: 1,
              marginBottom: '10px',
            }}>
              Support the mission.
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.88rem',
              color: 'rgba(240,238,230,0.55)',
              lineHeight: 1.7,
              maxWidth: '420px',
              margin: 0,
            }}>
              Donations fund open-source development and direct deployment
              to under-resourced conservation teams across Europe.
            </p>
          </div>
          <a
            href="https://www.samenvoorbiodiversiteit.nl/toolbox/ecologisch-verbinden"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#1a2818',
              background: '#f0eee6',
              padding: '16px 32px',
              borderRadius: '2px',
              textDecoration: 'none',
              transition: 'background 0.2s, transform 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f0eee6'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Donate to Biodiversity ↗
          </a>
        </div>

      </div>
    </section>
  )
}
