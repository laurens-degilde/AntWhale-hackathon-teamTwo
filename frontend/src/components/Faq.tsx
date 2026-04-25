const QA = [
  {
    q: 'Where does the data come from?',
    a: 'OpenStreetMap (Overpass), Copernicus land cover, Sentinel-2 via the Copernicus Data Space, GBIF, iNaturalist, Waarneming.nl roadkill records (verkeerslachtoffers), Rijkswaterstaat’s ecoduct inventory, and Dutch national layers (BRT/BGT, NNN, Atlas Natuurlijk Kapitaal). All sources are open. Resistance coefficients come from peer-reviewed literature with citations preserved in the report.',
  },
  {
    q: 'Is this an audit-ready ecological report?',
    a: 'It is a planning document. Every coefficient, every methodology choice, and every cost range is cited so a reviewing landscape ecologist can replicate or override our defaults. For tendered projects you will still want a site-specific feasibility study — the report explicitly recommends one for the top-3 ranked interventions.',
  },
  {
    q: 'What does a donation fund?',
    a: 'Compute time on connectivity model runs, paid API quota where it is required (rare — most providers are free), and engineering work to add provinces, raster overlays, and country-specific cadastres. We are an open-source / open-data project; we do not resell the analyses.',
  },
  {
    q: 'Can my province or NGO use this directly?',
    a: 'Yes. Pick a perimeter, generate the action plan, and hand the PDF to your GIS team or municipality. The same backend can also export GeoPackage / Shapefile so it slots into existing GIS workflows. Landowner letters and pre-filled subsidy applications are next on the roadmap.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="section section-narrow">
      <div className="section-head">
        <span className="section-kicker">FAQ</span>
        <h2>Common questions</h2>
      </div>
      <div className="faq">
        {QA.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
