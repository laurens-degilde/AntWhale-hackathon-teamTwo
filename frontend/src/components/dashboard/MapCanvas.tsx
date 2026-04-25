import { useState } from 'react'
import type { LayerState } from './LayerPanel'

interface TooltipData {
  x: number
  y: number
  content: React.ReactNode
}

interface MapCanvasProps {
  layers: LayerState
  selectedSpecies: string[]
}

// Gelderland landscape data (normalized SVG coordinates 0-800 x 0-600)
const HABITAT_PATCHES = [
  // Veluwe (large central forest)
  {
    id: 'veluwe',
    label: 'Veluwe',
    path: 'M 120 60 L 380 50 L 420 120 L 400 220 L 340 280 L 240 290 L 140 250 L 90 180 Z',
    fill: '#142019',
    stroke: '#2a5c38',
  },
  // Gelderse Poort (near Nijmegen)
  { id: 'poort', label: 'Gelderse Poort', path: 'M 540 380 L 620 360 L 680 400 L 660 450 L 590 460 L 530 430 Z', fill: '#142019', stroke: '#2a5c38' },
  // Montferland
  { id: 'montferland', label: 'Montferland', path: 'M 620 220 L 680 200 L 720 250 L 700 300 L 640 310 L 600 270 Z', fill: '#142019', stroke: '#2a5c38' },
  // Rijk van Nijmegen
  { id: 'rijk', label: 'Rijk van Nijmegen', path: 'M 480 440 L 540 420 L 560 480 L 500 500 L 460 480 Z', fill: '#1a2d21', stroke: '#2a5c38' },
  // Posbank area
  { id: 'posbank', label: 'Posbank', path: 'M 290 180 L 340 160 L 370 200 L 350 240 L 290 240 Z', fill: '#1a2d21', stroke: '#2a5c38' },
]

const ROADS = [
  // A1 (east-west, north)
  { id: 'a1', label: 'A1', d: 'M 0 90 L 800 80', stroke: '#1a2a18', width: 8 },
  // A12 (east-west, central)
  { id: 'a12', label: 'A12', d: 'M 0 320 Q 400 310 800 330', stroke: '#1a2a18', width: 8 },
  // A15 (east-west, south — along Waal)
  { id: 'a15', label: 'A15', d: 'M 0 460 Q 400 450 800 455', stroke: '#1a2a18', width: 8 },
  // A50 (north-south)
  { id: 'a50', label: 'A50', d: 'M 450 0 Q 455 300 460 600', stroke: '#1a2a18', width: 7 },
  // A325 (Arnhem-Nijmegen)
  { id: 'a325', label: 'A325', d: 'M 390 310 L 500 460', stroke: '#1a2a18', width: 5 },
  // A348 (Doetinchem direction)
  { id: 'a348', label: 'A348', d: 'M 450 80 Q 580 180 650 220', stroke: '#1a2a18', width: 5 },
]

const WATERWAYS = [
  // Waal (Waal river, south)
  { id: 'waal', label: 'Waal', d: 'M 0 490 Q 200 480 400 492 Q 600 505 800 490', stroke: '#0d2030', width: 14, strokeSecondary: '#112840', labelY: 498 },
  // IJssel (north-east)
  { id: 'ijssel', label: 'IJssel', d: 'M 540 0 Q 560 150 550 300', stroke: '#0d2030', width: 10, strokeSecondary: '#112840', labelY: 150 },
  // Rijn near Arnhem
  { id: 'rijn', label: 'Rijn', d: 'M 340 340 Q 420 345 500 350', stroke: '#0d2030', width: 8, strokeSecondary: '#112840', labelY: 348 },
]

const ROADKILL_HOTSPOTS = [
  { x: 450, y: 320, count: 47, species: 'Badger, Otter' },
  { x: 390, y: 315, count: 31, species: 'Badger' },
  { x: 460, y: 455, count: 28, species: 'Otter, Deer' },
  { x: 452, y: 95, count: 22, species: 'Deer, Badger' },
  { x: 650, y: 228, count: 14, species: 'Marten' },
  { x: 380, y: 318, count: 19, species: 'Badger' },
]

const EXISTING_CROSSINGS = [
  { x: 452, y: 88, type: 'Ecoduct', label: 'Ecoduct Kootwijkerzand', quality: 'good' },
  { x: 425, y: 314, type: 'Tunnel', label: 'Tunnel Arnhem-N', quality: 'fair' },
  { x: 460, y: 448, type: 'Culvert', label: 'Culvert A15/km34', quality: 'poor' },
]

const CORRIDOR_PATHS = [
  // Veluwe to Gelderse Poort (via A12 pinch)
  { d: 'M 380 200 Q 430 260 450 320 Q 460 380 520 410', id: 'corr-1', width: 12, opacity: 0.6 },
  // Veluwe to Montferland (via A1)
  { d: 'M 380 120 Q 500 90 620 230', id: 'corr-2', width: 8, opacity: 0.4 },
  // Veluwe internal
  { d: 'M 180 150 Q 280 200 330 260', id: 'corr-3', width: 6, opacity: 0.3 },
]

const INTERVENTION_POINTS = [
  { x: 450, y: 320, id: 'i1', type: 'culvert', label: 'Culvert A12/km23', score: 89, cost: '€42k' },
  { x: 453, y: 455, id: 'i2', type: 'underpass', label: 'Underpass A15', score: 76, cost: '€320k' },
  { x: 452, y: 90, id: 'i3', type: 'ecoduct', label: 'Ecoduct A1 expand', score: 64, cost: '€1.2M' },
  { x: 250, y: 300, id: 'i4', type: 'hedgerow', label: 'Hedgerow strip', score: 58, cost: '€12k' },
]

function getCorrType(type: string) {
  if (type === 'culvert')   return { color: '#2EC4B6', icon: '⬡' }
  if (type === 'underpass') return { color: '#48CAE4', icon: '⬡' }
  if (type === 'ecoduct')   return { color: '#FCBF49', icon: '⬡' }
  return { color: '#F77F00', icon: '⬡' }
}

export default function MapCanvas({ layers, selectedSpecies }: MapCanvasProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const showTooltip = (e: React.MouseEvent, content: React.ReactNode) => {
    const rect = (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      content,
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {/* Map header */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(46,196,182,0.15)',
        borderRadius: '6px',
        padding: '8px 12px',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#2EC4B6',
          boxShadow: '0 0 6px #2EC4B6',
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.9)',
          textTransform: 'uppercase',
        }}>
          Gelderland — Province, NL
        </span>
        {selectedSpecies.length > 0 && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: '#2EC4B6',
            letterSpacing: '0.05em',
          }}>
            · {selectedSpecies.length} species
          </span>
        )}
      </div>

      {/* Coordinates */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 10,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.06em',
        background: 'rgba(0,0,0,0.7)',
        padding: '4px 8px',
        borderRadius: '3px',
      }}>
        51.97°N, 5.91°E
      </div>

      {/* SVG Map */}
      <svg
        viewBox="0 0 800 600"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          {/* Grid pattern */}
          <pattern id="map-grid" x="0" y="0" width="80" height="60" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 60" fill="none" stroke="rgba(30,52,40,0.5)" strokeWidth="0.5" />
          </pattern>

          {/* Corridor glow filter */}
          <filter id="corridor-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Hotspot glow */}
          <filter id="hotspot-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Gradient for corridors */}
          <linearGradient id="corr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4dbd6c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4dbd6c" stopOpacity="0.2" />
          </linearGradient>

          {/* Resistance surface gradient */}
          <radialGradient id="resist-grad-1" cx="35%" cy="35%" r="40%">
            <stop offset="0%" stopColor="#4dbd6c" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#d4841a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#c0391a" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Base fill */}
        <rect width="800" height="600" fill="#070f0b" />

        {/* Grid */}
        <rect width="800" height="600" fill="url(#map-grid)" />

        {/* Land use layer (simple terrain zones) */}
        {layers.landuse && (
          <g opacity="0.5">
            {/* Agricultural areas (light tint) */}
            <rect x="0" y="0" width="800" height="600" fill="rgba(30,50,25,0.15)" />
            {/* Farmland patches */}
            <rect x="0" y="300" width="120" height="200" fill="rgba(180,160,80,0.08)" />
            <rect x="680" y="100" width="120" height="300" fill="rgba(180,160,80,0.08)" />
            <rect x="0" y="0" width="100" height="280" fill="rgba(180,160,80,0.06)" />
          </g>
        )}

        {/* Resistance surface overlay */}
        {layers.resistance && selectedSpecies.length > 0 && (
          <g>
            <rect width="800" height="600" fill="url(#resist-grad-1)" />
            {/* High resistance near roads */}
            {ROADS.map(road => (
              <path
                key={`resist-${road.id}`}
                d={road.d}
                stroke="rgba(192,57,26,0.12)"
                strokeWidth={road.width + 20}
                fill="none"
                strokeLinecap="round"
              />
            ))}
          </g>
        )}

        {/* Habitat patches */}
        {HABITAT_PATCHES.map(patch => (
          <path
            key={patch.id}
            d={patch.path}
            fill={patch.fill}
            stroke={patch.stroke}
            strokeWidth="1"
            onMouseEnter={e => showTooltip(e, (
              <div>
                <strong style={{ color: '#FFFFFF' }}>{patch.label}</strong>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                  Habitat patch · Source node
                </div>
              </div>
            ))}
            style={{ cursor: 'crosshair' }}
          />
        ))}

        {/* Inner habitat texture */}
        {HABITAT_PATCHES.map(patch => (
          <path
            key={`glow-${patch.id}`}
            d={patch.path}
            fill="none"
            stroke={patch.stroke}
            strokeWidth="3"
            opacity="0.3"
            filter="url(#corridor-glow)"
          />
        ))}

        {/* Waterways */}
        {WATERWAYS.map(w => (
          <g key={w.id}>
            <path d={w.d} stroke={w.stroke} strokeWidth={w.width} fill="none" strokeLinecap="round" />
            <path d={w.d} stroke={w.strokeSecondary} strokeWidth={w.width - 4} fill="none" strokeLinecap="round" />
            <text>
              <textPath href={`#${w.id}-path`} startOffset="20%"
                fill="#1e4a6a" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.08em">
                {w.label}
              </textPath>
            </text>
          </g>
        ))}

        {/* Roads */}
        {ROADS.map(road => (
          <g key={road.id}>
            <path d={road.d} stroke="#050c07" strokeWidth={road.width + 4} fill="none" strokeLinecap="round" />
            <path d={road.d} stroke={road.stroke} strokeWidth={road.width} fill="none" strokeLinecap="round" />
            <path d={road.d} stroke="#111f0e" strokeWidth={road.width - 3} fill="none" strokeLinecap="round" strokeDasharray="12 8" />
          </g>
        ))}

        {/* Road labels */}
        <text x="16" y="314" fill="#1e3a1a" fontSize="9" fontFamily="var(--font-mono)" fontWeight="500">A12</text>
        <text x="16" y="452" fill="#1e3a1a" fontSize="9" fontFamily="var(--font-mono)" fontWeight="500">A15</text>
        <text x="16" y="84" fill="#1e3a1a" fontSize="9" fontFamily="var(--font-mono)" fontWeight="500">A1</text>
        <text x="444" y="18" fill="#1e3a1a" fontSize="9" fontFamily="var(--font-mono)" fontWeight="500">A50</text>

        {/* Habitat labels */}
        <text x="210" y="160" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="var(--font-mono)"
          letterSpacing="0.1em" textAnchor="middle">VELUWE</text>
        <text x="610" y="410" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--font-mono)"
          letterSpacing="0.08em" textAnchor="middle">GELDERSE POORT</text>
        <text x="660" y="255" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="var(--font-mono)"
          letterSpacing="0.08em" textAnchor="middle">MONTFERLAND</text>

        {/* City dots */}
        {[
          { x: 400, y: 320, label: 'Arnhem' },
          { x: 490, y: 460, label: 'Nijmegen' },
          { x: 290, y: 285, label: 'Ede' },
          { x: 350, y: 80, label: 'Apeldoorn' },
          { x: 620, y: 270, label: 'Doetinchem' },
        ].map(city => (
          <g key={city.label}>
            <circle cx={city.x} cy={city.y} r="3" fill="#1a2d21" stroke="#2a4a2a" strokeWidth="1" />
            <text x={city.x + 6} y={city.y + 4} fill="rgba(255,255,255,0.3)" fontSize="7"
              fontFamily="var(--font-mono)" letterSpacing="0.05em">{city.label}</text>
          </g>
        ))}

        {/* CORRIDORS layer */}
        {layers.corridors && (
          <g>
            {CORRIDOR_PATHS.map(corr => (
              <g key={corr.id}>
                {/* Glow */}
                <path
                  d={corr.d}
                  stroke="#4dbd6c"
                  strokeWidth={corr.width + 8}
                  fill="none"
                  opacity={corr.opacity * 0.3}
                  filter="url(#corridor-glow)"
                  strokeLinecap="round"
                />
                {/* Main path */}
                <path
                  d={corr.d}
                  stroke="url(#corr-grad)"
                  strokeWidth={corr.width}
                  fill="none"
                  opacity={corr.opacity}
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: '6 3',
                    animation: 'flow-path 3s linear infinite',
                  }}
                />
              </g>
            ))}
          </g>
        )}

        {/* FRAGMENTATION layer */}
        {layers.fragmentation && (
          <g>
            {/* Fragmentation zones around A12 and A50 crossing */}
            {[
              { cx: 450, cy: 320, rx: 60, ry: 30 },
              { cx: 452, cy: 456, rx: 50, ry: 25 },
              { cx: 452, cy: 92, rx: 55, ry: 28 },
            ].map(({ cx, cy, rx, ry }, i) => (
              <g key={i}>
                <ellipse cx={cx} cy={cy} rx={rx + 20} ry={ry + 14}
                  fill="rgba(212,132,26,0.04)" stroke="rgba(212,132,26,0.15)" strokeWidth="1" strokeDasharray="4 3" />
                <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
                  fill="rgba(212,132,26,0.08)" stroke="rgba(212,132,26,0.3)" strokeWidth="1" />
              </g>
            ))}
          </g>
        )}

        {/* ROADKILL layer */}
        {layers.roadkill && (
          <g>
            {ROADKILL_HOTSPOTS.map((hs, i) => (
              <g key={i}>
                <circle cx={hs.x} cy={hs.y} r={Math.sqrt(hs.count) * 1.5 + 4}
                  fill="rgba(192,57,26,0.12)" stroke="rgba(192,57,26,0.3)" strokeWidth="1"
                  style={{ animation: `pulse-ring ${1.8 + i * 0.3}s ${i * 0.4}s infinite` }}
                />
                <circle cx={hs.x} cy={hs.y} r={Math.sqrt(hs.count) + 3}
                  fill="rgba(192,57,26,0.2)" stroke="#F77F00" strokeWidth="1"
                  filter="url(#hotspot-glow)"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => showTooltip(e, (
                    <div>
                      <strong style={{ color: '#e05c3a' }}>Roadkill Cluster</strong>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '4px' }}>
                        {hs.count} casualties recorded
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: '2px' }}>
                        {hs.species}
                      </div>
                    </div>
                  ))}
                />
                <circle cx={hs.x} cy={hs.y} r="3" fill="#F77F00" />
              </g>
            ))}
          </g>
        )}

        {/* EXISTING CROSSINGS layer */}
        {layers.crossings && (
          <g>
            {EXISTING_CROSSINGS.map((cr, i) => {
              const color = cr.quality === 'good' ? '#2EC4B6'
                : cr.quality === 'fair' ? '#FCBF49' : '#F77F00'
              return (
                <g key={i}>
                  <rect
                    x={cr.x - 8} y={cr.y - 8} width={16} height={16} rx={2}
                    fill="rgba(0,0,0,0.8)" stroke={color} strokeWidth="1.5"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => showTooltip(e, (
                      <div>
                        <strong style={{ color: '#FFFFFF' }}>{cr.label}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                          {cr.type} · Quality: {cr.quality}
                        </div>
                      </div>
                    ))}
                  />
                  <text x={cr.x} y={cr.y + 4} textAnchor="middle"
                    fill={color} fontSize="8" fontFamily="var(--font-mono)" fontWeight="500">
                    {cr.type === 'Ecoduct' ? 'E' : cr.type === 'Tunnel' ? 'T' : 'C'}
                  </text>
                </g>
              )
            })}
          </g>
        )}

        {/* Intervention markers */}
        {INTERVENTION_POINTS.map(pt => {
          const { color } = getCorrType(pt.type)
          return (
            <g key={pt.id}>
              {/* Outer ring pulse */}
              <circle cx={pt.x} cy={pt.y} r="14"
                fill="transparent"
                stroke={color}
                strokeWidth="1"
                opacity="0.4"
                style={{ animation: `pulse-ring 2.5s infinite` }}
              />
              <circle
                cx={pt.x} cy={pt.y} r="8"
                fill="rgba(0,0,0,0.9)"
                stroke={color}
                strokeWidth="1.5"
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => showTooltip(e, (
                  <div>
                    <strong style={{ color: '#FFFFFF' }}>{pt.label}</strong>
                    <div style={{
                      display: 'flex', gap: '12px', marginTop: '6px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>Cost: <span style={{ color: '#FCBF49' }}>{pt.cost}</span></span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>Score: <span style={{ color: '#2EC4B6' }}>{pt.score}</span></span>
                    </div>
                  </div>
                ))}
              />
              <text x={pt.x} y={pt.y + 4} textAnchor="middle"
                fill={color} fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">
                {pt.score}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            background: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(46,196,182,0.15)',
            borderRadius: '6px',
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 50,
            maxWidth: '220px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(46,196,182,0.15)',
        borderRadius: '6px',
        padding: '10px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        maxWidth: '400px',
      }}>
        {[
          { color: 'var(--green-dim)', label: 'Habitat' },
          { color: '#0f1a0e', border: '1px solid #1e2e1a', label: 'Road' },
          { color: '#F77F00', label: 'Roadkill' },
          { color: '#2EC4B6', label: 'Corridor' },
          { color: '#FCBF49', label: 'Intervention' },
          { color: '#48CAE4', label: 'Water' },
        ].map(({ color, label, border }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '2px',
              background: color, border: border || 'none', flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.58rem',
              letterSpacing: '0.04em',
              color: 'rgba(255,255,255,0.3)',
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
