
interface HeroSectionProps {
  onEnterApp: () => void;
}

export default function HeroSection({ onEnterApp }: HeroSectionProps) {
  const animIn = true;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,300;1,9..144,400&family=DM+Sans:wght@400;500&display=swap');

        @keyframes wc-zoom {
          from { transform: scale(1.08); }
          to   { transform: scale(1); }
        }

        .wc-cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 18px 30px;
          border: 1px solid rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          cursor: pointer;
          transition:
            background 0.45s ease,
            color 0.45s ease,
            border-color 0.45s ease,
            padding-right 0.45s ease;
          overflow: hidden;
        }
        .wc-cta:hover {
          background: #fff;
          color: #0a1410;
          border-color: #fff;
          padding-right: 38px;
        }
        .wc-cta-arrow { transition: transform 0.45s cubic-bezier(0.2,0.8,0.2,1); }
        .wc-cta:hover .wc-cta-arrow { transform: translateX(8px); }

        .wc-grain {
          position: absolute;
          inset: 0;
          opacity: 0.10;
          mix-blend-mode: overlay;
          pointer-events: none;
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }

        @media (max-width: 768px) {
          .wc-frame { top: 14px !important; left: 14px !important; right: 14px !important; bottom: 14px !important; }
          .wc-topbar { padding: 26px 28px !important; }
          .wc-topbar-meta span:nth-child(1),
          .wc-topbar-meta span:nth-child(2) { display: none !important; }
          .wc-content { padding: 0 32px 56px 32px !important; }
          .wc-vert { display: none !important; }
        }
      `}</style>

      <section
        style={{
          position: "relative",
          minHeight: "100svh",
          width: "100%",
          overflow: "hidden",
          backgroundColor: "#080c09",
          color: "#fff",
        }}
      >
        {/* Hero image — slow ken-burns zoom */}
        <img
          src="/hero-image.jpeg"
          alt="Wildlife corridor aerial view"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 35%",
            zIndex: 0,
            animation: "wc-zoom 12s ease-out forwards",
          }}
        />

        {/* Cinematic vertical gradient */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(6,12,9,0.30) 0%, rgba(6,12,9,0.06) 28%, rgba(6,12,9,0.04) 55%, rgba(4,8,6,0.50) 88%, rgba(2,5,3,0.70) 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Radial vignette */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 75% 95% at 50% 55%, transparent 35%, rgba(0,0,0,0.25) 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Film grain */}
        <div className="wc-grain" style={{ zIndex: 2 }} />

        {/* Top bar — brand + edition */}
        <div
          className="wc-topbar"
          style={{
            position: "relative",
            zIndex: 4,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "42px 56px",
            opacity: animIn ? 1 : 0,
            transform: animIn ? "translateY(0)" : "translateY(-10px)",
            transition: "opacity 0.9s ease 0.5s, transform 0.9s ease 0.5s",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}></div>
          <div
            className="wc-topbar-meta"
            style={{
              display: "flex",
              gap: 28,
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          ></div>
        </div>

        {/* Main content — centered vertically, upper half */}
        <div
          className="wc-content"
          style={{
            position: "relative",
            zIndex: 4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px 0 96px",
            minHeight: "calc(100svh - 130px)",
            paddingTop: "8vh",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.78)",
              marginBottom: 30,
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: animIn ? 1 : 0,
              transform: animIn ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.9s ease 0.75s, transform 0.9s ease 0.75s",
            }}
          >
            <span
              style={{
                width: 36,
                height: 1,
                background: "rgba(255,255,255,0.55)",
              }}
            />
            <span style={{ display: "inline-block", position: "relative" }}>
              <span style={{
                position: "absolute",
                top: "-3px",
                bottom: "-8px",
                left: "-10px",
                right: "-14px",
                background: "linear-gradient(90deg, transparent 0%, rgba(146,102,35,0.50) 9%, rgba(146,102,35,0.72) 28%, rgba(146,102,35,0.76) 62%, rgba(146,102,35,0.62) 80%, transparent 100%)",
                transform: "skewX(-7deg) skewY(0.4deg)",
                borderRadius: "0",
              }} />
              <span style={{ position: "relative" }}>A Wildlife Corridor Initiative</span>
            </span>
          </div>

          {/* MASSIVE HEADLINE */}
          <h1
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: "clamp(48px, 9vw, 130px)",
              lineHeight: 0.85,
              fontWeight: 400,
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              opacity: animIn ? 1 : 0,
              transform: animIn ? "translateY(0)" : "translateY(48px)",
              transition:
                "opacity 1.3s cubic-bezier(0.2,0.8,0.2,1) 0.95s, transform 1.3s cubic-bezier(0.2,0.8,0.2,1) 0.95s",
              textShadow:
                "0 4px 24px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.9)",
            }}
          >
            Wildcross
          </h1>

          {/* Sweeping divider line */}
          <div
            aria-hidden
            style={{
              marginTop: 38,
              marginBottom: 30,
              height: 1,
              background: "rgba(255,255,255,0.55)",
              transformOrigin: "left center",
              transform: animIn ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 1.3s cubic-bezier(0.7,0,0.3,1) 1.5s",
              maxWidth: 760,
            }}
          />

          {/* Tagline */}
          <p
            style={{
              fontFamily:
                "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              fontSize: "clamp(13px, 1.1vw, 17px)",
              lineHeight: 1.4,
              fontWeight: 300,
              fontStyle: "normal",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.92)",
              margin: 0,
              maxWidth: 580,
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              opacity: animIn ? 1 : 0,
              transform: animIn ? "translateY(0)" : "translateY(18px)",
              transition: "opacity 1s ease 1.85s, transform 1s ease 1.85s",
            }}
          >
            Fighting against{" "}
            <span style={{ color: "#fff", fontWeight: 500 }}>
              habitat fragmentation
            </span>
            .
          </p>

          {/* CTA — below tagline */}
          <div
            style={{
              marginTop: 32,
              opacity: animIn ? 1 : 0,
              transform: animIn ? "translateY(0)" : "translateY(18px)",
              transition: "opacity 1s ease 2.1s, transform 1s ease 2.1s",
            }}
          >
            <button className="wc-cta" onClick={onEnterApp}>
              <span>Enter the Field</span>
              <svg
                className="wc-cta-arrow"
                width="20"
                height="10"
                viewBox="0 0 20 10"
                fill="none"
              >
                <path
                  d="M0 5 H17 M13 1 L17 5 L13 9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
