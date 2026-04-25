import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type GeoJSONSource,
  type ImageSource,
  type LngLatBoundsLike,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchEcoducts, type Ecoduct } from '../api/ecoducts'
import { bboxToCircle, fetchInaturalist } from '../api/occurrences'
import { fetchGbifRoadkills } from '../api/roadkills'
import { fetchPinchPoints, type PinchPoint } from '../api/pinchPoints'
import { fetchConnectivity, gridToCanvas } from '../api/connectivity'
import { fetchHabitatPatches, type HabitatPatch } from '../api/habitatPatches'
import { SPECIES, type Species } from '../api/technicalReport'

interface Props {
  species: Species
  bbox: string | null
  layers: { ecoducts: boolean; occurrences: boolean; roadkill: boolean; pinch: boolean; connectivity: boolean; patches: boolean }
  flyTo?: { lat: number; lng: number; zoom: number; _seq: number } | null
  onSpeciesChange: (s: Species) => void
  onBboxChange: (b: string | null) => void
  onLayerToggle: (key: keyof Props['layers']) => void
  onCounts: (counts: { occurrences: number; roadkill: number; pinch: number }) => void
  onRequestPlan: () => void
}

interface PointFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: Record<string, unknown>
}

const ECODUCTS_SRC     = 'src-ecoducts'
const OCC_SRC          = 'src-occurrences'
const RK_SRC           = 'src-roadkill'
const PINCH_SRC        = 'src-pinch'
const BBOX_SRC         = 'src-bbox'
const PATCHES_SRC      = 'src-patches'
const CONNECTIVITY_SRC = 'src-connectivity'
const NL_CENTER: [number, number] = [5.29, 52.13]
// 1×1 fully-transparent PNG — canvas guarantees RGBA with alpha=0
const BLANK_PNG = (() => { const c = document.createElement('canvas'); c.width = 1; c.height = 1; return c.toDataURL() })()

// ── helpers ──────────────────────────────────────────────────────────────────
function asFc(features: PointFeature[]) { return { type: 'FeatureCollection' as const, features } }
function emptyFc() { return asFc([]) }
function pointFeature(lng: number, lat: number, props: Record<string, unknown>): PointFeature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: props }
}
function bboxLine(bbox: string) {
  const [w, s, e, n] = bbox.split(',').map(Number)
  return { type: 'FeatureCollection' as const, features: [{
    type: 'Feature' as const, properties: {},
    geometry: { type: 'LineString' as const, coordinates: [[w,s],[e,s],[e,n],[w,n],[w,s]] },
  }] }
}
function humanType(t: string) { return t.replace(/_/g, ' ').toLowerCase() }

// ── popup HTML ────────────────────────────────────────────────────────────────
const esc = (v: unknown) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const row = (label: string, val: string) =>
  `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-top:1px solid #f3f4f6">` +
  `<span style="font-size:11px;color:#9ca3af">${label}</span>` +
  `<span style="font-size:11px;font-weight:600;color:#1f2937">${esc(val)}</span></div>`

function ecoductHtml(p: Record<string, string>): string {
  const t = p.type ?? ''
  const colorMap: Record<string,string> = { 'ecoduct':'#6366f1','wildlife underpass':'#8b5cf6','amphibian tunnel':'#06b6d4','small mammal culvert':'#0ea5e9' }
  const iconMap: Record<string,string>  = { 'ecoduct':'🌉','wildlife underpass':'🚇','amphibian tunnel':'🐸','small mammal culvert':'🐀' }
  const c = colorMap[t] ?? '#6366f1', icon = iconMap[t] ?? '🌿'
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:230px">` +
    `<div style="background:${c};padding:14px 16px;display:flex;align-items:center;gap:10px">` +
    `<span style="font-size:22px">${icon}</span><div style="min-width:0">` +
    `<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase">Infrastructure</div>` +
    `<div style="font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name ?? 'Ecoduct')}</div>` +
    `</div></div><div style="padding:12px 16px;background:#fff">` +
    `<span style="background:${c}1a;color:${c};font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:3px 9px;border-radius:20px;display:inline-block;margin-bottom:10px">${esc(t)}</span>` +
    (p.road ? row('Road', p.road) : '') +
    (p.species ? `<div style="padding:6px 0;border-top:1px solid #f3f4f6"><div style="font-size:10px;color:#9ca3af;margin-bottom:2px">Target species</div><div style="font-size:11px;color:#374151;font-style:italic">${esc(p.species)}</div></div>` : '') +
    `</div></div>`
  )
}

function pinchHtml(p: Record<string, string>): string {
  const score = parseFloat(p.score) || 0
  const pct = Math.round(score * 100)
  const barC = pct > 75 ? '#ef4444' : pct > 50 ? '#f97316' : pct > 25 ? '#f59e0b' : '#22c55e'
  const label = pct > 75 ? 'Critical' : pct > 50 ? 'High' : pct > 25 ? 'Moderate' : 'Low'
  const cover = (p.cover ?? '').toLowerCase()
  let fix = '🏗️ Small mammal culvert (€15k–€60k)'
  if (/motorway|highway/.test(cover))   fix = '🛣️ Ecoduct recommended (€2M–€8M)'
  else if (/trunk|primary|road/.test(cover)) fix = '🚇 Wildlife underpass (€200k–€800k)'
  else if (/agri|farm|crop/.test(cover)) fix = '🌾 Hedgerow planting (€8–15/m)'
  else if (/fence/.test(cover))          fix = '🔓 Fence modification / removal'
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:250px">` +
    `<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:14px 16px;display:flex;align-items:center;gap:10px">` +
    `<span style="font-size:22px">⚡</span><div>` +
    `<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.1em;text-transform:uppercase">Movement Bottleneck</div>` +
    `<div style="font-size:14px;font-weight:700;color:#fff">Critical Pinch Point</div>` +
    `</div></div><div style="padding:12px 16px;background:#fff">` +
    `<div style="margin-bottom:10px">` +
    `<div style="display:flex;justify-content:space-between;margin-bottom:5px">` +
    `<span style="font-size:11px;color:#6b7280">Bottleneck severity</span>` +
    `<span style="font-size:11px;font-weight:700;color:${barC}">${label} · ${pct}%</span></div>` +
    `<div style="background:#f3f4f6;border-radius:100px;height:7px;overflow:hidden">` +
    `<div style="background:${barC};width:${pct}%;height:100%;border-radius:100px"></div></div></div>` +
    (p.cover ? row('Land cover', p.cover) : '') +
    (p.between ? `<div style="padding:5px 0;border-top:1px solid #f3f4f6"><div style="font-size:10px;color:#9ca3af;margin-bottom:2px">Connects</div><div style="font-size:11px;color:#374151">${esc(p.between)}</div></div>` : '') +
    `<div style="margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;font-size:11px;color:#92400e;line-height:1.5">${fix}</div>` +
    `</div></div>`
  )
}

function patchHtml(p: Record<string, string>): string {
  const cMap: Record<string,string> = { SOURCE:'#22c55e', DESTINATION:'#3b82f6', STEPPING_STONE:'#a855f7' }
  const iMap: Record<string,string> = { SOURCE:'🌳', DESTINATION:'🎯', STEPPING_STONE:'🪨' }
  const tMap: Record<string,string> = { SOURCE:'Source Habitat', DESTINATION:'Destination', STEPPING_STONE:'Stepping Stone' }
  const dMap: Record<string,string> = {
    SOURCE: 'Population-rich habitat animals disperse from.',
    DESTINATION: 'Target habitat needing connectivity restored.',
    STEPPING_STONE: 'Intermediate patch facilitating movement.',
  }
  const kind = p.kind ?? 'SOURCE', c = cMap[kind] ?? '#22c55e'
  const q = Math.round((parseFloat(p.quality) || 0) * 100)
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:230px">` +
    `<div style="background:${c};padding:14px 16px;display:flex;align-items:center;gap:10px">` +
    `<span style="font-size:22px">${iMap[kind] ?? '🌿'}</span><div>` +
    `<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.1em;text-transform:uppercase">Habitat Patch</div>` +
    `<div style="font-size:14px;font-weight:700;color:#fff">${tMap[kind] ?? kind}</div>` +
    `</div></div><div style="padding:12px 16px;background:#fff">` +
    `<p style="font-size:11px;color:#6b7280;margin:0 0 8px;line-height:1.5">${dMap[kind] ?? ''}</p>` +
    (p.areaHa ? row('Area', `${parseFloat(p.areaHa).toFixed(1)} ha`) : '') +
    (p.cover ? row('Land cover', p.cover) : '') +
    `<div style="padding:6px 0;border-top:1px solid #f3f4f6">` +
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px">` +
    `<span style="font-size:11px;color:#9ca3af">Habitat quality</span>` +
    `<span style="font-size:11px;font-weight:600;color:${c}">${q}%</span></div>` +
    `<div style="background:#f3f4f6;border-radius:100px;height:5px;overflow:hidden">` +
    `<div style="background:${c};width:${q}%;height:100%;border-radius:100px"></div></div>` +
    `</div></div></div>`
  )
}

function roadkillDetailHtml(p: Record<string, string>): string {
  const d = p.date ? new Date(p.date).toLocaleDateString('en-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unknown'
  const sp = p.species ?? ''
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:240px">` +
    `<div style="background:linear-gradient(135deg,#7f1d1d,#991b1b,#b91c1c);padding:16px 16px 14px;position:relative;overflow:hidden">` +
    // subtle texture lines
    `<div style="position:absolute;inset:0;opacity:0.07;background:repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 8px)"></div>` +
    `<div style="position:relative;display:flex;align-items:center;gap:12px">` +
    `<span style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">💀</span>` +
    `<div>` +
    `<div style="font-size:9px;font-weight:700;color:rgba(255,200,200,0.8);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:2px">Road Mortality</div>` +
    `<div style="font-size:13px;font-weight:700;color:#fff;line-height:1.2">${sp ? esc(sp) : 'Unknown species'}</div>` +
    `</div></div>` +
    `</div>` +
    `<div style="padding:12px 14px;background:#fff">` +
    `<div style="display:flex;align-items:center;gap:8px;padding:6px 0">` +
    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><circle cx="12" cy="12" r="10" stroke="#9ca3af" stroke-width="1.8"/><path d="M12 6v6l4 2" stroke="#9ca3af" stroke-width="1.8" stroke-linecap="round"/></svg>` +
    `<span style="font-size:11px;color:#4b5563">${d}</span>` +
    `</div>` +
    `<div style="margin-top:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;font-size:10px;color:#991b1b;line-height:1.55">` +
    `<strong>Source:</strong> GBIF · Human observation · Netherlands` +
    `</div>` +
    `</div></div>`
  )
}

function tooltipHtml(isRoadkill: boolean, date: string): string {
  const d = date ? new Date(date).toLocaleDateString('en-NL', { day:'numeric', month:'short', year:'numeric' }) : 'Date unknown'
  return (
    `<div style="font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px;padding:1px 0">` +
    `<span style="font-size:18px;line-height:1">${isRoadkill ? '💀' : '🐾'}</span><div>` +
    `<div style="font-size:12px;font-weight:600;color:${isRoadkill ? '#e11d48' : '#0891b2'}">${isRoadkill ? 'Road mortality' : 'Species sighting'}</div>` +
    `<div style="font-size:10px;color:#9ca3af;margin-top:1px">${d}</div>` +
    `</div></div>`
  )
}

// ── component ─────────────────────────────────────────────────────────────────
export function DataMap(props: Props) {
  const { species, bbox, layers, flyTo, onBboxChange, onCounts } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const rafRef       = useRef<number | null>(null)
  const hoverPopRef  = useRef<maplibregl.Popup | null>(null)
  const [mapReady,        setMapReady]        = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [pendingCorner,   setPendingCorner]   = useState<[number, number] | null>(null)
  const [loadingCircuit,  setLoadingCircuit]  = useState(false)

  const speciesLatin = useMemo(() => SPECIES.find(s => s.value === species)?.latin ?? '', [species])
  const speciesLabel = useMemo(() => SPECIES.find(s => s.value === species)?.label ?? species, [species])

  // ── init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const NL_BOUNDS: LngLatBoundsLike = [[2.8, 50.4], [7.6, 53.85]]

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: NL_CENTER,
      zoom: 7.2, minZoom: 6.5, maxZoom: 15,
      maxBounds: NL_BOUNDS,
      attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right')

    m.on('load', () => {
      // ── sources ──
      m.addSource(ECODUCTS_SRC, { type: 'geojson', data: emptyFc() })
      m.addSource(OCC_SRC,  { type: 'geojson', data: emptyFc(), cluster: true, clusterMaxZoom: 11, clusterRadius: 45 })
      m.addSource(RK_SRC,   { type: 'geojson', data: emptyFc() })
      m.addSource(PINCH_SRC,   { type: 'geojson', data: emptyFc() })
      m.addSource(PATCHES_SRC, { type: 'geojson', data: emptyFc() })
      m.addSource(BBOX_SRC,    { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addSource(CONNECTIVITY_SRC, {
        type: 'image', url: BLANK_PNG,
        coordinates: [[3.2,53.6],[7.2,53.6],[7.2,50.7],[3.2,50.7]],
      })

      // ── connectivity heatmap (bottom layer) ──
      m.addLayer({ id: 'lyr-connectivity', type: 'raster', source: CONNECTIVITY_SRC,
        paint: { 'raster-opacity': 0.70, 'raster-resampling': 'linear' } })

      // ── bbox ──
      m.addLayer({ id: 'lyr-bbox-fill', type: 'fill', source: BBOX_SRC,
        paint: { 'fill-color': '#6366f1', 'fill-opacity': 0.05 } })
      m.addLayer({ id: 'lyr-bbox', type: 'line', source: BBOX_SRC,
        paint: { 'line-color': '#6366f1', 'line-width': 2, 'line-dasharray': [4, 4] } })

      // ── habitat patches ──
      m.addLayer({ id: 'lyr-patches-halo', type: 'circle', source: PATCHES_SRC, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 22, 12, 48],
        'circle-color': ['match', ['get', 'kind'], 'SOURCE','#22c55e','DESTINATION','#3b82f6','#a855f7'],
        'circle-opacity': 0.12, 'circle-stroke-width': 0,
      }})
      m.addLayer({ id: 'lyr-patches', type: 'circle', source: PATCHES_SRC, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 11, 12, 22],
        'circle-color': ['match', ['get', 'kind'], 'SOURCE','#22c55e','DESTINATION','#3b82f6','#a855f7'],
        'circle-opacity': 0.92, 'circle-stroke-width': 3, 'circle-stroke-color': '#fff',
      }})
      m.addLayer({ id: 'lyr-patches-label', type: 'symbol', source: PATCHES_SRC,
        layout: {
          'text-field': ['match', ['get', 'kind'], 'SOURCE', 'Source', 'DESTINATION', 'Dest.', 'Step'],
          'text-font': ['Noto Sans Bold', 'Noto Sans Regular'],
          'text-size': 10, 'text-offset': [0, 2.2], 'text-anchor': 'top',
        },
        paint: {
          'text-color': ['match', ['get', 'kind'], 'SOURCE','#15803d','DESTINATION','#1d4ed8','#7e22ce'],
          'text-halo-color': '#fff', 'text-halo-width': 1.5,
        },
      })

      // ── occurrences (clustered) ──
      m.addLayer({ id: 'lyr-occ-cluster', type: 'circle', source: OCC_SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#06b6d4', 'circle-opacity': 0.9,
          'circle-stroke-width': 3, 'circle-stroke-color': '#fff',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 40, 28],
        },
      })
      m.addLayer({ id: 'lyr-occ-cluster-label', type: 'symbol', source: OCC_SRC,
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 11,
          'text-font': ['Noto Sans Bold', 'Noto Sans Regular'] },
        paint: { 'text-color': '#fff' },
      })
      m.addLayer({ id: 'lyr-occurrences-halo', type: 'circle', source: OCC_SRC,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 12, 12, 24],
          'circle-color': '#06b6d4', 'circle-opacity': 0.14, 'circle-stroke-width': 0,
        },
      })
      m.addLayer({ id: 'lyr-occurrences', type: 'circle', source: OCC_SRC,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 12, 11],
          'circle-color': '#06b6d4', 'circle-opacity': 1,
          'circle-stroke-width': 3, 'circle-stroke-color': '#fff',
        },
      })

      // ── roadkill: blood-red heatmap (always visible) ──
      m.addLayer({
        id: 'lyr-rk-heat', type: 'heatmap', source: RK_SRC,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1.5, 12, 4.0],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,    'rgba(0,0,0,0)',
            0.08, 'rgba(80,0,0,0.35)',
            0.25, 'rgba(155,0,0,0.62)',
            0.50, 'rgba(205,15,10,0.80)',
            0.75, 'rgba(232,45,10,0.92)',
            1.0,  'rgba(255,140,0,1.0)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 22, 7, 34, 12, 55],
          'heatmap-opacity': 0.88,
        },
      })
      // ── roadkill: skull markers visible at all zooms ──
      m.addLayer({
        id: 'lyr-rk-skull', type: 'symbol', source: RK_SRC,
        layout: {
          'text-field': '💀',
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 9, 13, 14, 22],
          'text-allow-overlap': false,
          'text-font': ['Noto Sans Regular'],
        },
        paint: { 'text-opacity': 1 },
      })

      // ── ecoducts ──
      m.addLayer({ id: 'lyr-ecoducts-halo', type: 'circle', source: ECODUCTS_SRC, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 16, 12, 30],
        'circle-color': '#6366f1', 'circle-opacity': 0.14, 'circle-stroke-width': 0,
      }})
      m.addLayer({ id: 'lyr-ecoducts', type: 'circle', source: ECODUCTS_SRC, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 8, 12, 15],
        'circle-color': '#6366f1', 'circle-opacity': 1,
        'circle-stroke-width': 3, 'circle-stroke-color': '#fff',
      }})

      // ── pinch points ──
      m.addLayer({ id: 'lyr-pinch-halo', type: 'circle', source: PINCH_SRC, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 20, 12, 38],
        'circle-color': '#f59e0b', 'circle-opacity': 0.14, 'circle-stroke-width': 0,
      }})
      m.addLayer({ id: 'lyr-pinch', type: 'circle', source: PINCH_SRC, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 9, 12, 16],
        'circle-color': '#f59e0b', 'circle-opacity': 1,
        'circle-stroke-width': 3, 'circle-stroke-color': '#fff',
      }})

      // ── hover popup ──────────────────────────────────────────────────────
      const hoverPop = new maplibregl.Popup({
        closeButton: false, closeOnClick: false, offset: 12, maxWidth: '240px',
      })
      hoverPopRef.current = hoverPop

      const showHover = (isRoadkill: boolean, e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        hoverPop.setLngLat([lng, lat]).setHTML(tooltipHtml(isRoadkill, p.date ?? '')).addTo(m)
      }
      m.on('mousemove',  'lyr-occurrences', (e) => showHover(false, e))
      m.on('mouseleave', 'lyr-occurrences', ()  => hoverPop.remove())
      m.on('mousemove',  'lyr-rk-skull', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        hoverPop.setLngLat([lng, lat]).setHTML(tooltipHtml(true, p.date ?? '')).addTo(m)
      })
      m.on('mouseleave', 'lyr-rk-skull', () => hoverPop.remove())

      // ── click popups ─────────────────────────────────────────────────────
      const popup = (html: string, lngLat: [number, number]) =>
        new maplibregl.Popup({ closeButton: false, maxWidth: '260px', offset: 12 })
          .setLngLat(lngLat).setHTML(html).addTo(m)

      m.on('click', 'lyr-occurrences', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        hoverPop.remove()
        popup(tooltipHtml(false, p.date ?? ''), [lng, lat])
      })
      m.on('click', 'lyr-rk-skull', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        hoverPop.remove()
        popup(roadkillDetailHtml(p), [lng, lat])
      })
      m.on('click', 'lyr-ecoducts', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        popup(ecoductHtml(f.properties as Record<string, string>), [lng, lat])
      })
      m.on('click', 'lyr-pinch', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        popup(pinchHtml(f.properties as Record<string, string>), [lng, lat])
      })
      m.on('click', 'lyr-patches', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        popup(patchHtml(f.properties as Record<string, string>), [lng, lat])
      })

      // Cluster zoom-in
      const zoomCluster = (srcId: string, layerId: string) => {
        m.on('click', layerId, (e) => {
          const f = e.features?.[0]; if (!f) return
          const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
          ;(m.getSource(srcId) as GeoJSONSource).getClusterExpansionZoom(
            f.properties!.cluster_id as number,
            (err, zoom) => { if (!err) m.easeTo({ center: [lng, lat], zoom: zoom + 0.5 }) }
          )
        })
      }
      zoomCluster(OCC_SRC, 'lyr-occ-cluster')

      // ── cursors ──────────────────────────────────────────────────────────
      const pointerLayers = ['lyr-ecoducts','lyr-pinch','lyr-patches','lyr-occurrences',
                             'lyr-rk-skull','lyr-occ-cluster']
      pointerLayers.forEach(id => {
        m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', id, () => { m.getCanvas().style.cursor = '' })
      })

      // ── pulsing animation for pinch halos ────────────────────────────────
      let op = 0.12, dir = 1
      const pulse = () => {
        op += dir * 0.004
        if (op > 0.32) { op = 0.32; dir = -1 }
        if (op < 0.06) { op = 0.06; dir =  1 }
        if (m.getLayer('lyr-pinch-halo')) m.setPaintProperty('lyr-pinch-halo', 'circle-opacity', op)
        rafRef.current = requestAnimationFrame(pulse)
      }
      rafRef.current = requestAnimationFrame(pulse)

      setMapReady(true)
    })

    mapRef.current = m
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      hoverPopRef.current?.remove()
      m.remove()
      mapRef.current = null
    }
  }, [])

  // ── fly to programmatic target ───────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady || !flyTo) return
    m.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom, duration: 1100, essential: true })
  }, [mapReady, flyTo])

  // ── load ecoducts once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return
    let cancelled = false
    fetchEcoducts()
      .then((items: Ecoduct[]) => {
        if (cancelled) return
        const feats = items
          .filter(e => e.location && typeof e.location.lat === 'number')
          .map(e => pointFeature(e.location.lng, e.location.lat, {
            id: e.id, name: e.name, type: humanType(e.type),
            road: e.road ?? '', species: (e.speciesTarget ?? []).join(', '),
          }))
        ;(mapRef.current?.getSource(ECODUCTS_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
      })
      .catch((err: Error) => setError(err.message))
    return () => { cancelled = true }
  }, [mapReady])

  // ── layer visibility ─────────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    const vis = (on: boolean) => (on ? 'visible' : 'none') as 'visible' | 'none'
    m.setLayoutProperty('lyr-connectivity',     'visibility', vis(layers.connectivity))
    m.setLayoutProperty('lyr-patches-halo',     'visibility', vis(layers.patches))
    m.setLayoutProperty('lyr-patches',          'visibility', vis(layers.patches))
    m.setLayoutProperty('lyr-patches-label',    'visibility', vis(layers.patches))
    m.setLayoutProperty('lyr-ecoducts-halo',    'visibility', vis(layers.ecoducts))
    m.setLayoutProperty('lyr-ecoducts',         'visibility', vis(layers.ecoducts))
    m.setLayoutProperty('lyr-occ-cluster',      'visibility', vis(layers.occurrences))
    m.setLayoutProperty('lyr-occ-cluster-label','visibility', vis(layers.occurrences))
    m.setLayoutProperty('lyr-occurrences-halo', 'visibility', vis(layers.occurrences))
    m.setLayoutProperty('lyr-occurrences',      'visibility', vis(layers.occurrences))
    m.setLayoutProperty('lyr-rk-heat',  'visibility', vis(layers.roadkill))
    m.setLayoutProperty('lyr-rk-skull', 'visibility', vis(layers.roadkill))
    m.setLayoutProperty('lyr-pinch-halo',       'visibility', vis(layers.pinch))
    m.setLayoutProperty('lyr-pinch',            'visibility', vis(layers.pinch))
  }, [mapReady, layers])

  // ── fetch occurrences ────────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady || !speciesLatin) return
    let cancelled = false
    const target = bbox ? bboxToCircle(bbox) : viewportCircle(m)
    if (!target) return
    fetchInaturalist(speciesLatin, target.center, target.radiusKm, 80)
      .then(res => {
        if (cancelled) return
        const feats = res.results.filter(o => o.location)
          .map(o => pointFeature(o.location!.lng, o.location!.lat, { id: o.id, date: o.date ?? '', species: speciesLabel }))
        ;(m.getSource(OCC_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
        onCounts(p => ({ ...p, occurrences: res.total ?? feats.length }))
      })
      .catch((err: Error) => setError(err.message))
    return () => { cancelled = true }
  }, [mapReady, species, speciesLatin, speciesLabel, bbox, onCounts])

  // ── fetch roadkills from GBIF ─────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    let cancelled = false
    fetchGbifRoadkills(bbox, 300)
      .then(({ total, points }) => {
        if (cancelled) return
        const feats = points.map(p => pointFeature(p.lng, p.lat, { id: p.id, date: p.date ?? '', species: p.species ?? '' }))
        ;(m.getSource(RK_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
        onCounts(prev => ({ ...prev, roadkill: total }))
      })
      .catch((err: Error) => setError(err.message))
    return () => { cancelled = true }
  }, [mapReady, bbox, onCounts])

  // ── fetch pinch points ───────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    const effectiveBbox = bbox ?? viewportBbox(m)
    let cancelled = false
    fetchPinchPoints(species, effectiveBbox, 8)
      .then((pps: PinchPoint[]) => {
        if (cancelled) return
        const feats = pps.filter(p => p.location)
          .map(p => pointFeature(p.location.lng, p.location.lat, {
            id: p.id, score: p.bottleneckScore ?? 0,
            cover: p.dominantLandCoverAtPoint ?? '',
            between: Array.isArray(p.betweenPatches) ? p.betweenPatches.join(' ↔ ') : (p.betweenPatches ?? ''),
          }))
        ;(m.getSource(PINCH_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
      })
      .catch((err: Error) => setError(err.message))
    return () => { cancelled = true }
  }, [mapReady, species, bbox])

  // ── fetch connectivity grid ───────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    if (!bbox) {
      ;(m.getSource(CONNECTIVITY_SRC) as ImageSource | undefined)?.updateImage({
        url: BLANK_PNG, coordinates: [[3.2,53.6],[7.2,53.6],[7.2,50.7],[3.2,50.7]],
      })
      return
    }
    let cancelled = false
    setLoadingCircuit(true)
    fetchConnectivity(species, bbox)
      .then(result => {
        if (cancelled) return
        const canvas = gridToCanvas(result.currentDensityGrid, result.maxCurrentDensity)
        const [minLng, minLat, maxLng, maxLat] = result.bbox
        ;(m.getSource(CONNECTIVITY_SRC) as ImageSource | undefined)?.updateImage({
          url: canvas.toDataURL(),
          coordinates: [[minLng,maxLat],[maxLng,maxLat],[maxLng,minLat],[minLng,minLat]],
        })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => { if (!cancelled) setLoadingCircuit(false) })
    return () => { cancelled = true }
  }, [mapReady, species, bbox])

  // ── fetch habitat patches ────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    const effectiveBbox = bbox ?? viewportBbox(m)
    let cancelled = false
    fetchHabitatPatches(species, effectiveBbox)
      .then((patches: HabitatPatch[]) => {
        if (cancelled) return
        const feats = patches.filter(p => p.centroid)
          .map(p => pointFeature(p.centroid.lng, p.centroid.lat, {
            id: p.id, kind: p.kind, areaHa: p.areaHa,
            quality: p.habitatQuality, cover: p.dominantLandCover,
          }))
        ;(m.getSource(PATCHES_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
      })
      .catch((err: Error) => setError(err.message))
    return () => { cancelled = true }
  }, [mapReady, species, bbox])

  // ── two-click bbox capture ───────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    const handler = (e: MapMouseEvent) => {
      const blocked = m.queryRenderedFeatures(e.point, {
        layers: ['lyr-ecoducts','lyr-pinch','lyr-patches','lyr-occurrences','lyr-rk-skull','lyr-occ-cluster'],
      })
      if (blocked.length > 0) return
      const { lng, lat } = e.lngLat
      if (!pendingCorner) { setPendingCorner([lng, lat]); return }
      const [a0, a1] = pendingCorner
      const newBbox = `${Math.min(a0,lng).toFixed(4)},${Math.min(a1,lat).toFixed(4)},${Math.max(a0,lng).toFixed(4)},${Math.max(a1,lat).toFixed(4)}`
      setPendingCorner(null)
      onBboxChange(newBbox)
    }
    m.on('click', handler)
    return () => { m.off('click', handler) }
  }, [mapReady, pendingCorner, onBboxChange])

  // ── render bbox outline + fit view ──────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    const src = m.getSource(BBOX_SRC) as GeoJSONSource | undefined
    if (!bbox) { src?.setData({ type: 'FeatureCollection', features: [] }); return }
    src?.setData(bboxLine(bbox))
    const [w, s, e, n] = bbox.split(',').map(Number)
    m.fitBounds([[w,s],[e,n]], { padding: 60, duration: 500, maxZoom: 11 })
  }, [mapReady, bbox])

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        .maplibregl-popup-content {
          border-radius: 12px !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08) !important;
          border: none !important;
        }
        .maplibregl-popup-tip { display: none !important; }
        .maplibregl-popup-close-button { display: none !important; }
        .maplibregl-ctrl-group { border-radius: 10px !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important; }
      `}</style>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* pending corner toast */}
      {pendingCorner && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(99,102,241,0.3)', borderRadius: '100px',
          padding: '9px 22px', zIndex: 10, pointerEvents: 'none',
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 500, color: '#4338ca',
          boxShadow: '0 4px 20px rgba(99,102,241,0.18)',
          display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, boxShadow: '0 0 0 3px rgba(99,102,241,0.2)' }} />
          Click a second corner — circuit analysis runs automatically
        </div>
      )}

      {/* circuit loading indicator */}
      {loadingCircuit && (
        <div style={{
          position: 'absolute', top: 16, right: 60, zIndex: 10,
          background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(236,72,153,0.25)', borderRadius: '100px',
          padding: '7px 16px', pointerEvents: 'none',
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 500, color: '#be185d',
          boxShadow: '0 2px 12px rgba(236,72,153,0.15)',
          display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: '#ec4899', animation: 'wcPulse 1s ease-in-out infinite' }} />
          Running circuit analysis…
          <style>{`@keyframes wcPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }`}</style>
        </div>
      )}

      {/* error */}
      {error && (
        <div style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: '#fff1f2', border: '1.5px solid rgba(244,63,94,0.25)', borderRadius: '100px',
          padding: '8px 18px', zIndex: 10,
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', fontWeight: 500, color: '#e11d48',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

function viewportCircle(m: maplibregl.Map) {
  const c = m.getCenter(), b = m.getBounds()
  const dLat = (b.getNorth() - b.getSouth()) * 111
  const dLng = (b.getEast() - b.getWest()) * 111 * Math.cos(c.lat * Math.PI / 180)
  return { center: { lat: c.lat, lng: c.lng }, radiusKm: Math.round(Math.min(50, Math.max(2, 0.5 * Math.sqrt(dLat*dLat + dLng*dLng))) * 10) / 10 }
}

function viewportBbox(m: maplibregl.Map): string {
  const b = m.getBounds()
  return `${b.getWest().toFixed(3)},${b.getSouth().toFixed(3)},${b.getEast().toFixed(3)},${b.getNorth().toFixed(3)}`
}
