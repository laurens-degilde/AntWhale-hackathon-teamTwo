import { useState, useEffect, useRef } from 'react'

const FAQS = [
  {
    q: 'What data sources does WildCross use?',
    a: 'OpenStreetMap (roads, buildings, land-use, waterways), Copernicus land cover and Sentinel-2 satellite imagery, GBIF and iNaturalist for species occurrences, Waarneming.nl for road-kill data in the Netherlands, Rijkswaterstaat ecoduct inventories, and national cadastral registers (Kadaster for NL, Land Registry for UK). All sources are open-access or openly licensed.',
  },
  {
    q: 'Which species does it support?',
    a: 'The current menu includes badger, Eurasian otter, red deer, hazel dormouse, European pine marten, great crested newt, and roe deer. Each species has peer-reviewed resistance coefficients. Additional species can be added by providing a resistance table referencing published studies.',
  },
  {
    q: 'How accurate is the connectivity modelling?',
    a: 'WildCross uses Circuitscape — the gold-standard academic tool for landscape connectivity based on circuit theory. Every resistance coefficient is drawn from published literature (Zeller et al. 2012, Koen et al. 2014) with inline citations. A reviewing ecologist can inspect and adjust every value. Absolute accuracy depends on data quality; the model\'s strength is identifying relative priorities within a region.',
  },
  {
    q: 'How is this different from hiring an ecological consultant?',
    a: 'A traditional corridor study costs €50–150k and takes 3–6 months, producing a static PDF. WildCross runs in hours, costs a fraction of that, and produces a living document updated monthly. It generates not just the analysis but everything needed to act on it: landowner letters, subsidy forms, technical reports, and GIS exports.',
  },
  {
    q: 'Can it work outside the Netherlands?',
    a: 'Yes. The pipeline works anywhere OpenStreetMap has reasonable coverage. Data adapters exist for UK (Project Splatter, Land Registry), Germany, and Belgium. The species menu applies across full European ranges. National subsidy form templates require per-country customisation.',
  },
  {
    q: 'What does it actually output?',
    a: '(1) Ranked intervention list with cost estimates and connectivity scores. (2) GeoPackage/Shapefile outputs for GIS teams. (3) Technical report with full methodology and citations. (4) Personalised landowner outreach letters from cadastral data. (5) Pre-filled subsidy applications. (6) Stakeholder map for municipalities, water boards, and NGOs.',
  },
]

function FAQItem({ item, index }: { item: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        borderTop: '1px solid rgba(0,0,0,0.09)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.5s ${index * 0.06}s, transform 0.5s ${index * 0.06}s`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '28px 0',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flex: 1 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.58rem',
            color: 'rgba(0,0,0,0.25)',
            letterSpacing: '0.1em',
            flexShrink: 0,
          }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: 'clamp(0.9rem, 1.3vw, 1.05rem)',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: open ? '#1a2818' : 'rgba(0,0,0,0.68)',
            lineHeight: 1.4,
            transition: 'color 0.2s',
          }}>
            {item.q}
          </span>
        </div>
        <div style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: open ? '#2a4020' : 'rgba(0,0,0,0.3)',
          transition: 'transform 0.3s ease, color 0.2s',
          transform: open ? 'rotate(45deg)' : 'none',
          fontSize: '1.4rem',
          fontWeight: 300,
          lineHeight: 1,
        }}>
          +
        </div>
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '400px' : '0',
        transition: 'max-height 0.45s cubic-bezier(0.2,0.8,0.2,1)',
      }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.9rem',
          color: 'rgba(0,0,0,0.52)',
          lineHeight: 1.85,
          paddingBottom: '28px',
          paddingLeft: '38px',
          paddingRight: '48px',
        }}>
          {item.a}
        </p>
      </div>
    </div>
  )
}

export default function FAQSection() {
  return (
    <section className="light-section" style={{
      borderTop: '1px solid rgba(0,0,0,0.09)',
      padding: '100px 0',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.68rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.32)',
              marginBottom: '20px',
            }}>
              Questions & Answers
            </div>
            <div style={{
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 0.9,
              color: '#1a2818',
            }}>
              <div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)' }}>What you</div>
              <div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)', color: '#2a4020' }}>need to know.</div>
            </div>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.9rem',
            color: 'rgba(0,0,0,0.45)',
            lineHeight: 1.8,
            maxWidth: '360px',
            margin: 0,
          }}>
            Everything about how WildCross works, what it produces, and who it's built for.
          </p>
        </div>

        {/* FAQ list */}
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
          {FAQS.map((item, i) => (
            <FAQItem key={i} item={item} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
