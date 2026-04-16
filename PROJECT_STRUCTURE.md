# Project Structure Guide

This document provides a brief explanation of the files and directories in this
project to help you navigate the codebase.

## Root Directory Files

- **`bun.lockb`**: Lockfile for the Bun package manager, ensuring consistent
  dependency installations.
- **`components.json`**: Configuration file for the UI component library (e.g.,
  shadcn/ui), specifying component locations and preferences.
- **`eslint.config.js`**: Configuration for ESLint, used for linting and
  enforcing code quality standards.
- **`index.html`**: The main HTML entry point for the application. Vite injects
  the built assets here.
- **`package.json`**: NPM configuration file defining project dependencies,
  scripts, and metadata.
- **`postcss.config.js`**: Configuration for PostCSS, typically used here to
  process Tailwind CSS.
- **`PROJECT_DETAILED_GUIDE.md`**: A detailed guide providing in-depth
  information about the project.
- **`README.md`**: General high-level documentation about the project, usually
  including setup instructions.
- **`tailwind.config.ts`**: Configuration file for Tailwind CSS, defining
  themes, custom colors, and plugins.
- **`tsconfig.*.json`** (`tsconfig.app.json`, `tsconfig.json`,
  `tsconfig.node.json`): TypeScript configuration files defining compiler
  options for different environments (app browser vs node).
- **`vite.config.ts`**: Configuration file for Vite, the build tool and
  development server used in the project.
- **`vitest.config.ts`**: Configuration file for Vitest, the testing framework
  used.

## Directories

### `public/`

Contains static assets that are served exactly as they are without being
processed by Vite.

- `icons/`: Application icons and logos.
- `maps/`: Map data files (e.g., GeoJSON or TopoJSON) used for rendering maps in
  the UI.
- `robots.txt`: Instructions for web crawlers.

### `server/`

Contains backend server code.

- `index.cjs`: The main entry point for the backend server logic.

### `src/`

Contains the core frontend source code.

- **Core Files (`App.tsx`, `App.css`, `main.tsx`, `index.css`)**: The primary
  initialization files for the React application, routing setup, and global
  stylesheets.
- **`vite-env.d.ts`**: TypeScript declarations specific to Vite environment
  variables.

#### `src/components/`

Reusable React components forming the building blocks of the UI.

- **`dashboard/`**: Feature-specific components for the dashboard view (e.g.,
  `MapView.tsx`, `Navbar.tsx`, `Sidebar.tsx`, `StatsCards.tsx`). Includes some
  specific test files (`Sidebar.test.tsx`).
- **`ui/`**: Generic, atomic UI components (like buttons, dialogs, cards, forms)
  usually generated via shadcn/ui.

#### `src/data/`

Contains static or mock data used throughout the application.

- `mockData.ts`: Mock data typically used for development, testing, or UI
  prototyping before real APIs are connected.

#### `src/hooks/`

Custom React hooks encapsulating reusable stateful or side-effect logic.

- `use-mobile.tsx`: A hook for detecting responsive/mobile viewport states.
- `use-toast.ts`: A hook for triggering toast notifications.

#### `src/lib/`

Utility functions, API abstractions, and shared business logic.

- `csvExport.ts`: Utilities for exporting data to CSV format (along with its
  tests).
- `dashboardApi.ts`: Functions handling API requests related to the dashboard.
- `labelColors.ts`: Logic/utilities for determining UI colors for various
  labels.
- `utils.ts`: General-purpose utility functions commonly used across the app
  (like class name merging).

#### `src/pages/`

Top-level page (route) components.

- `Index.tsx`: The main landing page.
- `NotFound.tsx`: A fallback page for 404/not found routes.
- `StatisticsDashboard.tsx`: The primary dashboard page rendering statistics and
  data views.

#### `src/test/`

Global testing setup and examples.

- `setup.ts`: Setup file for initializing the Vitest/testing environment before
  tests run.
- `example.test.ts`: Example standard tests.

#### `src/types/`

TypeScript type definitions and interfaces.

- `dashboard.ts`: Types specifically related to dashboard data structures, API
  responses, or component props.
