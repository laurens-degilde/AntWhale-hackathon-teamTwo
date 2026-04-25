import { getJson } from '../lib/http'

export interface PinchPoint {
  id: string
  location: { lat: number; lng: number }
  currentDensity?: number
  bottleneckScore?: number
  dominantLandCoverAtPoint?: string
  betweenPatches?: string[]
}

export interface PinchPointResponse {
  species: string
  bbox: number[]
  topN: number
  pinchPoints: PinchPoint[]
  status?: string
  methodology?: string
}

export async function fetchPinchPoints(
  species: string,
  bbox: string,
  topN = 8,
): Promise<PinchPointResponse> {
  return getJson<PinchPointResponse>('/api/pinch-points', { species, bbox, topN })
}
