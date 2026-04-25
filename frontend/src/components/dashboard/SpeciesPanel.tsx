interface Species {
  id: string
  name: string
  latin: string
  icon: string
  resistance: { forest: number; road: number; farmland: number; urban: number }
  color: string
}

export const SPECIES_LIST: Species[] = [
  { id: 'badger',   name: 'Badger',           latin: 'Meles meles',                 icon: '🦡', resistance: { forest: 1, road: 9, farmland: 3, urban: 8 }, color: '#FCBF49' },
  { id: 'otter',    name: 'Eurasian Otter',   latin: 'Lutra lutra',                 icon: '🦦', resistance: { forest: 3, road: 8, farmland: 6, urban: 9 }, color: '#48CAE4' },
  { id: 'deer',     name: 'Red Deer',         latin: 'Cervus elaphus',              icon: '🦌', resistance: { forest: 1, road: 10, farmland: 4, urban: 9 }, color: '#F77F00' },
  { id: 'dormouse', name: 'Hazel Dormouse',   latin: 'Muscardinus avellanarius',    icon: '🐭', resistance: { forest: 1, road: 9, farmland: 7, urban: 10 }, color: '#2B9348' },
  { id: 'marten',   name: 'Pine Marten',      latin: 'Martes martes',               icon: '🐾', resistance: { forest: 1, road: 8, farmland: 5, urban: 9 },  color: '#2EC4B6' },
  { id: 'newt',     name: 'Great Crested Newt', latin: 'Triturus cristatus',        icon: '🦎', resistance: { forest: 2, road: 9, farmland: 5, urban: 10 }, color: '#9b7fd4' },
]

function ResistanceBar({ label, value }: { label: string; value: number; color: string }) {
  const barColor = value <= 3 ? '#2B9348' : value <= 6 ? '#FCBF49' : '#F77F00'
  return (
    <div style={{ marginBottom: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'capitalize', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: barColor }}>{value}/10</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
        <div style={{ width: `${value * 10}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

interface SpeciesPanelProps {
  selectedSpecies: string[]
  onToggle: (id: string) => void
}

export default function SpeciesPanel({ selectedSpecies, onToggle }: SpeciesPanelProps) {
  return (
    <div>
      <div className="label" style={{ marginBottom: '14px' }}>Target Species</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {SPECIES_LIST.map(sp => {
          const selected = selectedSpecies.includes(sp.id)
          return (
            <div
              key={sp.id}
              onClick={() => onToggle(sp.id)}
              style={{
                padding: '11px 12px',
                background: selected ? `${sp.color}0d` : 'transparent',
                border: `1px solid ${selected ? sp.color + '40' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={e => {
                if (!selected) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: selected ? '10px' : 0 }}>
                <span style={{ fontSize: '1.1rem' }}>{sp.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: selected ? 'var(--text-h)' : 'var(--text)' }}>{sp.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>{sp.latin}</div>
                </div>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: `1.5px solid ${selected ? sp.color : 'rgba(255,255,255,0.15)'}`,
                  background: selected ? sp.color : 'transparent',
                  flexShrink: 0, transition: 'all 0.2s',
                }} />
              </div>

              {selected && (
                <div>
                  {Object.entries(sp.resistance).map(([land, val]) => (
                    <ResistanceBar key={land} label={land} value={val} color={sp.color} />
                  ))}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', marginTop: '6px', fontStyle: 'italic' }}>
                    Source: Zeller et al. 2012
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
