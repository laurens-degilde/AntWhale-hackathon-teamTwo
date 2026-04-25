export interface LayerState {
  roadkill: boolean
  corridors: boolean
  crossings: boolean
  fragmentation: boolean
  landuse: boolean
  resistance: boolean
}

interface LayerConfig {
  key: keyof LayerState
  label: string
  description: string
  color: string
}

const LAYERS: LayerConfig[] = [
  { key: 'corridors',     label: 'Connectivity Flow',   description: 'Current-density corridors (Circuitscape)', color: '#2EC4B6' },
  { key: 'roadkill',      label: 'Road-kill Hotspots',  description: 'Mortalities (Waarneming.nl)',              color: '#F77F00' },
  { key: 'crossings',     label: 'Existing Crossings',  description: 'Ecoducts, culverts, underpasses',          color: '#48CAE4' },
  { key: 'fragmentation', label: 'Fragmentation Zones', description: 'High-priority intervention areas',          color: '#FCBF49' },
  { key: 'landuse',       label: 'Land Use',            description: 'Copernicus / BGT classification',           color: '#2B9348' },
  { key: 'resistance',    label: 'Resistance Surface',  description: 'Per-species movement cost',                 color: '#9b7fd4' },
]

interface LayerPanelProps {
  layers: LayerState
  onToggle: (key: keyof LayerState) => void
}

export default function LayerPanel({ layers, onToggle }: LayerPanelProps) {
  return (
    <div>
      <div className="label" style={{ marginBottom: '14px' }}>Map Layers</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '24px' }}>
        {LAYERS.map(layer => {
          const active = layers[layer.key]
          return (
            <button
              key={layer.key}
              onClick={() => onToggle(layer.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                background: active ? `${layer.color}0d` : 'transparent',
                border: '1px solid',
                borderColor: active ? `${layer.color}33` : 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Toggle pill */}
              <div style={{
                width: '30px',
                height: '15px',
                borderRadius: '8px',
                background: active ? layer.color : 'rgba(255,255,255,0.08)',
                position: 'relative',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2.5px',
                  left: active ? '16px' : '2.5px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: active ? '#000' : 'rgba(255,255,255,0.3)',
                  transition: 'left 0.2s, background 0.2s',
                }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: active ? 'var(--text-h)' : 'var(--text)',
                  transition: 'color 0.15s',
                }}>
                  {layer.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  color: 'var(--text-dim)',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {layer.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Region selector */}
      <div className="label" style={{ marginBottom: '10px' }}>Region</div>
      <select
        style={{
          width: '100%',
          padding: '9px 12px',
          background: '#0d1822',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px',
          color: 'var(--text-h)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          outline: 'none',
          marginBottom: '10px',
        }}
      >
        <option>Gelderland, NL</option>
        <option>Veluwe Region</option>
        <option>Achterhoek</option>
        <option>Utrechtse Heuvelrug</option>
        <option>Overijssel, NL</option>
      </select>

      <button
        style={{
          width: '100%',
          padding: '11px',
          background: 'rgba(46,196,182,0.1)',
          border: '1px solid rgba(46,196,182,0.25)',
          borderRadius: '4px',
          color: 'var(--teal)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          transition: 'all 0.2s',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--teal)'
          e.currentTarget.style.color = '#000'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(46,196,182,0.1)'
          e.currentTarget.style.color = 'var(--teal)'
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Run Analysis
      </button>
    </div>
  )
}
