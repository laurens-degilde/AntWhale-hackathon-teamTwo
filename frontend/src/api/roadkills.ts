import { getJson } from '../lib/http'
import { bboxToCircle } from './occurrences'

export interface RoadkillPoint {
  id: number
  lat: number
  lng: number
  date?: string
  species?: string
}

interface RoadkillObservation {
  id: number
  observedOn?: string
  taxon?: { name?: string; commonName?: string }
  location?: { lat: number; lng: number }
}

interface RoadkillResponse {
  total: number
  page: number
  results: RoadkillObservation[]
}

/**
 * Fetch roadkill observations via the backend (iNaturalist proxy).
 * When a bbox is supplied, converts it to a center+radius circle.
 */
export async function fetchRoadkills(
  bbox?: string | null,
  limit = 200,
): Promise<{ total: number; points: RoadkillPoint[] }> {
  const params: Record<string, string | number> = {
    perPage: Math.min(limit, 200),
  }

  if (bbox) {
    const circle = bboxToCircle(bbox)
    if (circle) {
      params.lat = circle.center.lat
      params.lng = circle.center.lng
      params.radius = circle.radiusKm
    }
  }

  const data = await getJson<RoadkillResponse>('/api/roadkills', params)

  const points: RoadkillPoint[] = data.results
    .filter(r => r.location)
    .map(r => ({
      id: r.id,
      lat: r.location!.lat,
      lng: r.location!.lng,
      date: r.observedOn,
      species: r.taxon?.commonName ?? r.taxon?.name,
    }))

  return { total: data.total, points }
}
