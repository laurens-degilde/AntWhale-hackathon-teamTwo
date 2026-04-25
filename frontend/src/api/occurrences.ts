import { getJson } from '../lib/http'

export interface Occurrence {
  id: number
  species: { id: number; name: string; vernacularName?: string | null }
  date?: string | null
  location?: { lat: number; lng: number } | null
  count?: number | null
  source: string
}

interface OccurrenceResponse {
  total: number
  results: Occurrence[]
}

export interface Center { lat: number; lng: number }

/** Convert "minLng,minLat,maxLng,maxLat" to a centroid + radius (km), capped at maxKm. */
export function bboxToCircle(bbox: string, maxKm = 50): { center: Center; radiusKm: number } | null {
  const parts = bbox.split(',').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null
  const [minLng, minLat, maxLng, maxLat] = parts
  if (maxLat <= minLat || maxLng <= minLng) return null
  const midLat = (minLat + maxLat) / 2
  const midLng = (minLng + maxLng) / 2
  const dLatKm = (maxLat - minLat) * 111
  const dLngKm = (maxLng - minLng) * 111 * Math.cos((midLat * Math.PI) / 180)
  const radiusKm = Math.min(maxKm, Math.max(1, 0.5 * Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm)))
  return { center: { lat: midLat, lng: midLng }, radiusKm: Math.round(radiusKm * 10) / 10 }
}

export async function fetchInaturalist(
  taxonName: string,
  center: Center,
  radiusKm: number,
  perPage = 80,
): Promise<OccurrenceResponse> {
  return getJson<OccurrenceResponse>('/api/inaturalist-occurrences', {
    taxonName,
    lat: center.lat,
    lng: center.lng,
    radius: radiusKm,
    perPage,
    page: 1,
  })
}
