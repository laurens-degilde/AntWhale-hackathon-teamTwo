import { getJson } from '../lib/http'

export interface PinchPoint {
  id: string
  location: { lat: number; lng: number }
  currentDensity?: number
  bottleneckScore?: number
  dominantLandCoverAtPoint?: string
  betweenPatches?: string[]
}

interface PinchPointResponse {
  species: string
  bbox: number[]
  topN: number
  pinchPoints: PinchPoint[]
  status?: string
}

export async function fetchPinchPoints(
  species: string,
  bbox: string,
  topN = 8,
): Promise<PinchPoint[]> {
  const data = await getJson<PinchPointResponse>('/api/pinch-points', { species, bbox, topN })
  return data.pinchPoints ?? []
}
