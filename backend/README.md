# corridor-api

Wildlife corridor analysis backend — Spring Boot 3 / Java 21 / Maven. Covers
data assembly, per-species resistance surfaces with peer-reviewed citations,
connectivity analysis, intervention classification with cost & cost-effectiveness
ranking, and output generation (GeoPackage manifest, technical report, landowner
letters, subsidy applications, stakeholder map), plus stateless change detection.

## Run locally

```bash
mvn spring-boot:run
```

That's it — all live external APIs (iNaturalist, GBIF, Overpass) are public and
need no auth. The app boots on `http://localhost:8080`.

`.env` is auto-loaded by `spring-dotenv` if present (gitignored — see `.env.example`).

## What's live vs stub

| Endpoint | Status |
| --- | --- |
| `/api/health`, `/api/docs` | live |
| `/api/roadkills` (iNat field:Roadkill=yes) | live |
| `/api/inaturalist-occurrences` (general iNat) | live |
| `/api/species-occurrences` (GBIF) | live |
| `/api/osm-features` (Overpass) | live |
| `/api/waarneming-roadkills` | **stub** — needs Stichting Observation partner token |
| `/api/land-cover` (Copernicus) | **stub** — see `// TODO` in `LandCoverService` |
| `/api/sentinel2-imagery` | **stub** — wire Element 84 STAC `/v1/search` |
| `/api/brt-bgt` | **stub** — wire PDOK BRT/BGT WFS |
| `/api/nnn` | **stub** — wire PDOK provincial NNN WFS |
| `/api/atlas-natuurlijk-kapitaal` | **stub** — wire Atlas raster sampling |
| `/api/cadastre/parcels` | **stub** — geometry via PDOK; ownership needs BRK 2.0 auth |
| `/api/ecoducts` | **stub** with curated real Dutch dataset |
| `/api/resistance-surface` | **stub** — coefficients live, raster generation pending |
| `/api/habitat-patches` | **stub** |
| `/api/connectivity` | **stub** — pending Circuitscape orchestration |
| `/api/pinch-points` | **stub** |
| `/api/interventions` | **stub** |
| `/api/outputs/geopackage-manifest` | **stub** |
| `/api/outputs/technical-report` | **stub** |
| `/api/outputs/landowner-letters` | **stub** |
| `/api/outputs/subsidy-applications` | **stub** |
| `/api/outputs/stakeholder-map` | **stub** |
| `POST /api/change-detection` | **stub** — fully stateless, takes both snapshots in body |

Per the spec we do **not** generate binary GIS files or PDF/DOCX in this layer —
output endpoints emit structured JSON contracts that a downstream document
renderer consumes.

## Endpoints — curl examples

### Liveness + self-doc
```bash
curl -s localhost:8080/api/health
curl -s localhost:8080/api/docs | jq '.endpoints[].path'
```

### Data assembly
```bash
# iNat roadkills (live)
curl -s 'localhost:8080/api/roadkills?taxonName=Meles%20meles&perPage=20&page=1' | jq

# GBIF species occurrences (live)
curl -s 'localhost:8080/api/species-occurrences?taxonKey=2433875&lat=52.1&lng=5.7&radiusKm=25' | jq

# Plain iNat occurrences (live)
curl -s 'localhost:8080/api/inaturalist-occurrences?taxonName=Meles%20meles&placeId=7506' | jq

# OSM via Overpass — note bbox order south,west,north,east (live)
curl -s 'localhost:8080/api/osm-features?bbox=52.10,5.70,52.20,5.85&featureTypes=roads,waterways,fences' | jq '.featureCount'

# Stubs
curl -s 'localhost:8080/api/waarneming-roadkills?limit=5' | jq
curl -s 'localhost:8080/api/land-cover?bbox=5.6,52.0,5.9,52.3' | jq
curl -s 'localhost:8080/api/sentinel2-imagery?bbox=5.6,52.0,5.9,52.3&dateAfter=2025-09-01&maxCloudCoverPct=15' | jq
curl -s 'localhost:8080/api/brt-bgt?bbox=5.6,52.0,5.9,52.3&dataset=BGT' | jq
curl -s 'localhost:8080/api/nnn?province=Gelderland&bbox=5.6,52.0,5.9,52.3' | jq
curl -s 'localhost:8080/api/atlas-natuurlijk-kapitaal?bbox=5.6,52.0,5.9,52.3' | jq
curl -s 'localhost:8080/api/cadastre/parcels?bbox=5.6,52.0,5.9,52.3&limit=5' | jq
curl -s 'localhost:8080/api/ecoducts' | jq '.results[0]'
```

### Resistance + connectivity pipeline
```bash
curl -s 'localhost:8080/api/resistance-surface?species=badger&bbox=5.6,52.0,5.9,52.3' | jq
curl -s 'localhost:8080/api/habitat-patches?species=badger&bbox=5.6,52.0,5.9,52.3' | jq
curl -s 'localhost:8080/api/connectivity?species=badger&bbox=5.6,52.0,5.9,52.3' | jq '.meanCurrentDensity'
curl -s 'localhost:8080/api/pinch-points?species=badger&bbox=5.6,52.0,5.9,52.3&topN=5' | jq
curl -s 'localhost:8080/api/interventions?species=badger&bbox=5.6,52.0,5.9,52.3&topN=5' | jq
```

### Outputs
```bash
curl -s 'localhost:8080/api/outputs/geopackage-manifest?species=badger&bbox=5.6,52.0,5.9,52.3' | jq
curl -s 'localhost:8080/api/outputs/technical-report?species=badger&bbox=5.6,52.0,5.9,52.3' | jq
curl -s 'localhost:8080/api/outputs/landowner-letters?species=badger&bbox=5.6,52.0,5.9,52.3' | jq '.letters[0]'
curl -s 'localhost:8080/api/outputs/subsidy-applications?species=badger&bbox=5.6,52.0,5.9,52.3' | jq '.applications[0]'
curl -s 'localhost:8080/api/outputs/stakeholder-map?species=badger&bbox=5.6,52.0,5.9,52.3' | jq '.stakeholders[].name'
```

### Change detection (stateless)
```bash
curl -s -X POST localhost:8080/api/change-detection \
  -H 'Content-Type: application/json' \
  -d '{
    "previous": {"takenAt":"2025-01-01T00:00:00Z", "bbox":[5.6,52.0,5.9,52.3],
                  "landCoverPct":{"forest":12.0,"agricultural_field":35.0},
                  "roadkillPoints":[{"id":"a","lat":52.1,"lng":5.7,"observedOn":"2024-09-01"}],
                  "rankedPinchPointIds":["pp-1","pp-2","pp-3"], "osmBuildingCount":1100},
    "current":  {"takenAt":"2026-04-01T00:00:00Z", "bbox":[5.6,52.0,5.9,52.3],
                  "landCoverPct":{"forest":11.4,"agricultural_field":34.6},
                  "roadkillPoints":[{"id":"a","lat":52.1,"lng":5.7,"observedOn":"2024-09-01"},
                                     {"id":"b","lat":52.2,"lng":5.8,"observedOn":"2025-11-30"}],
                  "rankedPinchPointIds":["pp-2","pp-1","pp-3"], "osmBuildingCount":1180}
   }' | jq
```

## Env vars / `application.properties` keys

| Key | Default | Notes |
| --- | --- | --- |
| `external.inaturalist.base-url` | `https://api.inaturalist.org/v1` | open |
| `external.gbif.base-url` | `https://api.gbif.org/v1` | open |
| `external.copernicus.base-url` | `https://land.copernicus.eu/api` | currently stub |
| `external.overpass.base-url` | `https://overpass-api.de/api/interpreter` | open, fair-use |
| `external.rijkswaterstaat.base-url` | `https://geo.rijkswaterstaat.nl` | currently stub |
| `ratelimit.requests-per-minute` | `10` | per IP, all `/api/**` except health/docs |
| `webclient.max-in-memory-size-bytes` | `16777216` | for Overpass payloads |
| `webclient.connect-timeout-ms` / `response-timeout-ms` | `10000` / `30000` | |
| `server.port` | `8080` | |

## Project layout

```
src/main/java/com/corridorapi/
  CorridorApiApplication.java
  controller/   - one per endpoint
  service/      - one per data source / pipeline stage
  client/       - WebClient logging filter
  config/       - ExternalApiConfig, WebClientConfig, CorsConfig, RateLimit*
  model/
    request/    - POST bodies (ChangeDetectionRequest, RegionSnapshot)
    response/   - Lombok @Value POJOs returned by controllers
  exception/    - GlobalExceptionHandler @ControllerAdvice
  enums/        - SpeciesType, EcoductType, InterventionType, SubsidyScheme,
                  StakeholderType, HabitatPatchKind
src/main/resources/
  application.properties
  docs.json
```

## Dependency versions

- Spring Boot **3.3.5** (web, webflux, validation)
- Java **21**
- Lombok (Spring-Boot-managed)
- Bucket4j **8.14.0** (`bucket4j_jdk17-core`)
- spring-dotenv **4.0.0**
- Reactor Netty (transitive via webflux)
- Jackson (transitive via Spring Boot)

## Notes

- Outbound HTTP is logged with URL, method, status and elapsed ms
  (`client/WebClientLoggingFilter`).
- Rate limiting is in-memory per-IP — replace `ConcurrentHashMap` with Redis if
  the deployment ever runs more than one replica.
- The Overpass GeoJSON converter handles `node` and `way`; relations are skipped.
- Resistance coefficients carry per-coefficient citations in
  `ResistanceSurfaceService.coefficientsFor()` and are emitted as
  `{landCoverClass, value, citation}` objects on the wire.
- Stubs all carry inline `// TODO` comments pointing at the live endpoint that
  would replace them.
