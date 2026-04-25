import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type GeoJSONSource,
  type ImageSource,
  type LngLatBoundsLike,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import ecoductPng from '../assets/ecoduct.png'
import tree2Png from '../assets/tree2.png'
import roadkillPng from '../assets/roadkill.png'
import toolboxPng from '../assets/toolbox.png'
import pawsPng from '../assets/paws.png'
import { fetchEcoducts, type Ecoduct } from '../api/ecoducts'
import { fetchInaturalistByPlace } from '../api/occurrences'
import { bboxToCircle, fetchInaturalist } from '../api/occurrences'
import { fetchGbifRoadkills } from '../api/roadkills'
import { fetchPinchPoints } from '../api/pinchPoints'
import { fetchConnectivity, gridToCanvas } from '../api/connectivity'
import { fetchHabitatPatches, type HabitatPatch } from '../api/habitatPatches'
import { SPECIES, type Species } from '../api/technicalReport'

interface Props {
  species: Species
  bbox: string | null
  layers: { ecoducts: boolean; occurrences: boolean; roadkill: boolean; pinch: boolean; connectivity: boolean; patches: boolean }
  flyTo?: { lat: number; lng: number; zoom: number; _seq: number } | null
  connectivityOpacity?: number
  onSpeciesChange: (s: Species) => void
  onBboxChange: (b: string | null) => void
  onLayerToggle: (key: keyof Props['layers']) => void
  onCounts: (counts: { occurrences: number; roadkill: number; pinch: number } | ((prev: { occurrences: number; roadkill: number; pinch: number }) => { occurrences: number; roadkill: number; pinch: number })) => void
  onRequestPlan: () => void
  reportMode?: boolean
  userReports?: Array<{ id: string; rtype: string; lat: number; lng: number; species: string }>
  onMapClick?: (lat: number, lng: number) => void
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
const REPORTS_SRC      = 'src-user-reports'

const NL_CENTER: [number, number] = [5.29, 52.13]
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
  `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-top:1px solid rgba(0,0,0,0.09)">` +
  `<span style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.45)">${label}</span>` +
  `<span style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#1a2818">${esc(val)}</span></div>`

const diagonalTexture = `<div style="position:absolute;inset:0;opacity:0.06;background:repeating-linear-gradient(-45deg,#f0eee6 0,#f0eee6 1px,transparent 1px,transparent 10px)"></div>`

function ecoductHtml(p: Record<string, string>): string {
  const t = p.type ?? ''
  const colorMap: Record<string,string> = {
    'ecoduct': '#2a4020',
    'wildlife underpass': '#2E6028',
    'amphibian tunnel': '#7C5A3C',
    'small mammal culvert': '#B87830',
  }
  const iconMap: Record<string,string> = {
    'ecoduct': '🌉',
    'wildlife underpass': '🚇',
    'amphibian tunnel': '🐸',
    'small mammal culvert': '🐀',
  }
  const c = colorMap[t] ?? '#2a4020'
  const icon = iconMap[t] ?? '🌿'
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:240px">` +
    `<div style="background:${c};padding:14px 16px 12px;position:relative;overflow:hidden">` +
    diagonalTexture +
    `<div style="position:relative;display:flex;align-items:center;gap:10px">` +
    `<span style="font-size:22px;line-height:1">${icon}</span>` +
    `<div style="min-width:0">` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:8px;color:rgba(240,238,230,0.55);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:3px">Infrastructure</div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:13px;font-weight:700;color:#f0eee6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:0.04em">${esc(p.name ?? 'Ecoduct')}</div>` +
    `</div></div></div>` +
    `<div style="padding:12px 16px 14px;background:#f0eee6">` +
    `<span style="background:rgba(42,64,32,0.1);color:${c};font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;padding:3px 8px;border-radius:2px;display:inline-block;margin-bottom:10px;border:1px solid rgba(42,64,32,0.15)">${esc(t) || 'unknown type'}</span>` +
    (p.road ? row('Road', p.road) : '') +
    (p.species
      ? `<div style="padding:7px 0;border-top:1px solid rgba(0,0,0,0.09)">` +
        `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.45);margin-bottom:4px">Target species</div>` +
        `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#1a2818;font-style:italic;line-height:1.5">${esc(p.species)}</div>` +
        `</div>`
      : '') +
    `</div></div>`
  )
}

function pinchHtml(p: Record<string, string>): string {
  const score = parseFloat(p.score) || 0
  const pct = Math.round(score * 100)
  const sev = pct > 75
    ? { label: 'Critical', color: '#7C5A3C' }
    : pct > 50
    ? { label: 'High', color: '#B87830' }
    : pct > 25
    ? { label: 'Moderate', color: '#C89040' }
    : { label: 'Low', color: '#2E6028' }
  const cover = (p.cover ?? '').toLowerCase()
  let fix = '🏗 Small mammal culvert (€15k–€60k)'
  if (/motorway|highway/.test(cover))        fix = '🛣 Ecoduct recommended (€2M–€8M)'
  else if (/trunk|primary|road/.test(cover)) fix = '🚇 Wildlife underpass (€200k–€800k)'
  else if (/agri|farm|crop/.test(cover))     fix = '🌾 Hedgerow planting (€8–15/m)'
  else if (/fence/.test(cover))              fix = '🔓 Fence modification / removal'
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:260px">` +
    `<div style="background:#1a2818;padding:14px 16px 12px;position:relative;overflow:hidden">` +
    diagonalTexture +
    `<div style="position:relative;display:flex;align-items:center;gap:10px">` +
    `<span style="font-size:22px;line-height:1">⚡</span>` +
    `<div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:8px;color:rgba(240,238,230,0.5);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:3px">Movement bottleneck</div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:13px;font-weight:700;color:#f0eee6;text-transform:uppercase;letter-spacing:0.04em">Pinch Point</div>` +
    `</div></div></div>` +
    `<div style="padding:12px 16px 14px;background:#f0eee6">` +
    `<div style="margin-bottom:12px">` +
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">` +
    `<span style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.45)">Bottleneck severity</span>` +
    `<span style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:${sev.color}">${sev.label} · ${pct}%</span>` +
    `</div>` +
    `<div style="background:rgba(0,0,0,0.09);border-radius:2px;height:5px;overflow:hidden">` +
    `<div style="background:${sev.color};width:${pct}%;height:100%;border-radius:2px"></div>` +
    `</div></div>` +
    (p.cover ? row('Land cover', p.cover) : '') +
    (p.between
      ? `<div style="padding:7px 0;border-top:1px solid rgba(0,0,0,0.09)">` +
        `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.45);margin-bottom:4px">Connects</div>` +
        `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#1a2818;line-height:1.5">${esc(p.between)}</div>` +
        `</div>`
      : '') +
    `<div style="margin-top:10px;background:rgba(184,120,48,0.08);border:1px solid rgba(184,120,48,0.2);border-radius:2px;padding:9px 11px">` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.38);margin-bottom:4px">Recommended fix</div>` +
    `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#7C5A3C;line-height:1.5;font-weight:500">${fix}</div>` +
    `</div>` +
    `</div></div>`
  )
}

function patchHtml(p: Record<string, string>): string {
  const cMap: Record<string,string> = { SOURCE: '#2E6028', DESTINATION: '#2a4020', STEPPING_STONE: '#B87830' }
  const iMap: Record<string,string> = { SOURCE: '🌳', DESTINATION: '🎯', STEPPING_STONE: '🪨' }
  const tMap: Record<string,string> = { SOURCE: 'Source Habitat', DESTINATION: 'Destination', STEPPING_STONE: 'Stepping Stone' }
  const dMap: Record<string,string> = {
    SOURCE: 'Population-rich habitat animals disperse from.',
    DESTINATION: 'Target habitat needing connectivity restored.',
    STEPPING_STONE: 'Intermediate patch facilitating movement.',
  }
  const kind = p.kind ?? 'SOURCE'
  const c = cMap[kind] ?? '#2E6028'
  const q = Math.round((parseFloat(p.quality) || 0) * 100)
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:240px">` +
    `<div style="background:${c};padding:14px 16px 12px;position:relative;overflow:hidden">` +
    diagonalTexture +
    `<div style="position:relative;display:flex;align-items:center;gap:10px">` +
    `<span style="font-size:22px;line-height:1">${iMap[kind] ?? '🌿'}</span>` +
    `<div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:8px;color:rgba(240,238,230,0.55);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:3px">Habitat Patch</div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:13px;font-weight:700;color:#f0eee6;text-transform:uppercase;letter-spacing:0.04em">${tMap[kind] ?? kind}</div>` +
    `</div></div></div>` +
    `<div style="padding:12px 16px 14px;background:#f0eee6">` +
    `<p style="font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(0,0,0,0.5);margin:0 0 10px;line-height:1.6;font-style:italic">${dMap[kind] ?? ''}</p>` +
    (p.areaHa ? row('Area', `${parseFloat(p.areaHa).toFixed(1)} ha`) : '') +
    (p.cover ? row('Land cover', p.cover) : '') +
    `<div style="padding:7px 0;border-top:1px solid rgba(0,0,0,0.09)">` +
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">` +
    `<span style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.45)">Habitat quality</span>` +
    `<span style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:${c}">${q}%</span>` +
    `</div>` +
    `<div style="background:rgba(0,0,0,0.09);border-radius:2px;height:4px;overflow:hidden">` +
    `<div style="background:${c};width:${q}%;height:100%;border-radius:2px"></div>` +
    `</div></div>` +
    `</div></div>`
  )
}

function roadkillDetailHtml(p: Record<string, string>): string {
  const d = p.date
    ? new Date(p.date).toLocaleDateString('en-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date unknown'
  const sp = p.species ?? ''
  return (
    `<div style="font-family:'DM Sans',sans-serif;width:240px">` +
    `<div style="background:#1a2818;padding:16px 16px 14px;position:relative;overflow:hidden">` +
    diagonalTexture +
    `<div style="position:relative;display:flex;align-items:center;gap:12px">` +
    `<span style="font-size:26px;line-height:1">🚗</span>` +
    `<div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:8px;color:rgba(240,238,230,0.5);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:3px">Road Mortality</div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:13px;font-weight:700;color:#f0eee6;text-transform:uppercase;letter-spacing:0.04em">${sp ? esc(sp) : 'Unknown species'}</div>` +
    `</div></div></div>` +
    `<div style="padding:12px 14px 14px;background:#f0eee6">` +
    `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.09)">` +
    `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;opacity:0.35"><circle cx="12" cy="12" r="10" stroke="#1a2818" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#1a2818" stroke-width="2" stroke-linecap="round"/></svg>` +
    `<span style="font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(0,0,0,0.65)">${d}</span>` +
    `</div>` +
    `<div style="margin-top:10px;background:rgba(124,90,60,0.07);border:1px solid rgba(124,90,60,0.15);border-radius:2px;padding:8px 10px">` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.38);margin-bottom:3px">Source</div>` +
    `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#7C5A3C;font-weight:500">iNaturalist · Human observation · Netherlands</div>` +
    `</div>` +
    `</div></div>`
  )
}

function tooltipHtml(isRoadkill: boolean, date: string): string {
  const d = date
    ? new Date(date).toLocaleDateString('en-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date unknown'
  const c = isRoadkill ? '#7C5A3C' : '#2a4020'
  return (
    `<div style="font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:9px;padding:2px 0">` +
    `<span style="font-size:16px;line-height:1">${isRoadkill ? '🚗' : '🐾'}</span>` +
    `<div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:11px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.06em">${isRoadkill ? 'Road mortality' : 'Species sighting'}</div>` +
    `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;color:rgba(0,0,0,0.4);margin-top:2px;letter-spacing:0.06em">${d}</div>` +
    `</div></div>`
  )
}

// ── component ─────────────────────────────────────────────────────────────────
export function DataMap(props: Props) {
  const { species, bbox, layers, flyTo, onBboxChange, onCounts } = props
  const containerRef  = useRef<HTMLDivElement | null>(null)
  const mapRef           = useRef<maplibregl.Map | null>(null)
  const rafRef           = useRef<number | null>(null)
  const hoverPopRef      = useRef<maplibregl.Popup | null>(null)
  const clickPopRef      = useRef<maplibregl.Popup | null>(null)
  const onBboxChangeRef  = useRef(onBboxChange)
  const isDrawingRef     = useRef(false)
  const drawStartRef     = useRef<[number, number] | null>(null)
  const reportModeRef    = useRef(false)
  const onMapClickRef    = useRef<((lat: number, lng: number) => void) | undefined>(undefined)
  const [mapReady,        setMapReady]       = useState(false)
  const [error,           setError]          = useState<string | null>(null)
  const [isDrawing,       setIsDrawing]      = useState(false)
  const [loadingCircuit,  setLoadingCircuit] = useState(false)
  const [loadingPinch,    setLoadingPinch]    = useState(false)
  const [pendingCorner,   setPendingCorner]   = useState<[number, number] | null>(null)

  const speciesLatin = useMemo(() => SPECIES.find(s => s.value === species)?.latin ?? '', [species])
  const speciesLabel = useMemo(() => SPECIES.find(s => s.value === species)?.label ?? species, [species])

  useEffect(() => { onBboxChangeRef.current = onBboxChange }, [onBboxChange])
  useEffect(() => { isDrawingRef.current = isDrawing }, [isDrawing])
  useEffect(() => { reportModeRef.current = !!props.reportMode }, [props.reportMode])
  useEffect(() => { onMapClickRef.current = props.onMapClick }, [props.onMapClick])

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
      // ── load icons ──
      const loadIcon = (name: string, src: string) => {
        const img = new Image()
        img.onload = () => { if (!m.hasImage(name)) m.addImage(name, img, { sdf: false }) }
        img.src = src
      }
      loadIcon('ecoduct-icon',  ecoductPng)
      loadIcon('habitat-icon',  tree2Png)
      loadIcon('roadkill-icon', roadkillPng)
      loadIcon('toolbox-icon',  toolboxPng)
      loadIcon('paws-icon',     pawsPng)

      // ── sources ──
      m.addSource(ECODUCTS_SRC,     { type: 'geojson', data: emptyFc() })
      m.addSource(OCC_SRC,          { type: 'geojson', data: emptyFc(), cluster: true, clusterMaxZoom: 11, clusterRadius: 45 })
      m.addSource(RK_SRC,           { type: 'geojson', data: emptyFc() })
      m.addSource(PINCH_SRC,        { type: 'geojson', data: emptyFc() })
      m.addSource(PATCHES_SRC,      { type: 'geojson', data: emptyFc() })
      m.addSource(BBOX_SRC,         { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addSource(CONNECTIVITY_SRC, {
        type: 'image', url: BLANK_PNG,
        coordinates: [[3.2,53.6],[7.2,53.6],[7.2,50.7],[3.2,50.7]],
      })
      m.addSource(REPORTS_SRC, { type: 'geojson', data: emptyFc() })

      // ── connectivity heatmap ──
      m.addLayer({ id: 'lyr-connectivity', type: 'raster', source: CONNECTIVITY_SRC,
        paint: { 'raster-opacity': 0.70, 'raster-resampling': 'linear' } })

      // ── user reports ──
      m.addLayer({
        id: 'lyr-user-reports', type: 'circle', source: REPORTS_SRC,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 12, 10],
          'circle-color': ['case',
            ['==', ['get', 'rtype'], 'roadkill'], '#c0392b',
            ['==', ['get', 'rtype'], 'crossing'], '#4a9e5c',
            '#B87830',
          ],
          'circle-opacity': 0.92,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#f0eee6',
          'circle-stroke-opacity': 1,
        },
      })

      // ── bbox ──
      m.addLayer({ id: 'lyr-bbox-fill', type: 'fill', source: BBOX_SRC,
        paint: { 'fill-color': '#2a4020', 'fill-opacity': 0.04 } })
      m.addLayer({ id: 'lyr-bbox', type: 'line', source: BBOX_SRC,
        paint: { 'line-color': '#2a4020', 'line-width': 1.5, 'line-dasharray': [5, 4] } })

      // ── habitat patches ──
      m.addLayer({ id: 'lyr-patches', type: 'symbol', source: PATCHES_SRC,
        layout: {
          'icon-image': 'habitat-icon',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.15, 10, 0.22, 14, 0.32],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'text-field': ['get', 'speciesLabel'],
          'text-font': ['Noto Sans Italic', 'Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 0.4],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'icon-opacity': 0.92,
          'text-color': '#2a4020',
          'text-halo-color': 'rgba(240,238,230,0.95)',
          'text-halo-width': 2,
        },
      })

      // ── occurrences (clustered) ──
      m.addLayer({ id: 'lyr-occ-cluster', type: 'symbol', source: OCC_SRC,
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': 'paws-icon',
          'icon-size': ['step', ['get', 'point_count'], 0.18, 10, 0.22, 40, 0.28],
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Bold', 'Noto Sans Regular'],
          'text-size': 10,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.1],
        },
        paint: {
          'icon-opacity': 0.95,
          'text-color': '#2a4020',
          'text-halo-color': '#f0eee6',
          'text-halo-width': 1.5,
        },
      })
      m.addLayer({ id: 'lyr-occ-cluster-label', type: 'symbol', source: OCC_SRC,
        filter: ['has', 'point_count'],
        layout: { 'text-field': '', 'text-font': ['Noto Sans Regular'] },
        paint: {},
      })
      m.addLayer({ id: 'lyr-occurrences', type: 'symbol', source: OCC_SRC,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'paws-icon',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.08, 10, 0.12, 14, 0.18],
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
        },
        paint: { 'icon-opacity': 0.95 },
      })

      // ── roadkill ──
      m.addLayer({
        id: 'lyr-rk-skull', type: 'symbol', source: RK_SRC,
        layout: {
          'icon-image': 'roadkill-icon',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.12, 9, 0.16, 14, 0.24],
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
        },
        paint: { 'icon-opacity': 0.9 },
      })

      // ── ecoducts ──
      m.addLayer({ id: 'lyr-ecoducts', type: 'symbol', source: ECODUCTS_SRC,
        layout: {
          'icon-image': 'ecoduct-icon',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.16, 10, 0.24, 14, 0.36],
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
        },
        paint: { 'icon-opacity': 1 },
      })

      // ── pinch points ──
      m.addLayer({ id: 'lyr-pinch', type: 'symbol', source: PINCH_SRC,
        layout: {
          'icon-image': 'toolbox-icon',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.14, 10, 0.20, 14, 0.28],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
        paint: { 'icon-opacity': 0.95 },
      })

      // ── hover popup ──────────────────────────────────────────────────────
      const hoverPop = new maplibregl.Popup({
        closeButton: false, closeOnClick: false, offset: 14, maxWidth: '240px',
      })
      hoverPopRef.current = hoverPop

      // ── click popup helper ────────────────────────────────────────────────
      const openPopup = (html: string, lng: number, lat: number) => {
        clickPopRef.current?.remove()
        hoverPop.remove()
        const pop = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '280px',
          offset: 30,
          className: 'wc-popup',
        })
          .setLngLat([lng, lat])
          .setHTML(html)
          .addTo(m)
        pop.on('close', () => { clickPopRef.current = null })
        clickPopRef.current = pop
      }

      // ── hover tooltips ────────────────────────────────────────────────────
      m.on('mousemove', 'lyr-occurrences', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        hoverPop.setLngLat([lng, lat]).setHTML(tooltipHtml(false, p.date ?? '')).addTo(m)
      })
      m.on('mouseleave', 'lyr-occurrences', () => hoverPop.remove())

      m.on('mousemove', 'lyr-rk-skull', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        hoverPop.setLngLat([lng, lat]).setHTML(tooltipHtml(true, p.date ?? '')).addTo(m)
      })
      m.on('mouseleave', 'lyr-rk-skull', () => hoverPop.remove())

      // ── click popups ──────────────────────────────────────────────────────
      m.on('click', 'lyr-occurrences', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        openPopup(tooltipHtml(false, p.date ?? ''), lng, lat)
      })
      m.on('click', 'lyr-rk-skull', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        openPopup(roadkillDetailHtml(p), lng, lat)
      })
      m.on('click', 'lyr-ecoducts', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        openPopup(ecoductHtml(f.properties as Record<string, string>), lng, lat)
      })
      m.on('click', 'lyr-pinch', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        openPopup(pinchHtml(f.properties as Record<string, string>), lng, lat)
      })
      m.on('click', 'lyr-patches', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        openPopup(patchHtml(f.properties as Record<string, string>), lng, lat)
      })

      // ── cluster zoom-in ───────────────────────────────────────────────────
      m.on('click', 'lyr-occ-cluster', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        ;(m.getSource(OCC_SRC) as GeoJSONSource).getClusterExpansionZoom(
          f.properties!.cluster_id as number
        ).then(zoom => { m.easeTo({ center: [lng, lat], zoom: zoom + 0.5 }) })
      })

      // ── report mode click ─────────────────────────────────────────────────
      m.on('click', (e: MapMouseEvent) => {
        if (!reportModeRef.current) return
        const blocked = m.queryRenderedFeatures(e.point, {
          layers: ['lyr-ecoducts','lyr-pinch','lyr-patches','lyr-occurrences','lyr-rk-skull','lyr-occ-cluster'],
        })
        if (blocked.length > 0) return
        onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng)
      })

      // ── drag-to-draw bbox ─────────────────────────────────────────────────
      m.on('mousedown', (e: MapMouseEvent) => {
        if (!isDrawingRef.current) return
        if (reportModeRef.current) return
        const blocked = m.queryRenderedFeatures(e.point, {
          layers: ['lyr-ecoducts','lyr-pinch','lyr-patches','lyr-occurrences','lyr-rk-skull','lyr-occ-cluster'],
        })
        if (blocked.length > 0) return
        e.preventDefault()
        drawStartRef.current = [e.lngLat.lng, e.lngLat.lat]
        m.dragPan.disable()
      })
      m.on('mousemove', (e: MapMouseEvent) => {
        if (!isDrawingRef.current || !drawStartRef.current) return
        const [a0, a1] = drawStartRef.current
        const { lng, lat } = e.lngLat
        if (Math.abs(a0 - lng) > 0.0001 || Math.abs(a1 - lat) > 0.0001) {
          const live = `${Math.min(a0,lng)},${Math.min(a1,lat)},${Math.max(a0,lng)},${Math.max(a1,lat)}`
          ;(m.getSource(BBOX_SRC) as GeoJSONSource | undefined)?.setData(bboxLine(live))
        }
      })
      m.on('mouseup', (e: MapMouseEvent) => {
        if (!isDrawingRef.current || !drawStartRef.current) return
        const [a0, a1] = drawStartRef.current
        const { lng, lat } = e.lngLat
        drawStartRef.current = null
        m.dragPan.enable()
        setIsDrawing(false)
        if (Math.abs(a0 - lng) > 0.001 || Math.abs(a1 - lat) > 0.001) {
          const newBbox = `${Math.min(a0,lng).toFixed(4)},${Math.min(a1,lat).toFixed(4)},${Math.max(a0,lng).toFixed(4)},${Math.max(a1,lat).toFixed(4)}`
          onBboxChangeRef.current(newBbox)
        }
        openPopup(patchHtml(f.properties as Record<string, string>), lng, lat)
      })

      // ── cluster zoom-in ───────────────────────────────────────────────────
      m.on('click', 'lyr-occ-cluster', (e) => {
        const f = e.features?.[0]; if (!f) return
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        ;(m.getSource(OCC_SRC) as GeoJSONSource).getClusterExpansionZoom(
          f.properties!.cluster_id as number
        ).then(zoom => { m.easeTo({ center: [lng, lat], zoom: zoom + 0.5 }) })
      })

      // ── drag-to-draw bbox ─────────────────────────────────────────────────
      m.on('mousedown', (e: MapMouseEvent) => {
        if (!isDrawingRef.current) return
        const blocked = m.queryRenderedFeatures(e.point, {
          layers: ['lyr-ecoducts','lyr-pinch','lyr-patches','lyr-occurrences','lyr-rk-skull','lyr-occ-cluster'],
        })
        if (blocked.length > 0) return
        e.preventDefault()
        drawStartRef.current = [e.lngLat.lng, e.lngLat.lat]
        m.dragPan.disable()
      })
      m.on('mousemove', (e: MapMouseEvent) => {
        if (!isDrawingRef.current || !drawStartRef.current) return
        const [a0, a1] = drawStartRef.current
        const { lng, lat } = e.lngLat
        if (Math.abs(a0 - lng) > 0.0001 || Math.abs(a1 - lat) > 0.0001) {
          const live = `${Math.min(a0,lng)},${Math.min(a1,lat)},${Math.max(a0,lng)},${Math.max(a1,lat)}`
          ;(m.getSource(BBOX_SRC) as GeoJSONSource | undefined)?.setData(bboxLine(live))
        }
      })
      m.on('mouseup', (e: MapMouseEvent) => {
        if (!isDrawingRef.current || !drawStartRef.current) return
        const [a0, a1] = drawStartRef.current
        const { lng, lat } = e.lngLat
        drawStartRef.current = null
        m.dragPan.enable()
        setIsDrawing(false)
        if (Math.abs(a0 - lng) > 0.001 || Math.abs(a1 - lat) > 0.001) {
          const newBbox = `${Math.min(a0,lng).toFixed(4)},${Math.min(a1,lat).toFixed(4)},${Math.max(a0,lng).toFixed(4)},${Math.max(a1,lat).toFixed(4)}`
          onBboxChangeRef.current(newBbox)
        }
      })
      // ── user report hover tooltips ────────────────────────────────────────
      m.on('mousemove', 'lyr-user-reports', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties as Record<string, string>
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        const typeMap: Record<string,string> = { roadkill: 'Road-kill report', crossing: 'New crossing', observation: 'Observation' }
        const colorMap: Record<string,string> = { roadkill: '#7C5A3C', crossing: '#2a4020', observation: '#B87830' }
        const c = colorMap[p.rtype] ?? '#2a4020'
        hoverPop.setLngLat([lng, lat]).setHTML(
          `<div style="font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:9px;padding:2px 0">` +
          `<div>` +
          `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:11px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.06em">${typeMap[p.rtype] ?? 'Community report'}</div>` +
          `<div style="font-family:'Futura','Trebuchet MS','Century Gothic',sans-serif;font-size:9px;color:rgba(0,0,0,0.4);margin-top:2px;letter-spacing:0.05em">Community · ${p.species && p.species !== 'unknown' ? p.species : 'Species unknown'}</div>` +
          `</div></div>`
        ).addTo(m)
      })
      m.on('mouseleave', 'lyr-user-reports', () => hoverPop.remove())

      // ── cursors ───────────────────────────────────────────────────────────
      const pointerLayers = ['lyr-ecoducts','lyr-pinch','lyr-patches','lyr-occurrences',
                             'lyr-rk-skull','lyr-occ-cluster','lyr-user-reports']
      pointerLayers.forEach(id => {
        m.on('mouseenter', id, () => { if (!isDrawingRef.current) m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', id, () => { if (!isDrawingRef.current) m.getCanvas().style.cursor = '' })
      })

      setMapReady(true)
    })

    mapRef.current = m
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      hoverPopRef.current?.remove()
      clickPopRef.current?.remove()
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

  // ── connectivity layer opacity ────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    m.setPaintProperty('lyr-connectivity', 'raster-opacity', props.connectivityOpacity ?? 0.70)
  }, [mapReady, props.connectivityOpacity])

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
    m.setLayoutProperty('lyr-connectivity',      'visibility', vis(layers.connectivity))
    m.setLayoutProperty('lyr-patches',            'visibility', vis(layers.patches))
    m.setLayoutProperty('lyr-ecoducts',           'visibility', vis(layers.ecoducts))
    m.setLayoutProperty('lyr-occ-cluster',       'visibility', vis(layers.occurrences))
    m.setLayoutProperty('lyr-occ-cluster-label', 'visibility', vis(layers.occurrences))
    m.setLayoutProperty('lyr-occurrences',       'visibility', vis(layers.occurrences))
    m.setLayoutProperty('lyr-rk-skull',          'visibility', vis(layers.roadkill))
    m.setLayoutProperty('lyr-pinch',              'visibility', vis(layers.pinch))
  }, [mapReady, layers])

  // ── fetch occurrences ────────────────────────────────────────────────────
  // Always NL-wide via iNat place_id (7506); bbox is for corridor analysis, not
  // for narrowing context overlays. Matches the roadkill behaviour.
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady || !speciesLatin) return
    let cancelled = false
    const timer = setTimeout(() => {
      const target = bbox ? bboxToCircle(bbox) : viewportCircle(m)
      if (!target || cancelled) return
      fetchInaturalistByPlace(speciesLatin, 7506, 80)
          .then(res => {
            if (cancelled) return
            const feats = res.results.filter(o => o.location)
                .map(o => pointFeature(o.location!.lng, o.location!.lat, {
                  id: o.id,
                  date: o.date ?? '',
                  species: speciesLabel
                }))
            ;(m.getSource(OCC_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
            onCounts(p => ({...p, occurrences: res.total ?? feats.length}))
          })
          .catch((err: Error) => setError(err.message))
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [mapReady, species, speciesLatin, speciesLabel, bbox, onCounts])

  // ── fetch roadkills from GBIF ─────────────────────────────────────────────
  // Roadkills are NL-wide context for spotting pinch-point clusters; we don't narrow
  // them to the selected bbox (otherwise they disappear when you zoom into a small area).
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      // const effectiveBbox = bbox ?? viewportBbox(m)
      fetchGbifRoadkills(null, 300)
        .then(({ total, points }) => {
          if (cancelled) return
          const feats = points.map(p => pointFeature(p.lng, p.lat, { id: p.id, date: p.date ?? '', species: p.species ?? '' }))
          ;(m.getSource(RK_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
          onCounts(prev => ({ ...prev, roadkill: total }))
        })
        .catch((err: Error) => setError(err.message))
    }, 600)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [mapReady, bbox, onCounts])

  // ── fetch pinch points ───────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    if (!bbox) {
      ;(m.getSource(PINCH_SRC) as GeoJSONSource | undefined)?.setData(emptyFc())
      onCounts(prev => ({ ...prev, pinch: 0 }))
      return
    }
    let cancelled = false
    setLoadingPinch(true)
    const timer = setTimeout(() => {
      if (cancelled) return
      setLoadingPinch(true)
      fetchPinchPoints(species, bbox, 8)
          .then(resp => {
            if (cancelled) return
            const effectiveBbox = bbox ?? viewportBbox(m)
            fetchPinchPoints(species, effectiveBbox, 8)
            const pps = resp.pinchPoints ?? []
            const feats = pps.filter(p => p.location)
                .map(p => pointFeature(p.location.lng, p.location.lat, {
                  id: p.id, score: p.bottleneckScore ?? 0,
                  cover: p.dominantLandCoverAtPoint ?? '',
                  between: Array.isArray(p.betweenPatches) ? p.betweenPatches.join(' ↔ ') : (p.betweenPatches ?? ''),
                  coords: `${p.location.lat.toFixed(4)}, ${p.location.lng.toFixed(4)}`,
                }))
            ;(m.getSource(PINCH_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
            onCounts(prev => ({...prev, pinch: feats.length}))
            if (feats.length === 0) {
              if (resp.status === 'INSUFFICIENT_HABITAT') {
                setError('No bottlenecks: this area has too little ' + species + ' habitat. Pick a larger region or a species with broader range.')
              } else {
                setError('No bottlenecks above threshold in this area. Try a larger bbox.')
              }
            }
          })
          .catch((err: Error) => setError(err.message))
          .finally(() => {
            if (!cancelled) setLoadingPinch(false)
          })
    }, 800)
    return () => { cancelled = true; clearTimeout(timer) }
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
    const timer = setTimeout(() => {
      if (cancelled) return
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
    }, 600)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [mapReady, species, bbox])

  // ── fetch habitat patches ────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    if (!bbox) {
      ;(m.getSource(PATCHES_SRC) as GeoJSONSource | undefined)?.setData(emptyFc())
      return
    }
    const effectiveBbox = bbox ?? viewportBbox(m)
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
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
    }, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [mapReady, species, bbox])

  // ── drawing mode: cursor + dragPan ───────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    m.getCanvas().style.cursor = isDrawing ? 'crosshair' : ''
    if (!isDrawing) { drawStartRef.current = null; m.dragPan.enable() }
  }, [isDrawing])

  // ── report mode cursor ───────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    if (props.reportMode) m.getCanvas().style.cursor = 'crosshair'
    else if (!isDrawing) m.getCanvas().style.cursor = ''
  }, [props.reportMode, isDrawing])

  // ── sync user reports to map ─────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current; if (!m || !mapReady) return
    const feats = (props.userReports ?? []).map(r => pointFeature(r.lng, r.lat, {
      id: r.id, rtype: r.rtype, species: r.species,
    }))
    ;(m.getSource(REPORTS_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
  }, [mapReady, props.userReports])

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
        /* ── popup container ── */
        .maplibregl-popup-content {
          border-radius: 4px !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 16px 48px rgba(26,40,24,0.18), 0 4px 16px rgba(0,0,0,0.10) !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          background: #f0eee6 !important;
        }
        .maplibregl-popup-tip { display: none !important; }

        /* ── hover popup (tooltip) ── */
        .maplibregl-popup:not(.wc-popup) .maplibregl-popup-content {
          padding: 9px 14px !important;
          background: rgba(240,238,230,0.97) !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 3px !important;
          box-shadow: 0 4px 18px rgba(26,40,24,0.14), 0 1px 4px rgba(0,0,0,0.07) !important;
        }

        /* ── close button ── */
        .wc-popup .maplibregl-popup-close-button {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 22px !important;
          height: 22px !important;
          top: 7px !important;
          right: 7px !important;
          font-size: 15px !important;
          line-height: 1 !important;
          color: rgba(240,238,230,0.65) !important;
          background: rgba(255,255,255,0.1) !important;
          border-radius: 2px !important;
          border: none !important;
          cursor: pointer !important;
          z-index: 2 !important;
          transition: background 0.2s, color 0.2s !important;
        }
        .wc-popup .maplibregl-popup-close-button:hover {
          color: #f0eee6 !important;
          background: rgba(255,255,255,0.22) !important;
        }

        /* ── nav controls ── */
        .maplibregl-ctrl-group {
          border-radius: 3px !important;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(26,40,24,0.14) !important;
          border: 1px solid rgba(0,0,0,0.09) !important;
        }
        .maplibregl-ctrl-group button {
          background: #f0eee6 !important;
        }
        .maplibregl-ctrl-group button:hover {
          background: #e8e6de !important;
        }
      `}</style>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* draw mode hint */}
      {isDrawing && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(26,40,24,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px',
          padding: '9px 22px', zIndex: 10, pointerEvents: 'none',
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 500, color: '#f0eee6',
          boxShadow: '0 4px 18px rgba(26,40,24,0.18)',
          display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap',
        }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="12" height="12" rx="1" stroke="rgba(240,238,230,0.6)" strokeWidth="1.5" strokeDasharray="3 2"/>
          </svg>
          Drag on the map to draw your analysis region
        </div>
      )}

      {/* draw region / clear region buttons */}
      <div style={{
        position: 'absolute', bottom: 32, right: 16, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end',
      }}>
        <button
          onClick={() => setIsDrawing(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px',
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.54rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: isDrawing ? '#f0eee6' : '#1a2818',
            background: isDrawing ? '#1a2818' : 'rgba(240,238,230,0.97)',
            border: isDrawing ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
            borderRadius: '2px', cursor: 'pointer',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.18s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="1"
              stroke={isDrawing ? 'rgba(240,238,230,0.7)' : 'rgba(42,64,32,0.7)'}
              strokeWidth="1.5" strokeDasharray="3 2"/>
          </svg>
          {isDrawing ? 'Cancel draw' : 'Draw region'}
        </button>
        {props.bbox && !isDrawing && (
          <button
            onClick={() => props.onBboxChange(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 12px',
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.45)',
              background: 'rgba(240,238,230,0.9)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '2px', cursor: 'pointer',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            }}
          >
            ✕ Clear region
          </button>
        )}
      </div>

      {/* loading spinner — centered over the map while pinch / connectivity solve runs */}
      {(loadingCircuit || loadingPinch) && (
      {/* draw region / clear region buttons */}
      <div style={{
        position: 'absolute', bottom: 32, right: 16, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end',
      }}>
        <button
          onClick={() => setIsDrawing(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px',
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: '0.54rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: isDrawing ? '#f0eee6' : '#1a2818',
            background: isDrawing ? '#1a2818' : 'rgba(240,238,230,0.97)',
            border: isDrawing ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
            borderRadius: '2px', cursor: 'pointer',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.18s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="1"
              stroke={isDrawing ? 'rgba(240,238,230,0.7)' : 'rgba(42,64,32,0.7)'}
              strokeWidth="1.5" strokeDasharray="3 2"/>
          </svg>
          {isDrawing ? 'Cancel draw' : 'Draw region'}
        </button>
        {props.bbox && !isDrawing && (
          <button
            onClick={() => props.onBboxChange(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 12px',
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.45)',
              background: 'rgba(240,238,230,0.9)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '2px', cursor: 'pointer',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            }}
          >
            ✕ Clear region
          </button>
        )}
      </div>

      {/* circuit loading indicator */}
      {loadingCircuit && (
        <div style={{
          position: 'absolute', top: 16, right: 60, zIndex: 10,
          background: 'rgba(240,238,230,0.97)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.09)', borderRadius: '2px',
          padding: '7px 16px', pointerEvents: 'none',
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 500, color: '#2a4020',
          boxShadow: '0 2px 12px rgba(26,40,24,0.1)',
          display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: '#2a4020', animation: 'wcPulse 1s ease-in-out infinite' }} />
          Running circuit analysis…
          <style>{`@keyframes wcPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.65)} }`}</style>
        </div>
      )}

      {/* error */}
      {error && (
        <div style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(240,238,230,0.97)', border: '1px solid rgba(124,90,60,0.2)', borderRadius: '2px',
          padding: '8px 18px', zIndex: 10,
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', fontWeight: 500, color: '#7C5A3C',
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
