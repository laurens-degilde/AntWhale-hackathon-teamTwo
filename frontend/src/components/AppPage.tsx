import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../map.css";
import { DataMap } from "./DataMap";
import {
  REGION_PRESETS,
  SPECIES,
  technicalReportPdfUrl,
  type Species,
} from "../api/technicalReport";
import tree1Png from "../assets/tree1.png";
import tree2Png from "../assets/tree2.png";
import tree3Png from "../assets/tree3.png";
import ecoductIconPng from "../assets/ecoduct.png";
import roadkillIconPng from "../assets/roadkill.png";
import toolboxIconPng from "../assets/toolbox.png";
import pawsIconPng from "../assets/paws.png";

type LayerKey = "ecoducts" | "occurrences" | "roadkill" | "pinch" | "patches" | "connectivity";
type ResistanceModel = "literature" | "conservative" | "permissive";
type ReportType = "roadkill" | "crossing" | "observation";

interface MapCounts { occurrences: number; roadkill: number; pinch: number }

interface UserReport {
  id: string;
  rtype: ReportType;
  species: string;
  note: string;
  lat: number;
  lng: number;
  date: string;
}

const FUTURA = "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif";
const DM_SANS = "'DM Sans', system-ui, sans-serif";

const LAYER_META: { key: LayerKey; label: string; color: string; desc: string; icon?: string }[] = [
  { key: "ecoducts",     label: "Ecoducts",      color: "#4a9e5c", desc: "Wildlife crossings",    icon: ecoductIconPng  },
  { key: "patches",      label: "Habitats",       color: "#2E6028", desc: "Habitat patches",       icon: tree2Png        },
  { key: "occurrences",  label: "Occurrences",    color: "#C89040", desc: "iNaturalist sightings", icon: pawsIconPng     },
  { key: "roadkill",     label: "Road-kill",      color: "#c0392b", desc: "Mortality hotspots",    icon: roadkillIconPng },
  { key: "pinch",        label: "Pinch points",   color: "#8e44ad", desc: "Movement bottlenecks",  icon: toolboxIconPng  },
  { key: "connectivity", label: "Connectivity",   color: "#5b87d4", desc: "Circuit flow heatmap"                        },
];

const SPECIES_META: Record<Species, { emoji: string; desc: string }> = {
  badger:             { emoji: "🦡", desc: "Hedgerows & woodland edges"       },
  otter:              { emoji: "🦦", desc: "Riparian & waterway corridors"    },
  red_deer:           { emoji: "🦌", desc: "Large-scale forest corridors"     },
  pine_marten:        { emoji: "🐾", desc: "Needs continuous canopy cover"    },
  great_crested_newt: { emoji: "🐸", desc: "Pond networks & rough grassland"  },
  hazel_dormouse:     { emoji: "🐭", desc: "Hedgerow & scrub specialist"      },
};

const INTERVENTIONS = [
  { id: "ecoduct",   label: "Ecoduct",           cost: "€2M–€8M",     icon: "🌉" },
  { id: "underpass", label: "Wildlife underpass", cost: "€200k–€800k", icon: "🚇" },
  { id: "culvert",   label: "Mammal culvert",     cost: "€15k–€60k",   icon: "🐀" },
  { id: "hedgerow",  label: "Hedgerow planting",  cost: "€8–15/m",     icon: "🌿" },
  { id: "fence",     label: "Fence modification", cost: "–",           icon: "🔓" },
  { id: "stepping",  label: "Stepping stone",     cost: "varies",      icon: "🪨" },
];

const SIDEBAR_W = 264;
const HANDLE_W  = 24;

function bboxCenter(bbox: string) {
  const [w, s, e, n] = bbox.split(",").map(Number);
  return { lat: (s + n) / 2, lng: (w + e) / 2, zoom: 11 };
}

async function geocode(query: string): Promise<{ lat: number; lng: number; zoom: number } | null> {
  const coordMatch = query.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const a = parseFloat(coordMatch[1]), b = parseFloat(coordMatch[2]);
    if (!isNaN(a) && !isNaN(b)) {
      const [lat, lng] = Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : [b, a];
      return { lat, lng, zoom: 13 };
    }
  }
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), zoom: 12 };
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ on, color = "#2E6028" }: { on: boolean; color?: string }) {
  return (
    <div style={{
      width: 28, height: 15, borderRadius: 8, flexShrink: 0,
      background: on ? color : "rgba(0,0,0,0.12)",
      transition: "background 0.2s",
      position: "relative",
    }}>
      <div style={{
        position: "absolute",
        top: 2, left: on ? 13 : 2,
        width: 11, height: 11, borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.22)",
      }} />
    </div>
  );
}

// ── Sidebar Panel ─────────────────────────────────────────────────────────────
interface SidebarProps {
  species: Species;
  layers: Record<LayerKey, boolean>;
  counts: MapCounts;
  activePreset: string | null;
  resistanceModel: ResistanceModel;
  connectivityOpacity: number;
  bbox: string | null;
  onSpeciesChange: (s: Species) => void;
  onLayerToggle: (key: LayerKey) => void;
  onSelectPreset: (id: string, bbox: string) => void;
  onClearRegion: () => void;
  onResistanceModelChange: (m: ResistanceModel) => void;
  onConnectivityOpacityChange: (v: number) => void;
  onRequestPlan: () => void;
  onStartReport: () => void;
}

function SidebarPanel(props: SidebarProps) {
  const {
    species, layers, counts, activePreset, resistanceModel,
    connectivityOpacity, bbox,
    onSpeciesChange, onLayerToggle, onSelectPreset, onClearRegion,
    onResistanceModelChange, onConnectivityOpacityChange, onRequestPlan, onStartReport,
  } = props;

  const sectionHead: React.CSSProperties = {
    fontFamily: FUTURA, fontSize: "0.48rem", letterSpacing: "0.22em",
    textTransform: "uppercase", color: "rgba(0,0,0,0.3)",
    padding: "20px 16px 8px", display: "block",
  };
  const divider = <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "2px 0" }} />;

  return (
    <>
      <style>{`
        .sb-sp-btn { transition: background 0.12s; }
        .sb-sp-btn:hover:not(.sb-sp-active) { background: rgba(0,0,0,0.035) !important; }
        .sb-lyr-row { transition: background 0.12s; }
        .sb-lyr-row:hover { background: rgba(0,0,0,0.03) !important; }
        .sb-preset { transition: all 0.15s; }
        .sb-preset:hover:not(.sb-preset-active) { background: rgba(42,64,32,0.07) !important; border-color: rgba(42,64,32,0.25) !important; }
        .sb-preset-active { background: rgba(42,64,32,0.1) !important; border-color: rgba(42,64,32,0.32) !important; }
        .sb-rm-btn { transition: all 0.14s; }
        .sb-rm-btn:hover:not(.sb-rm-active) { background: rgba(42,64,32,0.06) !important; border-color: rgba(42,64,32,0.2) !important; }
        .sb-rm-active { background: rgba(42,64,32,0.1) !important; border-color: rgba(42,64,32,0.3) !important; }
        .sb-opacity-range {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 3px; border-radius: 2px; outline: none; cursor: pointer;
          background: linear-gradient(to right, #2E6028 0%, #2E6028 calc(var(--pct, 70) * 1%), rgba(0,0,0,0.12) calc(var(--pct, 70) * 1%), rgba(0,0,0,0.12) 100%);
        }
        .sb-opacity-range::-webkit-slider-thumb {
          -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
          background: #2E6028; box-shadow: 0 0 0 2.5px rgba(46,96,40,0.18), 0 1px 4px rgba(0,0,0,0.18); cursor: pointer; transition: box-shadow 0.15s;
        }
        .sb-opacity-range::-webkit-slider-thumb:hover { box-shadow: 0 0 0 4px rgba(46,96,40,0.22), 0 1px 4px rgba(0,0,0,0.18); }
        .sb-opacity-range::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; border: none; background: #2E6028; box-shadow: 0 1px 4px rgba(0,0,0,0.2); cursor: pointer; }
        .sb-cta:hover { background: #3a7030 !important; transform: translateY(-1px); }
        .sb-cta:active { transform: translateY(0) !important; }
        .sb-report-btn:hover { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.22) !important; }
      `}</style>

      {/* ── Species ─────────────────────────────── */}
      <span style={sectionHead}>Target Species</span>
      {SPECIES.map((s) => {
        const meta = SPECIES_META[s.value];
        const active = species === s.value;
        return (
          <button
            key={s.value}
            className={`sb-sp-btn${active ? " sb-sp-active" : ""}`}
            onClick={() => onSpeciesChange(s.value)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 16px",
              width: "100%", border: "none", cursor: "pointer", textAlign: "left",
              background: active ? "#1a2818" : "transparent",
            }}
          >
            <span style={{ fontSize: "1.15rem", lineHeight: 1, flexShrink: 0 }}>{meta.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: DM_SANS, fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.25, color: active ? "#f0eee6" : "#1a2818", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.label}
              </div>
              <div style={{ fontFamily: DM_SANS, fontSize: "0.64rem", fontStyle: "italic", lineHeight: 1.3, color: active ? "rgba(240,238,230,0.45)" : "rgba(0,0,0,0.33)", marginTop: 2 }}>
                {s.latin}
              </div>
            </div>
            {active && <div style={{ flexShrink: 0 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4a9e5c", boxShadow: "0 0 6px rgba(74,158,92,0.7)" }} /></div>}
          </button>
        );
      })}
      <div style={{ margin: "4px 12px 4px", padding: "7px 10px", background: "rgba(42,64,32,0.055)", borderRadius: 3, fontFamily: DM_SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.42)", fontStyle: "italic", lineHeight: 1.5 }}>
        {SPECIES_META[species].desc}
      </div>

      {divider}

      {/* ── Data Layers ─────────────────────────── */}
      <span style={sectionHead}>Data Layers</span>
      <div style={{ padding: "0 0 4px" }}>
        {LAYER_META.map(({ key, label, color, desc, icon }) => (
          <div key={key}>
            <button
              className="sb-lyr-row"
              onClick={() => onLayerToggle(key)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 16px", width: "100%", border: "none", cursor: "pointer", background: "transparent" }}
            >
              {icon ? (
                <img
                  src={icon}
                  alt=""
                  style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0, opacity: layers[key] ? 1 : 0.25, transition: "opacity 0.2s", filter: layers[key] ? "none" : "grayscale(1)" }}
                />
              ) : (
                /* connectivity — no icon, use a small gradient swatch */
                <div style={{ width: 18, height: 10, borderRadius: 2, flexShrink: 0, background: layers[key] ? "linear-gradient(to right, #1a4494, #4a9edc, #f0dc5c, #e05020)" : "rgba(0,0,0,0.1)", transition: "all 0.2s" }} />
              )}
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{ fontFamily: FUTURA, fontSize: "0.6rem", letterSpacing: "0.07em", textTransform: "uppercase", color: layers[key] ? "#1a2818" : "rgba(0,0,0,0.28)", transition: "color 0.2s" }}>{label}</div>
                <div style={{ fontFamily: DM_SANS, fontSize: "0.63rem", color: "rgba(0,0,0,0.32)", marginTop: 1, lineHeight: 1.3 }}>{desc}</div>
              </div>
              <ToggleSwitch on={layers[key]} color={color} />
            </button>
            {key === "connectivity" && layers.connectivity && (
              <div style={{ padding: "2px 16px 10px 33px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: FUTURA, fontSize: "0.48rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.28)" }}>Opacity</span>
                  <span style={{ fontFamily: DM_SANS, fontSize: "0.66rem", fontWeight: 600, color: "#5b87d4" }}>{Math.round(connectivityOpacity * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.01} value={connectivityOpacity}
                  onChange={(e) => onConnectivityOpacityChange(parseFloat(e.target.value))}
                  className="sb-opacity-range"
                  style={{ "--pct": Math.round(connectivityOpacity * 100) } as React.CSSProperties}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {divider}

      {/* ── Quick Regions ────────────────────────── */}
      <span style={sectionHead}>Quick Regions</span>
      <div style={{ padding: "2px 12px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {REGION_PRESETS.map((r) => {
          const isActive = activePreset === r.id;
          return (
            <button
              key={r.id}
              className={`sb-preset${isActive ? " sb-preset-active" : ""}`}
              onClick={() => onSelectPreset(r.id, r.bbox)}
              style={{ padding: "7px 8px", fontFamily: FUTURA, fontSize: "0.54rem", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", color: isActive ? "#1a2818" : "rgba(0,0,0,0.5)", background: "transparent", border: `1px solid ${isActive ? "rgba(42,64,32,0.32)" : "rgba(0,0,0,0.1)"}`, borderRadius: 3, cursor: "pointer", lineHeight: 1.35 }}
            >
              {r.label.split(" (")[0]}
            </button>
          );
        })}
      </div>
      {bbox && (
        <div style={{ padding: "0 12px 12px" }}>
          <button
            onClick={onClearRegion}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "7px", fontFamily: FUTURA, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(192,57,43,0.7)", background: "transparent", border: "1px solid rgba(192,57,43,0.18)", borderRadius: 3, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(192,57,43,0.06)"; e.currentTarget.style.borderColor = "rgba(192,57,43,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(192,57,43,0.18)"; }}
          >
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Clear region
          </button>
        </div>
      )}

      {divider}

      {/* ── Analysis Model ────────────────────────── */}
      <span style={sectionHead}>Resistance Model</span>
      <div style={{ padding: "2px 12px 12px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["literature", "conservative", "permissive"] as const).map((m) => {
            const active = resistanceModel === m;
            return (
              <button key={m} className={`sb-rm-btn${active ? " sb-rm-active" : ""}`} onClick={() => onResistanceModelChange(m)} style={{ flex: 1, padding: "7px 4px", fontFamily: FUTURA, fontSize: "0.48rem", letterSpacing: "0.07em", textTransform: "capitalize", color: active ? "#1a2818" : "rgba(0,0,0,0.4)", background: active ? "rgba(42,64,32,0.1)" : "transparent", border: `1px solid ${active ? "rgba(42,64,32,0.3)" : "rgba(0,0,0,0.1)"}`, borderRadius: 3, cursor: "pointer", transition: "all 0.14s" }}>
                {m === "literature" ? "Lit." : m === "conservative" ? "Cons." : "Perm."}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 8, fontFamily: DM_SANS, fontSize: "0.68rem", color: "rgba(0,0,0,0.35)", lineHeight: 1.55 }}>
          {resistanceModel === "literature"   && "Published species-specific coefficients with citations."}
          {resistanceModel === "conservative" && "Higher resistance — more corridors flagged for intervention."}
          {resistanceModel === "permissive"   && "Lower resistance — only critical pinch points surfaced."}
        </div>
      </div>

      {divider}

      {/* ── Live counts ───────────────────────────── */}
      <span style={sectionHead}>Live Data</span>
      <div style={{ padding: "4px 16px 16px", display: "flex", gap: 6 }}>
        {[
          { label: "Sightings",   value: counts.occurrences, color: "#B87830" },
          { label: "Road-kill",   value: counts.roadkill,    color: "#c0392b" },
          { label: "Bottlenecks", value: counts.pinch,       color: "#8e44ad" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: "9px 6px", textAlign: "center", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 3 }}>
            <div style={{ fontFamily: FUTURA, fontSize: "1.05rem", fontWeight: 800, color: "#1a2818", lineHeight: 1 }}>{value > 999 ? `${(value / 1000).toFixed(1)}k` : value}</div>
            <div style={{ fontFamily: FUTURA, fontSize: "0.42rem", letterSpacing: "0.12em", textTransform: "uppercase", color, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── CTAs ──────────────────────────────────── */}
      <div style={{ padding: "0 12px 8px" }}>
        <button
          className="sb-report-btn"
          onClick={onStartReport}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px 16px", fontFamily: FUTURA, fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#1a2818", background: "transparent", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 3, cursor: "pointer", transition: "all 0.18s" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Report new data
        </button>
      </div>
      <div style={{ padding: "0 12px 20px" }}>
        <button
          className="sb-cta"
          onClick={onRequestPlan}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 16px", fontFamily: FUTURA, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#f0eee6", background: "#2E6028", border: "none", borderRadius: 3, cursor: "pointer", boxShadow: "0 2px 14px rgba(46,96,40,0.32)", transition: "background 0.2s, transform 0.15s" }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 1h6l2 2v8H1V1z" stroke="rgba(240,238,230,0.7)" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
            <path d="M3 5h4M3 7h4M3 9h2" stroke="rgba(240,238,230,0.7)" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          Generate Report
        </button>
      </div>
    </>
  );
}

// ── Report Sheet ──────────────────────────────────────────────────────────────
type LocSource = "map" | "gps" | "manual";

function ReportSheet({
  pin,
  onSubmit,
  onClose,
  onPickOnMap,
}: {
  pin: { lat: number; lng: number } | null;
  onSubmit: (rtype: ReportType, species: string, note: string, coords: { lat: number; lng: number }) => void;
  onClose: () => void;
  onPickOnMap: () => void;
}) {
  const [rtype, setRtype]       = useState<ReportType>("roadkill");
  const [species, setSpecies]   = useState("unknown");
  const [note, setNote]         = useState("");

  // location state
  const [locSource, setLocSource] = useState<LocSource>(pin ? "map" : "manual");
  const [coords, setCoords]       = useState<{ lat: number; lng: number } | null>(pin ?? null);
  const [manualLat, setManualLat] = useState(pin ? String(pin.lat.toFixed(5)) : "");
  const [manualLng, setManualLng] = useState(pin ? String(pin.lng.toFixed(5)) : "");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState<string | null>(null);

  const manualLatNum = parseFloat(manualLat);
  const manualLngNum = parseFloat(manualLng);
  const manualValid  = !isNaN(manualLatNum) && !isNaN(manualLngNum)
    && manualLatNum >= -90 && manualLatNum <= 90
    && manualLngNum >= -180 && manualLngNum <= 180;

  const effectiveCoords =
    locSource === "manual" && manualValid ? { lat: manualLatNum, lng: manualLngNum } :
    locSource !== "manual" ? coords :
    null;

  function switchTo(src: LocSource) {
    setLocSource(src);
    setGpsError(null);
    if (src === "gps") {
      if (!navigator.geolocation) { setGpsError("Geolocation not supported by your browser"); return; }
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setManualLat(c.lat.toFixed(5));
          setManualLng(c.lng.toFixed(5));
          setGpsLoading(false);
        },
        () => {
          setGpsError("Location access denied or unavailable");
          setGpsLoading(false);
        },
        { timeout: 8000 }
      );
    }
  }

  const REPORT_TYPES = [
    { key: "roadkill"     as const, icon: "🚗", label: "Road-kill",    desc: "Casualty on road",         color: "#c0392b" },
    { key: "crossing"     as const, icon: "🌿", label: "New crossing", desc: "Tunnel or wildlife bridge", color: "#4a9e5c" },
    { key: "observation"  as const, icon: "🐾", label: "Observation",  desc: "Species sighting",          color: "#B87830" },
  ];

  const LOC_TABS: { key: LocSource; icon: React.ReactNode; label: string }[] = [
    {
      key: "map",
      icon: (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1 2l3 1 2-1 3 1v7l-3-1-2 1-3-1V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <line x1="4" y1="2" x2="4" y2="9" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="6" y1="1" x2="6" y2="8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      ),
      label: "Map pin",
    },
    {
      key: "gps",
      icon: (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="5.5" y1="1" x2="5.5" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="5.5" y1="8" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="1" y1="5.5" x2="3" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="8" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ),
      label: "My location",
    },
    {
      key: "manual",
      icon: (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="1" y="2" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="3" y1="5.5" x2="8" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="5.5" y1="3.5" x2="5.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ),
      label: "Enter coords",
    },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,8,0.55)", backdropFilter: "blur(4px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", zIndex: 1, width: "100%", background: "#f0eee6", borderRadius: "12px 12px 0 0", animation: "slideUp 0.28s cubic-bezier(0.2,0.8,0.2,1)", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ background: "#1a2818", padding: "16px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
              <circle cx="7" cy="6" r="3.5" stroke="rgba(240,238,230,0.65)" strokeWidth="1.3"/>
              <path d="M7 10c0 0 -5 5-5 8h10c0-3-5-8-5-8z" stroke="rgba(240,238,230,0.45)" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(240,238,230,0.08)"/>
            </svg>
            <div>
              <div style={{ fontFamily: FUTURA, fontSize: "0.52rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(240,238,230,0.42)", marginBottom: 3 }}>
                Community report
              </div>
              <div style={{ fontFamily: DM_SANS, fontSize: "0.84rem", fontWeight: 600, color: "#f0eee6", letterSpacing: "0.01em" }}>
                {effectiveCoords
                  ? `${effectiveCoords.lat.toFixed(5)}, ${effectiveCoords.lng.toFixed(5)}`
                  : gpsLoading ? "Locating…" : "Set a location below"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(240,238,230,0.1)", border: "1px solid rgba(240,238,230,0.15)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "rgba(240,238,230,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(240,238,230,0.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(240,238,230,0.1)"; }}
          >✕</button>
        </div>

        {/* Form body */}
        <div style={{ padding: "22px 28px 28px", overflowY: "auto", maxHeight: "70vh" }}>

          {/* ── Location source ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: FUTURA, fontSize: "0.5rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 10 }}>
              Location
            </div>
            {/* Tab row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {LOC_TABS.map((t) => {
                const active = locSource === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => { if (t.key === "map" && !pin) { onPickOnMap(); } else { switchTo(t.key); } }}
                    disabled={false}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 13px",
                      fontFamily: FUTURA, fontSize: "0.52rem", letterSpacing: "0.08em", textTransform: "uppercase",
                      color: active ? "#1a2818" : "rgba(0,0,0,0.45)",
                      background: active ? "rgba(42,64,32,0.1)" : "rgba(0,0,0,0.03)",
                      border: `1.5px solid ${active ? "rgba(42,64,32,0.32)" : "rgba(0,0,0,0.08)"}`,
                      borderRadius: 3, cursor: "pointer",
                      transition: "all 0.14s",
                    }}
                    onMouseEnter={e => { if (!active && !(t.key === "map" && !pin)) { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.16)"; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; e.currentTarget.style.borderColor = active ? "rgba(42,64,32,0.32)" : "rgba(0,0,0,0.08)"; }}}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Location detail area */}
            {locSource === "map" && (
              coords ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(42,64,32,0.06)", border: "1px solid rgba(42,64,32,0.14)", borderRadius: 3 }}>
                  <svg width="9" height="12" viewBox="0 0 9 12" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="4.5" cy="4" r="2" stroke="#2E6028" strokeWidth="1.2"/>
                    <path d="M4.5 6C4.5 6 1.5 9 1.5 10.5h6C7.5 9 4.5 6 4.5 6z" stroke="#2E6028" strokeWidth="1.2" strokeLinejoin="round" fill="rgba(46,96,40,0.1)"/>
                  </svg>
                  <span style={{ fontFamily: DM_SANS, fontSize: "0.84rem", fontWeight: 600, color: "#2E6028", letterSpacing: "0.01em" }}>
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                  <button
                    onClick={onPickOnMap}
                    style={{ marginLeft: "auto", fontFamily: FUTURA, fontSize: "0.46rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,0.38)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 2, transition: "color 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#1a2818"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(0,0,0,0.38)"; }}
                  >
                    re-pick ↻
                  </button>
                </div>
              ) : (
                <button
                  onClick={onPickOnMap}
                  style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "11px 14px", background: "rgba(0,0,0,0.03)", border: "1.5px dashed rgba(0,0,0,0.13)", borderRadius: 3, cursor: "pointer", transition: "all 0.14s", textAlign: "left" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(42,64,32,0.05)"; e.currentTarget.style.borderColor = "rgba(42,64,32,0.22)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.13)"; }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                    <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
                  </svg>
                  <span style={{ fontFamily: DM_SANS, fontSize: "0.82rem", color: "rgba(0,0,0,0.4)" }}>Click to pin on map…</span>
                </button>
              )
            )}

            {locSource === "gps" && (
              <div style={{ padding: "10px 14px", background: gpsError ? "rgba(192,57,43,0.05)" : "rgba(42,64,32,0.06)", border: `1px solid ${gpsError ? "rgba(192,57,43,0.2)" : "rgba(42,64,32,0.14)"}`, borderRadius: 3, display: "flex", alignItems: "center", gap: 10 }}>
                {gpsLoading ? (
                  <>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid rgba(46,96,40,0.2)", borderTopColor: "#2E6028", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                    <span style={{ fontFamily: DM_SANS, fontSize: "0.82rem", color: "rgba(0,0,0,0.45)" }}>Requesting GPS position…</span>
                  </>
                ) : gpsError ? (
                  <span style={{ fontFamily: DM_SANS, fontSize: "0.8rem", color: "#c0392b" }}>{gpsError}</span>
                ) : coords ? (
                  <>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="4.5" cy="4.5" r="3.5" fill="rgba(46,96,40,0.15)"/>
                      <path d="M2.5 4.5l1.5 1.5 3-3" stroke="#2E6028" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontFamily: DM_SANS, fontSize: "0.84rem", fontWeight: 600, color: "#2E6028" }}>
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  </>
                ) : null}
              </div>
            )}

            {locSource === "manual" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Latitude", val: manualLat, set: setManualLat, placeholder: "52.08765", min: -90, max: 90 },
                  { label: "Longitude", val: manualLng, set: setManualLng, placeholder: "5.83421", min: -180, max: 180 },
                ].map(({ label, val, set, placeholder }) => (
                  <div key={label}>
                    <label style={{ display: "block", fontFamily: FUTURA, fontSize: "0.46rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 5 }}>
                      {label}
                    </label>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      step="0.00001"
                      style={{
                        width: "100%", padding: "9px 11px",
                        fontFamily: DM_SANS, fontSize: "0.86rem", color: "#1a2818",
                        background: "rgba(0,0,0,0.04)",
                        border: `1px solid ${val && (isNaN(parseFloat(val))) ? "rgba(192,57,43,0.45)" : "rgba(0,0,0,0.12)"}`,
                        borderRadius: 3, outline: "none", boxSizing: "border-box",
                      }}
                      onFocus={e => { e.target.style.borderColor = "rgba(42,64,32,0.4)"; }}
                      onBlur={e => { e.target.style.borderColor = val && isNaN(parseFloat(val)) ? "rgba(192,57,43,0.45)" : "rgba(0,0,0,0.12)"; }}
                    />
                  </div>
                ))}
                {manualValid && (
                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(42,64,32,0.05)", border: "1px solid rgba(42,64,32,0.12)", borderRadius: 3 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="3" fill="rgba(46,96,40,0.15)"/><path d="M2 4l1.5 1.5 3-3" stroke="#2E6028" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: DM_SANS, fontSize: "0.72rem", color: "#2E6028", fontWeight: 500 }}>{manualLatNum.toFixed(5)}, {manualLngNum.toFixed(5)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── What are you reporting ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: FUTURA, fontSize: "0.5rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 10 }}>
              What are you reporting?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {REPORT_TYPES.map((t) => {
                const active = rtype === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setRtype(t.key)}
                    style={{
                      padding: "14px 8px 12px", textAlign: "center", cursor: "pointer",
                      background: active ? `${t.color}0f` : "rgba(0,0,0,0.025)",
                      border: `1.5px solid ${active ? t.color + "60" : "rgba(0,0,0,0.09)"}`,
                      borderRadius: 5, transition: "all 0.14s",
                      outline: "none",
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.16)"; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "rgba(0,0,0,0.025)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.09)"; }}}
                  >
                    <div style={{ fontSize: "1.6rem", marginBottom: 6, lineHeight: 1 }}>{t.icon}</div>
                    <div style={{ fontFamily: DM_SANS, fontSize: "0.8rem", fontWeight: 600, color: active ? "#1a2818" : "rgba(0,0,0,0.55)", marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontFamily: DM_SANS, fontSize: "0.62rem", color: "rgba(0,0,0,0.33)", lineHeight: 1.35 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Species + Note: two-column */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 22 }}>
            <div>
              <label style={{ display: "block", fontFamily: FUTURA, fontSize: "0.5rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 7 }}>
                Species
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  style={{ width: "100%", padding: "10px 32px 10px 12px", fontFamily: DM_SANS, fontSize: "0.86rem", color: "#1a2818", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 3, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none", boxSizing: "border-box" }}
                >
                  <option value="unknown">Unknown / Other</option>
                  {SPECIES.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.latin}</option>)}
                </select>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <path d="M1 1l4 4 4-4" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontFamily: FUTURA, fontSize: "0.5rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 7 }}>
                Notes <span style={{ fontSize: "0.42rem", letterSpacing: "0.1em", color: "rgba(0,0,0,0.22)" }}>(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Road name, time of day, any context…"
                style={{ width: "100%", padding: "10px 12px", fontFamily: DM_SANS, fontSize: "0.82rem", color: "#1a2818", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 3, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6 }}
              />
            </div>
          </div>

          {/* Submit row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => { if (effectiveCoords) onSubmit(rtype, species, note, effectiveCoords); }}
              disabled={!effectiveCoords}
              style={{ flex: 1, padding: "12px 20px", fontFamily: FUTURA, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: effectiveCoords ? "#f0eee6" : "rgba(0,0,0,0.25)", background: effectiveCoords ? "#2E6028" : "rgba(0,0,0,0.06)", border: "none", borderRadius: 3, cursor: effectiveCoords ? "pointer" : "not-allowed", boxShadow: effectiveCoords ? "0 2px 12px rgba(46,96,40,0.3)" : "none", transition: "background 0.2s, transform 0.15s" }}
              onMouseEnter={(e) => { if (effectiveCoords) { e.currentTarget.style.background = "#3a7030"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
              onMouseLeave={(e) => { if (effectiveCoords) { e.currentTarget.style.background = "#2E6028"; e.currentTarget.style.transform = "translateY(0)"; }}}
            >
              {effectiveCoords ? "Submit Report ↗" : "Set a location first"}
            </button>
            <button
              onClick={onClose}
              style={{ padding: "12px 20px", fontFamily: FUTURA, fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", background: "transparent", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 3, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.22)"; e.currentTarget.style.color = "rgba(0,0,0,0.65)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; e.currentTarget.style.color = "rgba(0,0,0,0.4)"; }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AppPage ──────────────────────────────────────────────────────────────
export default function AppPage() {
  const navigate = useNavigate();

  // map state
  const [species, setSpecies]       = useState<Species>("badger");
  const [bbox, setBbox]             = useState<string | null>(null);
  const [layers, setLayers]         = useState<Record<LayerKey, boolean>>({ ecoducts: true, patches: true, occurrences: true, roadkill: true, pinch: true, connectivity: true });
  const [counts, setCounts]         = useState<MapCounts>({ occurrences: 0, roadkill: 0, pinch: 0 });
  const [flyTo, setFlyTo]           = useState<{ lat: number; lng: number; zoom: number; _seq: number } | null>(null);

  // sidebar / ui state
  const [sidebarOpen, setSidebarOpen]               = useState(true);
  const [resistanceModel, setResistanceModel]       = useState<ResistanceModel>("literature");
  const [connectivityOpacity, setConnectivityOpacity] = useState(0.70);
  const [activePreset, setActivePreset]             = useState<string | null>(null);
  const [reportOpen, setReportOpen]                 = useState(false);

  // report mode state
  const [reportMode, setReportMode]         = useState(false);
  const [reportPin, setReportPin]           = useState<{ lat: number; lng: number } | null>(null);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [userReports, setUserReports]       = useState<UserReport[]>([]);
  const [reportToast, setReportToast]       = useState(false);

  // search
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError]   = useState<string | null>(null);

  const onLayerToggle = useCallback((key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const onCounts = useCallback(
    (next: MapCounts | ((prev: MapCounts) => MapCounts)) => {
      setCounts((prev) => (typeof next === "function" ? next(prev) : next));
    },
    []
  );

  function selectPreset(id: string, presetBbox: string) {
    setActivePreset(id);
    setBbox(presetBbox);
    setFlyTo({ ...bboxCenter(presetBbox), _seq: Date.now() });
  }

  function clearRegion() {
    setBbox(null);
    setActivePreset(null);
  }

  function startReportMode() {
    // Open the sheet directly — user can pick location inside (GPS, coords, or click map)
    setReportFormOpen(true);
    setReportMode(false);
    setReportPin(null);
  }

  function startMapClickMode() {
    // Activate crosshair mode so user can click the map to set pin
    setReportFormOpen(false);
    setReportMode(true);
    setReportPin(null);
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setReportPin({ lat, lng });
    setReportMode(false);
    setReportFormOpen(true); // re-opens sheet with the map pin set
  }, []);

  function submitReport(rtype: ReportType, species: string, note: string, coords: { lat: number; lng: number }) {
    const report: UserReport = {
      id: `ur-${Date.now()}`,
      rtype, species, note,
      lat: coords.lat, lng: coords.lng,
      date: new Date().toISOString().slice(0, 10),
    };
    setUserReports((prev) => [...prev, report]);
    setReportFormOpen(false);
    setReportPin(null);
    setReportToast(true);
    setTimeout(() => setReportToast(false), 3500);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await geocode(searchQuery);
      if (!result) setSearchError("Location not found");
      else setFlyTo({ ...result, _seq: Date.now() });
    } catch {
      setSearchError("Search failed");
    }
    setSearchLoading(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f0eee6", fontFamily: DM_SANS }}>

      {/* ── Map ── */}
      <DataMap
        species={species}
        bbox={bbox}
        layers={layers}
        flyTo={flyTo}
        connectivityOpacity={connectivityOpacity}
        reportMode={reportMode}
        userReports={userReports}
        onMapClick={handleMapClick}
        onSpeciesChange={setSpecies}
        onBboxChange={(b) => { setBbox(b); if (!b) setActivePreset(null); }}
        onLayerToggle={onLayerToggle}
        onCounts={onCounts}
        onRequestPlan={() => setReportOpen(true)}
      />

      {/* ── Collapsible Sidebar ── */}
      <div
        style={{
          position: "absolute", left: 0, top: 68, bottom: 0,
          width: SIDEBAR_W + HANDLE_W, zIndex: 22,
          display: "flex",
          transform: sidebarOpen ? "translateX(0)" : `translateX(-${SIDEBAR_W}px)`,
          transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
        }}
      >
        {/* Panel */}
        <div
          style={{
            width: SIDEBAR_W, height: "100%", overflowY: "auto",
            background: "rgba(240,238,230,0.98)", backdropFilter: "blur(28px)",
            borderRight: "1px solid rgba(0,0,0,0.07)",
            flexShrink: 0, display: "flex", flexDirection: "column",
            pointerEvents: "all", scrollbarWidth: "none",
          }}
        >
          <SidebarPanel
            species={species} layers={layers} counts={counts}
            activePreset={activePreset} resistanceModel={resistanceModel}
            connectivityOpacity={connectivityOpacity} bbox={bbox}
            onSpeciesChange={setSpecies} onLayerToggle={onLayerToggle}
            onSelectPreset={selectPreset} onClearRegion={clearRegion}
            onResistanceModelChange={setResistanceModel}
            onConnectivityOpacityChange={setConnectivityOpacity}
            onRequestPlan={() => setReportOpen(true)}
            onStartReport={startReportMode}
          />
        </div>

        {/* Handle strip */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Collapse panel" : "Expand panel"}
          style={{ width: HANDLE_W, height: "100%", background: "rgba(232,230,222,0.9)", backdropFilter: "blur(28px)", border: "none", borderRight: "1px solid rgba(0,0,0,0.07)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 0, flexShrink: 0, pointerEvents: "all", transition: "background 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(226,224,216,0.98)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(232,230,222,0.9)"; }}
        >
          {[0, 1, 2].map((i) => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(0,0,0,0.22)" }} />)}
          <svg width="7" height="11" viewBox="0 0 7 11" fill="none" style={{ marginTop: 7, transform: sidebarOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
            <path d="M5 1.5L2 5.5l3 4" stroke="rgba(0,0,0,0.32)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Floating "Report" button — slides with sidebar ── */}
      {!reportFormOpen && !reportMode && (
        <div
          style={{
            position: "absolute", bottom: 32,
            left: sidebarOpen ? SIDEBAR_W + HANDLE_W + 10 : HANDLE_W + 10,
            zIndex: 21,
            transition: "left 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <button
            onClick={startReportMode}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px",
              fontFamily: FUTURA, fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase",
              color: "#1a2818",
              background: "rgba(240,238,230,0.97)",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: "2px", cursor: "pointer",
              backdropFilter: "blur(14px)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.14)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(240,238,230,0.97)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)"; }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Report data
          </button>
        </div>
      )}

      {/* ── Report mode hint banner ── */}
      {reportMode && (
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          background: "rgba(26,40,24,0.92)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "2px",
          padding: "10px 22px", zIndex: 35, pointerEvents: "none",
          fontFamily: DM_SANS, fontSize: "0.78rem", fontWeight: 500, color: "#f0eee6",
          boxShadow: "0 4px 18px rgba(26,40,24,0.18)",
          display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap",
        }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="rgba(240,238,230,0.5)" strokeWidth="1.3"/>
            <circle cx="5.5" cy="5.5" r="1.8" fill="rgba(240,238,230,0.7)"/>
          </svg>
          Click anywhere on the map to place your report
          <button
            onClick={() => setReportMode(false)}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 2, color: "rgba(240,238,230,0.7)", cursor: "pointer",
              padding: "3px 10px", fontFamily: FUTURA, fontSize: "0.5rem",
              letterSpacing: "0.1em", textTransform: "uppercase", pointerEvents: "all",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Back / Brand ── */}
      <button
        onClick={() => navigate("/")}
        style={{ position: "absolute", top: 16, left: 16, zIndex: 30, background: "rgba(240,238,230,0.94)", backdropFilter: "blur(14px)", border: "1px solid rgba(0,0,0,0.09)", borderRadius: "2px", cursor: "pointer", padding: "9px 14px", display: "flex", alignItems: "center", gap: "8px", transition: "background 0.2s", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(240,238,230,0.94)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5 L9 1.5 C9 1.5 2.5 5.5 2.5 11 C2.5 14.6 5.4 17.5 9 17.5 C12.6 17.5 15.5 14.6 15.5 11 C15.5 5.5 9 1.5 9 1.5Z" stroke="#2a4020" strokeWidth="1.3" fill="rgba(42,64,32,0.1)" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontFamily: FUTURA, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a2818" }}>Wildcross</span>
        <span style={{ fontFamily: FUTURA, fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,0.28)" }}>← back</span>
      </button>

      {/* ── Search bar ── */}
      <form onSubmit={handleSearch} style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30, width: "min(560px, calc(100vw - 300px))" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <svg style={{ position: "absolute", left: 18, pointerEvents: "none", opacity: searchLoading ? 0 : 1, transition: "opacity 0.2s" }} width="17" height="17" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="rgba(0,0,0,0.32)" strokeWidth="1.7"/>
            <path d="M13 13 L17 17" stroke="rgba(0,0,0,0.32)" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
          {searchLoading && <div style={{ position: "absolute", left: 18, width: 17, height: 17, border: "2px solid rgba(0,0,0,0.08)", borderTopColor: "#2a4020", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
          <input
            type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null); }}
            placeholder="Search a location, city, or coordinates…"
            style={{ width: "100%", padding: "14px 90px 14px 48px", fontFamily: DM_SANS, fontSize: "0.92rem", color: "#1a2818", background: "rgba(240,238,230,0.97)", backdropFilter: "blur(20px)", border: searchError ? "1.5px solid rgba(192,57,43,0.5)" : "1.5px solid rgba(0,0,0,0.08)", borderRadius: "100px", outline: "none", boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onFocus={(e) => { if (!searchError) e.target.style.borderColor = "rgba(42,64,32,0.45)"; e.target.style.boxShadow = "0 4px 24px rgba(0,0,0,0.10), 0 0 0 4px rgba(42,64,32,0.07)"; }}
            onBlur={(e) => { if (!searchError) e.target.style.borderColor = "rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 4px 24px rgba(0,0,0,0.10)"; }}
          />
          <button
            type="submit" disabled={searchLoading}
            style={{ position: "absolute", right: 7, padding: "8px 20px", fontFamily: DM_SANS, fontSize: "0.78rem", fontWeight: 600, color: "#f0eee6", background: searchLoading ? "rgba(42,64,32,0.45)" : "#1a2818", border: "none", borderRadius: "100px", cursor: searchLoading ? "not-allowed" : "pointer", transition: "background 0.2s", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => { if (!searchLoading) e.currentTarget.style.background = "#2a4020"; }}
            onMouseLeave={(e) => { if (!searchLoading) e.currentTarget.style.background = "#1a2818"; }}
          >
            Search
          </button>
        </div>
        {searchError && (
          <div style={{ marginTop: 8, padding: "7px 18px", background: "rgba(240,238,230,0.96)", backdropFilter: "blur(10px)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: "100px", fontFamily: DM_SANS, fontSize: "0.75rem", color: "#992b1e", textAlign: "center" }}>
            {searchError}
          </div>
        )}
      </form>

      {/* ── Top-right: counts + generate report ── */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 30, display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "rgba(240,238,230,0.94)", backdropFilter: "blur(14px)", border: "1px solid rgba(0,0,0,0.09)", borderRadius: "2px", padding: "8px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          {[
            { label: "occ",   value: counts.occurrences, color: "#B87830" },
            { label: "kill",  value: counts.roadkill,    color: "#7C5A3C" },
            { label: "pinch", value: counts.pinch,       color: "#2E6028" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center", lineHeight: 1 }}>
              <div style={{ fontFamily: FUTURA, fontSize: "0.88rem", fontWeight: 700, color: "#1a2818" }}>{value}</div>
              <div style={{ fontFamily: FUTURA, fontSize: "0.44rem", letterSpacing: "0.1em", textTransform: "uppercase", color, marginTop: "2px" }}>{label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setReportOpen(true)}
          style={{ fontFamily: FUTURA, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#f0eee6", background: "#2E6028", border: "none", borderRadius: "2px", padding: "10px 16px", cursor: "pointer", transition: "background 0.2s, transform 0.15s", boxShadow: "0 2px 12px rgba(46,96,40,0.35)", whiteSpace: "nowrap" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#3a7030"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#2E6028"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Generate Report ↗
        </button>
      </div>

      {/* ── Report form sheet ── */}
      {reportFormOpen && (
        <ReportSheet
          pin={reportPin}
          onSubmit={submitReport}
          onClose={() => { setReportFormOpen(false); setReportPin(null); setReportMode(false); }}
          onPickOnMap={startMapClickMode}
        />
      )}

      {/* ── Success toast ── */}
      {reportToast && (
        <div style={{
          position: "absolute", bottom: 86, left: "50%", transform: "translateX(-50%)",
          background: "rgba(46,96,40,0.95)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(74,158,92,0.3)", borderRadius: 2,
          padding: "10px 20px", zIndex: 50, pointerEvents: "none",
          fontFamily: DM_SANS, fontSize: "0.8rem", fontWeight: 500, color: "#f0eee6",
          display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap",
          animation: "toastIn 3.5s ease-in-out forwards",
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" fill="rgba(240,238,230,0.15)"/>
            <path d="M3.5 6.5l2 2 4-4" stroke="#f0eee6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Report submitted — thank you for contributing!
        </div>
      )}

      {/* ── PDF Report panel ── */}
      {reportOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end" }} onClick={() => setReportOpen(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,8,0.72)", backdropFilter: "blur(6px)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", zIndex: 1, width: "100%", maxHeight: "88vh", background: "#f0eee6", borderRadius: "12px 12px 0 0", animation: "slideUp 0.35s cubic-bezier(0.2,0.8,0.2,1)", overflow: "hidden" }}>
            <button onClick={() => setReportOpen(false)} style={{ position: "absolute", top: "16px", right: "20px", background: "rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", color: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", zIndex: 2 }}>✕</button>
            <div style={{ padding: "40px 64px 64px", overflowY: "auto", maxHeight: "88vh" }}>
              <div style={{ marginBottom: "40px" }}>
                <div style={{ fontFamily: FUTURA, fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(0,0,0,0.32)", marginBottom: "14px" }}>Action Plan</div>
                <div style={{ fontFamily: FUTURA, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 0.9 }}>
                  <div style={{ fontSize: "clamp(1.8rem, 3vw, 3rem)", color: "#1a2818" }}>Generate</div>
                  <div style={{ fontSize: "clamp(1.8rem, 3vw, 3rem)", color: "#2a4020" }}>Technical Report.</div>
                </div>
                <p style={{ marginTop: "18px", fontFamily: DM_SANS, fontSize: "0.88rem", color: "rgba(0,0,0,0.52)", lineHeight: 1.8, maxWidth: "520px", margin: "18px 0 0" }}>
                  Generates a costed, ranked, cited PDF for the perimeter and species selected on the map. Hand it to a province, NGO, or municipality.
                </p>
              </div>
              <ReportFormStyled species={species} bbox={bbox} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp  { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes toastIn  { 0% { opacity:0; transform:translateX(-50%) translateY(8px); } 12%,80% { opacity:1; transform:translateX(-50%) translateY(0); } 100% { opacity:0; } }
      `}</style>
    </div>
  );
}

// ── PDF Report Form ───────────────────────────────────────────────────────────
function ReportFormStyled({ species: initSpecies, bbox: initBbox }: { species: Species; bbox: string | null }) {
  const [species, setSpecies] = useState<Species>(initSpecies);
  const [bbox, setBbox]       = useState<string>(initBbox ?? REGION_PRESETS[0].bbox);
  const [presetId, setPresetId] = useState<string>(REGION_PRESETS.find((r) => r.bbox === (initBbox ?? REGION_PRESETS[0].bbox))?.id ?? "custom");
  const [expanded, setExpanded]       = useState(false);
  const [interventions, setInterventions] = useState<Set<string>>(new Set(INTERVENTIONS.map((i) => i.id)));
  const [budgetCap, setBudgetCap]     = useState("");
  const [language, setLanguage]       = useState<"en" | "nl">("en");
  const [includeLetters, setIncludeLetters] = useState(true);
  const [resistanceModel, setResistanceModel] = useState<"literature" | "conservative" | "permissive">("literature");

  const BBOX_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
  const bboxValid = (() => {
    if (!BBOX_RE.test(bbox)) return false;
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
    return maxLng > minLng && maxLat > minLat;
  })();

  const downloadUrl = bboxValid ? technicalReportPdfUrl(species, bbox, "attachment") : "#";
  const viewUrl     = bboxValid ? technicalReportPdfUrl(species, bbox, "inline")     : "#";

  function applyPreset(id: string) { setPresetId(id); const p = REGION_PRESETS.find((r) => r.id === id); if (p) setBbox(p.bbox); }
  function toggleIntervention(id: string) { setInterventions((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); }

  const mono: React.CSSProperties = { fontFamily: FUTURA };
  const inputBase: React.CSSProperties = { width: "100%", display: "block", padding: "10px 13px", fontFamily: DM_SANS, fontSize: "0.88rem", color: "#1a2818", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "3px", outline: "none", boxSizing: "border-box" };
  const sectionLabel: React.CSSProperties = { ...mono, fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,0,0,0.38)", marginBottom: "10px", display: "block" };
  const SPECIES_META_FORM: Record<Species, { emoji: string; desc: string }> = {
    badger: { emoji: "🦡", desc: "Generalist, uses hedgerows & woodland edges" }, otter: { emoji: "🦦", desc: "Riparian corridors & waterway connectivity" },
    red_deer: { emoji: "🦌", desc: "Large-scale forest & heath corridors" }, pine_marten: { emoji: "🐾", desc: "Arboreal; needs continuous canopy cover" },
    great_crested_newt: { emoji: "🐸", desc: "Pond networks & rough grassland patches" }, hazel_dormouse: { emoji: "🐭", desc: "Hedgerow & scrub connectivity specialist" },
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "28px" }}>
        <span style={sectionLabel}>Target species</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {SPECIES.map((s) => {
            const meta = SPECIES_META_FORM[s.value]; const active = species === s.value;
            return (
              <button key={s.value} onClick={() => setSpecies(s.value)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 13px", textAlign: "left", background: active ? "rgba(42,64,32,0.08)" : "rgba(0,0,0,0.03)", border: active ? "1.5px solid rgba(42,64,32,0.35)" : "1.5px solid rgba(0,0,0,0.08)", borderRadius: "4px", cursor: "pointer", transition: "all 0.15s" }}>
                <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{meta.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: DM_SANS, fontSize: "0.82rem", fontWeight: 600, color: active ? "#1a2818" : "rgba(0,0,0,0.65)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                  <div style={{ ...mono, fontSize: "0.58rem", color: "rgba(0,0,0,0.35)", fontStyle: "italic", marginTop: "2px" }}>{s.latin}</div>
                </div>
                {active && <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="rgba(42,64,32,0.15)" stroke="#2a4020" strokeWidth="1.5"/><path d="M4 7l2 2 4-4" stroke="#2a4020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: "8px", padding: "8px 12px", background: "rgba(42,64,32,0.05)", borderRadius: "3px", fontFamily: DM_SANS, fontSize: "0.76rem", color: "rgba(0,0,0,0.45)", fontStyle: "italic" }}>{SPECIES_META_FORM[species].desc}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: "24px" }}>
        <div>
          <span style={sectionLabel}>Region preset</span>
          <select value={presetId} onChange={(e) => applyPreset(e.target.value)} style={inputBase}>
            {REGION_PRESETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            <option value="custom">Custom bbox…</option>
          </select>
        </div>
        <div>
          <span style={sectionLabel}>Bounding box <span style={{ opacity: 0.55, marginLeft: "6px", fontSize: "0.52rem" }}>minLng,minLat,maxLng,maxLat</span></span>
          <input type="text" value={bbox} spellCheck={false} onChange={(e) => { setBbox(e.target.value); setPresetId("custom"); }} placeholder="5.74,52.05,5.86,52.12" style={{ ...inputBase, borderColor: !bboxValid && bbox ? "#c0392b" : "rgba(0,0,0,0.12)" }} />
          {!bboxValid && bbox && <span style={{ fontSize: "0.68rem", color: "#c0392b", marginTop: "4px", display: "block" }}>Four comma-separated numbers — max &gt; min on both axes.</span>}
        </div>
      </div>

      <button onClick={() => setExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "6px 0", marginBottom: expanded ? "20px" : "24px" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M5 3l4 4-4 4" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ ...mono, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)" }}>{expanded ? "Hide" : "Expand"} advanced options</span>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "20px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <span style={sectionLabel}>Include intervention types</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {INTERVENTIONS.map(({ id, label, cost, icon }) => { const on = interventions.has(id); return (
                <button key={id} onClick={() => toggleIntervention(id)} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 12px", background: on ? "rgba(42,64,32,0.08)" : "rgba(0,0,0,0.03)", border: on ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)", borderRadius: "100px", cursor: "pointer", transition: "all 0.15s" }}>
                  <span style={{ fontSize: "0.95rem" }}>{icon}</span>
                  <span style={{ fontFamily: DM_SANS, fontSize: "0.76rem", fontWeight: on ? 600 : 400, color: on ? "#1a2818" : "rgba(0,0,0,0.45)" }}>{label}</span>
                  <span style={{ ...mono, fontSize: "0.58rem", color: "rgba(0,0,0,0.3)" }}>{cost}</span>
                </button>
              ); })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <div>
              <span style={sectionLabel}>Resistance model</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["literature", "conservative", "permissive"] as const).map((m) => (
                  <button key={m} onClick={() => setResistanceModel(m)} style={{ flex: 1, padding: "8px 6px", cursor: "pointer", borderRadius: "3px", background: resistanceModel === m ? "rgba(42,64,32,0.1)" : "rgba(0,0,0,0.03)", border: resistanceModel === m ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)", ...mono, fontSize: "0.54rem", letterSpacing: "0.08em", textTransform: "capitalize", color: resistanceModel === m ? "#1a2818" : "rgba(0,0,0,0.45)", transition: "all 0.15s" }}>{m}</button>
                ))}
              </div>
              <div style={{ marginTop: "6px", fontFamily: DM_SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.35)", lineHeight: 1.5 }}>
                {resistanceModel === "literature" && "Uses published species-specific coefficients with citations."}
                {resistanceModel === "conservative" && "Higher resistance values — more corridors flagged for intervention."}
                {resistanceModel === "permissive" && "Lower resistance — only the most critical pinch points surfaced."}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Budget cap (optional)</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.4)", fontFamily: DM_SANS, fontSize: "0.88rem" }}>€</span>
                <input type="number" min="0" step="10000" value={budgetCap} onChange={(e) => setBudgetCap(e.target.value)} placeholder="No limit" style={{ ...inputBase, paddingLeft: "26px" }} />
              </div>
              <div style={{ marginTop: "6px", fontFamily: DM_SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.35)" }}>Interventions ranked by cost-effectiveness within budget.</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <div>
              <span style={sectionLabel}>Report language</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["en", "nl"] as const).map((l) => (
                  <button key={l} onClick={() => setLanguage(l)} style={{ flex: 1, padding: "9px", cursor: "pointer", borderRadius: "3px", background: language === l ? "rgba(42,64,32,0.1)" : "rgba(0,0,0,0.03)", border: language === l ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)", ...mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: language === l ? "#1a2818" : "rgba(0,0,0,0.45)", transition: "all 0.15s" }}>{l === "en" ? "🇬🇧 English" : "🇳🇱 Nederlands"}</button>
                ))}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Landowner letters</span>
              <button onClick={() => setIncludeLetters((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 13px", cursor: "pointer", borderRadius: "3px", background: includeLetters ? "rgba(42,64,32,0.08)" : "rgba(0,0,0,0.03)", border: includeLetters ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)", transition: "all 0.15s" }}>
                <span style={{ fontSize: "1.1rem" }}>{includeLetters ? "✉️" : "—"}</span>
                <span style={{ fontFamily: DM_SANS, fontSize: "0.8rem", color: includeLetters ? "#1a2818" : "rgba(0,0,0,0.4)" }}>{includeLetters ? "Include personalised letters" : "Skip landowner letters"}</span>
              </button>
              <div style={{ marginTop: "6px", fontFamily: DM_SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.35)", lineHeight: 1.5 }}>One letter per cadastral parcel, pre-filled with subsidy info.</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <a href={downloadUrl} aria-disabled={!bboxValid} download={bboxValid ? `corridor-action-plan-${species}.pdf` : undefined} onClick={(e) => { if (!bboxValid) e.preventDefault(); }} style={{ fontFamily: FUTURA, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: bboxValid ? "#f0eee6" : "rgba(0,0,0,0.2)", background: bboxValid ? "#2E6028" : "rgba(0,0,0,0.06)", padding: "13px 28px", borderRadius: "3px", textDecoration: "none", display: "inline-block", cursor: bboxValid ? "pointer" : "not-allowed", transition: "background 0.2s", boxShadow: bboxValid ? "0 2px 12px rgba(46,96,40,0.25)" : "none" }}>
          Download PDF
        </a>
        <a href={viewUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!bboxValid} onClick={(e) => { if (!bboxValid) e.preventDefault(); }} style={{ fontFamily: FUTURA, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: bboxValid ? "#2E6028" : "rgba(0,0,0,0.2)", border: `1.5px solid ${bboxValid ? "rgba(46,96,40,0.35)" : "rgba(0,0,0,0.1)"}`, padding: "12px 28px", borderRadius: "3px", textDecoration: "none", display: "inline-block", cursor: bboxValid ? "pointer" : "not-allowed" }}>
          Open in browser ↗
        </a>
        <p style={{ fontFamily: DM_SANS, fontSize: "0.72rem", color: "rgba(0,0,0,0.32)", lineHeight: 1.6, margin: 0 }}>
          Ranked interventions · cost estimates<br />citations · GIS exports{includeLetters ? " · landowner letters" : ""}
        </p>
      </div>
    </div>
  );
}
