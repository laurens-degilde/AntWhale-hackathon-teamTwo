import { useEffect, useRef, useState } from "react";
import photo1 from "../assets/photo1.jpg";
import photo2 from "../assets/photo2.jpg";
import photo3 from "../assets/photo3.jpg";
import photo4 from "../assets/photo4.jpg";

interface StatItem {
  value: string;
  unit: string;
  label: string;
  sub: string;
  tag: string;
  accent: string;
}

const STATS: StatItem[] = [
  {
    value: "223M",
    unit: "/yr",
    label: "Birds & mammals killed by roads",
    sub: "194M birds + 29M mammals — Grilo et al. 2020",
    tag: "Road mortality",
    accent: "#B87830",
  },
  {
    value: "1,500",
    unit: "ha/day",
    label: "Land paved over in the EU",
    sub: "The entire Netherlands' farmland every 3–4 years — EEA",
    tag: "Habitat loss",
    accent: "#2E6028",
  },
  {
    value: "15%",
    unit: "",
    label: "Species abundance remaining",
    sub: "Down from 40% in 1900. Netherlands average — PBL",
    tag: "Collapse",
    accent: "#7C5A3C",
  },
  {
    value: "215",
    unit: "",
    label: "Fragmentation bottlenecks in NL alone",
    sub: "Caused by roads, railways & waterways — MJPO",
    tag: "Bottlenecks",
    accent: "#C89040",
  },
];

const STACK: { rotate: number; x: number; y: number; scale: number }[] = [
  { rotate: 0, x: 0, y: 0, scale: 1 },
  { rotate: -6, x: -20, y: 16, scale: 0.96 },
  { rotate: 5, x: 18, y: 26, scale: 0.92 },
  { rotate: -3, x: -8, y: 34, scale: 0.88 },
];

export default function StatsSection() {
  const total = STATS.length;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  /* Scroll-driven card index */
  useEffect(() => {
    const onScroll = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const { top, height } = wrapper.getBoundingClientRect();
      const scrollable = height - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.max(0, Math.min(1, -top / scrollable));
      const idx = Math.min(total - 1, Math.floor(progress * total));
      setCurrent((c) => {
        if (c !== idx) setPrev(c);
        return idx;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [total]);

  /* Clear prev after transition */
  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), 450);
    return () => clearTimeout(t);
  }, [prev]);

  /* Swipe on mobile */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(
      (touchStartY.current ?? 0) - e.changedTouches[0].clientY,
    );
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const step = window.innerHeight;
      window.scrollBy({ top: dx > 0 ? step : -step, behavior: "smooth" });
    }
    touchStartX.current = null;
  };

  return (
    /* Tall wrapper — creates scroll space; section sticks inside it */
    <div
      ref={wrapperRef}
      style={{ height: `${total * 100}vh`, position: "relative" }}
    >
      <section
        className="light-section"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          overflow: "hidden",
          gap: "48px",
          padding: "0 56px",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* ── LEFT: header + cards + dots ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "40px", maxWidth: "360px" }}>
            <div style={{
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontWeight: 800,
              color: "#2a4020",
              textTransform: "uppercase",
              lineHeight: 0.92,
              letterSpacing: "-0.01em",
            }}>
              <div style={{ fontSize: "clamp(1.8rem, 2.8vw, 2.4rem)" }}>Habitat</div>
              <div style={{ fontSize: "clamp(1.8rem, 2.8vw, 2.4rem)", marginBottom: "14px" }}>Fragmentation</div>
              <div style={{
                width: "40px",
                height: "3px",
                background: "#2a4020",
                marginBottom: "14px",
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: "clamp(0.72rem, 1vw, 0.85rem)",
                fontWeight: 500,
                letterSpacing: "0.06em",
                lineHeight: 1.6,
                color: "#2a4020",
                opacity: 0.75,
              }}>
                is one of the biggest drivers<br />
                of biodiversity loss in Europe.
              </div>
            </div>
          </div>

          {/* Card stack */}
          <div
            style={{ position: "relative", width: "340px", height: "290px" }}
          >
            {STATS.map((s, i) => {
              const offset = i - current;
              const isExiting = i === prev;
              const direction = prev !== null && prev < current ? 1 : -1;

              /* Hide cards that are behind current and not animating out */
              if (offset < 0 && !isExiting) {
                return (
                  <div
                    key={s.label}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      pointerEvents: "none",
                      borderRadius: "20px",
                      zIndex: 0,
                    }}
                  />
                );
              }

              if (offset >= STACK.length && !isExiting) return null;

              const cfg = STACK[Math.max(0, offset)];
              const isBack = offset > 0;
              const zIndex = isExiting ? 20 : 10 - Math.abs(offset);

              let transform: string;
              let opacity = 1;

              if (isExiting) {
                transform =
                  direction > 0
                    ? "translateX(100px) rotate(10deg) scale(0.88)"
                    : "translateX(-100px) rotate(-10deg) scale(0.88)";
                opacity = 0;
              } else {
                transform = `rotate(${cfg.rotate}deg) translate(${cfg.x}px, ${cfg.y}px) scale(${cfg.scale})`;
              }

              return (
                <div
                  key={s.label}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "20px",
                    zIndex,
                    transform,
                    opacity,
                    transition:
                      "transform 0.45s cubic-bezier(0.2,0.8,0.2,1), opacity 0.4s ease",
                    pointerEvents: "none",
                    willChange: "transform, opacity",
                    overflow: "hidden",
                    background: isBack ? s.accent : "#f0eee6",
                    boxShadow: isBack
                      ? `0 8px 32px ${s.accent}28`
                      : "0 24px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
                    border: isBack ? "none" : "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  {isBack ? (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-8px",
                        right: "16px",
                        fontSize: "8rem",
                        fontWeight: 800,
                        color: "rgba(255,255,255,0.18)",
                        lineHeight: 1,
                        letterSpacing: "-0.05em",
                        userSelect: "none",
                        fontFamily: "'Anton', sans-serif",
                      }}
                    >
                      {s.value}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "32px",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.6rem",
                            letterSpacing: "0.16em",
                            color: "rgba(0,0,0,0.28)",
                            fontWeight: 500,
                            textTransform: "uppercase",
                          }}
                        >
                          {String(current + 1).padStart(2, "0")} /{" "}
                          {String(total).padStart(2, "0")}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            letterSpacing: "0.1em",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            color: s.accent,
                          }}
                        >
                          {s.tag}
                        </span>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: "clamp(3.2rem, 9vw, 4.8rem)",
                            fontWeight: 800,
                            lineHeight: 1,
                            color: "#0d0d0d",
                            letterSpacing: "-0.04em",
                            fontFamily: "'Anton', 'DM Sans', sans-serif",
                          }}
                        >
                          {s.value}
                          {s.unit && (
                            <span
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: 400,
                                color: "rgba(0,0,0,0.28)",
                                marginLeft: "6px",
                                letterSpacing: "0",
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {s.unit}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            color: "#111",
                            marginTop: "10px",
                            lineHeight: 1.3,
                          }}
                        >
                          {s.label}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "rgba(0,0,0,0.4)",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {s.sub}
                      </span>

                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: "3px",
                          background: `linear-gradient(90deg, ${s.accent}, ${s.accent}50)`,
                          borderRadius: "0 0 20px 20px",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dot indicators */}
          <div style={{ display: "flex", gap: "8px", marginTop: "32px" }}>
            {STATS.map((s, i) => (
              <div
                key={i}
                style={{
                  width: i === current ? "22px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: i === current ? s.accent : "rgba(0,0,0,0.14)",
                  transition: "width 0.3s ease, background 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
        {/* end left column */}

        {/* ── RIGHT: hanging photo grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          {[
            { src: photo1, rotate: "-3.5deg", translateY: "0px" },
            { src: photo2, rotate: "4deg", translateY: "18px" },
            { src: photo3, rotate: "-1.5deg", translateY: "12px" },
            { src: photo4, rotate: "3deg", translateY: "-8px" },
          ].map((p, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                transform: `rotate(${p.rotate}) translateY(${p.translateY})`,
                transition: "transform 0.3s ease",
                cursor: "default",
                filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.18))",
              }}
            >
              {/* Clip frame */}
              <div
                style={{
                  width: "180px",
                  height: "200px",
                  overflow: "hidden",
                  background: "#e8e6de",
                  borderRadius: "2px",
                  border: "6px solid #f5f3ec",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                <img
                  src={p.src}
                  alt={`Wildlife photo ${i + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
              {/* Binder clip */}
              <div
                style={{
                  position: "absolute",
                  top: "-10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "18px",
                  height: "14px",
                  background: "#888",
                  borderRadius: "2px 2px 0 0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: "-4px",
                    left: "3px",
                    right: "3px",
                    height: "4px",
                    background: "#666",
                    borderRadius: "0 0 2px 2px",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Scroll hint — only on first card */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            opacity: current === total - 1 ? 0 : 0.45,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#000",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Scroll
          </span>
          <svg
            width="12"
            height="18"
            viewBox="0 0 12 18"
            fill="none"
            style={{ animation: "scrollBounce 1.6s ease-in-out infinite" }}
          >
            <path
              d="M6 1v10M2 8l4 4 4-4"
              stroke="#000"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <style>{`
          @keyframes scrollBounce {
            0%, 100% { transform: translateY(0); opacity: 0.6; }
            50%       { transform: translateY(4px); opacity: 1; }
          }
        `}</style>
      </section>
    </div>
  );
}
