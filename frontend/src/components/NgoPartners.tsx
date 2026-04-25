const PARTNERS = [
  { name: 'Natuurmonumenten',          line: 'Largest Dutch nature NGO — 370+ reserves, active connectivity work.' },
  { name: 'ARK Rewilding Nederland',    line: 'Landscape-scale connectivity and rewilding corridors.' },
  { name: 'Zoogdiervereniging',         line: 'Dutch mammal society. Owns the road-kill data; deep badger and otter expertise.' },
  { name: 'De Vlinderstichting',        line: 'Butterfly conservation — habitat networks at the agricultural margin.' },
  { name: 'Landschappen NL',            line: 'Umbrella for 12 provincial landscape trusts; regional networks.' },
  { name: 'Rewilding Europe',           line: 'Pan-European rewilding landscapes that need corridor planning.' },
]

export function NgoPartners() {
  return (
    <section id="partners" className="section section-narrow">
      <div className="section-head">
        <span className="section-kicker">Built for</span>
        <h2>Conservation NGOs and the public bodies they work with</h2>
        <p>
          The science is solved. The cost is not. Small NGOs, provincial governments, and water boards
          can&apos;t afford €50–150k consultancy studies for every landscape. Corridor closes that gap.
        </p>
      </div>
      <ul className="ngos">
        {PARTNERS.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong>
            <span>{p.line}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
