# 🌿 DGIS Analysis Dashboard - Detailed Project Guide

**Comprehensive technical documentation explaining the architecture, interactive
subsystems, data flows, and project structure from the SQLite backend to the
React Vite UI.**

---

## 🚀 What's New

The project has recently evolved with unified state and live statistical
capabilities:

- **Interactive Charts with Recharts:** Implemented new responsive charts using
  the Recharts library, including a new Confidence Histogram to better visualize
  detection confidences.
- **Unified Filtering Architecture:** The map dashboard and
  `StatisticsDashboard` now utilize identical, fully-matched filtering logic,
  ensuring changes in dates, confidence thresholds, and labels are synchronously
  respected across views.
- **Dynamic Tree Density Computation:** Replaced static mocking with a true
  `Tree Density` computation derived live from frontend math:
  `Math.round(totalTrees / areaScanned)`, leveraging the true `/api/stats`
  endpoint.
- **Shannon Biodiversity Index:** Integrated a live-calculated biodiversity
  index tracking real-time filtered ecological detections fetched from the
  SQLite store.

---

## 🌍 1. Project Purpose

The DGIS Analysis Dashboard is an ecological and local telemetry application
offering:

- 🗺️ **Interactive Geographic Map:** Marker-based map dashboard plotting flora
  and fauna detections.
- 📊 **Statistics Dashboard:** Dedicated analytics view outlining densities,
  indexes, and summary metrics.
- ⚙️ **Robust Filter Controls:** Real-time controls filtering date ranges,
  detection confidences, and categorical label sets.
- 📥 **CSV Bulk Export:** Secure export generation of local detections.
- 🌲 **Multi-biome Support:** Live fallback capabilities managing mix-states
  (e.g., live databases mapping against mock catalogs).

The system architecture features dual local services:

- **Frontend (UI):** Rendered by Vite + React on `http://localhost:8080`.
- **Backend (API):** Managed by Express + `better-sqlite3` operating on
  `http://localhost:3001`.

---

## 🏗️ 2. High-Level Architecture

The Frontend (`http://localhost:8080`) relies on Vite's proxy bridging `/api`
endpoints directly to the Backend (`localhost:3001`).

### 🔄 Runtime Flow (Interaction Lifecycle)

1. **User Trigger:** Selects biome parameters, view tabs, or localized filters
   using the dashboard interfaces.
2. **State Updates:** React page states recalculate
   (`Index`/`StatisticsDashboard`).
3. **Query Engine:** React Query generates new request keys bound to active
   configurations.
4. **Data Retrieval:** Endpoints `/api/labels`, `/api/detections`, and
   `/api/stats` securely query `dbCache`-pooled SQLite databases.
5. **Backend Processing:** Backend parses biome ID, runs optimized DB reads,
   normalizes geometry fields (e.g., producing `%` coordinates), and outputs
   JSON.
6. **Frontend Render:** UI repaints localized `Sidebar` counts, `MapView`
   markers, and `StatsCards`.
7. **Extraction:** Evaluated sets can be exported natively by the `csvExport.ts`
   engine.

---

## 📂 3. Repository Structure & Subsystems

### 🛠️ Root Operations

| File                 | Role                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------- |
| `package.json`       | Cross-context command scripts (dev, lint, test, build), shared dependency management.   |
| `vite.config.ts`     | Host/port declarations, local API proxy interceptors, and strict path aliasing (`@/*`). |
| `vitest.config.ts`   | JSDOM definition environments and Vitest unit testing wrappers.                         |
| `tailwind.config.ts` | Theming definitions, token generation, and layout scanning boundaries.                  |
| `tsconfig*.json`     | Node and Web TypeScript behaviors.                                                      |
| `eslint.config.js`   | TypeScript validation schemas alongside React Refresh constraints.                      |
| `components.json`    | Native `shadcn/ui` workspace configurator.                                              |

### 🧭 Frontend Application (`src/`)

- `src/main.tsx` & `src/App.tsx`: Bootstrapping engines and primary routing
  (`index`, `statistics`, `notFound`).
- `src/pages/`:
  - `Index.tsx`: Primary map UI orchestrator.
  - `StatisticsDashboard.tsx`: Statistics-focused layout computing true ecology
    data.
- `src/components/dashboard/`: Contains core layouts including `Navbar.tsx`,
  `Sidebar.tsx`, `MapView.tsx`, and `StatsCards.tsx`.
- `src/components/ui/`: Isolated standard primitives configured via shadcn.
- `src/lib/`:
  - `dashboardApi.ts`: Data fetchers bridging the React Query interface.
  - `csvExport.ts`: Raw CSV parser handling client-side Blob creations.
  - `labelColors.ts`: Deterministic hashing engines mapping HSL color spaces.
- `src/data/mockData.ts`: Non-live catalog states tracking biome options.

### ⚙️ Backend Application (`server/`)

- `server/index.cjs`: Unified Express server housing lightweight, read-only
  connections directly into optimized SQLite layers mapping coordinate
  responses.

---

## 🖥️ 4. Frontend Detailed Behavior

### 4.1 Page Routing and Bootstrapping

- Encased in isolated contexts including `QueryClientProvider` and native
  `TooltipProvider` layers.
- Fallback routing explicitly handles standard mappings into isolated React
  routers.

### 🗺️ 4.2 Page: Index (Map Dashboard)

- Controls states like `activeTab` ('flora', 'fauna'), contextual constraints,
  and bounding rules (`dateTo`, `confidenceMin`).
- Distinguishes inherently live biomes from structural placeholders via
  `BIOME_OPTIONS`.
- Injects auto-reset logic for parameter changes preventing filter desyncing.
- Provides standard Error boundaries mapped sequentially inside React Query
  scopes.

### 📊 4.3 Page: StatisticsDashboard

Uses unified filter architecture paralleling operations located in `Index.tsx`
but targeting high-end diagnostic reports.

- **Unified Filtering:** Inherits dynamic bounds for detections using mapped
  states logic.
- **Ecological Metrics:** Dynamically computes `True Tree Density` using backend
  counts (`statsQuery.data.totalTrees`) mapped proportionally to `areaScanned`.
- **Biodiversity Computation:** Uses integrated logic running a live Shannon
  Biodiversity Index measuring distribution variants over actual flora/fauna
  returns.

### 🧩 4.4 Dashboard Components

- **`Sidebar.tsx`**: Filter controller running multi-group selections, specific
  determination (`indeterminate` checkbox logic), dynamic deterministic label
  colors referencing `labelColors.ts`, and active exports.
- **`MapView.tsx`**: Hover/interactive zone displaying XY metrics scaled on
  localized percentage margins directly originating from mapping thresholds from
  the database bounds.
- **`StatsCards.tsx`**: Aggregates dynamic numeric trackers parsing total
  elements.
- **`Navbar.tsx`**: High-level tab controls routing map toggles.

---

## 🗄️ 5. Backend SQL Telemetry

- Based synchronously on `better-sqlite3` restricted to `.readonly()` file
  connections.
- Caches environments resolving internal database calls reducing memory
  allocation.
- **`GET /api/labels`**: Groups localized categorical queries tracking database
  hits (grouped normally referencing `trees` vs. `fauna`).
- **`GET /api/detections`**: Parses date bounds, labels, and percentage mapping
  constraints outputting optimized rows minimizing layout load on map placements
  `percentX`, `percentY`.
- **`GET /api/stats`**: Returns absolute row calculations evaluating total
  database entries, target categories, scanning footprints, and tree subsets
  needed for the front-end calculations.

---

## 🎨 6. Theming and UI System

- **Dark Interface Elements:** Heavily targets CSS defined states under
  `src/index.css` running dynamic dark mode behaviors (`--primary`, `--muted`).
- **Deterministic Color Binding:** `labelColors.ts` guarantees specific items
  generate matching colors natively mapping checkboxes and visual legend
  mappings directly.
- Overrides and animations are defined statically against `tailwind.config.ts`.

---

## 🧪 7. Testing Coverage

Vitest + Testing Library is currently mapping essential pipelines:

- `csvExport.test.ts`: Integrity parsing verifying line-endings and
  comma-escapes.
- `labelColors.test.ts`: Hashing evaluations handling uniqueness constraints.
- `Sidebar.test.tsx` + `Index.export.test.tsx`: Validating local interactivity
  sequences tracking un-checked bounds, empty arrays, and mocked failure
  responses directly showing toaster alerts.

---

## 🔓 8. Expanding the Project

- **Add New Biomes:** Introduce new subsets natively referencing `BIOME_CONFIG`
  in the backend and `BIOME_OPTIONS` in `mockData.ts`. Connect appropriate
  SQLite files holding targeted tables (`Observations_new`).
- **Extend Live Computations:** Alter `api/stats` to process extended analytics
  passing fields natively into `DashboardStats` interface types updating density
  views within `StatisticsDashboard.tsx`.

---

## ✅ 9. Quick Start Checklist

Before committing new updates:

1. Ensure databases (`DGIS.db`, `DGIS_Boreal.db`) are attached to project
   repositories.
2. Initialize locally utilizing `npm run dev`.
3. Assure testing endpoints function with `npm run test` and `npm run lint`.
4. Audit local API health through `http://localhost:3001/api/health`.

> **Note:** The backend executes under port `3001` natively, Vite operates at
> `8080`.
