const STEPS = [
  {
    title: 'Assemble the landscape',
    body: 'Pulls OSM, Copernicus land cover, Sentinel-2 imagery, BRT/BGT, NNN, GBIF, iNaturalist, road-kill databases, and existing ecoduct inventories — stitched into one georeferenced stack.',
  },
  {
    title: 'Build a resistance surface',
    body: 'Per-species resistance values from peer-reviewed literature (Zeller, Koen, et al.). Forest is easy for a dormouse, hard for a grass snake. Every coefficient is cited so an ecologist can audit it.',
  },
  {
    title: 'Run the connectivity model',
    body: 'Circuitscape (or Omniscape for large regions) on the resistance surface plus source/destination patches. Output: current-density showing where animals would move if they could.',
  },
  {
    title: 'Identify interventions',
    body: 'Each pinch point is classified: ecoduct (€2–8M), wildlife underpass (€200–800k), culvert (€15–60k), hedgerow planting (~€8–15/m), fence modification, stepping-stone habitat. Costed and ranked.',
  },
  {
    title: 'Handle the paperwork',
    body: 'GeoPackage for the GIS team, technical report PDF, personalised landowner letters via Kadaster, pre-filled subsidy applications (ANLb, GLB eco-schemes), and a stakeholder map.',
  },
  {
    title: 'Keep it live',
    body: 'Re-runs quarterly. New road-kill cluster? New development approved? Pasture converted? It reprioritises and drafts amendments. The plan tracks the landscape — it doesn’t age out.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="section section-narrow">
      <div className="section-head">
        <span className="section-kicker">How it works</span>
        <h2>From open data to a plan you can ship</h2>
        <p>
          The bottleneck has never been the science — Circuitscape and the resistance literature have existed for years.
          The bottleneck is the months of glue work between datasets, models, and paperwork. Corridor compresses that.
        </p>
      </div>
      <ol className="how-grid">
        {STEPS.map((s, i) => (
          <li className="how-card" key={s.title}>
            <span className="how-num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
