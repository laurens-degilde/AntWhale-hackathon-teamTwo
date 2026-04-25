import { getJson } from '../lib/http'

export interface Ecoduct {
  id: string
  name: string
  type: 'ECODUCT' | 'WILDLIFE_UNDERPASS' | 'AMPHIBIAN_TUNNEL' | string
  location: { lat: number; lng: number }
  road?: string
  widthM?: number | null
  speciesTarget?: string[]
  source?: string
}

interface EcoductResponse {
  results: Ecoduct[]
}

export async function fetchEcoducts(): Promise<Ecoduct[]> {
  const data = await getJson<EcoductResponse>('/api/ecoducts')
  return data.results ?? []
}
