export async function fetchBackend() {
  const response = await fetch('/api/backend')
  if (!response.ok) {
    throw new Error(`Backend returned ${response.status} ${response.statusText}`)
  }
  return response.text()
}
