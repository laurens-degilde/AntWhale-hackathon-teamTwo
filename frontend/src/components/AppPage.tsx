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

  const onLayerToggle = useCallback((key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const onCounts = useCallback(
    (next: MapCounts | ((prev: MapCounts) => MapCounts)) => {
      setCounts((prev) => (typeof next === "function" ? next(prev) : next));
    },
    [],
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0d1208",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          flexShrink: 0,
          height: "58px",
          background: "#111a10",
          borderBottom: "1px solid rgba(240,238,230,0.07)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: "24px",
          overflow: "hidden",
        }}
      >
        {/* Decorative trees — left edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            display: "flex",
            alignItems: "flex-end",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <img
            src={tree3Png}
            alt=""
            style={{
              height: "46px",
              width: "auto",
              opacity: 0.18,
              filter: "brightness(0.6)",
            }}
          />
          <img
            src={tree1Png}
            alt=""
            style={{
              height: "52px",
              width: "auto",
              opacity: 0.22,
              filter: "brightness(0.55)",
              marginLeft: "-8px",
            }}
          />
          <img
            src={tree2Png}
            alt=""
            style={{
              height: "38px",
              width: "auto",
              opacity: 0.14,
              filter: "brightness(0.6)",
              marginLeft: "-6px",
            }}
          />
        </div>

        {/* Decorative trees — right edge (mirrored) */}
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "flex-end",
            pointerEvents: "none",
            zIndex: 0,
            transform: "scaleX(-1)",
          }}
        >
          <img
            src={tree2Png}
            alt=""
            style={{
              height: "44px",
              width: "auto",
              opacity: 0.16,
              filter: "brightness(0.6)",
            }}
          />
          <img
            src={tree3Png}
            alt=""
            style={{
              height: "54px",
              width: "auto",
              opacity: 0.2,
              filter: "brightness(0.55)",
              marginLeft: "-8px",
            }}
          />
          <img
            src={tree1Png}
            alt=""
            style={{
              height: "36px",
              width: "auto",
              opacity: 0.13,
              filter: "brightness(0.6)",
              marginLeft: "-6px",
            }}
          />
        </div>

        {/* Brand / back */}
        <button
          onClick={() => navigate("/")}
          style={{
            position: "relative",
            zIndex: 1,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
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
              fontSize: "0.8rem",
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
              fontSize: "0.52rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(240,238,230,0.28)",
              marginLeft: "2px",
            }}
          >
            ← back
          </span>
        </button>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "20px",
            background: "rgba(240,238,230,0.1)",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* Layer toggles */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {LAYER_META.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => onLayerToggle(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "2px",
                cursor: "pointer",
                border: `1px solid ${layers[key] ? color + "80" : "rgba(240,238,230,0.1)"}`,
                background: layers[key] ? color + "18" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: layers[key] ? color : "rgba(240,238,230,0.18)",
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.55rem",
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

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Live counts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            position: "relative",
            zIndex: 1,
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
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#f0eee6",
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.48rem",
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

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "20px",
            background: "rgba(240,238,230,0.1)",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* Generate report CTA */}
        <button
          onClick={() => setReportOpen(true)}
          style={{
            position: "relative",
            zIndex: 1,
            fontFamily:
              "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#1a2818",
            background: "#f0eee6",
            border: "none",
            borderRadius: "2px",
            padding: "8px 16px",
            cursor: "pointer",
            transition: "background 0.2s, transform 0.15s",
            flexShrink: 0,
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
      </header>

      {/* ── Map fills remaining space ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <DataMap
          species={species}
          bbox={bbox}
          layers={layers}
          onSpeciesChange={setSpecies}
          onBboxChange={setBbox}
          onLayerToggle={onLayerToggle}
          onCounts={onCounts}
          onRequestPlan={() => setReportOpen(true)}
        />
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
              {/* trees left */}
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
              {/* trees right (mirrored) */}
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
              {/* fade the forest into beige */}
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
              {/* close button */}
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
              {/* Header */}
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
