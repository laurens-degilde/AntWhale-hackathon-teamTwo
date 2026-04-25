import { useState } from 'react'
import MapCanvas from './MapCanvas'
import SpeciesPanel from './SpeciesPanel'
import LayerPanel, { type LayerState } from './LayerPanel'
import InterventionList from './InterventionList'
import WorkflowPanel from './WorkflowPanel'

const DEFAULT_LAYERS: LayerState = {
  roadkill: true,
  corridors: true,
  crossings: true,
  fragmentation: true,
  landuse: false,
  resistance: false,
}

type LeftTab = 'species' | 'layers'

export default function MapDashboard() {
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS)
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(['badger'])
  const [leftTab, setLeftTab] = useState<LeftTab>('layers')
  const [showWorkflow, setShowWorkflow] = useState(false)

  const toggleLayer = (key: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleSpecies = (id: string) => {
    setSelectedSpecies(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  return (
    <div style={{
      height: '100svh',
      display: 'flex',
      flexDirection: 'column',
      background: '#000',
      paddingTop: '64px',
    }}>
      {/* Toolbar */}
      <div style={{
        height: '48px',
        background: '#050a0f',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: '16px',
        gap: '4px',
        flexShrink: 0,
      }}>
        {/* Left tabs */}
        {(['layers', 'species'] as LeftTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setLeftTab(tab)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '5px 14px',
              borderRadius: '3px',
              border: 'none',
              background: leftTab === tab ? 'rgba(46,196,182,0.1)' : 'transparent',
              color: leftTab === tab ? 'var(--teal)' : 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Interventions label */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          paddingRight: '8px',
        }}>
          Interventions
        </span>

        {/* Generate workflow */}
        <button
          onClick={() => setShowWorkflow(true)}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '7px 18px',
            borderRadius: '3px',
            border: 'none',
            background: 'var(--orange)',
            color: '#000',
            cursor: 'pointer',
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FF9A1A')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--orange)')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Generate Workflow
        </button>
      </div>

      {/* Main 3-panel layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left sidebar */}
        <div style={{
          width: '256px',
          flexShrink: 0,
          background: '#080f17',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto',
          padding: '16px',
        }}>
          {leftTab === 'layers'   && <LayerPanel   layers={layers}          onToggle={toggleLayer}   />}
          {leftTab === 'species'  && <SpeciesPanel selectedSpecies={selectedSpecies} onToggle={toggleSpecies} />}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas layers={layers} selectedSpecies={selectedSpecies} />
        </div>

        {/* Right sidebar */}
        <div style={{
          width: '296px',
          flexShrink: 0,
          background: '#080f17',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <InterventionList />
        </div>
      </div>

      {/* Workflow modal */}
      {showWorkflow && (
        <>
          <div
            onClick={() => setShowWorkflow(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'all', position: 'relative' }}>
              <button
                onClick={() => setShowWorkflow(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
              <WorkflowPanel />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
