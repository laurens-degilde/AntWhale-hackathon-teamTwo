# Wildcross
<img width="677" height="386" alt="image" src="https://github.com/user-attachments/assets/cbc50fd0-db5d-45ec-baf4-f3ded514b6c7" />
<img width="677" height="378" alt="image" src="https://github.com/user-attachments/assets/18dba317-712f-46f2-9e8a-c3e66ded5782" />


---

## What's inside

```
.
├── backend/        Spring Boot 3 / Java 21 — analysis pipeline + REST API
└── frontend/       React + TypeScript + Vite — interactive map + landing page
```

---

## Prerequisites

| Tool    | Version                                     |
| ------- | ------------------------------------------- |
| Java    | 21+                                         |
| Maven   | 3.9+                                        |
| Node.js | 20+                                         |
| Julia   | 1.9+ (for Circuitscape connectivity solver) |

Julia must be on your `PATH`. Circuitscape is installed automatically on first run via the Julia package manager.

---

## Backend

```bash
cd backend

# (optional) copy env file and add your keys
cp .env.example .env

# run
mvn spring-boot:run
```

Boots at `http://localhost:8080`. No auth needed for any external API by default — iNaturalist, GBIF, and Overpass are all open.

### Environment variables

Put these in `backend/.env` (loaded automatically via spring-dotenv, no sourcing needed):

| Variable            | Required | What it does                                                                                                   |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | optional | Enables Claude narrative generation in reports and landowner letters. Falls back to placeholder text if unset. |
| `OPENAI_API_KEY`    | optional | Powers the discovery agent that scrapes RSS feeds and extracts structured conservation news.                   |
| `SOLVIMON_API_KEY`  | optional | Solvimon MCP integration.                                                                                      |

Everything else (ports, timeouts, grid size, cache TTL) lives in `src/main/resources/application.properties` with sane defaults.

### Key config knobs

```properties
corridor.grid-size=64                    # resistance raster resolution (cells)
corridor.habitat-resistance-threshold=5.0
corridor.min-patch-cells=5
corridor.max-focal-nodes=8               # Circuitscape scales O(N²) — keep this ≤ 8 for speed
corridor.cache-ttl-seconds=21600         # 6h — keeps demo sessions fast

circuitscape.julia-bin=julia             # path to julia binary
circuitscape.timeout-seconds=300

anthropic.model=claude-sonnet-4-6
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`. Expects the backend at `http://localhost:8080` (configured in `src/lib/http.ts`).

---

## Docker (full stack)

```bash
docker build -t corridor .
docker run -p 8080:8080 \
  -e ANTHROPIC_API_KEY=your_key \
  corridor
```

The Dockerfile builds the frontend, copies the dist into the Quarkus static resources, and serves everything from port 8080.

---

## Tech stack

**Backend**

- Spring Boot 3.3.5 / Java 21 / Maven
- Circuitscape (Julia) — circuit-theory connectivity solver
- Anthropic Java SDK → `claude-sonnet-4-6` — narrative prose generation
- OpenAI `gpt-4o-mini` — discovery agent (RSS → structured data)
- Bucket4j — rate limiting
- WebFlux / Reactor Netty — non-blocking outbound HTTP

**Frontend**

- React 18 + TypeScript + Vite
- MapLibre GL — base map
- React Router

**Data sources (all open, no auth)**

- OpenStreetMap via Overpass API — roads, land use, waterways
- GBIF — species occurrence records
- iNaturalist — species sightings + road-kill records
- Copernicus CGLS-LC100 — land cover raster
- Sentinel-2 L2A via Element 84 STAC
- PDOK BRT/BGT — Dutch topographic base
- PDOK NNN — provincial ecological network layers
- Rijkswaterstaat — ecoduct inventory (curated dataset included)
- Kadaster BRK — cadastral parcels + landowner data

---

## How the pipeline works

```
bbox + species
  → OSM rasterised to 64×64 land-cover grid
  → per-species resistance coefficients applied (from peer-reviewed literature)
  → BFS connected components → habitat patches
  → Circuitscape pairwise current density across patch focal nodes
  → pinch points = current-density local maxima
  → interventions classified by land-cover type (ecoduct / culvert / hedgerow / …)
  → ranked by cost-effectiveness (connectivity uplift / cost)
  → outputs: technical report, landowner letters, subsidy applications, stakeholder map
```

Resistance coefficients are sourced from Zeller et al. (2012), Koen et al. (2014), and species-specific literature. Every coefficient ships with its citation so an ecologist can audit and adjust.

---

## API — quick reference

```bash
# health
curl localhost:8080/api/health
curl localhost:8080/api/docs | jq '.endpoints[].path'

# live data
curl 'localhost:8080/api/roadkills?taxonName=Meles%20meles&perPage=20'
curl 'localhost:8080/api/species-occurrences?taxonKey=2433875&lat=52.1&lng=5.7&radiusKm=25'
curl 'localhost:8080/api/inaturalist-occurrences?taxonName=Meles%20meles&placeId=7506'
curl 'localhost:8080/api/osm-features?bbox=52.10,5.70,52.20,5.85&featureTypes=roads,waterways'

# connectivity pipeline
curl 'localhost:8080/api/resistance-surface?species=badger&bbox=5.6,52.0,5.9,52.3'
curl 'localhost:8080/api/habitat-patches?species=badger&bbox=5.6,52.0,5.9,52.3'
curl 'localhost:8080/api/connectivity?species=badger&bbox=5.6,52.0,5.9,52.3'
curl 'localhost:8080/api/pinch-points?species=badger&bbox=5.6,52.0,5.9,52.3&topN=5'
curl 'localhost:8080/api/interventions?species=badger&bbox=5.6,52.0,5.9,52.3&topN=5'

# output documents
curl 'localhost:8080/api/outputs/technical-report?species=badger&bbox=5.6,52.0,5.9,52.3'
curl 'localhost:8080/api/outputs/landowner-letters?species=badger&bbox=5.6,52.0,5.9,52.3'
curl 'localhost:8080/api/outputs/subsidy-applications?species=badger&bbox=5.6,52.0,5.9,52.3'
curl 'localhost:8080/api/outputs/stakeholder-map?species=badger&bbox=5.6,52.0,5.9,52.3'
```

**Supported species:** `badger` · `otter` · `red_deer` · `pine_marten` · `great_crested_newt` · `hazel_dormouse`

**bbox format:** `west,south,east,north` (WGS84 decimal degrees)

---

## Species

| Species            | Key habitat          | What blocks them                            |
| ------------------ | -------------------- | ------------------------------------------- |
| Badger             | Woodland + hedgerows | Fenced highways                             |
| Otter              | Rivers + wetlands    | Roads near water                            |
| Red Deer           | Forest               | Highways + urban                            |
| Pine Marten        | Continuous canopy    | Any open gap >forest edge                   |
| Great Crested Newt | Pond networks        | Roads during breeding migration             |
| Hazel Dormouse     | Hedgerow + scrub     | Everything — won't cross >5m of open ground |

---

---

## Built at

Whale × Anthropic Hackathon — April 2026
