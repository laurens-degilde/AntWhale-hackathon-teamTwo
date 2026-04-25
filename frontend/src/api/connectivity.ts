import { getJson } from '../lib/http'

export interface ConnectivityResult {
  species: string
  bbox: number[]
  gridWidth: number
  gridHeight: number
  meanCurrentDensity: number
  maxCurrentDensity: number
  currentDensityGrid: number[][]
  engine: string
  status: string
}

export async function fetchConnectivity(
  species: string,
  bbox: string,
): Promise<ConnectivityResult> {
  return getJson<ConnectivityResult>('/api/connectivity', { species, bbox })
}

/** Render a current-density grid to a canvas using a cyan→indigo→pink gradient. */
export function gridToCanvas(
  grid: number[][],
  maxDensity: number,
): HTMLCanvasElement {
  const h = grid.length
  const w = h > 0 ? grid[0].length : 0
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  if (w === 0 || h === 0) return canvas
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(w, h)
  const d = imageData.data

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const raw = grid[row][col] ?? 0
      const t = Math.max(0, Math.min(1, raw / (maxDensity || 1)))
      const idx = (row * w + col) * 4

      // Color stops: 0→transparent, 0.35→cyan, 0.65→indigo, 1→hot-pink
      let r = 0, g = 0, b = 0, a = 0
      if (t < 0.05) {
        a = 0
      } else if (t < 0.35) {
        const f = (t - 0.05) / 0.30
        // transparent → cyan (#06b6d4)
        r = Math.round(6 * f)
        g = Math.round(182 * f)
        b = Math.round(212 * f)
        a = Math.round(160 * f)
      } else if (t < 0.65) {
        const f = (t - 0.35) / 0.30
        // cyan → indigo (#6366f1)
        r = Math.round(6   + (99  - 6)   * f)
        g = Math.round(182 + (102 - 182) * f)
        b = Math.round(212 + (241 - 212) * f)
        a = Math.round(160 + (200 - 160) * f)
      } else {
        const f = (t - 0.65) / 0.35
        // indigo → hot-pink (#ec4899)
        r = Math.round(99  + (236 - 99)  * f)
        g = Math.round(102 + (72  - 102) * f)
        b = Math.round(241 + (153 - 241) * f)
        a = Math.round(200 + (230 - 200) * f)
      }

      d[idx]     = r
      d[idx + 1] = g
      d[idx + 2] = b
      d[idx + 3] = a
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}
