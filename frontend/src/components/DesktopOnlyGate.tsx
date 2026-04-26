import { useEffect, useState, type ReactNode } from 'react'

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        background: '#f0eee6',
        color: '#1a1a1a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 16, letterSpacing: '0.02em' }}>
          Desktop only
        </h1>
        <p style={{ fontSize: '1rem', lineHeight: 1.5, opacity: 0.8 }}>
          Wildcross relies on a wide map view and dense controls that don't fit on a phone.
          Open this page on a laptop or desktop to continue.
        </p>
      </div>
    </div>
  )
}
