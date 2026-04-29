# DGIS Analysis Dashboard

A local dashboard for viewing and filtering ecological detections across supported biomes.

The project runs as two local services:

1. Frontend: React + Vite app on port `8080`
2. Backend: Express API with SQLite on port `3001`

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Express
- SQLite (`better-sqlite3`)
- Vitest + Testing Library

## Prerequisites

Install these first:

1. Git
2. Node.js LTS (recommended: Node.js 20 or newer)
3. npm (comes with Node.js)

Optional:

1. Bun (if you want Bun commands in addition to npm)

Windows note:

- If native module install fails for `better-sqlite3`, install the Visual Studio C++ Build Tools and retry dependency installation.

## Required Data Files

The API expects these SQLite files in the project root:

- `DGIS.db`
- `DGIS_Boreal.db`

These files are currently present in this repository.

## Run the Project (Recommended: npm)

1. Clone and enter the repo:

```bash
git clone <YOUR_REPOSITORY_URL>
cd state-spun-main
```

1. Install dependencies:

```bash
npm install
```

1. Start frontend + backend together:

```bash
npm run dev
```

1. Open:

- Frontend: <http://localhost:8080>
- API health check: <http://localhost:3001/api/health>

## Run with Bun (Alternative)

1. Install dependencies:

```bash
bun install
```

1. Start both services:

```bash
bun run dev
```

If `bun run dev` has issues in your environment, use npm for the `dev` script.

## Environment Variables

You can run without any `.env` file. Optional variables:

- `PORT`: API server port (default: `3001`)
- `DGIS_DB_PATH`: custom path for the temperate database (defaults to `DGIS.db` in project root)

Example (PowerShell):

```powershell
$env:PORT=3002
$env:DGIS_DB_PATH="C:\path\to\DGIS.db"
npm run dev:api
```

## Available Scripts

- `npm run dev`: run backend and frontend together
- `npm run dev:api`: run API only (`server/index.cjs`)
- `npm run dev:web`: run frontend only (Vite)
- `npm run build`: production build
- `npm run build:dev`: development-mode build
- `npm run preview`: preview production build locally
- `npm run lint`: run ESLint
- `npm run test`: run tests once (Vitest)
- `npm run test:watch`: run tests in watch mode

## Quick Verification Checklist

After startup:

1. `http://localhost:8080` loads the dashboard UI.
2. `http://localhost:3001/api/health` returns `ok: true` when databases are accessible.
3. Selecting supported biomes returns data from the API.

## Troubleshooting

- Port already in use:
  - Change `PORT` for API and update frontend proxy target in `vite.config.ts` if needed.
- API returns database unavailable errors:
  - Confirm `DGIS.db` and `DGIS_Boreal.db` exist in project root.
  - If using a custom temperate DB path, verify `DGIS_DB_PATH` points to a real file.
- Frontend loads but no data:
  - Confirm API is running and `/api/health` succeeds.

## Recent Project Changes

Latest updates from the repository history (`git log --oneline -n 12`):

- Updated the detailed guide documentation.
- Added subtropical map support and a subtropical desert database.
- Added temperate map support.
- Removed outdated map-selection comment in `Navbar.tsx`.
- Added animal icon and fixed category labels.
- Improved map-point hover formatting to two decimal places.
- Corrected mountain placement/bounds and added a mountain database.
- Fixed zoom in/out behavior.
- Adapted confidence score distribution for values below `50%`.
- Added data to `DGIS_Boreal`.

To inspect recent changes locally:

1. `git log --oneline -n 20`
1. `git show <commit_hash>`

## Project Structure

- `src/`: frontend app
- `server/index.cjs`: backend API
- `public/maps/`: map assets
- `src/lib/`: shared helpers and API client code
