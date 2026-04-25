import React, { useEffect, useRef, useState, type FormEvent } from 'react'
import { postDonation, type DonationResponse } from '../api/donations'

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

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '0.88rem',
  color: '#f0eee6',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '2px',
  outline: 'none',
  marginTop: '6px',
  display: 'block',
  boxSizing: 'border-box',
}

function DonateBanner() {
  const [ngoName, setNgoName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('100')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<DonationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await postDonation({
        ngoName: ngoName.trim(),
        contactEmail: email.trim(),
        amountEuros: Number(amount),
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(240,238,230,0.42)',
    display: 'block',
  }

  return (
    <div style={{
      marginTop: '80px',
      background: '#1a2818',
      padding: '56px 64px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '64px',
      alignItems: 'start',
    }}>
      {/* Left: copy */}
      <div>
        <div style={{
          fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
          lineHeight: 0.9, marginBottom: '20px',
        }}>
          <div style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2.4rem)', color: '#f0eee6' }}>Support</div>
          <div style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2.4rem)', color: '#4a9e5c' }}>the mission.</div>
        </div>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.88rem', color: 'rgba(240,238,230,0.52)', lineHeight: 1.8, margin: 0,
        }}>
          Donations fund open-source development and direct deployment
          to under-resourced conservation teams across Europe. Every euro
          goes to connectivity-model compute, new country data, and
          expanding species coverage.
        </p>
      </div>

      {/* Right: form or success */}
      {result ? (
        <div>
          <div style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: '#4a9e5c', fontSize: '0.85rem', marginBottom: '12px',
          }}>
            {result.status === 'demo' ? 'Demo invoice created' : 'Invoice created ✓'}
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: 'rgba(240,238,230,0.55)', lineHeight: 1.7, marginBottom: '20px' }}>
            {result.status === 'demo'
              ? 'Running in demo mode — no real invoice was generated.'
              : `Invoice ${result.invoiceNumber ?? result.invoiceId} is ready.`}
          </p>
          <a
            href={result.hostedInvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#1a2818', background: '#f0eee6',
              padding: '12px 24px', borderRadius: '2px', textDecoration: 'none',
              display: 'inline-block', marginRight: '12px',
            }}
          >
            Open payment link ↗
          </a>
          <button
            onClick={() => { setResult(null); setNgoName(''); setEmail(''); setAmount('100') }}
            style={{
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(240,238,230,0.5)', background: 'none',
              border: '1px solid rgba(255,255,255,0.14)',
              padding: '11px 24px', borderRadius: '2px', cursor: 'pointer',
            }}
          >
            Another donation
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={labelStyle}>
              NGO / organisation
              <input type="text" required maxLength={200} value={ngoName}
                onChange={e => setNgoName(e.target.value)}
                placeholder="Natuurmonumenten" style={INPUT_STYLE} />
            </label>
            <label style={labelStyle}>
              Contact email
              <input type="email" required maxLength={200} value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="info@example.org" style={INPUT_STYLE} />
            </label>
          </div>

          <label style={labelStyle}>
            Amount (EUR)
            <input type="number" required min={1} max={100000} value={amount}
              onChange={e => setAmount(e.target.value)} style={{ ...INPUT_STYLE, maxWidth: '160px' }} />
          </label>

          {error && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#e74c3c', margin: 0 }}>
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              style={{
                fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#1a2818', background: submitting ? 'rgba(240,238,230,0.5)' : '#f0eee6',
                border: 'none', borderRadius: '2px',
                padding: '14px 28px', cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {submitting ? 'Creating invoice…' : 'Donate →'}
            </button>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.72rem', color: 'rgba(240,238,230,0.3)', lineHeight: 1.6,
              marginTop: '10px', marginBottom: 0,
            }}>
              Invoice via Solvimon. Payment link sent by email — no card details collected here.
            </p>
          </div>
        </form>
      )}
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
        <DonateBanner />

      </div>
    </section>
  )
}
