import { getJson } from '../lib/http'

export type PatchKind = 'SOURCE' | 'DESTINATION' | 'STEPPING_STONE'

export interface HabitatPatch {
  id: string
  kind: PatchKind
  areaHa: number
  centroid: { lat: number; lng: number }
  dominantLandCover: string
  habitatQuality: number
}

interface HabitatPatchResponse {
  species: string
  bbox: number[]
  patches: HabitatPatch[]
  status: string
}

export async function fetchHabitatPatches(
  species: string,
  bbox: string,
): Promise<HabitatPatch[]> {
  const data = await getJson<HabitatPatchResponse>('/api/habitat-patches', { species, bbox })
  return data.patches ?? []
}
