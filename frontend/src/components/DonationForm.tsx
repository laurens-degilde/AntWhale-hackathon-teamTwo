import { useState, type FormEvent } from 'react'
import { postDonation, type DonationResponse } from '../api/donations'
import { DonationSuccess } from './DonationSuccess'

export function DonationForm() {
  const [ngoName, setNgoName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [amountEuros, setAmountEuros] = useState('100')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<DonationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await postDonation({
        ngoName: ngoName.trim(),
        contactEmail: contactEmail.trim(),
        amountEuros: Number(amountEuros),
        message: message.trim() || undefined,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    setNgoName('')
    setContactEmail('')
    setAmountEuros('100')
    setMessage('')
  }

  if (result) {
    return <DonationSuccess result={result} onAnother={reset} />
  }

  return (
    <form className="donation-form" onSubmit={onSubmit}>
      <h2>Support corridor work</h2>
      <p className="donation-lede">
        Funding goes directly to the open data and modelling pipeline that
        backs every analysis.
      </p>

      <label>
        NGO / organisation
        <input
          type="text"
          required
          maxLength={200}
          value={ngoName}
          onChange={(e) => setNgoName(e.target.value)}
          placeholder="Natuurmonumenten"
        />
      </label>

      <label>
        Contact email
        <input
          type="email"
          required
          maxLength={200}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="donations@example.org"
        />
      </label>

      <label>
        Amount (EUR)
        <input
          type="number"
          required
          min={1}
          max={100000}
          step={1}
          value={amountEuros}
          onChange={(e) => setAmountEuros(e.target.value)}
        />
      </label>

      <label>
        Message <span className="donation-optional">(optional)</span>
        <textarea
          rows={3}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="For badger corridor work in Gelderland"
        />
      </label>

      {error && <p className="donation-error">{error}</p>}

      <button type="submit" disabled={submitting} className="donation-submit">
        {submitting ? 'Creating invoice…' : 'Donate'}
      </button>
      <p className="donation-fineprint">
        We create an invoice via Solvimon. You will receive a payment link —
        no card details are collected here.
      </p>
    </form>
  )
}
