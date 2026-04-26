import React, { useEffect, useRef, useState, type FormEvent } from 'react'
import { postDonation, type DonationResponse } from '../api/donations'

interface NGO {
  name: string
  country: 'NL' | 'EU'
  focus: string
  note: string
  url: string
  image: string
}

const ALL_NGOS: NGO[] = [
  {
    name: 'Natuurmonumenten',
    country: 'NL',
    focus: 'Nature reserves & connectivity',
    note: '370+ reserves, actively doing corridor work across the Netherlands.',
    url: 'https://www.natuurmonumenten.nl',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80&fit=crop',
  },
  {
    name: 'Zoogdiervereniging',
    country: 'NL',
    focus: 'Mammals & road-kill data',
    note: 'Owns the road-kill database and deep badger/otter expertise.',
    url: 'https://www.zoogdiervereniging.nl',
    image: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&q=80&fit=crop',
  },
  {
    name: 'ARK Rewilding',
    country: 'NL',
    focus: 'Rewilding corridors',
    note: 'Landscape-scale connectivity and rewilding — the Dutch vanguard.',
    url: 'https://www.ark.eu',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80&fit=crop',
  },
  {
    name: 'Landschappen NL',
    country: 'NL',
    focus: 'Provincial landscape trusts',
    note: 'Umbrella for 12 provincial trusts managing regional habitat networks.',
    url: 'https://www.landschappennl.nl',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80&fit=crop',
  },
  {
    name: 'Rewilding Europe',
    country: 'EU',
    focus: 'Large-scale rewilding',
    note: '10+ large rewilding landscapes across Europe needing corridor planning.',
    url: 'https://rewildingeurope.com',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80&fit=crop',
  },
  {
    name: 'WWF European Policy',
    country: 'EU',
    focus: 'Nature Restoration Law',
    note: 'Lead implementer of the EU Nature Restoration Law (2024).',
    url: 'https://www.wwf.eu',
    image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=600&q=80&fit=crop',
  },
  {
    name: 'EuroNatur',
    country: 'EU',
    focus: 'Green Belt corridor',
    note: 'Former Iron Curtain as Europe\'s longest wildlife corridor — Balkan advocacy.',
    url: 'https://www.euronatur.org',
    image: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=600&q=80&fit=crop',
  },
  {
    name: 'Wetlands International',
    country: 'EU',
    focus: 'Wetland connectivity',
    note: 'Connectivity for otters, amphibians, and waterbirds across Europe\'s wetlands.',
    url: 'https://www.wetlands.org',
    image: 'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=600&q=80&fit=crop',
  },
]

function NGOCard({ ngo, index }: { ngo: NGO; index: number }) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.08 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <a
      href={ngo.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <div
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '4px',
          height: '320px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(28px)',
          transition: `opacity 0.6s ${index * 0.07}s ease, transform 0.6s ${index * 0.07}s ease`,
          cursor: 'pointer',
        }}
      >
        {/* Background image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${ngo.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.55s ease',
        }} />

        {/* Gradient overlay — always dark at bottom */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: hovered
            ? 'linear-gradient(to top, rgba(10,22,8,0.96) 0%, rgba(10,22,8,0.6) 55%, rgba(10,22,8,0.2) 100%)'
            : 'linear-gradient(to top, rgba(10,22,8,0.92) 0%, rgba(10,22,8,0.45) 55%, rgba(10,22,8,0.08) 100%)',
          transition: 'background 0.4s ease',
        }} />

        {/* Country badge */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
          fontSize: '0.55rem',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: ngo.country === 'NL' ? '#4a9e5c' : '#7ec8e3',
          background: 'rgba(10,22,8,0.7)',
          padding: '4px 9px',
          borderRadius: '2px',
          border: `1px solid ${ngo.country === 'NL' ? 'rgba(74,158,92,0.4)' : 'rgba(126,200,227,0.4)'}`,
          backdropFilter: 'blur(4px)',
        }}>
          {ngo.country === 'NL' ? 'Netherlands' : 'Europe'}
        </div>

        {/* Bottom content */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 22px',
        }}>
          {/* Focus tag */}
          <div style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.55rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#4a9e5c',
            marginBottom: '8px',
            opacity: hovered ? 1 : 0.8,
            transition: 'opacity 0.3s',
          }}>
            {ngo.focus}
          </div>

          {/* Name */}
          <div style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: 'clamp(1rem, 1.4vw, 1.2rem)',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#f0eee6',
            lineHeight: 1.1,
            marginBottom: '10px',
          }}>
            {ngo.name}
          </div>

          {/* Note — slides in on hover */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.8rem',
            color: 'rgba(240,238,230,0.72)',
            lineHeight: 1.55,
            maxHeight: hovered ? '80px' : '0px',
            opacity: hovered ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.4s ease, opacity 0.35s ease',
            marginBottom: hovered ? '12px' : '0',
          }}>
            {ngo.note}
          </div>

          {/* Visit link */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: hovered ? '#4a9e5c' : 'rgba(240,238,230,0.4)',
            transition: 'color 0.3s',
          }}>
            Visit website
            <span style={{
              transform: hovered ? 'translateX(4px)' : 'translateX(0)',
              transition: 'transform 0.3s',
              display: 'inline-block',
            }}>↗</span>
          </div>
        </div>
      </div>
    </a>
  )
}

/* ── Donate Banner ────────────────────────────────────────────────── */

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
    fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
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
          {result.status !== 'demo' && (
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
          )}
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

/* ── Main section ─────────────────────────────────────────────────── */

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
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
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

        {/* Card grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}>
          {ALL_NGOS.map((ngo, i) => (
            <NGOCard key={ngo.name} ngo={ngo} index={i} />
          ))}
        </div>

        {/* Donate banner */}
        <DonateBanner />

      </div>
    </section>
  )
}
