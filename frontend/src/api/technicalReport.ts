import { API_BASE } from '../lib/http'

export type Species =
  | 'badger'
  | 'otter'
  | 'red_deer'
  | 'pine_marten'
  | 'great_crested_newt'
  | 'hazel_dormouse'

export interface SpeciesOption {
  value: Species
  label: string
  latin: string
}

export const SPECIES: SpeciesOption[] = [
  { value: 'badger',             label: 'Badger',             latin: 'Meles meles' },
  { value: 'otter',              label: 'Otter',              latin: 'Lutra lutra' },
  { value: 'red_deer',           label: 'Red deer',           latin: 'Cervus elaphus' },
  { value: 'pine_marten',        label: 'European pine marten', latin: 'Martes martes' },
  { value: 'great_crested_newt', label: 'Great crested newt', latin: 'Triturus cristatus' },
  { value: 'hazel_dormouse',     label: 'Hazel dormouse',     latin: 'Muscardinus avellanarius' },
]

export interface RegionPreset {
  id: string
  label: string
  bbox: string
}

export const REGION_PRESETS: RegionPreset[] = [
  { id: 'hoge-veluwe', label: 'Hoge Veluwe (Gelderland)',     bbox: '5.74,52.05,5.86,52.12' },
  { id: 'utrechtse-heuvelrug', label: 'Utrechtse Heuvelrug', bbox: '5.20,52.00,5.45,52.15' },
  { id: 'biesbosch', label: 'Biesbosch (Zuid-Holland/NB)',    bbox: '4.70,51.70,4.95,51.82' },
  { id: 'salland-twente', label: 'Salland–Twente corridor',   bbox: '6.00,52.20,6.40,52.45' },
]

export function technicalReportPdfUrl(
  species: Species,
  bbox: string,
  disposition: 'attachment' | 'inline' = 'attachment'
): string {
  const params = new URLSearchParams({ species, bbox, disposition })
  return `${API_BASE}/api/outputs/technical-report/pdf?${params.toString()}`
}
