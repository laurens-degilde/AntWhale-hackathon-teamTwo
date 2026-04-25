import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataMap } from './DataMap'
import { REGION_PRESETS, SPECIES, technicalReportPdfUrl, type Species } from '../api/technicalReport'

type LayerKey = 'ecoducts' | 'occurrences' | 'roadkill' | 'pinch'
interface MapCounts { occurrences: number; roadkill: number; pinch: number }

const LAYER_LABELS: Record<LayerKey, string> = {
  ecoducts: 'Ecoducts',
  occurrences: 'Occurrences',
  roadkill: 'Road-kill',
  pinch: 'Pinch points',
}

const LAYER_COLORS: Record<LayerKey, string> = {
  ecoducts: '#4a9e5c',
  occurrences: '#C89040',
  roadkill: '#c0392b',
  pinch: '#8e44ad',
}

export default function AppPage() {
  const navigate = useNavigate()
  const [species, setSpecies] = useState<Species>('badger')
  const [bbox, setBbox] = useState<string | null>(null)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    ecoducts: true, occurrences: true, roadkill: true, pinch: true,
  })
  const [counts, setCounts] = useState<MapCounts>({ occurrences: 0, roadkill: 0, pinch: 0 })
  const [reportOpen, setReportOpen] = useState(false)

  const onLayerToggle = useCallback((key: LayerKey) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const onCounts = useCallback((next: MapCounts | ((prev: MapCounts) => MapCounts)) => {
    setCounts(prev => typeof next === 'function' ? next(prev) : next)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d1208', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '52px',
        background: '#111a10',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2 C9 2 3 6 3 11 C3 14.3 5.7 17 9 17 C12.3 17 15 14.3 15 11 C15 6 9 2 9 2Z" stroke="#4a9e5c" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
            <path d="M9 7 L9 13 M6 10 L9 13 L12 10" stroke="#4a9e5c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#f0eee6',
          }}>
            Wildcross
          </span>
        </button>

        {/* Layer toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(Object.keys(layers) as LayerKey[]).map(key => (
            <button
              key={key}
              onClick={() => onLayerToggle(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                border: `1px solid ${layers[key] ? LAYER_COLORS[key] : 'rgba(255,255,255,0.12)'}`,
                background: layers[key] ? `${LAYER_COLORS[key]}22` : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: layers[key] ? LAYER_COLORS[key] : 'rgba(255,255,255,0.2)',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: layers[key] ? '#f0eee6' : 'rgba(255,255,255,0.3)',
              }}>
                {LAYER_LABELS[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Counts + report CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[
              { label: 'occ', value: counts.occurrences, color: LAYER_COLORS.occurrences },
              { label: 'kill', value: counts.roadkill,   color: LAYER_COLORS.roadkill   },
              { label: 'pinch', value: counts.pinch,     color: LAYER_COLORS.pinch      },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.95rem', fontWeight: 700, color: '#f0eee6' }}>{value}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color }}>{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setReportOpen(true)}
            style={{
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#1a2818', background: '#f0eee6',
              border: 'none', borderRadius: '2px',
              padding: '8px 18px', cursor: 'pointer',
              transition: 'background 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0eee6'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Generate Report ↗
          </button>
        </div>
      </div>

      {/* ── Map (fills remaining height) ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <DataMap
          species={species}
          bbox={bbox}
          layers={layers}
          onSpeciesChange={setSpecies}
          onBboxChange={setBbox}
          onLayerToggle={onLayerToggle}
          onCounts={onCounts}
          onRequestPlan={() => setReportOpen(true)}
        />
      </div>

      {/* ── Report slide-up panel ── */}
      {reportOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setReportOpen(false)}
        >
          {/* backdrop */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }} />

          {/* panel */}
          <div
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', maxHeight: '85vh', overflowY: 'auto',
              background: '#f0eee6',
              borderRadius: '16px 16px 0 0',
              padding: '48px 64px 64px',
              animation: 'slideUp 0.35s cubic-bezier(0.2,0.8,0.2,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* close */}
            <button
              onClick={() => setReportOpen(false)}
              style={{
                position: 'absolute', top: '20px', right: '24px',
                background: 'none', border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: '50%', width: '32px', height: '32px',
                cursor: 'pointer', fontSize: '1rem', color: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>

            {/* header */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.32)', marginBottom: '14px',
              }}>
                Action Plan
              </div>
              <div style={{
                fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                lineHeight: 0.9, color: '#1a2818',
              }}>
                <div style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)' }}>Generate</div>
                <div style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)', color: '#2a4020' }}>Technical Report.</div>
              </div>
              <p style={{
                marginTop: '18px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.88rem', color: 'rgba(0,0,0,0.52)', lineHeight: 1.8,
                maxWidth: '520px',
              }}>
                Generates a costed, ranked, cited PDF for the perimeter and species selected on the map.
                Hand it to a province, NGO, or municipality.
              </p>
            </div>

            <ReportFormStyled species={species} bbox={bbox} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/* ── Restyled report form matching design system ── */
function ReportFormStyled({ species: initSpecies, bbox: initBbox }: { species: Species; bbox: string | null }) {
  const [species, setSpecies] = useState<Species>(initSpecies)
  const [bbox, setBbox] = useState<string>(initBbox ?? REGION_PRESETS[0].bbox)
  const [presetId, setPresetId] = useState<string>(
    REGION_PRESETS.find(r => r.bbox === (initBbox ?? REGION_PRESETS[0].bbox))?.id ?? 'custom'
  )

  const BBOX_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/
  const bboxValid = (() => {
    if (!BBOX_RE.test(bbox)) return false
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number)
    return maxLng > minLng && maxLat > minLat
  })()

  const downloadUrl = bboxValid ? technicalReportPdfUrl(species, bbox, 'attachment') : '#'
  const viewUrl     = bboxValid ? technicalReportPdfUrl(species, bbox, 'inline')     : '#'

  function applyPreset(id: string) {
    setPresetId(id)
    const p = REGION_PRESETS.find(r => r.id === id)
    if (p) setBbox(p.bbox)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    color: '#1a2818',
    background: 'rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: '2px',
    outline: 'none',
    marginTop: '8px',
    display: 'block',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    color: 'rgba(0,0,0,0.42)',
    display: 'block',
    marginBottom: '20px',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '900px' }}>
      <label style={labelStyle}>
        Target species
        <select value={species} onChange={e => setSpecies(e.target.value as Species)} style={inputStyle}>
          {SPECIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label} — {s.latin}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Region preset
        <select value={presetId} onChange={e => applyPreset(e.target.value)} style={inputStyle}>
          {REGION_PRESETS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
          <option value="custom">Custom bbox…</option>
        </select>
      </label>

      <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
        Bounding box <span style={{ opacity: 0.6 }}>(minLng, minLat, maxLng, maxLat)</span>
        <input
          type="text"
          value={bbox}
          onChange={e => { setBbox(e.target.value); setPresetId('custom') }}
          placeholder="5.74,52.05,5.86,52.12"
          spellCheck={false}
          style={{ ...inputStyle, borderColor: !bboxValid && bbox ? '#c0392b' : 'rgba(0,0,0,0.12)' }}
        />
        {!bboxValid && bbox && (
          <span style={{ fontSize: '0.72rem', color: '#c0392b', marginTop: '4px', display: 'block' }}>
            Four comma-separated numbers — max &gt; min on both axes.
          </span>
        )}
      </label>

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <a
          href={downloadUrl}
          aria-disabled={!bboxValid}
          download={bboxValid ? `corridor-action-plan-${species}.pdf` : undefined}
          onClick={e => { if (!bboxValid) e.preventDefault() }}
          style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: bboxValid ? '#f0eee6' : 'rgba(0,0,0,0.25)',
            background: bboxValid ? '#1a2818' : 'rgba(0,0,0,0.06)',
            padding: '14px 28px', borderRadius: '2px', textDecoration: 'none',
            display: 'inline-block', transition: 'background 0.2s',
            cursor: bboxValid ? 'pointer' : 'not-allowed',
          }}
        >
          Download PDF
        </a>
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!bboxValid}
          onClick={e => { if (!bboxValid) e.preventDefault() }}
          style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: bboxValid ? '#2a4020' : 'rgba(0,0,0,0.2)',
            border: `1px solid ${bboxValid ? 'rgba(42,64,32,0.35)' : 'rgba(0,0,0,0.1)'}`,
            padding: '13px 28px', borderRadius: '2px', textDecoration: 'none',
            display: 'inline-block', transition: 'border-color 0.2s',
            cursor: bboxValid ? 'pointer' : 'not-allowed',
          }}
        >
          Open in browser ↗
        </a>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', lineHeight: 1.6, margin: 0,
        }}>
          Includes ranked interventions, cost estimates,<br />resistance coefficients with citations + GIS exports.
        </p>
      </div>
    </div>
  )
}
