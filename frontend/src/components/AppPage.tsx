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

type LayerKey = "ecoducts" | "occurrences" | "roadkill" | "pinch";
interface MapCounts {
  occurrences: number;
  roadkill: number;
  pinch: number;
}

const LAYER_META: { key: LayerKey; label: string; color: string }[] = [
  { key: "ecoducts", label: "Ecoducts", color: "#4a9e5c" },
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
    occurrences: true,
    roadkill: true,
    pinch: true,
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
        background: "#0d1208",
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
          background: "rgba(13,18,8,0.78)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(240,238,230,0.1)",
          borderRadius: "8px",
          cursor: "pointer",
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background 0.2s",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(26,40,24,0.92)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(13,18,8,0.78)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 1.5 L9 1.5 C9 1.5 2.5 5.5 2.5 11 C2.5 14.6 5.4 17.5 9 17.5 C12.6 17.5 15.5 14.6 15.5 11 C15.5 5.5 9 1.5 9 1.5Z"
            stroke="#4a9e5c"
            strokeWidth="1.3"
            fill="rgba(74,158,92,0.12)"
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
            color: "#f0eee6",
          }}
        >
          Wildcross
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.5rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(240,238,230,0.3)",
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
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          width: "min(500px, calc(100vw - 300px))",
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          {/* Search icon */}
          <svg
            style={{
              position: "absolute",
              left: 13,
              pointerEvents: "none",
              opacity: searchLoading ? 0 : 1,
              transition: "opacity 0.2s",
              flexShrink: 0,
            }}
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              stroke="rgba(240,238,230,0.4)"
              strokeWidth="1.6"
            />
            <path
              d="M13 13 L17 17"
              stroke="rgba(240,238,230,0.4)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>

          {/* Loading spinner */}
          {searchLoading && (
            <div
              style={{
                position: "absolute",
                left: 13,
                width: 14,
                height: 14,
                border: "1.5px solid rgba(240,238,230,0.15)",
                borderTopColor: "#4a9e5c",
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
            placeholder="Search location, city, or coordinates…"
            style={{
              width: "100%",
              padding: "10px 72px 10px 38px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.82rem",
              color: "#f0eee6",
              background: "rgba(13,18,8,0.84)",
              backdropFilter: "blur(18px)",
              border: searchError
                ? "1px solid rgba(192,57,43,0.55)"
                : "1px solid rgba(240,238,230,0.12)",
              borderRadius: "8px",
              outline: "none",
              boxSizing: "border-box",
              boxShadow: "0 4px 28px rgba(0,0,0,0.35)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              if (!searchError)
                e.target.style.borderColor = "rgba(74,158,92,0.45)";
              e.target.style.boxShadow =
                "0 4px 28px rgba(0,0,0,0.35), 0 0 0 3px rgba(74,158,92,0.1)";
            }}
            onBlur={(e) => {
              if (!searchError)
                e.target.style.borderColor = "rgba(240,238,230,0.12)";
              e.target.style.boxShadow = "0 4px 28px rgba(0,0,0,0.35)";
            }}
          />

          <button
            type="submit"
            disabled={searchLoading}
            style={{
              position: "absolute",
              right: 6,
              padding: "5px 12px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.52rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1a2818",
              background: searchLoading ? "rgba(74,158,92,0.4)" : "#4a9e5c",
              border: "none",
              borderRadius: "5px",
              cursor: searchLoading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            Go
          </button>
        </div>

        {searchError && (
          <div
            style={{
              marginTop: 6,
              padding: "6px 12px",
              background: "rgba(192,57,43,0.14)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(192,57,43,0.25)",
              borderRadius: "6px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              color: "#e07060",
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
            background: "rgba(13,18,8,0.78)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(240,238,230,0.1)",
            borderRadius: "8px",
            padding: "8px 16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {[
            { label: "occ", value: counts.occurrences, color: "#C89040" },
            { label: "kill", value: counts.roadkill, color: "#c0392b" },
            { label: "pinch", value: counts.pinch, color: "#8e44ad" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center", lineHeight: 1 }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "#f0eee6",
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
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
            color: "#1a2818",
            background: "#f0eee6",
            border: "none",
            borderRadius: "8px",
            padding: "10px 16px",
            cursor: "pointer",
            transition: "background 0.2s, transform 0.15s",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f0eee6";
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
              borderRadius: "6px",
              cursor: "pointer",
              border: `1px solid ${layers[key] ? color + "70" : "rgba(240,238,230,0.08)"}`,
              background: layers[key]
                ? "rgba(13,18,8,0.82)"
                : "rgba(13,18,8,0.5)",
              backdropFilter: "blur(14px)",
              transition: "all 0.2s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                flexShrink: 0,
                background: layers[key] ? color : "rgba(240,238,230,0.18)",
                boxShadow: layers[key] ? `0 0 6px ${color}80` : "none",
                transition: "all 0.2s",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.52rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: layers[key] ? "#f0eee6" : "rgba(240,238,230,0.28)",
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
                    fontFamily: "'JetBrains Mono', monospace",
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

  const BBOX_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
  const bboxValid = (() => {
    if (!BBOX_RE.test(bbox)) return false;
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
    return maxLng > minLng && maxLat > minLat;
  })();

  const downloadUrl = bboxValid
    ? technicalReportPdfUrl(species, bbox, "attachment")
    : "#";
  const viewUrl = bboxValid
    ? technicalReportPdfUrl(species, bbox, "inline")
    : "#";

  function applyPreset(id: string) {
    setPresetId(id);
    const p = REGION_PRESETS.find((r) => r.id === id);
    if (p) setBbox(p.bbox);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    display: "block",
    marginTop: "8px",
    padding: "11px 14px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.88rem",
    color: "#1a2818",
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: "2px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "20px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.6rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(0,0,0,0.4)",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0 32px",
        maxWidth: "860px",
      }}
    >
      <label style={labelStyle}>
        Target species
        <select
          value={species}
          onChange={(e) => setSpecies(e.target.value as Species)}
          style={inputStyle}
        >
          {SPECIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} — {s.latin}
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Region preset
        <select
          value={presetId}
          onChange={(e) => applyPreset(e.target.value)}
          style={inputStyle}
        >
          {REGION_PRESETS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
          <option value="custom">Custom bbox…</option>
        </select>
      </label>

      <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
        Bounding box
        <span style={{ opacity: 0.5, marginLeft: "8px", fontSize: "0.55rem" }}>
          minLng, minLat, maxLng, maxLat
        </span>
        <input
          type="text"
          value={bbox}
          spellCheck={false}
          onChange={(e) => {
            setBbox(e.target.value);
            setPresetId("custom");
          }}
          placeholder="5.74,52.05,5.86,52.12"
          style={{
            ...inputStyle,
            borderColor: !bboxValid && bbox ? "#c0392b" : "rgba(0,0,0,0.12)",
          }}
        />
        {!bboxValid && bbox && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "#c0392b",
              marginTop: "4px",
              display: "block",
            }}
          >
            Four comma-separated numbers — max &gt; min on both axes.
          </span>
        )}
      </label>

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <a
          href={downloadUrl}
          aria-disabled={!bboxValid}
          download={
            bboxValid ? `corridor-action-plan-${species}.pdf` : undefined
          }
          onClick={(e) => {
            if (!bboxValid) e.preventDefault();
          }}
          style={{
            fontFamily:
              "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: bboxValid ? "#f0eee6" : "rgba(0,0,0,0.2)",
            background: bboxValid ? "#1a2818" : "rgba(0,0,0,0.06)",
            padding: "13px 28px",
            borderRadius: "2px",
            textDecoration: "none",
            display: "inline-block",
            cursor: bboxValid ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
        >
          Download PDF
        </a>
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!bboxValid}
          onClick={(e) => {
            if (!bboxValid) e.preventDefault();
          }}
          style={{
            fontFamily:
              "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: bboxValid ? "#2a4020" : "rgba(0,0,0,0.2)",
            border: `1px solid ${bboxValid ? "rgba(42,64,32,0.3)" : "rgba(0,0,0,0.1)"}`,
            padding: "12px 28px",
            borderRadius: "2px",
            textDecoration: "none",
            display: "inline-block",
            cursor: bboxValid ? "pointer" : "not-allowed",
          }}
        >
          Open in browser ↗
        </a>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.72rem",
            color: "rgba(0,0,0,0.32)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Ranked interventions, cost estimates,
          <br />
          citations + GIS exports.
        </p>
      </div>
    </div>
  );
}
