import heroImg from '../assets/hero.png'

export function Hero() {
  return (
    <section id="mission" className="hero-section">
      <div className="hero-art">
        <img src={heroImg} alt="" width="180" height="189" />
      </div>
      <h1 className="hero-title">Roads cut habitats. We tell you exactly where to fix them.</h1>
      <p className="hero-lede">
        Habitat fragmentation is the leading driver of European biodiversity loss.
        Corridor reads open data — OSM, Sentinel-2, GBIF, Kadaster — and produces
        a ranked, costed plan for where to put the next ecoduct, culvert or hedgerow.
        For NGOs, provinces, and water boards. Not another dashboard. The paperwork too.
      </p>
      <div className="hero-ctas">
        <a className="cta-primary" href="#map">See the data</a>
        <a className="cta-secondary" href="#how">How it works</a>
      </div>
      <p className="hero-meta">
        Built on open data &amp; open source: OSM · Copernicus · GBIF · iNaturalist · PDOK · Rijkswaterstaat · Circuitscape.
      </p>
    </section>
  )
}
