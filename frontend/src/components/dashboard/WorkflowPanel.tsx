import { useState } from 'react'

interface ChecklistItem {
  id: string
  label: string
  category: 'document' | 'contact' | 'subsidy' | 'gis'
  done: boolean
  detail?: string
}

const WORKFLOW_ITEMS: ChecklistItem[] = [
  { id: 'w1', label: 'Technical report (methods + citations)',   category: 'document', done: true,  detail: 'PDF with full Circuitscape methodology and resistance table citations' },
  { id: 'w2', label: 'GeoPackage export for GIS team',          category: 'gis',      done: true,  detail: 'EPSG:28992 · 6 layers · corridor_analysis_gelderland_2026.gpkg' },
  { id: 'w3', label: 'Landowner letter: Gemeente Barneveld',    category: 'contact',  done: false, detail: 'Hedgerow planting on parcel BGT-2024-44821 (0.8 ha field edge)' },
  { id: 'w4', label: 'Landowner letter: Maatschap de Vries',    category: 'contact',  done: false, detail: 'Culvert access permission for A12/km23.4 approach' },
  { id: 'w5', label: 'ANLb subsidy application (hedgerow)',     category: 'subsidy',  done: false, detail: 'Regime AL07 · est. €240/ha/yr' },
  { id: 'w6', label: 'GLB eco-scheme form (biodiversity strips)', category: 'subsidy', done: false, detail: 'Gemeenschappelijk Landbouwbeleid 2023–2027 · eco-scheme B7' },
  { id: 'w7', label: 'Contact Provincie Gelderland (NNN)',      category: 'contact',  done: false, detail: 'Approval needed for interventions in Natuur Netwerk Nederland' },
  { id: 'w8', label: 'Contact Rijkswaterstaat (A12 culvert)',   category: 'contact',  done: false, detail: 'Permit for infrastructure works on national road' },
  { id: 'w9', label: 'Stakeholder map: water boards',           category: 'document', done: true,  detail: 'Waterschap Vallei en Veluwe, Waterschap Rijn en IJssel' },
  { id: 'w10', label: 'Provincial biodiversity grant',          category: 'subsidy',  done: false, detail: 'Provincie Gelderland · deadline 2026-06-01' },
]

const CAT: Record<string, { color: string; label: string }> = {
  document: { color: '#48CAE4', label: 'Document' },
  contact:  { color: '#FCBF49', label: 'Contact' },
  subsidy:  { color: '#2B9348', label: 'Subsidy' },
  gis:      { color: '#2EC4B6', label: 'GIS' },
}

export default function WorkflowPanel() {
  const [items, setItems] = useState(WORKFLOW_ITEMS)
  const [filter, setFilter] = useState('all')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const toggle = (id: string) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, done: !it.done } : it))

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)
  const doneCount = items.filter(i => i.done).length
  const pct = Math.round((doneCount / items.length) * 100)

  return (
    <div style={{
      background: '#080f17',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      width: '660px',
      maxHeight: '82vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 32px 100px rgba(0,0,0,0.8)',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 28px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div className="label" style={{ marginBottom: '8px' }}>Generated Workflow</div>
          <h3 style={{ marginBottom: '4px', fontFamily: 'var(--font-display)' }}>Gelderland Corridor Plan</h3>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            {doneCount}/{items.length} completed · Badger, Otter, Deer
          </p>
        </div>

        {/* Progress ring */}
        <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
          <svg viewBox="0 0 56 56" width="56" height="56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="28" cy="28" r="22" fill="none" stroke="#2EC4B6" strokeWidth="4"
              strokeDasharray={`${(doneCount / items.length) * 138.2} 138.2`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-h)',
          }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '3px', padding: '10px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['all', 'document', 'contact', 'subsidy', 'gis'].map(cat => {
          const active = filter === cat
          const catInfo = cat !== 'all' ? CAT[cat] : null
          return (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.07em', textTransform: 'uppercase',
              padding: '4px 12px', borderRadius: '3px', border: '1px solid',
              borderColor: active ? (catInfo ? catInfo.color + '50' : 'rgba(255,255,255,0.15)') : 'transparent',
              background: active ? (catInfo ? catInfo.color + '12' : 'rgba(255,255,255,0.06)') : 'transparent',
              color: active ? (catInfo ? catInfo.color : 'var(--text-h)') : 'var(--text-dim)',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
              {cat === 'all' ? `All (${items.length})` : catInfo!.label}
            </button>
          )
        })}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 28px' }}>
        {filtered.map(item => {
          const { color, label } = CAT[item.category]
          return (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: 'flex', gap: '12px',
                padding: '12px 0', marginBottom: '2px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', opacity: item.done ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: '18px', height: '18px', borderRadius: '3px', flexShrink: 0, marginTop: '2px',
                border: `1.5px solid ${item.done ? color : 'rgba(255,255,255,0.15)'}`,
                background: item.done ? color + '20' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {item.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.86rem', color: item.done ? 'var(--text)' : 'var(--text-h)',
                    textDecoration: item.done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(255,255,255,0.2)',
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.57rem', letterSpacing: '0.06em',
                    padding: '1px 6px', borderRadius: '2px',
                    background: color + '12', color, border: `1px solid ${color}30`,
                  }}>
                    {label}
                  </span>
                </div>
                {item.detail && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)', lineHeight: 1.5, letterSpacing: '0.02em' }}>
                    {item.detail}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {!generated ? (
          <button
            onClick={() => { setGenerating(true); setTimeout(() => { setGenerating(false); setGenerated(true) }, 2000) }}
            disabled={generating}
            style={{
              width: '100%', padding: '13px',
              background: generating ? 'rgba(255,255,255,0.04)' : 'var(--orange)',
              border: generating ? '1px solid rgba(255,255,255,0.08)' : 'none',
              borderRadius: '4px',
              color: generating ? 'var(--text-dim)' : '#000',
              fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600,
              cursor: generating ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
              transition: 'all 0.15s', letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.background = '#FF9A1A' }}
            onMouseLeave={e => { if (!generating) e.currentTarget.style.background = 'var(--orange)' }}
          >
            {generating ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ animation: 'spin-slow 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Generating documents…
              </>
            ) : 'Generate All Documents'}
          </button>
        ) : (
          <div style={{
            padding: '13px', background: 'rgba(43,147,72,0.1)', border: '1px solid rgba(43,147,72,0.3)',
            borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B9348" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem', color: '#2B9348', letterSpacing: '0.04em' }}>
              7 documents generated · Ready to download
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
