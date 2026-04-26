import { useEffect, useState, type ReactNode } from 'react'
import foxImg from '../assets/fox.png'

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i
const MOBILE_MAX_WIDTH = 900

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  if (MOBILE_UA.test(navigator.userAgent)) return true
  if (window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < MOBILE_MAX_WIDTH) return true
  return window.innerWidth < MOBILE_MAX_WIDTH
}

export default function DesktopOnlyGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(isMobile)

  useEffect(() => {
    const onResize = () => setBlocked(isMobile())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!blocked) return <>{children}</>

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        background: '#f0eee6',
        color: 'rgba(0,0,0,0.65)',
        textAlign: 'center',
      }}
    >
      {/* eyebrow label */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.68rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'rgba(0,0,0,0.32)',
        marginBottom: 32,
      }}>
        Wildcross
      </div>

      {/* fox image */}
      <img
        src={foxImg}
        alt="Fox"
        style={{
          width: 'clamp(140px, 40vw, 220px)',
          objectFit: 'contain',
          marginBottom: 36,
          opacity: 0.92,
        }}
      />

      {/* headline */}
      <div style={{
        fontFamily: "'Anton', sans-serif",
        fontSize: 'clamp(2.6rem, 10vw, 4rem)',
        fontWeight: 400,
        textTransform: 'uppercase',
        letterSpacing: '-0.005em',
        lineHeight: 1,
        color: '#1a2818',
        marginBottom: 8,
      }}>
        Desktop
      </div>
      <div style={{
        fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
        fontWeight: 800,
        fontSize: 'clamp(1rem, 4vw, 1.4rem)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: '#2a4020',
        marginBottom: 28,
      }}>
        only.
      </div>

      {/* divider */}
      <div style={{ width: 40, height: 1, background: 'rgba(0,0,0,0.18)', marginBottom: 28 }} />

      {/* body */}
      <p style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: '0.95rem',
        lineHeight: 1.8,
        color: 'rgba(0,0,0,0.55)',
        maxWidth: 340,
      }}>
        Wildcross relies on a wide map view and dense controls that don't fit on a phone.
        Open this page on a laptop or desktop to continue.
      </p>
    </div>
  )
}
