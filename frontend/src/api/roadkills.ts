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
  species?: string
  scientificName?: string
  vernacularName?: string
}

interface GbifResponse {
  count: number
  results: GbifResult[]
}

/**
 * Fetch roadkill observations directly from GBIF.
 * Uses `q=roadkill&country=NL&basisOfRecord=HUMAN_OBSERVATION`.
 * When a bbox is supplied, narrows by WKT geometry instead of country.
 */
export async function fetchGbifRoadkills(
  bbox?: string | null,
  limit = 300,
): Promise<{ total: number; points: RoadkillPoint[] }> {
  const params: Record<string, string> = {
    basisOfRecord: 'HUMAN_OBSERVATION',
    q: 'roadkill',
    limit: String(Math.min(limit, 300)),
  }

  if (bbox) {
    const [w, s, e, n] = bbox.split(',').map(Number)
    // GBIF WKT uses lon lat order, ring must be closed
    params.geometry = `POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`
  } else {
    params.country = 'NL'
  }

  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`https://api.gbif.org/v1/occurrence/search?${qs}`)
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
