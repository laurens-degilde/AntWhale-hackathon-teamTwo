import { API_BASE } from '../lib/http'

export interface CommunityReportRequest {
  rtype: 'roadkill' | 'crossing' | 'observation'
  species: string
  note: string
  lat: number
  lng: number
  date: string
}

export async function postCommunityReport(req: CommunityReportRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (body?.error) detail = body.error
    } catch { /* ignore */ }
    throw new Error(`Report submission failed (${res.status}): ${detail}`)
  }
}

export async function getCommunityReports(): Promise<CommunityReportRequest[]> {
  const res = await fetch(`${API_BASE}/api/community-reports`)
  if (!res.ok) throw new Error(`Failed to fetch community reports (${res.status})`)
  return res.json()
}
