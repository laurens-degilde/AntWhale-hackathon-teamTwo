import type { DonationResponse } from '../api/donations'

interface Props {
  result: DonationResponse
  onAnother: () => void
}

export function DonationSuccess({ result, onAnother }: Props) {
  const isDemo = result.status === 'demo'
  return (
    <div className="donation-success">
      <h2>{isDemo ? 'Demo invoice created' : 'Invoice created'}</h2>
      {isDemo && (
        <p className="donation-demo-banner">
          The backend is running without a Solvimon API key. No real invoice
          was generated; the link below is a placeholder.
        </p>
      )}
      <dl className="donation-meta">
        <dt>Invoice</dt>
        <dd>{result.invoiceNumber ?? result.invoiceId}</dd>
        <dt>Status</dt>
        <dd>{result.status}</dd>
      </dl>
      <a
        href={result.hostedInvoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="donation-link"
      >
        Open payment link →
      </a>
      <button type="button" className="donation-another" onClick={onAnother}>
        Make another donation
      </button>
    </div>
  )
}
