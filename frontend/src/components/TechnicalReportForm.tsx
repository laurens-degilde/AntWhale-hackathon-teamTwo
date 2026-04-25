import { useEffect, useMemo, useState } from 'react'
import {
  REGION_PRESETS,
  SPECIES,
  technicalReportPdfUrl,
  type Species,
} from '../api/technicalReport'

const BBOX_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/

interface Props {
  initialSpecies?: Species
  initialBbox?: string
}

function presetIdFor(bbox: string): string {
  return REGION_PRESETS.find((r) => r.bbox === bbox)?.id ?? 'custom'
}

export function TechnicalReportForm({ initialSpecies, initialBbox }: Props = {}) {
  const startingBbox = initialBbox ?? REGION_PRESETS[0].bbox
  const [species, setSpecies] = useState<Species>(initialSpecies ?? 'badger')
  const [bbox, setBbox] = useState<string>(startingBbox)
  const [presetId, setPresetId] = useState<string>(presetIdFor(startingBbox))

  // Sync when the parent (map) pushes new species/bbox.
  useEffect(() => {
    if (initialSpecies && initialSpecies !== species) setSpecies(initialSpecies)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpecies])
  useEffect(() => {
    if (initialBbox && initialBbox !== bbox) {
      setBbox(initialBbox)
      setPresetId(presetIdFor(initialBbox))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBbox])

  const bboxValid = useMemo(() => {
    if (!BBOX_RE.test(bbox)) return false
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number)
    return maxLng > minLng && maxLat > minLat
      && minLng >= -180 && maxLng <= 180
      && minLat >= -90 && maxLat <= 90
  }, [bbox])

  const downloadUrl = bboxValid ? technicalReportPdfUrl(species, bbox, 'attachment') : '#'
  const viewUrl     = bboxValid ? technicalReportPdfUrl(species, bbox, 'inline')     : '#'

  function applyPreset(id: string) {
    setPresetId(id)
    const p = REGION_PRESETS.find((r) => r.id === id)
    if (p) setBbox(p.bbox)
  }

  function onBboxChange(value: string) {
    setBbox(value)
    setPresetId('custom')
  }

  return (
    <form
      className="report-form"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Technical report download"
    >
      <h2>Corridor action plan</h2>
      <p className="report-lede">
        Pick a target species and a perimeter — we'll generate the technical
        report as a PDF the NGO can hand to their GIS team or municipality.
      </p>

      <label>
        Target species
        <select value={species} onChange={(e) => setSpecies(e.target.value as Species)}>
          {SPECIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} — {s.latin}
            </option>
          ))}
        </select>
      </label>

      <label>
        Region preset
        <select value={presetId} onChange={(e) => applyPreset(e.target.value)}>
          {REGION_PRESETS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
          <option value="custom">Custom bbox…</option>
        </select>
      </label>

      <label>
        Bounding box <span className="report-optional">(minLng, minLat, maxLng, maxLat)</span>
        <input
          type="text"
          value={bbox}
          onChange={(e) => onBboxChange(e.target.value)}
          placeholder="5.74,52.05,5.86,52.12"
          spellCheck={false}
        />
        {!bboxValid && (
          <span className="report-error">
            Format: four comma-separated numbers, with max &gt; min on both axes.
          </span>
        )}
      </label>

      <div className="report-actions">
        <a
          className="report-primary"
          href={downloadUrl}
          aria-disabled={!bboxValid}
          download={bboxValid ? `corridor-action-plan-${species}.pdf` : undefined}
          onClick={(e) => { if (!bboxValid) e.preventDefault() }}
        >
          Download PDF
        </a>
        <a
          className="report-secondary"
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!bboxValid}
          onClick={(e) => { if (!bboxValid) e.preventDefault() }}
        >
          Open in browser
        </a>
      </div>

      <p className="report-fineprint">
        Includes the action perimeter map, ranked interventions with cost
        ranges, methods + assumptions, resistance coefficients with
        citations, data sources and next steps.
      </p>
    </form>
  )
}
