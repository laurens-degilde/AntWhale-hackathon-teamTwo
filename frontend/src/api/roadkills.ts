import { getJson } from '../lib/http'
import type { Center, Occurrence } from './occurrences'

interface RoadkillResponse {
  total: number
  page?: number
  results: Occurrence[]
}

export async function fetchRoadkills(
  taxonName: string,
  center: Center,
  radiusKm: number,
  perPage = 80,
): Promise<RoadkillResponse> {
  return getJson<RoadkillResponse>('/api/roadkills', {
    taxonName,
    lat: center.lat,
    lng: center.lng,
    radius: radiusKm,
    perPage,
    page: 1,
  })
}
