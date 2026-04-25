import { API_BASE } from '../lib/http'

export interface DonationRequest {
  ngoName: string
  contactEmail: string
  amountEuros: number
  currency?: string
  message?: string
  anonymous?: boolean
}

export interface DonationResponse {
  invoiceId: string
  invoiceNumber: string | null
  hostedInvoiceUrl: string
  status: string
}

export async function postDonation(req: DonationRequest): Promise<DonationResponse> {
  const res = await fetch(`${API_BASE}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (body?.error) detail = body.error
    } catch {
      // ignore parse error, fall back to statusText
    }
    throw new Error(`Donation failed (${res.status}): ${detail}`)
  }
  return res.json()
}
