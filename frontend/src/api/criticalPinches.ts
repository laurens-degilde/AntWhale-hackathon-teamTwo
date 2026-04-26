import { getJson } from '../lib/http'

export interface CriticalPinch {
  species: string
  region: string
  id: string
  lat: number
  lng: number
  score: number
  cover: string | null
  between: string | null
}

interface CriticalPinchesResponse {
  species: string | null
  minScore: number
  bbox: string | null
  count: number
  source: 'file' | 'empty'
  pinches: CriticalPinch[]
}

/**
 * Pre-computed pinches served by the backend directly from a persisted JSON file.
 * No Circuitscape / Overpass calls — instant.
 *
 * @param species  e.g. 'badger'
 * @param minScore filter to pinches whose bottleneckScore is ≥ this. 0.95 for the always-on
 *                 critical layer; 0 to get every pinch in a bbox.
 * @param bbox     'minLng,minLat,maxLng,maxLat' to additionally filter by region; omit for NL-wide.
 */
export async function fetchCriticalPinches(
  species: string,
  minScore = 0.95,
  bbox?: string,
): Promise<CriticalPinch[]> {
  const params: Record<string, string | number> = { species, minScore }
  if (bbox) params.bbox = bbox
  const data = await getJson<CriticalPinchesResponse>('/api/critical-pinches', params)
  return data.pinches ?? []
}
