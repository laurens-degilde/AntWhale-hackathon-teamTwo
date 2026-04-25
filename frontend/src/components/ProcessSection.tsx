import signPng from "../assets/sign.png";
import tree1Png from "../assets/tree1.png";
import tree2Png from "../assets/tree2.png";
import tree3Png from "../assets/tree3.png";

// Horizontal winding road — gentle waves left to right
const ROAD_PATH =
  "M 0 210 C 80 210 120 150 175 150" +
  " C 230 150 270 270 350 270" +
  " C 430 270 470 150 525 150" +
  " C 580 150 620 270 700 270" +
  " C 780 270 820 150 875 150" +
  " C 930 150 970 270 1050 270" +
  " C 1130 270 1180 210 1260 210";

interface Sign {
  cx: number;
  cy: number;
  pos: "top" | "bottom";
  step: string;
  title: string;
  sub: string;
}

const SIGNS: Sign[] = [
  {
    cx: 175,
    cy: 150,
    pos: "top",
    step: "01",
    title: "Assemble the Landscape",
    sub: "OSM · Copernicus · GBIF · Kadaster",
  },
  {
    cx: 350,
    cy: 270,
    pos: "bottom",
    step: "02",
    title: "Build Resistance Surfaces",
    sub: "Per-species friction maps",
  },
  {
    cx: 525,
    cy: 150,
    pos: "top",
    step: "03",
    title: "Run Connectivity Analysis",
    sub: "Circuitscape pinch-point modelling",
  },
  {
    cx: 700,
    cy: 270,
    pos: "bottom",
    step: "04",
    title: "Identify Interventions",
    sub: "Ranked by cost-effectiveness",
  },
  {
    cx: 875,
    cy: 150,
    pos: "top",
    step: "05",
    title: "Handle the Paperwork",
    sub: "Letters · subsidies · GIS exports",
  },
  {
    cx: 1050,
    cy: 270,
    pos: "bottom",
    step: "06",
    title: "Monthly Refresh",
    sub: "Living document, auto-updated",
  },
];

const IMG = 64;

function SignNode({ s }: { s: Sign }) {
  const isTop = s.pos === "top";
  // Labels sit above sign for top, below sign for bottom
  const stepY = isTop ? s.cy - IMG / 2 - 38 : s.cy + IMG / 2 + 22;
  const titleY = isTop ? s.cy - IMG / 2 - 24 : s.cy + IMG / 2 + 36;
  const subY = isTop ? s.cy - IMG / 2 - 10 : s.cy + IMG / 2 + 49;

  return (
    <g>
      {/* Sign image */}
      <image
        href={signPng}
        x={s.cx - IMG / 2}
        y={s.cy - IMG / 2}
        width={IMG}
        height={IMG}
      />

      {/* Step number */}
      <text
        x={s.cx}
        y={stepY}
        textAnchor="middle"
        fontSize="9.5"
        letterSpacing="0.12em"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        fill="#2a4020"
      >
        STEP {s.step}
      </text>

      {/* Title */}
      <text
        x={s.cx}
        y={titleY}
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="700"
        fontFamily="'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif"
        fill="#111"
      >
        {s.title}
      </text>

      {/* Sub */}
      <text
        x={s.cx}
        y={subY}
        textAnchor="middle"
        fontSize="9"
        fontFamily="'DM Sans', sans-serif"
        fill="rgba(0,0,0,0.42)"
      >
        {s.sub}
      </text>
    </g>
  );
}

export default function ProcessSection() {
  return (
    <section
      id="process"
      className="light-section"
      style={{ borderTop: "1px solid rgba(0,0,0,0.09)", paddingBottom: "80px" }}
    >
      {/* Quote with forest flanks */}
      <div style={{ position: "relative", overflow: "hidden" }}>

        {/* ── Left forest ── */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "clamp(160px, 22vw, 340px)",
          pointerEvents: "none",
          zIndex: 1,
        }}>
          {/* === deep back row === */}
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"-30px", height:"88%", width:"auto", opacity:0.12, filter:"brightness(0.5)" }} />
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"30px",  height:"95%", width:"auto", opacity:0.13, filter:"brightness(0.45)" }} />
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"80px",  height:"80%", width:"auto", opacity:0.11, filter:"brightness(0.5)" }} />
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"120px", height:"90%", width:"auto", opacity:0.12, filter:"brightness(0.48)" }} />

          {/* === mid row === */}
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"-10px", height:"72%", width:"auto", opacity:0.28, filter:"brightness(0.6)" }} />
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"48px",  height:"78%", width:"auto", opacity:0.30, filter:"brightness(0.58)" }} />
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"100px", height:"65%", width:"auto", opacity:0.26, filter:"brightness(0.62)" }} />
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"140px", height:"74%", width:"auto", opacity:0.24, filter:"brightness(0.6)" }} />

          {/* === front row === */}
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"-20px", height:"55%", width:"auto", opacity:0.70, filter:"brightness(0.72)" }} />
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"28px",  height:"62%", width:"auto", opacity:0.75, filter:"brightness(0.68)" }} />
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"74px",  height:"50%", width:"auto", opacity:0.68, filter:"brightness(0.74)" }} />
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"116px", height:"58%", width:"auto", opacity:0.72, filter:"brightness(0.70)" }} />

          {/* edge fade into beige */}
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(to right, rgba(240,238,230,0) 0%, rgba(240,238,230,0.15) 55%, rgba(240,238,230,0.75) 78%, #f0eee6 100%)",
          }} />
        </div>

        {/* ── Right forest (mirrored) ── */}
        <div style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "clamp(160px, 22vw, 340px)",
          pointerEvents: "none",
          zIndex: 1,
          transform: "scaleX(-1)",
        }}>
          {/* === deep back row === */}
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"-30px", height:"88%", width:"auto", opacity:0.12, filter:"brightness(0.5)" }} />
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"30px",  height:"95%", width:"auto", opacity:0.13, filter:"brightness(0.45)" }} />
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"80px",  height:"80%", width:"auto", opacity:0.11, filter:"brightness(0.5)" }} />
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"120px", height:"90%", width:"auto", opacity:0.12, filter:"brightness(0.48)" }} />

          {/* === mid row === */}
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"-10px", height:"72%", width:"auto", opacity:0.28, filter:"brightness(0.6)" }} />
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"48px",  height:"78%", width:"auto", opacity:0.30, filter:"brightness(0.58)" }} />
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"100px", height:"65%", width:"auto", opacity:0.26, filter:"brightness(0.62)" }} />
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"140px", height:"74%", width:"auto", opacity:0.24, filter:"brightness(0.6)" }} />

          {/* === front row === */}
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"-20px", height:"55%", width:"auto", opacity:0.70, filter:"brightness(0.72)" }} />
          <img src={tree1Png} alt="" style={{ position:"absolute", bottom:0, left:"28px",  height:"62%", width:"auto", opacity:0.75, filter:"brightness(0.68)" }} />
          <img src={tree2Png} alt="" style={{ position:"absolute", bottom:0, left:"74px",  height:"50%", width:"auto", opacity:0.68, filter:"brightness(0.74)" }} />
          <img src={tree3Png} alt="" style={{ position:"absolute", bottom:0, left:"116px", height:"58%", width:"auto", opacity:0.72, filter:"brightness(0.70)" }} />

          {/* edge fade */}
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(to right, rgba(240,238,230,0) 0%, rgba(240,238,230,0.15) 55%, rgba(240,238,230,0.75) 78%, #f0eee6 100%)",
          }} />
        </div>

        {/* Quote text */}
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "90px 64px 64px",
            position: "relative",
            zIndex: 2,
            textAlign: "center",
          }}
        >
          <blockquote
            style={{
              margin: 0,
              fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                fontSize: "clamp(1rem, 3vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "0.06em",
                color: "#1a2818",
              }}
            >
              The deer isn't crossing the road. <br />The road is crossing its
              home.
            </div>
          </blockquote>
        </div>
      </div>

      {/* Horizontal road timeline */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <div
          style={{
            minWidth: "700px",
            maxWidth: "1300px",
            margin: "0 auto",
            padding: "0 32px",
          }}
        >
          <svg
            viewBox="0 0 1260 430"
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            {/* Shoulder */}
            <path
              d={ROAD_PATH}
              fill="none"
              stroke="#46433a"
              strokeWidth={54}
              strokeLinecap="round"
            />
            {/* Asphalt */}
            <path
              d={ROAD_PATH}
              fill="none"
              stroke="#1c1c1c"
              strokeWidth={44}
              strokeLinecap="round"
            />
            {/* Centre dashes */}
            <path
              d={ROAD_PATH}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
              strokeLinecap="butt"
              strokeDasharray="18 12"
            />

            {/* Signs + labels */}
            {SIGNS.map((s) => (
              <SignNode key={s.step} s={s} />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
