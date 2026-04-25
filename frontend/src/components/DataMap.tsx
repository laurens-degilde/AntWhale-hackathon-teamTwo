import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchEcoducts, type Ecoduct } from '../api/ecoducts'
import { bboxToCircle, fetchInaturalist, type Occurrence } from '../api/occurrences'
import { fetchRoadkills } from '../api/roadkills'
import { fetchPinchPoints, type PinchPoint } from '../api/pinchPoints'
import { REGION_PRESETS, SPECIES, type Species } from '../api/technicalReport'

interface Props {
  species: Species
  bbox: string | null
  layers: { ecoducts: boolean; occurrences: boolean; roadkill: boolean; pinch: boolean }
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

const ECODUCTS_SRC = 'src-ecoducts'
const OCC_SRC = 'src-occurrences'
const RK_SRC = 'src-roadkill'
const PINCH_SRC = 'src-pinch'
const BBOX_SRC = 'src-bbox'

const NL_CENTER: [number, number] = [5.29, 52.13]

function asFc(features: PointFeature[]) {
  return { type: 'FeatureCollection' as const, features }
}

function emptyFc() {
  return asFc([])
}

function pointFeature(lng: number, lat: number, props: Record<string, unknown>): PointFeature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: props }
}

function bboxLine(bbox: string) {
  const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number)
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [minLng, minLat], [maxLng, minLat],
            [maxLng, maxLat], [minLng, maxLat],
            [minLng, minLat],
          ],
        },
      },
    ],
  }
}

export function DataMap(props: Props) {
  const { species, bbox, layers, onSpeciesChange, onBboxChange, onLayerToggle, onCounts, onRequestPlan } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingCorner, setPendingCorner] = useState<[number, number] | null>(null)

  const speciesLatin = useMemo(() => SPECIES.find((s) => s.value === species)?.latin ?? '', [species])

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: NL_CENTER,
      zoom: 7,
      attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right')

    m.on('load', () => {
      m.addSource(ECODUCTS_SRC, { type: 'geojson', data: emptyFc() })
      m.addSource(OCC_SRC,      { type: 'geojson', data: emptyFc() })
      m.addSource(RK_SRC,       { type: 'geojson', data: emptyFc() })
      m.addSource(PINCH_SRC,    { type: 'geojson', data: emptyFc() })
      m.addSource(BBOX_SRC,     { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

      m.addLayer({
        id: 'lyr-occurrences', type: 'circle', source: OCC_SRC,
        paint: {
          'circle-radius': 4,
          'circle-color': '#16a34a',
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffffaa',
        },
      })
      m.addLayer({
        id: 'lyr-roadkill', type: 'circle', source: RK_SRC,
        paint: {
          'circle-radius': 5,
          'circle-color': '#dc2626',
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fee2e2',
        },
      })
      m.addLayer({
        id: 'lyr-ecoducts', type: 'circle', source: ECODUCTS_SRC,
        paint: {
          'circle-radius': 7,
          'circle-color': '#4338ca',
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#e0e7ff',
        },
      })
      m.addLayer({
        id: 'lyr-pinch', type: 'circle', source: PINCH_SRC,
        paint: {
          'circle-radius': 9,
          'circle-color': '#f97316',
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#7c2d12',
        },
      })
      m.addLayer({
        id: 'lyr-bbox', type: 'line', source: BBOX_SRC,
        paint: { 'line-color': '#0f172a', 'line-width': 2, 'line-dasharray': [2, 2] },
      })

      m.on('click', 'lyr-ecoducts', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as Record<string, string>
        const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const html =
          `<strong>${safe(p.name ?? '')}</strong><br/>` +
          `<span style="color:#4338ca;text-transform:lowercase;">${safe(p.type ?? '')}</span>` +
          (p.road ? ` · ${safe(p.road)}` : '') +
          (p.species ? `<br/><small>${safe(p.species)}</small>` : '')
        const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates
        new maplibregl.Popup({ closeButton: true }).setLngLat([lng, lat]).setHTML(html).addTo(m)
      })
      m.on('mouseenter', 'lyr-ecoducts', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'lyr-ecoducts', () => { m.getCanvas().style.cursor = '' })

      setMapReady(true)
    })

    mapRef.current = m
    return () => {
      m.remove()
      mapRef.current = null
    }
  }, [])

  // Load ecoducts once.
  useEffect(() => {
    if (!mapReady) return
    let cancelled = false
    fetchEcoducts()
      .then((items: Ecoduct[]) => {
        if (cancelled) return
        const feats = items
          .filter((e) => e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number')
          .map((e) => pointFeature(e.location.lng, e.location.lat, {
            id: e.id,
            name: e.name,
            type: humanType(e.type),
            road: e.road ?? '',
            species: (e.speciesTarget ?? []).join(', '),
          }))
        const src = mapRef.current?.getSource(ECODUCTS_SRC) as GeoJSONSource | undefined
        src?.setData(asFc(feats))
      })
      .catch((err: Error) => setError(err.message))
    return () => { cancelled = true }
  }, [mapReady])

  // Toggle layer visibility.
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    m.setLayoutProperty('lyr-ecoducts',    'visibility', layers.ecoducts ? 'visible' : 'none')
    m.setLayoutProperty('lyr-occurrences', 'visibility', layers.occurrences ? 'visible' : 'none')
    m.setLayoutProperty('lyr-roadkill',    'visibility', layers.roadkill ? 'visible' : 'none')
    m.setLayoutProperty('lyr-pinch',       'visibility', layers.pinch ? 'visible' : 'none')
  }, [mapReady, layers])

  // Refetch occurrences + roadkill on species/bbox change.
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady || !speciesLatin) return
    let cancelled = false
    const refetch = async () => {
      try {
        const target = bbox ? bboxToCircle(bbox) : viewportCircle(m)
        if (!target) return
        const [occRes, rkRes] = await Promise.all([
          fetchInaturalist(speciesLatin, target.center, target.radiusKm, 80).catch(() => ({ total: 0, results: [] as Occurrence[] })),
          fetchRoadkills(speciesLatin, target.center, target.radiusKm, 80).catch(() => ({ total: 0, results: [] as Occurrence[] })),
        ])
        if (cancelled) return
        const occFeats = occRes.results
          .filter((o) => o.location)
          .map((o) => pointFeature(o.location!.lng, o.location!.lat, { id: o.id, date: o.date ?? '' }))
        const rkFeats = rkRes.results
          .filter((o) => o.location)
          .map((o) => pointFeature(o.location!.lng, o.location!.lat, { id: o.id, date: o.date ?? '' }))
        ;(m.getSource(OCC_SRC) as GeoJSONSource | undefined)?.setData(asFc(occFeats))
        ;(m.getSource(RK_SRC) as GeoJSONSource | undefined)?.setData(asFc(rkFeats))
        onCounts({ occurrences: occRes.total ?? occFeats.length, roadkill: rkRes.total ?? rkFeats.length, pinch: 0 })
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    }
    refetch()
    return () => { cancelled = true }
  }, [mapReady, species, speciesLatin, bbox, onCounts])

  // Pinch points fetched only when bbox is set.
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    if (!bbox) {
      const src = m.getSource(PINCH_SRC) as GeoJSONSource | undefined
      src?.setData(emptyFc())
      return
    }
    let cancelled = false
    fetchPinchPoints(species, bbox, 8)
      .then((pps: PinchPoint[]) => {
        if (cancelled) return
        const feats = pps
          .filter((p) => p.location)
          .map((p) => pointFeature(p.location.lng, p.location.lat, {
            id: p.id,
            score: p.bottleneckScore ?? '',
            cover: p.dominantLandCoverAtPoint ?? '',
          }))
        ;(m.getSource(PINCH_SRC) as GeoJSONSource | undefined)?.setData(asFc(feats))
      })
      .catch((err: Error) => setError(err.message))
    return () => { cancelled = true }
  }, [mapReady, species, bbox])

  // Two-click bbox capture (excluding clicks on ecoduct markers).
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return

    const handler = (e: MapMouseEvent) => {
      const hits = m.queryRenderedFeatures(e.point, { layers: ['lyr-ecoducts'] })
      if (hits.length > 0) return
      const { lng, lat } = e.lngLat
      if (!pendingCorner) {
        setPendingCorner([lng, lat])
        return
      }
      const a = pendingCorner
      const b: [number, number] = [lng, lat]
      const minLng = Math.min(a[0], b[0]), maxLng = Math.max(a[0], b[0])
      const minLat = Math.min(a[1], b[1]), maxLat = Math.max(a[1], b[1])
      const newBbox = `${minLng.toFixed(4)},${minLat.toFixed(4)},${maxLng.toFixed(4)},${maxLat.toFixed(4)}`
      setPendingCorner(null)
      onBboxChange(newBbox)
    }
    m.on('click', handler)
    return () => { m.off('click', handler) }
  }, [mapReady, pendingCorner, onBboxChange])

  // Render the bbox outline + frame the view.
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapReady) return
    const src = m.getSource(BBOX_SRC) as GeoJSONSource | undefined
    if (!bbox) {
      src?.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    src?.setData(bboxLine(bbox))
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number)
    const bounds: LngLatBoundsLike = [[minLng, minLat], [maxLng, maxLat]]
    m.fitBounds(bounds, { padding: 60, duration: 500, maxZoom: 11 })
  }, [mapReady, bbox])

  function applyPreset(id: string) {
    const p = REGION_PRESETS.find((r) => r.id === id)
    if (p) onBboxChange(p.bbox)
  }

  function useCurrentView() {
    const m = mapRef.current
    if (!m) return
    const b = m.getBounds()
    onBboxChange(
      `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`
    )
  }

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" />
      <aside className="map-side">
        <h3>Layers</h3>
        <div className="map-layers">
          <LayerToggle label="Ecoducts & underpasses"           color="#4338ca" checked={layers.ecoducts}    onChange={() => onLayerToggle('ecoducts')} />
          <LayerToggle label="Species occurrences (iNaturalist)" color="#16a34a" checked={layers.occurrences} onChange={() => onLayerToggle('occurrences')} />
          <LayerToggle label="Road-kill observations"            color="#dc2626" checked={layers.roadkill}    onChange={() => onLayerToggle('roadkill')} />
          <LayerToggle label="Pinch points (top-N)"              color="#f97316" checked={layers.pinch}       onChange={() => onLayerToggle('pinch')} />
        </div>

        <h3>Target species</h3>
        <select className="map-select" value={species} onChange={(e) => onSpeciesChange(e.target.value as Species)}>
          {SPECIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label} — {s.latin}</option>
          ))}
        </select>

        <h3>Action perimeter</h3>
        <p className="map-hint">
          {pendingCorner
            ? 'Click a second point on the map to set the perimeter.'
            : bbox
              ? <>Set: <code>{bbox}</code></>
              : 'Pick a preset, click two corners on the map, or use the current view.'}
        </p>
        <div className="map-presets">
          {REGION_PRESETS.map((r) => (
            <button key={r.id} type="button" className="map-preset" onClick={() => applyPreset(r.id)}>
              {r.label}
            </button>
          ))}
          <button type="button" className="map-preset" onClick={useCurrentView}>
            Use current view
          </button>
          {bbox && (
            <button type="button" className="map-preset map-preset-clear" onClick={() => onBboxChange(null)}>
              Clear perimeter
            </button>
          )}
        </div>

        <button
          type="button"
          className="map-cta"
          disabled={!bbox}
          onClick={onRequestPlan}
          title={bbox ? 'Generate the action plan PDF for this perimeter' : 'Set a perimeter first'}
        >
          Generate action plan
        </button>

        {error && <p className="map-error">{error}</p>}
      </aside>
    </div>
  )
}

function LayerToggle(props: { label: string; color: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="map-layer">
      <input type="checkbox" checked={props.checked} onChange={props.onChange} />
      <span className="map-swatch" style={{ background: props.color }} />
      <span>{props.label}</span>
    </label>
  )
}

function viewportCircle(m: maplibregl.Map): { center: { lat: number; lng: number }; radiusKm: number } {
  const c = m.getCenter()
  const b = m.getBounds()
  const dLatKm = (b.getNorth() - b.getSouth()) * 111
  const dLngKm = (b.getEast() - b.getWest()) * 111 * Math.cos((c.lat * Math.PI) / 180)
  const radiusKm = Math.min(50, Math.max(2, 0.5 * Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm)))
  return { center: { lat: c.lat, lng: c.lng }, radiusKm: Math.round(radiusKm * 10) / 10 }
}

function humanType(t: string) {
  return t.replace(/_/g, ' ').toLowerCase()
}
