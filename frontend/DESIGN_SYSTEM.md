# Wildcross Design System

Editorial conservation-tech aesthetic. Think: field notebook meets nature poster meets long-form journalism. Dark forest greens, warm beige paper, Futura bold headers, raw monospace labels.

---

## Color Palette

### Light sections (primary surface)
| Token | Value | Usage |
|---|---|---|
| `--bg-light` | `#f0eee6` | All non-hero section backgrounds, base surface |
| `--ink-dark` | `#1a2818` | Primary text, headings, dark containers |
| `--ink-forest` | `#2a4020` | Accent headings, focus labels, divider lines |
| `--ink-body` | `rgba(0,0,0,0.65)` | Body copy |
| `--ink-sub` | `rgba(0,0,0,0.45)` | Subtitles, notes, captions |
| `--ink-dim` | `rgba(0,0,0,0.28)` | Index numbers, metadata |
| `--border-light` | `rgba(0,0,0,0.09)` | Section dividers, row borders |

### Hero / dark sections
| Token | Value | Usage |
|---|---|---|
| `--bg-hero` | `#080c09` | Hero section background |
| `--bg-footer` | `#111a10` | Footer, dark CTA containers |
| `--bg-banner` | `#1a2818` | Donate banner, dark inset blocks |
| `--text-hero` | `#fff` / `rgba(255,255,255,0.92)` | Hero body text |
| `--text-footer-dim` | `rgba(240,238,230,0.38)` | Footer captions |

### Accent / stats colors
| Name | Value | Usage |
|---|---|---|
| Amber | `#B87830` | Road mortality stat card |
| Forest | `#2E6028` | Habitat loss stat card |
| Bark | `#7C5A3C` | Species collapse stat card |
| Gold | `#C89040` | Bottlenecks stat card |
| Banner paint | `#926623` | Hero eyebrow highlight brush stroke |

---

## Typography

### Font families
```css
/* Display headers */
font-family: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif"

/* Body copy */
font-family: "'DM Sans', system-ui, sans-serif"

/* Labels, numbers, monospace metadata */
font-family: "'JetBrains Mono', monospace"

/* Hero massive headline only */
font-family: "'Anton', sans-serif"
```

### Type scale

| Role | Font | Size | Weight | Transform | Tracking |
|---|---|---|---|---|---|
| Section headline line 1 | Futura | `clamp(2.4rem, 5vw, 4.8rem)` | 800 | uppercase | `0.04em` |
| Section headline line 2 (accent) | Futura | `clamp(2.4rem, 5vw, 4.8rem)` | 800 | uppercase | `0.04em` — color `#2a4020` |
| Hero H1 | Anton | `clamp(48px, 9vw, 130px)` | 400 | uppercase | `-0.005em` |
| Quote / impact line | Futura | `clamp(1rem, 3vw, 3rem)` | 800 | uppercase | `0.06em` |
| Section label (eyebrow) | JetBrains Mono | `0.68rem` | 400 | uppercase | `0.22em` — color `rgba(0,0,0,0.32)` |
| Row org name | Futura | `clamp(0.95rem, 1.4vw, 1.15rem)` | 700 | uppercase | `0.04em` |
| Focus label (green tag) | JetBrains Mono | `0.62rem` | 400 | uppercase | `0.1em` — color `#2a4020` opacity 0.7 |
| Note / caption | DM Sans | `0.8rem` | 400 | normal | — italic, `rgba(0,0,0,0.45)` |
| Index number | JetBrains Mono | `0.58–0.6rem` | 400 | — | `0.1em` — color `rgba(0,0,0,0.25)` |
| Column header label | Futura | `0.65rem` | 700 | uppercase | `0.22em` — color `#2a4020` |
| Body paragraph | DM Sans | `0.9–0.95rem` | 400 | — | lineHeight 1.8 |
| CTA button | DM Sans | `12px` | 500 | uppercase | `0.32em` |
| Footer brand | Futura | `clamp(1.6rem, 2.5vw, 2.2rem)` | 800 | uppercase | `0.04em` |
| Stats value | Anton / DM Sans | `clamp(3.2rem, 9vw, 4.8rem)` | 800 | — | `-0.04em` |

### Headline pattern
All section headlines follow this two-line structure:
```tsx
<div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)', color: '#1a2818' }}>First line</div>
<div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)', color: '#2a4020' }}>Second line.</div>
```
Always preceded by a monospace eyebrow label.

---

## Spacing & Layout

### Container
```css
max-width: 1200px;
margin: 0 auto;
padding: 0 64px;
```

### Section padding
```css
/* Standard light section */
padding: 100px 0 0;

/* Section with bottom padding */
padding: 100px 0;

/* Hero */
min-height: 100svh;
```

### Column grid
```css
/* Two-column NGO / FAQ style */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 64px;
```

### Common gaps
| Context | Value |
|---|---|
| Eyebrow → headline | `margin-bottom: 20px` |
| Headline → body | `margin-top: 28px` |
| Header block → content | `margin-bottom: 72px` |
| Row border spacing | `padding: 20px 0` |
| Section divider | `border-top: 1px solid rgba(0,0,0,0.09)` |

---

## Components

### Section Eyebrow Label
```tsx
<div style={{
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.68rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'rgba(0,0,0,0.32)',
  marginBottom: '20px',
}}>
  Label Text
</div>
```

### Section Headline Block
```tsx
<div style={{
  fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  lineHeight: 0.9,
  color: '#1a2818',
}}>
  <div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)' }}>First line</div>
  <div style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)', color: '#2a4020' }}>Second line.</div>
</div>
```

### Column Section Header (with divider line)
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px' }}>
  <span style={{
    fontFamily: "'Futura', 'Trebuchet MS', 'Century Gothic', sans-serif",
    fontSize: '0.65rem', fontWeight: 700,
    letterSpacing: '0.22em', textTransform: 'uppercase',
    color: '#2a4020',
  }}>
    Column Title
  </span>
  <div style={{ flex: 1, height: '1px', background: 'rgba(42,64,32,0.2)' }} />
</div>
```

### Numbered Row (editorial list item)
```tsx
<div style={{ borderTop: '1px solid rgba(0,0,0,0.09)', padding: '20px 0' }}>
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: 'rgba(0,0,0,0.28)', letterSpacing: '0.1em' }}>
      01
    </span>
    <span style={{ fontFamily: "'Futura'...", fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      Name
    </span>
  </div>
  <div style={{ paddingLeft: '32px' }}>
    <div style={{ fontFamily: "'JetBrains Mono'...", fontSize: '0.62rem', textTransform: 'uppercase', color: '#2a4020', opacity: 0.7 }}>
      Focus label
    </div>
    <div style={{ fontFamily: "'DM Sans'...", fontSize: '0.8rem', color: 'rgba(0,0,0,0.45)', fontStyle: 'italic' }}>
      Note text
    </div>
  </div>
</div>
```

### Dark Banner / CTA Block
```tsx
<div style={{
  background: '#1a2818',
  padding: '56px 64px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '40px',
  flexWrap: 'wrap',
}}>
  <div>
    <div style={{ fontFamily: "'Futura'...", fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 800, textTransform: 'uppercase', color: '#f0eee6', lineHeight: 1 }}>
      Headline.
    </div>
    <p style={{ color: 'rgba(240,238,230,0.55)', fontSize: '0.88rem' }}>Supporting copy.</p>
  </div>
  <a style={{ background: '#f0eee6', color: '#1a2818', fontFamily: "'Futura'...", fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '16px 32px', borderRadius: '2px' }}>
    CTA Label ↗
  </a>
</div>
```

### Hero Paint Highlight (eyebrow)
Brush-stroke effect over inline text:
```tsx
<span style={{ display: 'inline-block', position: 'relative' }}>
  <span style={{
    position: 'absolute',
    top: '-3px', bottom: '-8px', left: '-10px', right: '-14px',
    background: 'linear-gradient(90deg, transparent 0%, rgba(146,102,35,0.50) 9%, rgba(146,102,35,0.72) 28%, rgba(146,102,35,0.76) 62%, rgba(146,102,35,0.62) 80%, transparent 100%)',
    transform: 'skewX(-7deg) skewY(0.4deg)',
    borderRadius: '0',
  }} />
  <span style={{ position: 'relative' }}>Text here</span>
</span>
```

### Hero CTA Button
```css
.wc-cta {
  display: inline-flex; align-items: center; gap: 14px;
  padding: 18px 30px;
  border: 1px solid rgba(255,255,255,0.45);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
  color: #fff;
  font-family: 'DM Sans'; font-size: 12px; font-weight: 500;
  letter-spacing: 0.32em; text-transform: uppercase;
  transition: background 0.45s, color 0.45s, border-color 0.45s, padding-right 0.45s;
}
.wc-cta:hover {
  background: #fff; color: #0a1410; border-color: #fff; padding-right: 38px;
}
```

### Scroll-Reveal (IntersectionObserver)
Standard pattern used in NGOSection and FAQSection:
```tsx
const [visible, setVisible] = useState(false)
const ref = useRef<HTMLDivElement>(null)

useEffect(() => {
  const obs = new IntersectionObserver(
    ([e]) => { if (e.isIntersecting) setVisible(true) },
    { threshold: 0.1 }
  )
  if (ref.current) obs.observe(ref.current)
  return () => obs.disconnect()
}, [])

// On element:
style={{
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(20px)',
  transition: `opacity 0.55s ${index * 0.07}s, transform 0.55s ${index * 0.07}s`,
}}
```

### Scroll-Driven Sticky Section
Used in StatsSection for card-per-scroll-step:
```tsx
// Tall wrapper creates scroll space
<div ref={wrapperRef} style={{ height: `${total * 100}vh`, position: 'relative' }}>
  <section style={{ position: 'sticky', top: 0, height: '100vh' }}>
    {/* content */}
  </section>
</div>

// Scroll handler
const { top, height } = wrapper.getBoundingClientRect()
const progress = Math.max(0, Math.min(1, -top / (height - window.innerHeight)))
const idx = Math.min(total - 1, Math.floor(progress * total))
```

---

## CSS Classes

```css
/* Apply to every non-hero section */
.light-section {
  background: #f0eee6;
  color: rgba(0,0,0,0.65);
  /* overrides CSS vars for child components */
}
```

All sections except HeroSection use `className="light-section"`.

---

## Asset Inventory

| File | Usage |
|---|---|
| `public/hero-image.jpeg` | Hero background (painting: deer in car mirror) |
| `src/assets/sign.png` | Road sign icon in ProcessSection SVG timeline |
| `src/assets/tree1.png` | Forest decoration, ProcessSection flanks |
| `src/assets/tree2.png` | Forest decoration, ProcessSection flanks |
| `src/assets/tree3.png` | Forest decoration, ProcessSection flanks |
| `src/assets/photo1–4.jpg` | Wildlife photos in StatsSection hanging grid |

---

## Motion Principles

- **Entrance**: `translateY(20–48px) → 0` + `opacity 0 → 1`. Never translate X on entrance.
- **Duration**: `0.5s–1.3s`. Longer for hero elements (more drama), shorter for list items.
- **Easing**: `cubic-bezier(0.2,0.8,0.2,1)` for card/transform animations. `ease` for opacity.
- **Stagger**: `index * 0.07s` delay between list rows.
- **Card exit**: `translateX(±100px) rotate(±10deg) scale(0.88)` + `opacity 0`.
- **No scroll hijacking**: use sticky+tall-wrapper instead of `preventDefault()` on wheel events.
- **Ken Burns**: hero image uses `scale(1.08) → scale(1)` over `12s ease-out forwards`.

---

## Section Map

```
HeroSection       — dark, full-bleed, painting bg, Anton headline
StatsSection      — light, sticky scroll, stacked card deck + photo grid
ProcessSection    — light, quote + road SVG timeline
NGOSection        — light, two-column editorial list + dark banner
FAQSection        — light, numbered accordion
Footer            — dark (#111a10), Futura brand + muted links
```
