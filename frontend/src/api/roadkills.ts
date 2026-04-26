export interface RoadkillPoint {
  id: number
  lat: number
  lng: number
  date?: string
  species?: string
}

interface GbifResult {
  key: number
  decimalLatitude?: number
  decimalLongitude?: number
  eventDate?: string
  scientificName?: string
  vernacularName?: string
  species?: string
}

interface GbifResponse {
  count: number
  results: GbifResult[]
}

/**
 * NL-wide roadkill observations from GBIF.
 *   GET https://api.gbif.org/v1/occurrence/search
 *     ?country=NL
 *     &basisOfRecord=HUMAN_OBSERVATION
 *     &q=roadkill
 *     &limit=<n>
 *
 * No auth, no rate limit worth caring about. Called directly from the browser.
 */
export async function fetchRoadkills(
  limit = 300,
): Promise<{ total: number; points: RoadkillPoint[] }> {
  const params = new URLSearchParams({
    country: 'NL',
    basisOfRecord: 'HUMAN_OBSERVATION',
    q: 'roadkill',
    limit: String(Math.min(limit, 300)),
  })
  const res = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`)
  if (!res.ok) throw new Error(`GBIF ${res.status}`)
  const data: GbifResponse = await res.json()

  const points: RoadkillPoint[] = data.results
    .filter(r => r.decimalLatitude != null && r.decimalLongitude != null)
    .map(r => ({
      id: r.key,
      lat: r.decimalLatitude!,
      lng: r.decimalLongitude!,
      date: r.eventDate,
      species: r.vernacularName ?? r.species ?? r.scientificName,
    }))

  return { total: data.count, points }
}
