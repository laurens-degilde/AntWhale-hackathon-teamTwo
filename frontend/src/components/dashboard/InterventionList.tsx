import { useState } from 'react'

interface Intervention {
  id: string
  type: 'culvert' | 'underpass' | 'ecoduct' | 'hedgerow' | 'stepping-stone'
  label: string
  location: string
  species: string[]
  cost: number
  costDisplay: string
  benefitScore: number
  costEfficiency: number
  status: 'proposed' | 'funded' | 'in-progress'
}

const INTERVENTIONS: Intervention[] = [
  { id: 'i1', type: 'culvert',       label: 'Small-mammal culvert',    location: 'A12 km 23.4',      species: ['Badger', 'Dormouse'],   cost: 42000,   costDisplay: '€42k',   benefitScore: 89, costEfficiency: 97, status: 'proposed' },
  { id: 'i2', type: 'hedgerow',      label: 'Hedgerow planting strip', location: 'Barneveld fields', species: ['Dormouse', 'Badger'],   cost: 12000,   costDisplay: '€12k',   benefitScore: 67, costEfficiency: 94, status: 'proposed' },
  { id: 'i3', type: 'culvert',       label: 'Otter culvert (riparian)',location: 'A50 km 15.1',      species: ['Otter'],                cost: 58000,   costDisplay: '€58k',   benefitScore: 84, costEfficiency: 88, status: 'funded' },
  { id: 'i4', type: 'underpass',     label: 'Large-mammal underpass',  location: 'A15 km 34.8',      species: ['Deer', 'Badger'],       cost: 320000,  costDisplay: '€320k',  benefitScore: 76, costEfficiency: 72, status: 'proposed' },
  { id: 'i5', type: 'stepping-stone',label: 'Woodland stepping stone', location: 'Achterhoek gap',   species: ['Marten', 'Dormouse'],   cost: 85000,   costDisplay: '€85k',   benefitScore: 61, costEfficiency: 68, status: 'proposed' },
  { id: 'i6', type: 'ecoduct',       label: 'Ecoduct expansion',       location: 'A1 Kootwijkerzand',species: ['Deer', 'Badger', 'Marten'], cost: 1200000, costDisplay: '€1.2M', benefitScore: 94, costEfficiency: 58, status: 'in-progress' },
]

const TYPE_COLORS: Record<string, string> = {
  culvert:        '#2EC4B6',
  underpass:      '#48CAE4',
  ecoduct:        '#FCBF49',
  hedgerow:       '#2B9348',
  'stepping-stone': '#F77F00',
}

const TYPE_LABELS: Record<string, string> = {
  culvert: 'Culvert', underpass: 'Underpass', ecoduct: 'Ecoduct',
  hedgerow: 'Hedgerow', 'stepping-stone': 'Habitat',
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  proposed:    { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
  funded:      { color: '#FCBF49',               bg: 'rgba(252,191,73,0.1)' },
  'in-progress': { color: '#2EC4B6',             bg: 'rgba(46,196,182,0.1)' },
}

export default function InterventionList() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'efficiency' | 'benefit' | 'cost'>('efficiency')

  const sorted = [...INTERVENTIONS].sort((a, b) => {
    if (sortBy === 'benefit') return b.benefitScore - a.benefitScore
    if (sortBy === 'cost')    return a.cost - b.cost
    return b.costEfficiency - a.costEfficiency
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <div className="label" style={{ marginBottom: '6px' }}>Ranked Interventions</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {INTERVENTIONS.length} identified · sorted by cost-effectiveness
        </p>
      </div>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={e => setSortBy(e.target.value as typeof sortBy)}
        style={{
          width: '100%',
          padding: '7px 10px',
          background: '#0d1822',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '3px',
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          outline: 'none',
          marginBottom: '12px',
        }}
      >
        <option value="efficiency">Sort: Cost-effectiveness</option>
        <option value="benefit">Sort: Benefit score</option>
        <option value="cost">Sort: Cost (low → high)</option>
      </select>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sorted.map((item, idx) => {
          const color = TYPE_COLORS[item.type]
          const open = expanded === item.id
          const ss = STATUS_STYLE[item.status]

          return (
            <div
              key={item.id}
              onClick={() => setExpanded(open ? null : item.id)}
              style={{
                background: open ? '#0d1822' : '#080f17',
                border: `1px solid ${open ? color + '30' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '5px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#0a1520' }}
              onMouseLeave={e => { if (!open) e.currentTarget.style.background = '#080f17' }}
            >
              {/* Row */}
              <div style={{ padding: '9px 11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  color: 'var(--text-dim)',
                  width: '12px',
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.57rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  background: color + '15',
                  color,
                  border: `1px solid ${color}30`,
                  flexShrink: 0,
                }}>
                  {TYPE_LABELS[item.type]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                    {item.location}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 600, color, lineHeight: 1 }}>
                    {item.costEfficiency}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    eff
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {open && (
                <div style={{ padding: '0 11px 12px', borderTop: `1px solid ${color}20` }}>
                  {/* Metrics */}
                  <div style={{ display: 'flex', gap: '16px', paddingTop: '10px', marginBottom: '10px' }}>
                    {[
                      { label: 'Cost', value: item.costDisplay, color: '#FCBF49' },
                      { label: 'Benefit', value: `${item.benefitScore}/100`, color: '#2EC4B6' },
                      { label: 'Status', value: item.status, color: ss.color },
                    ].map(({ label, value, color: c }) => (
                      <div key={label}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: c }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Benefit bar */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                      <div style={{ width: `${item.benefitScore}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  {/* Species */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {item.species.map(sp => (
                      <span key={sp} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '2px 7px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)' }}>
                        {sp}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {['Draft Letter', 'Subsidy Form'].map(label => (
                      <button key={label} style={{
                        flex: 1, padding: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = color + '15'; e.currentTarget.style.color = color; e.currentTarget.style.borderColor = color + '33' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div style={{
        marginTop: '10px',
        padding: '11px 12px',
        background: '#0d1822',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Total (all)
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600, color: '#FCBF49' }}>
          €1.72M
        </span>
      </div>
    </div>
  )
}
