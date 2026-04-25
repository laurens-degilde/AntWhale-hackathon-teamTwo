import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataMap } from './DataMap'
import { REGION_PRESETS, SPECIES, technicalReportPdfUrl, type Species } from '../api/technicalReport'
import tree1Png from '../assets/tree1.png'
import tree2Png from '../assets/tree2.png'
import tree3Png from '../assets/tree3.png'

// ── Types ────────────────────────────────────────────────────────────────────
type LayerKey = 'connectivity' | 'patches' | 'ecoducts' | 'occurrences' | 'roadkill' | 'pinch'
interface MapCounts { occurrences: number; roadkill: number; pinch: number }

const LAYER_META: { key: LayerKey; label: string; color: string; bg: string }[] = [
  { key: 'connectivity', label: 'Movement',   color: '#ec4899', bg: '#fdf2f8' },
  { key: 'patches',      label: 'Habitat',    color: '#22c55e', bg: '#f0fdf4' },
  { key: 'ecoducts',     label: 'Ecoducts',   color: '#6366f1', bg: '#eef2ff' },
  { key: 'occurrences',  label: 'Sightings',  color: '#06b6d4', bg: '#ecfeff' },
  { key: 'roadkill',     label: 'Road-kill',  color: '#f43f5e', bg: '#fff1f2' },
  { key: 'pinch',        label: 'Pinch pts',  color: '#f59e0b', bg: '#fffbeb' },
]

const ANTON  = "'Anton', sans-serif"
const FUTURA = "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif"
const MONO   = "'JetBrains Mono', monospace"
const SANS   = "'DM Sans', system-ui, sans-serif"

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AppPage() {
  const navigate = useNavigate()
  const [species, setSpecies]   = useState<Species>('badger')
  const [bbox,    setBbox]      = useState<string | null>(null)
  const [layers,  setLayers]    = useState<Record<LayerKey, boolean>>({
    connectivity: true, patches: true,
    ecoducts: true, occurrences: true, roadkill: true, pinch: true,
  })
  const [counts,     setCounts]     = useState<MapCounts>({ occurrences: 0, roadkill: 0, pinch: 0 })
  const [reportOpen, setReportOpen] = useState(false)
  const [flyTarget,  setFlyTarget]  = useState<{ lat: number; lng: number; zoom: number; _seq: number } | null>(null)
  const flySeqRef = useRef(0)

  const onLayerToggle = useCallback((key: LayerKey) =>
    setLayers(p => ({ ...p, [key]: !p[key] })), [])

  const onCounts = useCallback((next: MapCounts | ((p: MapCounts) => MapCounts)) =>
    setCounts(p => typeof next === 'function' ? next(p) : next), [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        @keyframes slideUp {
          from { transform: translateY(48px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .wc-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 22px; border: none; border-radius: 100px;
          background: #1e1b4b; color: #fff;
          font-family: ${SANS}; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35), 0 2px 6px rgba(0,0,0,0.12);
          transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
        }
        .wc-cta-btn:hover {
          background: #312e81;
          box-shadow: 0 6px 20px rgba(99,102,241,0.45), 0 3px 8px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        .wc-cta-arrow { transition: transform 0.3s cubic-bezier(0.2,0.8,0.2,1); }
        .wc-cta-btn:hover .wc-cta-arrow { transform: translateX(4px); }
        .wc-layer-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 100px; cursor: pointer;
          border: 1.5px solid rgba(0,0,0,0.08);
          background: #fff;
          font-family: ${SANS}; font-size: 0.72rem; font-weight: 500; color: #6b7280;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07);
          transition: all 0.2s ease;
        }
        .wc-layer-pill:hover { border-color: rgba(0,0,0,0.18); color: #374151; }
        .wc-layer-pill.active { border-color: transparent; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        /* popup override */
        .maplibregl-popup-content { border-radius: 12px !important; padding: 12px 14px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important; border: 1px solid rgba(0,0,0,0.06) !important; }
        .maplibregl-popup-tip { display: none !important; }
      `}</style>

      {/* ══ FULL-SCREEN MAP ══════════════════════════════════════════════════ */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <DataMap
          species={species}
          bbox={bbox}
          layers={layers}
          flyTo={flyTarget}
          onSpeciesChange={setSpecies}
          onBboxChange={setBbox}
          onLayerToggle={onLayerToggle}
          onCounts={onCounts}
          onRequestPlan={() => setReportOpen(true)}
        />
      </div>

      {/* ══ SEARCH BOX ══════════════════════════════════════════════════════ */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
        <SearchBox
          onFlyTo={(lat, lng, zoom) => {
            flySeqRef.current += 1
            setFlyTarget({ lat, lng, zoom, _seq: flySeqRef.current })
          }}
          onBboxChange={setBbox}
        />
      </div>

      {/* ══ FLOATING TOP-LEFT BRAND ══════════════════════════════════════════ */}
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 20 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#fff', borderRadius: '100px',
            border: '1.5px solid rgba(0,0,0,0.08)', cursor: 'pointer',
            padding: '8px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M9 2C9 2 3 6 3 11c0 3.3 2.7 6 6 6s6-2.7 6-6c0-5-6-9-6-9z" stroke="#4a9e5c" strokeWidth="1.5" fill="rgba(74,158,92,0.18)" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontFamily: SANS, fontSize: '0.8rem', fontWeight: 700, color: '#111827', letterSpacing: '0.01em' }}>
            Wildcross
          </span>
        </button>
      </div>

      {/* ══ FLOATING BOTTOM HUD ══════════════════════════════════════════════ */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: '100px',
        padding: '6px 8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Layer pills */}
        {LAYER_META.map(({ key, label, color, bg }) => (
          <button
            key={key}
            onClick={() => onLayerToggle(key)}
            className={`wc-layer-pill${layers[key] ? ' active' : ''}`}
            style={layers[key] ? { background: color, borderColor: 'transparent' } : {}}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: layers[key] ? 'rgba(255,255,255,0.85)' : color,
              boxShadow: layers[key] ? 'none' : `0 0 0 2px ${bg}`,
              transition: 'background 0.2s',
            }} />
            {label}
          </button>
        ))}

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.08)', flexShrink: 0, margin: '0 4px' }} />

        {/* Live counters */}
        {[
          { label: 'sightings',  value: counts.occurrences, color: '#06b6d4' },
          { label: 'road-kill',  value: counts.roadkill,    color: '#f43f5e' },
          { label: 'pinch pts',  value: counts.pinch,       color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ lineHeight: 1, textAlign: 'center', padding: '2px 8px' }}>
            <div style={{ fontFamily: ANTON, fontSize: '1.05rem', color: '#111827', letterSpacing: '0.01em' }}>{value}</div>
            <div style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginTop: '2px' }}>{label}</div>
          </div>
        ))}

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.08)', flexShrink: 0, margin: '0 4px' }} />

        {/* CTA */}
        <button className="wc-cta-btn" onClick={() => setReportOpen(true)}>
          Generate Report
          <svg className="wc-cta-arrow" width="14" height="7" viewBox="0 0 20 10" fill="none">
            <path d="M0 5 H17 M13 1 L17 5 L13 9" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </button>
      </div>

      {/* ══ REPORT PANEL ════════════════════════════════════════════════════ */}
      {reportOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setReportOpen(false)}
        >
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,9,0.75)', backdropFilter: 'blur(6px)' }} />

          {/* Sheet */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', maxHeight: '85vh',
              display: 'flex', flexDirection: 'column',
              background: '#f0eee6',
              borderRadius: '10px 10px 0 0',
              animation: 'slideUp 0.38s cubic-bezier(0.2,0.8,0.2,1)',
            }}
          >
            {/* Forest header strip */}
            <div style={{ flexShrink: 0, height: '72px', background: '#1a2818', borderRadius: '10px 10px 0 0', position: 'relative', overflow: 'hidden' }}>
              {[
                { src: tree3Png, x: '-8px',  h: '92px',  op: 0.40 },
                { src: tree1Png, x: '34px',  h: '100px', op: 0.50 },
                { src: tree2Png, x: '76px',  h: '78px',  op: 0.34 },
                { src: tree3Png, x: '114px', h: '88px',  op: 0.42 },
                { src: tree1Png, x: '154px', h: '82px',  op: 0.32 },
                { src: tree2Png, x: '192px', h: '96px',  op: 0.44 },
                { src: tree3Png, x: '234px', h: '76px',  op: 0.36 },
                { src: tree1Png, x: '272px', h: '90px',  op: 0.40 },
                { src: tree2Png, x: '314px', h: '84px',  op: 0.32 },
                { src: tree3Png, x: '352px', h: '94px',  op: 0.38 },
                { src: tree1Png, x: '392px', h: '80px',  op: 0.30 },
                { src: tree2Png, x: '430px', h: '88px',  op: 0.34 },
              ].map((t, i) => (
                <img key={i} src={t.src} alt="" style={{ position: 'absolute', bottom: 0, left: t.x, height: t.h, width: 'auto', opacity: t.op, filter: 'brightness(0.65)' }} />
              ))}
              {[
                { src: tree2Png, x: '-8px',  h: '90px',  op: 0.38 },
                { src: tree3Png, x: '30px',  h: '98px',  op: 0.44 },
                { src: tree1Png, x: '70px',  h: '80px',  op: 0.32 },
                { src: tree2Png, x: '108px', h: '92px',  op: 0.40 },
                { src: tree3Png, x: '148px', h: '78px',  op: 0.30 },
                { src: tree1Png, x: '186px', h: '88px',  op: 0.36 },
                { src: tree2Png, x: '226px', h: '96px',  op: 0.42 },
                { src: tree3Png, x: '266px', h: '82px',  op: 0.34 },
                { src: tree1Png, x: '306px', h: '90px',  op: 0.38 },
                { src: tree2Png, x: '346px', h: '76px',  op: 0.28 },
              ].map((t, i) => (
                <img key={i} src={t.src} alt="" style={{ position: 'absolute', bottom: 0, right: t.x, height: t.h, width: 'auto', opacity: t.op, filter: 'brightness(0.65)', transform: 'scaleX(-1)' }} />
              ))}
              {/* beige fade */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28px', background: 'linear-gradient(to bottom, transparent, #f0eee6)' }} />
              {/* close */}
              <button
                onClick={() => setReportOpen(false)}
                style={{
                  position: 'absolute', top: '16px', right: '22px', zIndex: 2,
                  background: 'rgba(240,238,230,0.1)', border: '1px solid rgba(240,238,230,0.18)',
                  borderRadius: '50%', width: '30px', height: '30px',
                  cursor: 'pointer', color: 'rgba(240,238,230,0.65)', fontSize: '0.72rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px 64px 60px' }}>
              {/* Eyebrow — amber highlight treatment from landing page */}
              <div style={{
                fontFamily: SANS,
                fontSize: '0.65rem', letterSpacing: '0.38em', textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.75)',
                marginBottom: '22px',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                <span style={{ width: 28, height: 1, background: 'rgba(0,0,0,0.3)', flexShrink: 0 }} />
                <span style={{ display: 'inline-block', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: '-3px', bottom: '-6px', left: '-10px', right: '-12px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(146,102,35,0.42) 10%, rgba(146,102,35,0.65) 30%, rgba(146,102,35,0.68) 65%, rgba(146,102,35,0.50) 82%, transparent 100%)',
                    transform: 'skewX(-7deg) skewY(0.4deg)',
                  }} />
                  <span style={{ position: 'relative' }}>Corridor Action Plan</span>
                </span>
              </div>
              {/* Headline — Anton like landing page big stats */}
              <div style={{ lineHeight: 0.88, marginBottom: '20px' }}>
                <div style={{ fontFamily: ANTON, fontSize: 'clamp(2.6rem, 4vw, 4.2rem)', color: '#1a2818', letterSpacing: '0.01em', textTransform: 'uppercase' }}>Generate</div>
                <div style={{ fontFamily: ANTON, fontSize: 'clamp(2.6rem, 4vw, 4.2rem)', color: '#2a4020', letterSpacing: '0.01em', textTransform: 'uppercase' }}>Technical Report.</div>
              </div>
              {/* Sweeping divider — same as landing page hero */}
              <div style={{ height: 1, background: 'rgba(0,0,0,0.18)', maxWidth: 520, marginBottom: '22px' }} />
              <p style={{ fontFamily: SANS, fontSize: '0.9rem', color: 'rgba(0,0,0,0.52)', lineHeight: 1.8, maxWidth: '520px', margin: '0 0 40px' }}>
                Generates a costed, ranked, cited PDF for the perimeter and species selected on the map.
                Hand it to a province, NGO, or municipality.
              </p>

              <ReportForm species={species} bbox={bbox} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Report form ───────────────────────────────────────────────────────────────
function ReportForm({ species: init, bbox: initBbox }: { species: Species; bbox: string | null }) {
  const [species, setSpecies] = useState<Species>(init)
  const [bbox, setBbox] = useState(initBbox ?? REGION_PRESETS[0].bbox)
  const [presetId, setPresetId] = useState(
    REGION_PRESETS.find(r => r.bbox === (initBbox ?? REGION_PRESETS[0].bbox))?.id ?? 'custom'
  )

  const BBOX_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/
  const valid = (() => {
    if (!BBOX_RE.test(bbox)) return false
    const [a, b, c, d] = bbox.split(',').map(Number)
    return c > a && d > b
  })()

  const dlUrl   = valid ? technicalReportPdfUrl(species, bbox, 'attachment') : '#'
  const viewUrl = valid ? technicalReportPdfUrl(species, bbox, 'inline')     : '#'

  const input: React.CSSProperties = {
    display: 'block', width: '100%', marginTop: '8px',
    padding: '11px 14px', boxSizing: 'border-box',
    fontFamily: SANS, fontSize: '0.88rem', color: '#1a2818',
    background: 'rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: '2px', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', marginBottom: '20px',
    fontFamily: MONO, fontSize: '0.6rem',
    letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.38)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', maxWidth: '800px' }}>
      <label style={lbl}>
        Target species
        <select value={species} onChange={e => setSpecies(e.target.value as Species)} style={input}>
          {SPECIES.map(s => <option key={s.value} value={s.value}>{s.label} — {s.latin}</option>)}
        </select>
      </label>

      <label style={lbl}>
        Region preset
        <select value={presetId} onChange={e => { setPresetId(e.target.value); const p = REGION_PRESETS.find(r => r.id === e.target.value); if (p) setBbox(p.bbox) }} style={input}>
          {REGION_PRESETS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          <option value="custom">Custom bbox…</option>
        </select>
      </label>

      <label style={{ ...lbl, gridColumn: '1 / -1' }}>
        Bounding box <span style={{ opacity: 0.45, fontSize: '0.54rem', marginLeft: '6px' }}>minLng, minLat, maxLng, maxLat</span>
        <input
          type="text" value={bbox} spellCheck={false}
          placeholder="5.74,52.05,5.86,52.12"
          onChange={e => { setBbox(e.target.value); setPresetId('custom') }}
          style={{ ...input, borderColor: bbox && !valid ? '#c0392b' : 'rgba(0,0,0,0.12)' }}
        />
        {bbox && !valid && <span style={{ display: 'block', marginTop: '4px', fontFamily: SANS, fontSize: '0.7rem', color: '#c0392b' }}>Four comma-separated numbers — max &gt; min on both axes.</span>}
      </label>

      {/* Divider */}
      <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(0,0,0,0.09)', margin: '4px 0 24px' }} />

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <a
          href={dlUrl}
          download={valid ? `corridor-action-plan-${species}.pdf` : undefined}
          onClick={e => { if (!valid) e.preventDefault() }}
          style={{
            fontFamily: FUTURA, fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: valid ? '#f0eee6' : 'rgba(0,0,0,0.2)',
            background: valid ? '#1a2818' : 'rgba(0,0,0,0.06)',
            padding: '13px 28px', borderRadius: '2px', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            cursor: valid ? 'pointer' : 'not-allowed',
            transition: 'background 0.3s ease',
          }}
        >
          Download PDF
          <svg width="16" height="8" viewBox="0 0 20 10" fill="none" style={{ opacity: valid ? 1 : 0.3 }}>
            <path d="M0 5 H17 M13 1 L17 5 L13 9" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </a>
        <a
          href={viewUrl} target="_blank" rel="noopener noreferrer"
          onClick={e => { if (!valid) e.preventDefault() }}
          style={{
            fontFamily: FUTURA, fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: valid ? '#2a4020' : 'rgba(0,0,0,0.2)',
            border: `1px solid ${valid ? 'rgba(42,64,32,0.35)' : 'rgba(0,0,0,0.1)'}`,
            padding: '12px 28px', borderRadius: '2px', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            cursor: valid ? 'pointer' : 'not-allowed',
            background: 'transparent',
            transition: 'border-color 0.3s ease, color 0.3s ease',
          }}
        >
          Open in browser
          <svg width="16" height="8" viewBox="0 0 20 10" fill="none" style={{ opacity: valid ? 0.7 : 0.3 }}>
            <path d="M0 5 H17 M13 1 L17 5 L13 9" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </a>
        <p style={{ fontFamily: SANS, fontSize: '0.72rem', color: 'rgba(0,0,0,0.32)', lineHeight: 1.6, margin: 0 }}>
          Ranked interventions, cost estimates,<br />citations + full GIS exports.
        </p>
      </div>
    </div>
  )
}

// ── Search box ────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string | number
  name: string
  subtitle: string
  type: string
  cls: string
  lat: number
  lng: number
  bbox: string // "minLng,minLat,maxLng,maxLat"
}

function locIcon(cls: string, type: string) {
  if (cls === 'coordinate') return '📍'
  if (['nature_reserve','national_park','protected_area','forest','wood','heath','wetland'].includes(type)) return '🌿'
  if (['water','river','lake','stream','canal'].includes(type) || cls === 'waterway') return '💧'
  if (['motorway','trunk','primary'].includes(type) || cls === 'highway') return '🛣️'
  if (['province','county','district','municipality'].includes(type) || cls === 'boundary') return '🗺️'
  if (['city','town','village','hamlet'].includes(type)) return '🏘️'
  return '📌'
}

function locCategory(cls: string, type: string) {
  if (cls === 'coordinate') return 'Coordinates'
  if (['nature_reserve','national_park','protected_area'].includes(type)) return 'Protected area'
  if (['forest','wood'].includes(type)) return 'Forest'
  if (['heath','wetland','grassland'].includes(type)) return 'Habitat'
  if (['water','river','lake','stream'].includes(type) || cls === 'waterway') return 'Water body'
  if (['motorway','trunk','primary'].includes(type)) return 'Road'
  if (['province','county','district'].includes(type)) return 'Region'
  if (['municipality'].includes(type) || cls === 'boundary') return 'Municipality'
  if (['city','town','village'].includes(type)) return 'Settlement'
  return 'Location'
}

function locSuggestion(cls: string, type: string): { text: string; color: string; bg: string } {
  if (['nature_reserve','national_park','protected_area','forest','wood','heath','wetland'].includes(type))
    return { text: 'Protected habitat — ideal for corridor connectivity analysis', color: '#15803d', bg: '#f0fdf4' }
  if (['water','river','lake','stream'].includes(type) || cls === 'waterway')
    return { text: 'Riparian corridor — key habitat for otter and great crested newt', color: '#0369a1', bg: '#f0f9ff' }
  if (['motorway','trunk','primary'].includes(type))
    return { text: 'Major road barrier — identify crossing opportunities nearby', color: '#b45309', bg: '#fffbeb' }
  if (['province','county','district','municipality'].includes(type))
    return { text: 'Analyze this region to find priority wildlife crossing locations', color: '#6b21a8', bg: '#faf5ff' }
  if (['city','town'].includes(type))
    return { text: 'Urban edge — check green corridor fragmentation patterns', color: '#1d4ed8', bg: '#eff6ff' }
  return { text: 'Set as analysis area to run circuit theory connectivity model', color: '#374151', bg: '#f9fafb' }
}

function bboxAreaKm2(bboxStr: string) {
  const [minLng, minLat, maxLng, maxLat] = bboxStr.split(',').map(Number)
  const midLat = (minLat + maxLat) / 2
  const h = (maxLat - minLat) * 111
  const w = (maxLng - minLng) * 111 * Math.cos(midLat * Math.PI / 180)
  return Math.round(h * w)
}

function SearchBox({ onFlyTo, onBboxChange }: {
  onFlyTo: (lat: number, lng: number, zoom: number) => void
  onBboxChange: (b: string) => void
}) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const debRef   = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    // Coordinate detection: "52.1, 5.4" or "52.1 5.4"
    const coordMatch = q.trim().match(/^(-?\d{1,3}(?:\.\d+)?)[°,\s]+(-?\d{1,3}(?:\.\d+)?)$/)
    if (coordMatch) {
      let a = parseFloat(coordMatch[1]), b = parseFloat(coordMatch[2])
      if (a < 20) [a, b] = [b, a] // swap if looks like lng first
      const pad = 0.025
      const bbox = `${(b-pad).toFixed(4)},${(a-pad).toFixed(4)},${(b+pad).toFixed(4)},${(a+pad).toFixed(4)}`
      setResults([{ id: 'coord', name: `${a.toFixed(5)}, ${b.toFixed(5)}`, subtitle: 'Decimal coordinates (lat, lng)', type: 'coordinate', cls: 'coordinate', lat: a, lng: b, bbox }])
      setOpen(true)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=nl&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en-GB' } }
      )
      const data = await res.json() as Array<{
        place_id: number; display_name: string; name?: string
        type: string; class: string; lat: string; lon: string
        boundingbox?: [string, string, string, string]
      }>
      const mapped: SearchResult[] = data.map(r => {
        const parts = r.display_name.split(', ')
        const bb = r.boundingbox
          ? `${parseFloat(r.boundingbox[2]).toFixed(4)},${parseFloat(r.boundingbox[0]).toFixed(4)},${parseFloat(r.boundingbox[3]).toFixed(4)},${parseFloat(r.boundingbox[1]).toFixed(4)}`
          : `${(parseFloat(r.lon)-0.05).toFixed(4)},${(parseFloat(r.lat)-0.05).toFixed(4)},${(parseFloat(r.lon)+0.05).toFixed(4)},${(parseFloat(r.lat)+0.05).toFixed(4)}`
        return { id: r.place_id, name: r.name ?? parts[0], subtitle: parts.slice(1,3).join(', '), type: r.type, cls: r.class, lat: parseFloat(r.lat), lng: parseFloat(r.lon), bbox: bb }
      })
      setResults(mapped)
      setOpen(mapped.length > 0)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val); setSelected(null)
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => doSearch(val), 320)
  }

  const handleSelect = (r: SearchResult) => {
    setSelected(r); setQuery(r.name); setOpen(false)
    const zoom = ['province','county','district'].includes(r.type) ? 9 : ['municipality','city'].includes(r.type) ? 11 : r.type === 'coordinate' ? 14 : 12
    onFlyTo(r.lat, r.lng, zoom)
  }

  const dismiss = () => { setSelected(null); setQuery(''); setResults([]); inputRef.current?.focus() }

  return (
    <div
      style={{ position: 'relative', width: 320 }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}
    >
      {/* Input pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(18px)',
        border: `1.5px solid ${open || selected ? 'rgba(99,102,241,0.35)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 100, padding: '8px 14px',
        boxShadow: open || selected ? '0 4px 24px rgba(0,0,0,0.13), 0 0 0 3px rgba(99,102,241,0.08)' : '0 4px 20px rgba(0,0,0,0.1)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        {loading
          ? <svg style={{ flexShrink: 0, animation: 'sbSpin 0.8s linear infinite', color: '#6366f1' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28 56"/>
            </svg>
          : <svg style={{ flexShrink: 0, color: open ? '#6366f1' : '#9ca3af', transition: 'color 0.2s' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
        }
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Search location or coordinates…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: SANS, fontSize: '0.8rem', color: '#111827', minWidth: 0 }}
        />
        {query && (
          <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af', display: 'flex', lineHeight: 1, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60,
          background: 'rgba(255,255,255,0.99)', backdropFilter: 'blur(18px)',
          border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.14)', overflow: 'hidden',
          animation: 'sbDown 0.18s cubic-bezier(0.2,0.8,0.2,1)',
        }}>
          {results.map((r, i) => (
            <button key={r.id} onMouseDown={() => handleSelect(r)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{locIcon(r.cls, r.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: '0.8rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                {r.subtitle && <div style={{ fontFamily: SANS, fontSize: '0.68rem', color: '#9ca3af', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</div>}
              </div>
              <span style={{ fontFamily: MONO, fontSize: '0.55rem', color: '#d1d5db', flexShrink: 0, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{locCategory(r.cls, r.type)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Info card for selected location */}
      {selected && !open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60,
          background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.14)', overflow: 'hidden',
          animation: 'sbDown 0.22s cubic-bezier(0.2,0.8,0.2,1)',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>{locIcon(selected.cls, selected.type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: ANTON, fontSize: '1.05rem', color: '#111827', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: '#6366f1', padding: '2px 7px', borderRadius: 100 }}>{locCategory(selected.cls, selected.type)}</span>
                {(() => { const a = bboxAreaKm2(selected.bbox); return a > 0 ? <span style={{ fontFamily: SANS, fontSize: '0.68rem', color: '#9ca3af' }}>{a.toLocaleString()} km²</span> : null })()}
              </div>
            </div>
          </div>

          {/* Suggestion strip */}
          {(() => {
            const s = locSuggestion(selected.cls, selected.type)
            return (
              <div style={{ margin: '0 14px 10px', padding: '8px 10px', borderRadius: 10, background: s.bg, border: `1px solid ${s.color}22` }}>
                <p style={{ margin: 0, fontFamily: SANS, fontSize: '0.72rem', color: s.color, lineHeight: 1.55 }}>{s.text}</p>
              </div>
            )
          })()}

          {/* Stats row — lat/lng coords */}
          <div style={{ margin: '0 14px 12px', display: 'flex', gap: 8 }}>
            {[['Lat', selected.lat.toFixed(4)], ['Lng', selected.lng.toFixed(4)]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af' }}>{l}</div>
                <div style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#374151', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8 }}>
            <button onClick={() => { onBboxChange(selected.bbox); setSelected(null) }} style={{
              flex: 1, padding: '9px 12px', fontFamily: SANS, fontSize: '0.73rem', fontWeight: 600,
              background: '#1e1b4b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#312e81')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1e1b4b')}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="2"/></svg>
              Analyze this area
            </button>
            <button onClick={dismiss} style={{ padding: '9px 13px', fontFamily: SANS, fontSize: '0.73rem', fontWeight: 500, color: '#6b7280', background: 'none', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sbSpin { to { transform: rotate(360deg) } }
        @keyframes sbDown { from { transform: translateY(-6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
