# DGIS Analysis Dashboard - Detailed Project Guide

This document explains how the project is structured, how each subsystem works, and how data flows from SQLite to the UI.

## 1) Project Purpose

The project is a local analysis dashboard for ecological detections.
It provides:
- A map-oriented dashboard for detections (flora/fauna).
- A separate statistics dashboard screen.
- Filter controls (date range, confidence threshold, label selection).
- CSV export of filtered detections.
- Multi-biome behavior with mixed live and catalog-only data modes.

The system runs as two local services:
- Frontend: Vite + React app on `http://localhost:8080`
- Backend: Express + better-sqlite3 API on `http://localhost:3001`

## 2) High-Level Architecture

Frontend and backend are separate processes started together via `npm run dev`:
- Frontend fetches `/api/*` endpoints.
- Vite proxy forwards `/api` to backend (`localhost:3001`).
- Backend reads SQLite databases and returns JSON payloads.
- Frontend renders map markers, statistics cards, and filter UI from API responses.

### Runtime Flow (typical interaction)

1. User selects biome/tab/filter values in UI.
2. React state updates in page components (`Index`, `StatisticsDashboard`).
3. React Query creates query keys from active state.
4. Query functions call `src/lib/dashboardApi.ts`.
5. Requests hit `/api/labels`, `/api/detections`, `/api/stats`.
6. Backend resolves biome, selects DB file, executes SQL, normalizes fields.
7. Frontend receives data and renders:
   - Sidebar label groups/counts
   - Marker positions and tooltip data
   - Stats cards
8. User may export current detections to CSV (`src/lib/csvExport.ts`).

## 3) Repository Structure and Responsibilities

## Root-level files

- `package.json`
  - Defines scripts for dev, build, lint, and tests.
  - Includes both frontend and backend dependencies.

- `vite.config.ts`
  - Dev server host/port.
  - API proxy from `/api` to `http://localhost:3001`.
  - Path alias support (`@` -> `src`).

- `vitest.config.ts`
  - JSDOM test environment.
  - Global test helpers and setup file.
  - Test include patterns.

- `tailwind.config.ts`
  - Tailwind content scanning paths.
  - CSS variable-driven design tokens.
  - Extended color set and animations.

- `tsconfig*.json`
  - TypeScript behavior for app and node/vite config contexts.
  - Alias mapping (`@/*`).
  - Relatively relaxed strictness in app config.

- `eslint.config.js`
  - TypeScript + React Hooks linting rules.
  - React Refresh lint plugin.

- `components.json`
  - shadcn/ui generator configuration and aliases.

- `README.md`
  - Quick setup, scripts, and troubleshooting basics.

## Backend

- `server/index.cjs`
  - Entire API server implementation.
  - Express endpoints and SQLite query logic.

## Frontend app

- `src/main.tsx`
  - React app bootstrap.

- `src/App.tsx`
  - Providers and route map.

- `src/pages/`
  - `Index.tsx`: map dashboard page.
  - `StatisticsDashboard.tsx`: statistics-focused dashboard page.
  - `NotFound.tsx`: fallback route.

- `src/components/dashboard/`
  - `Navbar.tsx`, `Sidebar.tsx`, `MapView.tsx`, `StatsCards.tsx`
  - Core dashboard visual components.

- `src/lib/`
  - `dashboardApi.ts`: fetch wrappers for API.
  - `csvExport.ts`: CSV build + browser download.
  - `labelColors.ts`: deterministic per-label color system.
  - `utils.ts`: utility helpers.

- `src/data/mockData.ts`
  - Biome options, label catalogs, fallback stats.
  - Defines which biomes have live DB data.

- `src/types/dashboard.ts`
  - Central data contracts (detections, filters, labels, stats, biome ids).

- `src/components/ui/`
  - shadcn/Radix-based reusable UI primitives.

- `src/hooks/`
  - Generic hooks (`use-mobile`, toast state manager).

- `src/test/` and `*.test.ts(x)`
  - Vitest + React Testing Library tests.

## Public assets

- `public/icons/`
  - UI icon files used by navbar and cards.
- `public/maps/`
  - Map assets.
- `public/robots.txt`
  - Crawler directives.

## 4) Frontend Detailed Behavior

## 4.1 App bootstrap and global providers

`src/main.tsx` mounts `<App />` and imports `src/index.css` (Tailwind + theme vars).

`src/App.tsx` wraps routes with:
- `QueryClientProvider` (React Query cache/data fetching)
- `TooltipProvider`
- Toast systems (`Toaster`, `Sonner`)
- `BrowserRouter`

Routes:
- `/` -> `Index`
- `/statistics-dashboard` -> `StatisticsDashboard`
- `*` -> `NotFound`

## 4.2 Page: Index (Map dashboard)

`src/pages/Index.tsx` is the main operational dashboard.

State:
- `activeTab`: `'flora' | 'fauna'`
- `selectedBiome`: biome id
- `filters`:
  - `dateFrom`
  - `dateTo`
  - `confidenceMin`
  - `selectedLabels`

Behavior:
- Chooses active biome metadata from `BIOME_OPTIONS`.
- Determines if selected biome has live DB (`hasDatabaseData`).
- Loads labels via React Query:
  - Live biomes: API (`getLabels`)
  - Non-live biomes: local catalog (`getBiomeLabels`)
- Resets filters whenever biome changes.
- Auto-selects labels after labels query resolves:
  - Keeps only still-valid selected labels
  - If none remain, selects all returned labels
- Loads detections via React Query:
  - Live biomes: API (`getDetections`)
  - Non-live biomes: empty array
- Loads stats via React Query:
  - Live biomes: API (`getStats`)
  - Non-live biomes: `BIOME_NO_DATA_STATS`
- Shows an error banner if any live-biome query errors.

Export action:
- If no detections: toast error.
- Otherwise:
  - builds CSV from current detections
  - builds filename from biome/tab/time
  - triggers download
  - shows success toast

Navigation action:
- `Navbar` CTA routes to `/statistics-dashboard`.

## 4.3 Page: StatisticsDashboard

`src/pages/StatisticsDashboard.tsx` shares filter/query patterns with `Index` but renders a custom analytics layout.

Important characteristics:
- Reuses `Navbar` and `Sidebar` filtering/export behavior.
- Pulls labels and detections using same API/local strategy.
- Uses static visual datasets (`speciesBars`, `confidenceBars`) for chart-like widgets.
- Displays API error warning when live data cannot be loaded.
- Navbar CTA routes back to main map dashboard (`/`).

This page combines:
- Live filter/export plumbing
- Mostly static chart visuals for dashboard presentation

## 4.4 Component: Navbar

`src/components/dashboard/Navbar.tsx` handles:
- Brand/logo area.
- Biome chooser via Popover + ToggleGroup.
- Flora/Fauna tab switch.
- Right-side action button (configurable label/icon/click handler).

Biome notes shown in UI:
- Text indicates temperate + boreal currently have live DB detections/stats.

## 4.5 Component: Sidebar

`src/components/dashboard/Sidebar.tsx` is the filtering and export panel.

Features:
- Date range filter (`from`, `to`).
- Confidence threshold slider.
- Grouped label checkboxes:
  - flora: Trees + Plants groups
  - fauna: Animals group (display name for internal `fauna` key)
- Group-level select-all/deselect-all behavior.
- Group checkbox states: checked, unchecked, indeterminate.
- Per-label count display.
- Export button with disabled/loading support.

Color behavior:
- Uses deterministic label colors from `labelColors.ts`.
- Selected labels are styled with group-consistent color values.

## 4.6 Component: MapView

`src/components/dashboard/MapView.tsx` renders:
- Decorative map background layers.
- Stats cards overlay (`StatsCards`).
- Detection markers using normalized `%` coordinates from backend.
- Hover popup with confidence and XYZ details.
- Legend generated from detections/labels/fallback names.
- Zoom controls (in/out/reset) via local `zoom` state.

Empty/loading states:
- Loading overlay while detections query loads.
- "No detection data yet" card for non-live biomes.
- "No observations yet" card for live biomes with zero records.

## 4.7 Component: StatsCards

`src/components/dashboard/StatsCards.tsx` builds cards dynamically by active tab:
- Flora mode: 4 cards
  - Total Detections
  - Total Trees
  - Total Plants
  - Area Scanned
- Fauna mode: 3 cards
  - Total Detections
  - Total Animals (sum of fauna label counts)
  - Area Scanned

Handles loading/no-data rendering (`...` and `--`).

## 4.8 Frontend utility modules

`src/lib/dashboardApi.ts`
- Shared `fetchJson` wrapper (throws on non-OK status).
- `getLabels(category, biome?)` -> `/api/labels`
- `getDetections(query)` -> `/api/detections`
- `getStats(biome?)` -> `/api/stats`

`src/lib/csvExport.ts`
- Defines fixed CSV column order.
- Escapes CSV commas/quotes/newlines.
- Produces UTF-8 BOM-prefixed downloadable file for spreadsheet compatibility.
- Generates timestamped filename:
  - `<biome>-<tab>-detections-YYYY-MM-DD-HH-mm-ss.csv`

`src/lib/labelColors.ts`
- Creates deterministic HSL color for each label in a scope.
- Guarantees stable color regardless of input scope order.
- Reuses same color for markers/legend/checkbox highlights.

`src/data/mockData.ts`
- `BIOME_OPTIONS`: biome metadata + live-data flag.
- `BIOME_LABEL_CATALOG`: local labels for all biomes.
- `getBiomeLabels`: flora/fauna label conversion into `DashboardLabel[]`.
- `BIOME_NO_DATA_STATS`: fallback stats for non-live biomes.

## 5) Backend Detailed Behavior

Backend file: `server/index.cjs`

Stack:
- Express 5
- CORS
- better-sqlite3 (synchronous, readonly mode)

## 5.1 Biome config and DB selection

`BIOME_CONFIG` defines per-biome behavior:
- `temperate-forest`
  - DB path: `DGIS_DB_PATH` env override, else `DGIS.db`
- `boreal-forest`
  - DB path: `DGIS_Boreal.db`

Each biome also contains hardcoded flora/fauna label lists used by API filtering.

Helpers:
- `resolveBiome(rawBiome)`
  - Returns default biome when missing
  - Returns `null` for unsupported biome values
- `getCategoryLabels(biome, category)`
  - Returns flora or fauna labels for the biome
- `getDbForBiome(biome)`
  - Opens SQLite connection if not cached
  - Uses readonly + fileMustExist
  - Returns `{ db, error, dbPath }`

DB caching:
- `dbCache` map stores one open DB connection per biome.

## 5.2 API endpoint behavior

### `GET /api/health`

Returns aggregated health for configured biome DBs.

Response concept:
- `ok`: true only if all configured biome DBs can open
- `databases[]`: per-biome status with path and error message

### `GET /api/labels?category=flora|fauna&biome=<id>`

Flow:
1. Resolve biome and database.
2. Validate database availability.
3. Select label list by category.
4. Query `Observations_new` grouped counts for those labels.
5. Return every configured label with count (0 if absent).

Response shape:
- `labels: [{ name, group, count }]`

Group mapping:
- flora -> `trees`
- fauna -> `fauna`

### `GET /api/detections`

Query params consumed:
- `category`
- `labels` (comma-separated)
- `confidenceMin`
- `dateFrom`
- `dateTo`
- `biome`

Flow:
1. Resolve biome and DB.
2. Determine allowed labels from biome + category.
3. Parse requested labels and keep only allowed labels.
4. If `labels` param omitted, use all allowed labels.
5. Build SQL `WHERE` for labels/confidence/date bounds.
6. Query min/max X/Z bounds for selected label set.
7. Query matching rows sorted by timestamp and id descending.
8. Normalize map coordinates:
   - `percentX` from X min/max
   - `percentY` from Z min/max then inverted (`100 - normalized`)
9. Return typed detection rows.

Coordinates returned:
- Raw values: `x`, `y`, `z`
- Render values: `percentX`, `percentY`

### `GET /api/stats?biome=<id>`

Flow:
1. Resolve biome + DB.
2. Count total rows in `Observations_new`.
3. Count flora rows for total trees.
4. Return stats object:
   - `totalDetections`
   - `totalTrees`
   - `totalPlants` (currently `"-"` placeholder)
   - `areaScanned` (currently hardcoded `2.4`)

## 5.3 Error handling

- Invalid biome -> HTTP 400.
- DB unavailable -> HTTP 500 with details.
- Unhandled errors -> HTTP 500 "Internal server error".

Server startup logs:
- API listening URL.
- Configured DB path for each biome.

## 6) Data Contracts (TypeScript)

Defined in `src/types/dashboard.ts`.

Key types:
- `DashboardTab`: `flora | fauna`
- `BiomeId`: supported biome ids
- `DashboardLabel`: `{ name, group, count }`
- `Detection`:
  - identification/time fields
  - raw coordinates
  - confidence/drone info
  - normalized percent coordinates for map placement
- `DashboardStats`
- `Filters`

These types are used consistently across pages, API client, and components.

## 7) Filtering and Query Semantics

Important rules:
- Biome change resets date/confidence/selected labels.
- Labels are auto-selected when fresh labels arrive.
- `confidenceMin` defaults to 81 in page state.
- Date filters apply only if parseable as valid dates.
- If labels filter removes all labels, API returns empty detection set.
- Non-live biomes still provide label lists (from mock catalog) for UI exploration.

## 8) Theming and UI System

Theme source:
- `src/index.css` CSS variables + Tailwind layers.

Characteristics:
- Dark green dashboard palette.
- Tokenized colors (`--primary`, `--muted`, etc.).
- Extra semantic tokens (`--success`, `--warning`, etc.).
- Custom scrollbar styling.

Tailwind integration:
- `tailwind.config.ts` maps CSS vars to utility colors.
- Includes animation plugin (`tailwindcss-animate`).

UI primitives:
- Built mainly with shadcn + Radix components in `src/components/ui/`.

Note:
- `src/App.css` still contains template starter styles and is not imported by `main.tsx`.

## 9) Testing Strategy and Current Coverage

Framework:
- Vitest + Testing Library + JSDOM.
- Setup file: `src/test/setup.ts` (includes jest-dom and matchMedia mock).

Current tests cover:
- `csvExport.test.ts`
  - Column order
  - CSV escaping
  - Deterministic filename generation

- `labelColors.test.ts`
  - Uniqueness in scope
  - Stability across scope order
  - Style/marker color consistency

- `Sidebar.test.tsx`
  - Animals naming in fauna view
  - Group-level select/deselect behavior
  - Indeterminate state
  - Flora tree group toggle behavior

- `Index.export.test.tsx`
  - No-download + error toast when no detections

- `StatisticsDashboard.export.test.tsx`
  - No-download error state
  - Successful download/success toast state
  - Disabled export while loading

Also present:
- `src/test/example.test.ts` simple sample test.

## 10) Tooling and Build Process

Scripts (`package.json`):
- `dev`: run backend + frontend concurrently
- `dev:api`: node server
- `dev:web`: vite
- `build`: production frontend build
- `build:dev`: development-mode build
- `preview`: preview built frontend
- `lint`: ESLint
- `test`, `test:watch`: Vitest

Vite dev server:
- Port `8080`
- API proxy `/api` -> `localhost:3001`

Backend default port:
- `3001` (override with `PORT` env)

## 11) Environment and Data Requirements

Required DB files in project root:
- `DGIS.db`
- `DGIS_Boreal.db`

Optional env vars:
- `PORT` (API server port)
- `DGIS_DB_PATH` (override path for temperate database)

Without DB files, API endpoints depending on DB access return availability errors.

## 12) Known Constraints and Practical Notes

- Only configured live biomes return DB-backed detections/stats.
- `totalPlants` is currently a placeholder (`"-"`) from backend.
- `areaScanned` is currently hardcoded.
- The statistics dashboard contains static chart bars; it is not fully bound to live aggregate calculations.
- API uses synchronous SQLite access (good for local tooling, but keep in mind for scale).

## 13) How to Extend the Project

## Add a new live biome

1. Backend (`server/index.cjs`):
   - Add biome entry to `BIOME_CONFIG` with DB path + label sets.
2. Frontend (`src/types/dashboard.ts`):
   - Add biome id to `BiomeId` union.
3. Frontend (`src/data/mockData.ts`):
   - Add biome option and catalog entries.
4. Ensure DB file exists and schema matches expectations (`Observations_new` with required columns).

## Add new filters

1. Extend `Filters` type.
2. Add UI control in `Sidebar`.
3. Add query param in `getDetections`.
4. Apply SQL condition in `/api/detections`.

## Make stats fully dynamic

1. Add SQL queries for additional metrics in `/api/stats`.
2. Update `DashboardStats` type.
3. Update `StatsCards` and any chart sections to use new values.

## Improve test depth

- Add API integration tests for endpoint query semantics.
- Add component tests for map marker rendering with mock detections.
- Add smoke test for route transitions (`/` <-> `/statistics-dashboard`).

## 14) Quick Developer Checklist

Before coding:
- Ensure both DB files are present.
- Run `npm install`.
- Start `npm run dev`.
- Confirm:
  - Frontend: `http://localhost:8080`
  - Health: `http://localhost:3001/api/health`

Before merging changes:
- Run `npm run lint`.
- Run `npm run test`.
- Manually verify filter/query behavior in at least one live biome.
- If backend query logic changed, validate endpoint JSON contracts still match TypeScript types.

---

If you want, this guide can be split into separate docs next (for example: `ARCHITECTURE.md`, `API_REFERENCE.md`, `FRONTEND_GUIDE.md`, and `TESTING.md`) to make onboarding even easier for teams.