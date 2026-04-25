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

type LayerKey = "ecoducts" | "occurrences" | "roadkill" | "pinch" | "patches" | "connectivity";
interface MapCounts {
  occurrences: number;
  roadkill: number;
  pinch: number;
}

const LAYER_META: { key: LayerKey; label: string; color: string }[] = [
  { key: "ecoducts", label: "Ecoducts", color: "#4a9e5c" },
  { key: "patches", label: "Habitats", color: "#2E6028" },
  { key: "occurrences", label: "Occurrences", color: "#C89040" },
  { key: "roadkill", label: "Road-kill", color: "#c0392b" },
  { key: "pinch", label: "Pinch pts", color: "#8e44ad" },
];

async function geocode(
  query: string,
): Promise<{ lat: number; lng: number; zoom: number } | null> {
  // Try coordinate patterns: "lat, lng" or "lat lng"
  const coordMatch = query
    .trim()
    .match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const a = parseFloat(coordMatch[1]);
    const b = parseFloat(coordMatch[2]);
    if (!isNaN(a) && !isNaN(b)) {
      const [lat, lng] =
        Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : [b, a];
      return { lat, lng, zoom: 13 };
    }
  }
  // Nominatim
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { "Accept-Language": "en" } },
  );
  const data = await res.json();
  if (!data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    zoom: 12,
  };
}

export default function AppPage() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species>("badger");
  const [bbox, setBbox] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    ecoducts: true,
    patches: true,
    occurrences: true,
    roadkill: true,
    pinch: true,
    connectivity: true,
  });
  const [counts, setCounts] = useState<MapCounts>({
    occurrences: 0,
    roadkill: 0,
    pinch: 0,
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    _seq: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const onLayerToggle = useCallback((key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const onCounts = useCallback(
    (next: MapCounts | ((prev: MapCounts) => MapCounts)) => {
      setCounts((prev) => (typeof next === "function" ? next(prev) : next));
    },
    [],
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await geocode(searchQuery);
      if (!result) {
        setSearchError("Location not found");
      } else {
        setFlyTo({ ...result, _seq: Date.now() });
      }
    } catch {
      setSearchError("Search failed");
    }
    setSearchLoading(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f0eee6",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Map fills everything ── */}
      <DataMap
        species={species}
        bbox={bbox}
        layers={layers}
        flyTo={flyTo}
        onSpeciesChange={setSpecies}
        onBboxChange={setBbox}
        onLayerToggle={onLayerToggle}
        onCounts={onCounts}
        onRequestPlan={() => setReportOpen(true)}
      />

      {/* ── Floating top-left: back / brand ── */}
      <button
        onClick={() => navigate("/")}
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 20,
          background: "rgba(240,238,230,0.94)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(0,0,0,0.09)",
          borderRadius: "2px",
          cursor: "pointer",
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background 0.2s",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(240,238,230,0.94)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 1.5 L9 1.5 C9 1.5 2.5 5.5 2.5 11 C2.5 14.6 5.4 17.5 9 17.5 C12.6 17.5 15.5 14.6 15.5 11 C15.5 5.5 9 1.5 9 1.5Z"
            stroke="#2a4020"
            strokeWidth="1.3"
            fill="rgba(42,64,32,0.1)"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontFamily:
              "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#1a2818",
          }}
        >
          Wildcross
        </span>
        <span
          style={{
            fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: "0.5rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.28)",
          }}
        >
          ← back
        </span>
      </button>

      {/* ── Floating search bar (top-center) ── */}
      <form
        onSubmit={handleSearch}
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          width: "min(580px, calc(100vw - 280px))",
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          {/* Search icon */}
          <svg
            style={{
              position: "absolute",
              left: 18,
              pointerEvents: "none",
              opacity: searchLoading ? 0 : 1,
              transition: "opacity 0.2s",
              flexShrink: 0,
            }}
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              stroke="rgba(0,0,0,0.32)"
              strokeWidth="1.7"
            />
            <path
              d="M13 13 L17 17"
              stroke="rgba(0,0,0,0.32)"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          {/* Loading spinner */}
          {searchLoading && (
            <div
              style={{
                position: "absolute",
                left: 18,
                width: 17,
                height: 17,
                border: "2px solid rgba(0,0,0,0.08)",
                borderTopColor: "#2a4020",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
          )}

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError(null);
            }}
            placeholder="Search a location, city, or coordinates…"
            style={{
              width: "100%",
              padding: "14px 90px 14px 48px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.92rem",
              color: "#1a2818",
              background: "rgba(240,238,230,0.97)",
              backdropFilter: "blur(20px)",
              border: searchError
                ? "1.5px solid rgba(192,57,43,0.5)"
                : "1.5px solid rgba(0,0,0,0.08)",
              borderRadius: "100px",
              outline: "none",
              boxSizing: "border-box",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              if (!searchError)
                e.target.style.borderColor = "rgba(42,64,32,0.45)";
              e.target.style.boxShadow =
                "0 4px 24px rgba(0,0,0,0.10), 0 0 0 4px rgba(42,64,32,0.07)";
            }}
            onBlur={(e) => {
              if (!searchError)
                e.target.style.borderColor = "rgba(0,0,0,0.08)";
              e.target.style.boxShadow = "0 4px 24px rgba(0,0,0,0.10)";
            }}
          />

          <button
            type="submit"
            disabled={searchLoading}
            style={{
              position: "absolute",
              right: 7,
              padding: "8px 20px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "#f0eee6",
              background: searchLoading ? "rgba(42,64,32,0.45)" : "#1a2818",
              border: "none",
              borderRadius: "100px",
              cursor: searchLoading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!searchLoading) e.currentTarget.style.background = "#2a4020";
            }}
            onMouseLeave={(e) => {
              if (!searchLoading) e.currentTarget.style.background = "#1a2818";
            }}
          >
            Search
          </button>
        </div>

        {searchError && (
          <div
            style={{
              marginTop: 8,
              padding: "7px 18px",
              background: "rgba(240,238,230,0.96)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(192,57,43,0.2)",
              borderRadius: "100px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.75rem",
              color: "#992b1e",
              textAlign: "center",
            }}
          >
            {searchError}
          </div>
        )}
      </form>

      {/* ── Floating top-right: live counts + generate report ── */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {/* Live counts pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            background: "rgba(240,238,230,0.94)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(0,0,0,0.09)",
            borderRadius: "2px",
            padding: "8px 16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          {[
            { label: "occ", value: counts.occurrences, color: "#B87830" },
            { label: "kill", value: counts.roadkill, color: "#7C5A3C" },
            { label: "pinch", value: counts.pinch, color: "#2E6028" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center", lineHeight: 1 }}>
              <div
                style={{
                  fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "#1a2818",
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                  fontSize: "0.44rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color,
                  marginTop: "2px",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Generate Report */}
        <button
          onClick={() => setReportOpen(true)}
          style={{
            fontFamily:
              "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#f0eee6",
            background: "#2E6028",
            border: "none",
            borderRadius: "2px",
            padding: "10px 16px",
            cursor: "pointer",
            transition: "background 0.2s, transform 0.15s",
            boxShadow: "0 2px 12px rgba(46,96,40,0.35)",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#3a7030";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#2E6028";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Generate Report ↗
        </button>
      </div>

      {/* ── Floating bottom-left: layer toggles ── */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 16,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        {LAYER_META.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => onLayerToggle(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "2px",
              cursor: "pointer",
              border: `1px solid ${layers[key] ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)"}`,
              background: layers[key]
                ? "rgba(240,238,230,0.96)"
                : "rgba(240,238,230,0.6)",
              backdropFilter: "blur(14px)",
              transition: "all 0.2s",
              boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                flexShrink: 0,
                background: layers[key] ? color : "rgba(0,0,0,0.15)",
                transition: "all 0.2s",
              }}
            />
            <span
              style={{
                fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                fontSize: "0.52rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: layers[key] ? "#1a2818" : "rgba(0,0,0,0.28)",
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Report slide-up panel ── */}
      {reportOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setReportOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10,15,8,0.72)",
              backdropFilter: "blur(6px)",
            }}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#f0eee6",
              borderRadius: "12px 12px 0 0",
              animation: "slideUp 0.35s cubic-bezier(0.2,0.8,0.2,1)",
              overflow: "hidden",
            }}
          >
            {/* Forest strip at top of panel */}
            <div
              style={{
                position: "relative",
                height: "64px",
                background: "#1a2818",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {[
                { src: tree3Png, left: "-10px", h: "80px", op: 0.35 },
                { src: tree1Png, left: "30px", h: "90px", op: 0.45 },
                { src: tree2Png, left: "72px", h: "68px", op: 0.3 },
                { src: tree3Png, left: "108px", h: "82px", op: 0.38 },
                { src: tree1Png, left: "148px", h: "72px", op: 0.28 },
                { src: tree2Png, left: "186px", h: "86px", op: 0.4 },
                { src: tree3Png, left: "228px", h: "70px", op: 0.32 },
                { src: tree1Png, left: "264px", h: "88px", op: 0.36 },
                { src: tree2Png, left: "304px", h: "74px", op: 0.28 },
                { src: tree3Png, left: "340px", h: "82px", op: 0.34 },
              ].map((t, i) => (
                <img
                  key={i}
                  src={t.src}
                  alt=""
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: t.left,
                    height: t.h,
                    width: "auto",
                    opacity: t.op,
                    filter: "brightness(0.7)",
                  }}
                />
              ))}
              {[
                { src: tree1Png, right: "-10px", h: "82px", op: 0.35 },
                { src: tree2Png, right: "28px", h: "72px", op: 0.4 },
                { src: tree3Png, right: "66px", h: "88px", op: 0.32 },
                { src: tree1Png, right: "106px", h: "68px", op: 0.3 },
                { src: tree2Png, right: "142px", h: "84px", op: 0.38 },
                { src: tree3Png, right: "182px", h: "74px", op: 0.28 },
                { src: tree1Png, right: "218px", h: "80px", op: 0.34 },
                { src: tree2Png, right: "256px", h: "70px", op: 0.3 },
                { src: tree3Png, right: "292px", h: "86px", op: 0.36 },
                { src: tree1Png, right: "330px", h: "76px", op: 0.28 },
              ].map((t, i) => (
                <img
                  key={i}
                  src={t.src}
                  alt=""
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: t.right,
                    height: t.h,
                    width: "auto",
                    opacity: t.op,
                    filter: "brightness(0.7)",
                    transform: "scaleX(-1)",
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "24px",
                  background:
                    "linear-gradient(to bottom, transparent, #f0eee6)",
                }}
              />
              <button
                onClick={() => setReportOpen(false)}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "20px",
                  background: "rgba(240,238,230,0.12)",
                  border: "1px solid rgba(240,238,230,0.2)",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  color: "rgba(240,238,230,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  zIndex: 2,
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "40px 64px 64px" }}>
              <div style={{ marginBottom: "40px" }}>
                <div
                  style={{
                    fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                    fontSize: "0.65rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(0,0,0,0.32)",
                    marginBottom: "14px",
                  }}
                >
                  Action Plan
                </div>
                <div
                  style={{
                    fontFamily:
                      "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    lineHeight: 0.9,
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(1.8rem, 3vw, 3rem)",
                      color: "#1a2818",
                    }}
                  >
                    Generate
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(1.8rem, 3vw, 3rem)",
                      color: "#2a4020",
                    }}
                  >
                    Technical Report.
                  </div>
                </div>
                <p
                  style={{
                    marginTop: "18px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.88rem",
                    color: "rgba(0,0,0,0.52)",
                    lineHeight: 1.8,
                    maxWidth: "520px",
                    margin: "18px 0 0",
                  }}
                >
                  Generates a costed, ranked, cited PDF for the perimeter and
                  species selected on the map. Hand it to a province, NGO, or
                  municipality.
                </p>
              </div>

              <ReportFormStyled species={species} bbox={bbox} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const SPECIES_META: Record<Species, { emoji: string; desc: string }> = {
  badger:             { emoji: "🦡", desc: "Generalist, uses hedgerows & woodland edges" },
  otter:              { emoji: "🦦", desc: "Riparian corridors & waterway connectivity" },
  red_deer:           { emoji: "🦌", desc: "Large-scale forest & heath corridors" },
  pine_marten:        { emoji: "🐾", desc: "Arboreal; needs continuous canopy cover" },
  great_crested_newt: { emoji: "🐸", desc: "Pond networks & rough grassland patches" },
  hazel_dormouse:     { emoji: "🐭", desc: "Hedgerow & scrub connectivity specialist" },
};

const INTERVENTIONS = [
  { id: "ecoduct",   label: "Ecoduct",           cost: "€2M–€8M",    icon: "🌉" },
  { id: "underpass", label: "Wildlife underpass", cost: "€200k–€800k", icon: "🚇" },
  { id: "culvert",   label: "Mammal culvert",     cost: "€15k–€60k",  icon: "🐀" },
  { id: "hedgerow",  label: "Hedgerow planting",  cost: "€8–15/m",    icon: "🌿" },
  { id: "fence",     label: "Fence modification", cost: "–",          icon: "🔓" },
  { id: "stepping",  label: "Stepping stone",     cost: "varies",     icon: "🪨" },
];

/* ── Report form styled to design system ── */
function ReportFormStyled({
  species: initSpecies,
  bbox: initBbox,
}: {
  species: Species;
  bbox: string | null;
}) {
  const [species, setSpecies] = useState<Species>(initSpecies);
  const [bbox, setBbox] = useState<string>(initBbox ?? REGION_PRESETS[0].bbox);
  const [presetId, setPresetId] = useState<string>(
    REGION_PRESETS.find((r) => r.bbox === (initBbox ?? REGION_PRESETS[0].bbox))
      ?.id ?? "custom",
  );
  const [expanded, setExpanded] = useState(false);
  const [interventions, setInterventions] = useState<Set<string>>(
    new Set(INTERVENTIONS.map((i) => i.id)),
  );
  const [budgetCap, setBudgetCap] = useState("");
  const [language, setLanguage] = useState<"en" | "nl">("en");
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

  function applyPreset(id: string) {
    setPresetId(id);
    const p = REGION_PRESETS.find((r) => r.id === id);
    if (p) setBbox(p.bbox);
  }
  function toggleIntervention(id: string) {
    setInterventions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const mono: React.CSSProperties = { fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif" };
  const inputBase: React.CSSProperties = {
    width: "100%", display: "block", padding: "10px 13px",
    fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem",
    color: "#1a2818", background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.12)", borderRadius: "3px",
    outline: "none", boxSizing: "border-box",
  };
  const sectionLabel: React.CSSProperties = {
    ...mono, fontSize: "0.58rem", letterSpacing: "0.16em",
    textTransform: "uppercase", color: "rgba(0,0,0,0.38)",
    marginBottom: "10px", display: "block",
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* ── Species picker ── */}
      <div style={{ marginBottom: "28px" }}>
        <span style={sectionLabel}>Target species</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {SPECIES.map((s) => {
            const meta = SPECIES_META[s.value];
            const active = species === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSpecies(s.value)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 13px", textAlign: "left",
                  background: active ? "rgba(42,64,32,0.08)" : "rgba(0,0,0,0.03)",
                  border: active ? "1.5px solid rgba(42,64,32,0.35)" : "1.5px solid rgba(0,0,0,0.08)",
                  borderRadius: "4px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{meta.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
                    fontWeight: 600, color: active ? "#1a2818" : "rgba(0,0,0,0.65)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{s.label}</div>
                  <div style={{
                    ...mono, fontSize: "0.58rem", color: "rgba(0,0,0,0.35)",
                    fontStyle: "italic", marginTop: "2px",
                  }}>{s.latin}</div>
                </div>
                {active && (
                  <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" fill="rgba(42,64,32,0.15)" stroke="#2a4020" strokeWidth="1.5"/>
                    <path d="M4 7l2 2 4-4" stroke="#2a4020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <div style={{
          marginTop: "8px", padding: "8px 12px",
          background: "rgba(42,64,32,0.05)", borderRadius: "3px",
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.76rem",
          color: "rgba(0,0,0,0.45)", fontStyle: "italic",
        }}>
          {SPECIES_META[species].desc}
        </div>
      </div>

      {/* ── Region ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: "24px" }}>
        <div>
          <span style={sectionLabel}>Region preset</span>
          <select value={presetId} onChange={(e) => applyPreset(e.target.value)} style={inputBase}>
            {REGION_PRESETS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
            <option value="custom">Custom bbox…</option>
          </select>
        </div>
        <div>
          <span style={sectionLabel}>
            Bounding box
            <span style={{ opacity: 0.55, marginLeft: "6px", fontSize: "0.52rem" }}>minLng,minLat,maxLng,maxLat</span>
          </span>
          <input
            type="text" value={bbox} spellCheck={false}
            onChange={(e) => { setBbox(e.target.value); setPresetId("custom"); }}
            placeholder="5.74,52.05,5.86,52.12"
            style={{ ...inputBase, borderColor: !bboxValid && bbox ? "#c0392b" : "rgba(0,0,0,0.12)" }}
          />
          {!bboxValid && bbox && (
            <span style={{ fontSize: "0.68rem", color: "#c0392b", marginTop: "4px", display: "block" }}>
              Four comma-separated numbers — max &gt; min on both axes.
            </span>
          )}
        </div>
      </div>

      {/* ── Advanced options toggle ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "none", border: "none", cursor: "pointer",
          padding: "6px 0", marginBottom: expanded ? "20px" : "24px",
        }}
      >
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M5 3l4 4-4 4" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ ...mono, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)" }}>
          {expanded ? "Hide" : "Expand"} advanced options
        </span>
      </button>

      {/* ── Advanced section ── */}
      {expanded && (
        <div style={{
          borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "20px", marginBottom: "24px",
          display: "flex", flexDirection: "column", gap: "24px",
        }}>
          {/* Intervention types */}
          <div>
            <span style={sectionLabel}>Include intervention types</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {INTERVENTIONS.map(({ id, label, cost, icon }) => {
                const on = interventions.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleIntervention(id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "7px",
                      padding: "7px 12px",
                      background: on ? "rgba(42,64,32,0.08)" : "rgba(0,0,0,0.03)",
                      border: on ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
                      borderRadius: "100px", cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "0.95rem" }}>{icon}</span>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: "0.76rem",
                      fontWeight: on ? 600 : 400,
                      color: on ? "#1a2818" : "rgba(0,0,0,0.45)",
                    }}>{label}</span>
                    <span style={{ ...mono, fontSize: "0.58rem", color: "rgba(0,0,0,0.3)" }}>{cost}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resistance model + budget */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <div>
              <span style={sectionLabel}>Resistance model</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["literature", "conservative", "permissive"] as const).map((m) => (
                  <button key={m} onClick={() => setResistanceModel(m)} style={{
                    flex: 1, padding: "8px 6px", cursor: "pointer", borderRadius: "3px",
                    background: resistanceModel === m ? "rgba(42,64,32,0.1)" : "rgba(0,0,0,0.03)",
                    border: resistanceModel === m ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
                    ...mono, fontSize: "0.54rem", letterSpacing: "0.08em", textTransform: "capitalize",
                    color: resistanceModel === m ? "#1a2818" : "rgba(0,0,0,0.45)",
                    transition: "all 0.15s",
                  }}>{m}</button>
                ))}
              </div>
              <div style={{ marginTop: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(0,0,0,0.35)", lineHeight: 1.5 }}>
                {resistanceModel === "literature" && "Uses published species-specific coefficients with citations."}
                {resistanceModel === "conservative" && "Higher resistance values — more corridors flagged for intervention."}
                {resistanceModel === "permissive" && "Lower resistance — only the most critical pinch points surfaced."}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Budget cap (optional)</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.4)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem" }}>€</span>
                <input
                  type="number" min="0" step="10000"
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(e.target.value)}
                  placeholder="No limit"
                  style={{ ...inputBase, paddingLeft: "26px" }}
                />
              </div>
              <div style={{ marginTop: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(0,0,0,0.35)" }}>
                Interventions ranked by cost-effectiveness within budget.
              </div>
            </div>
          </div>

          {/* Language + landowner letters */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <div>
              <span style={sectionLabel}>Report language</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["en", "nl"] as const).map((l) => (
                  <button key={l} onClick={() => setLanguage(l)} style={{
                    flex: 1, padding: "9px", cursor: "pointer", borderRadius: "3px",
                    background: language === l ? "rgba(42,64,32,0.1)" : "rgba(0,0,0,0.03)",
                    border: language === l ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
                    ...mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase",
                    color: language === l ? "#1a2818" : "rgba(0,0,0,0.45)",
                    transition: "all 0.15s",
                  }}>{l === "en" ? "🇬🇧 English" : "🇳🇱 Nederlands"}</button>
                ))}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Landowner letters</span>
              <button
                onClick={() => setIncludeLetters((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: "100%", padding: "9px 13px", cursor: "pointer", borderRadius: "3px",
                  background: includeLetters ? "rgba(42,64,32,0.08)" : "rgba(0,0,0,0.03)",
                  border: includeLetters ? "1.5px solid rgba(42,64,32,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{includeLetters ? "✉️" : "—"}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: includeLetters ? "#1a2818" : "rgba(0,0,0,0.4)" }}>
                  {includeLetters ? "Include personalised letters" : "Skip landowner letters"}
                </span>
              </button>
              <div style={{ marginTop: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(0,0,0,0.35)", lineHeight: 1.5 }}>
                One letter per cadastral parcel, pre-filled with subsidy info.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate buttons ── */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <a
          href={downloadUrl}
          aria-disabled={!bboxValid}
          download={bboxValid ? `corridor-action-plan-${species}.pdf` : undefined}
          onClick={(e) => { if (!bboxValid) e.preventDefault(); }}
          style={{
            fontFamily: "'Futura','Trebuchet MS','Century Gothic',sans-serif",
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
            color: bboxValid ? "#f0eee6" : "rgba(0,0,0,0.2)",
            background: bboxValid ? "#2E6028" : "rgba(0,0,0,0.06)",
            padding: "13px 28px", borderRadius: "3px", textDecoration: "none", display: "inline-block",
            cursor: bboxValid ? "pointer" : "not-allowed", transition: "background 0.2s",
            boxShadow: bboxValid ? "0 2px 12px rgba(46,96,40,0.25)" : "none",
          }}
        >
          Download PDF
        </a>
        <a
          href={viewUrl}
          target="_blank" rel="noopener noreferrer"
          aria-disabled={!bboxValid}
          onClick={(e) => { if (!bboxValid) e.preventDefault(); }}
          style={{
            fontFamily: "'Futura','Trebuchet MS','Century Gothic',sans-serif",
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
            color: bboxValid ? "#2E6028" : "rgba(0,0,0,0.2)",
            border: `1.5px solid ${bboxValid ? "rgba(46,96,40,0.35)" : "rgba(0,0,0,0.1)"}`,
            padding: "12px 28px", borderRadius: "3px", textDecoration: "none", display: "inline-block",
            cursor: bboxValid ? "pointer" : "not-allowed",
          }}
        >
          Open in browser ↗
        </a>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem",
          color: "rgba(0,0,0,0.32)", lineHeight: 1.6, margin: 0,
        }}>
          Ranked interventions · cost estimates
          <br />
          citations · GIS exports{includeLetters ? " · landowner letters" : ""}
        </p>
      </div>
    </div>
  );
}
