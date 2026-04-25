import { useCallback, useState } from 'react'
import './App.css'
import type { Species } from './api/technicalReport'
import { DonationForm } from './components/DonationForm'
import { TechnicalReportForm } from './components/TechnicalReportForm'
import { TopNav } from './components/TopNav'
import { Hero } from './components/Hero'
import { StatsStrip } from './components/StatsStrip'
import { HowItWorks } from './components/HowItWorks'
import { DataMap } from './components/DataMap'
import { NgoPartners } from './components/NgoPartners'
import { Faq } from './components/Faq'
import { Footer } from './components/Footer'

interface MapCounts { occurrences: number; roadkill: number; pinch: number }
type LayerKey = 'ecoducts' | 'occurrences' | 'roadkill' | 'pinch'

function App() {
  const [species, setSpecies] = useState<Species>('badger')
  const [bbox, setBbox] = useState<string | null>(null)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    ecoducts: true, occurrences: true, roadkill: true, pinch: true,
  })
  const [counts, setCounts] = useState<MapCounts>({ occurrences: 0, roadkill: 0, pinch: 0 })

  const onLayerToggle = useCallback((key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const onCounts = useCallback((next: MapCounts | ((prev: MapCounts) => MapCounts)) => {
    setCounts((prev) => (typeof next === 'function' ? (next as (p: MapCounts) => MapCounts)(prev) : next))
  }, [])

  const onRequestPlan = useCallback(() => {
    document.getElementById('plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="page">
      <TopNav />
      <Hero />
      <StatsStrip />
      <HowItWorks />

      <section id="map" className="section section-wide">
        <div className="section-head">
          <span className="section-kicker">See the data</span>
          <h2>Where animals try to move — and where they get stuck</h2>
          <p>
            Pick a species. Toggle layers. Pick a perimeter (preset, click two corners on the map, or use the current view).
            We'll fetch real iNaturalist + roadkill records, surface the modelled pinch points, and overlay every existing ecoduct.
            When you're ready, generate the action plan PDF.
          </p>
        </div>

        <DataMap
          species={species}
          bbox={bbox}
          layers={layers}
          onSpeciesChange={setSpecies}
          onBboxChange={setBbox}
          onLayerToggle={onLayerToggle}
          onCounts={onCounts}
          onRequestPlan={onRequestPlan}
        />

        <div className="map-counts" role="status" aria-live="polite">
          <span><strong>{counts.occurrences}</strong> species occurrences</span>
          <span><strong>{counts.roadkill}</strong> road-kill records</span>
          <span><strong>{counts.pinch}</strong> pinch points {bbox ? '' : '(set a perimeter)'}</span>
        </div>
      </section>

      <section id="plan" className="section section-narrow">
        <div className="section-head">
          <span className="section-kicker">Action plan</span>
          <h2>Hand this to a province, NGO, or municipality</h2>
          <p>
            Generates a costed, ranked, cited PDF for the perimeter and species you picked on the map above.
            Coefficients are population-mean values from the literature — site calibration may be needed before tendering.
          </p>
        </div>
        <TechnicalReportForm
          initialSpecies={species}
          initialBbox={bbox ?? undefined}
        />
      </section>

      <section id="donate" className="section section-narrow">
        <div className="section-head">
          <span className="section-kicker">Support the work</span>
          <h2>Fund a wider geography</h2>
          <p>
            We're an open-source / open-data project. Funding pays for connectivity-model compute,
            additional country cadastres, and engineering work to expand species coverage.
          </p>
        </div>
        <DonationForm />
      </section>

      <NgoPartners />
      <Faq />
      <Footer />
    </div>
  )
}

export default App
