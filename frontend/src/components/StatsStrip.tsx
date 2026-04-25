const STATS = [
  {
    number: '~150',
    label: 'species lost daily',
    note: 'Conservative IUCN-derived estimate of vertebrate, plant, and invertebrate extinction.',
  },
  {
    number: '194M',
    label: 'birds killed by traffic / year',
    note: 'European road mortality (Grilo et al. 2020). Plus ~29M mammals.',
  },
  {
    number: '20%',
    label: 'EU land to restore by 2030',
    note: 'EU Nature Restoration Law (2024) — connectivity is core to compliance.',
  },
]

export function StatsStrip() {
  return (
    <section className="stats-strip" aria-label="The scale of the problem">
      {STATS.map((s) => (
        <div className="stat" key={s.label}>
          <div className="stat-number">{s.number}</div>
          <div className="stat-label">{s.label}</div>
          <div className="stat-note">{s.note}</div>
        </div>
      ))}
    </section>
  )
}
