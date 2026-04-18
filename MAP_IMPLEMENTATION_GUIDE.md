# Map Implementation Guide

## Purpose

This document explains:

1. How the Boreal map integration was implemented in this project.
2. How to repeat the same approach for other maps/biomes.

It covers backend coordinate conversion, frontend rendering, map-like zoom and pan behavior, and validation steps.

---

## What Was Implemented For Boreal

### 1) Backend: Stable Unity-to-Map coordinate conversion

File: server/index.cjs

In the detections API, Boreal now uses fixed Unity world bounds:

- X: 0 to 1000
- Z: 0 to 1000

Instead of recalculating bounds from filtered rows, Boreal uses fixed bounds so marker positions do not drift when filters change.

Current behavior in /api/detections:

- For boreal-forest:
  - minX = 0, maxX = 1000
  - minZ = 0, maxZ = 1000
- For other biomes:
  - still uses DB min/max from selected labels

Coordinate conversion used by API:

- percentX = normalize(x, minX, maxX)
- percentY = 100 - normalize(z, minZ, maxZ)

The Y inversion is required because screen space grows downward while Unity Z grows upward in the top-down reference.

Result: the same Unity coordinate always lands on the same map position for Boreal.

---

### 2) Frontend: Native-size map image without base stretching

File: src/components/dashboard/MapView.tsx

Boreal now renders:

- image: public/maps/object_topdown.png
- native map size: 1280 x 1280

The rendered map stage is explicitly sized to 1280x1280 and transformed for pan/zoom. At zoom = 1, the image is shown at native size (not stretched by width:100%/height:100%).

---

### 3) Frontend: Google-map style interaction for Boreal

File: src/components/dashboard/MapView.tsx

Implemented for Boreal only:

- Wheel zoom, anchored around cursor position
- Drag to pan
- Pan clamping so the map cannot be dragged out of allowed bounds
- Zoom controls (+, -, reset) integrated with same transform logic

Interaction settings:

- min zoom = 0.5
- max zoom = 4.0

Transform model:

- map stage transform: translate(panX, panY) scale(zoom)
- transform origin: top left

This keeps movement predictable and makes interaction feel like a map tool.

---

### 4) Marker and popup synchronization

File: src/components/dashboard/MapView.tsx

For Boreal:

- Markers are rendered inside the same transformed map stage as the image.
- Marker placement uses percentX/percentY from API.
- Since image and markers share the same transform, they always stay aligned when zooming and panning.

Popup behavior:

- Popup position is computed in viewport pixel space from transformed marker position.
- Popup is clamped to viewport so it remains visible.

---

### 5) Boreal selection wiring

File: src/pages/Index.tsx

selectedBiome is passed to MapView so Boreal-specific behavior can be enabled without affecting other biomes.

---

## Why This Approach Works

1. Stable server normalization removes filter-dependent drift.
2. Native-size base map avoids distortion at default zoom.
3. Single shared transform for map + markers guarantees alignment.
4. Pan clamping and anchored zoom provide expected map UX.

---

## How To Apply The Same Method To Other Maps

## Required inputs per new map

Before coding, collect these facts:

1. Biome ID (example: mountain)
2. Map image path (example: public/maps/mountain_topdown.png)
3. Image native width and height in pixels
4. Unity world bounds for the captured map image:
   - minX, maxX
   - minZ, maxZ
5. Axis orientation confirmation:
   - Is X horizontal?
   - Is Z vertical?
   - Is Y inversion needed?
6. Whether image represents full world extent or only a crop

If this data is not exact, mapping will be approximate.

---

## Step-by-step onboarding procedure for a new map

### Step 1: Add data source support (if needed)

File: server/index.cjs

- Add new biome entry in BIOME_CONFIG with correct DB path and labels.
- Confirm biome resolution works through resolveBiome.

### Step 2: Add fixed bounds normalization for that biome

File: server/index.cjs (/api/detections)

- Add biome condition and use fixed min/max bounds from Unity world capture.
- Keep current behavior for biomes that should remain dynamic.

Recommended long-term improvement:

- Move hardcoded bounds into BIOME_CONFIG mapProjection object.
- Read minX/maxX/minZ/maxZ from config instead of if blocks.

### Step 3: Add map image profile in frontend

File: src/components/dashboard/MapView.tsx

Define per-map profile values:

- image source
- map width
- map height
- min zoom
- max zoom (optional custom)

### Step 4: Enable map mode condition for that biome

File: src/components/dashboard/MapView.tsx

- Add biome check similar to isBorealForest.
- Render map viewport with map stage transform for that biome.
- Use image in native size at zoom=1.

### Step 5: Render markers inside transformed stage

File: src/components/dashboard/MapView.tsx

- Ensure marker layer is inside the same transformed container as image.
- Keep left/top based on percentX/percentY.

### Step 6: Verify popup positioning

File: src/components/dashboard/MapView.tsx

- If popup should remain readable in zoomed/panned view, compute popup from transformed marker pixel coordinates and clamp to viewport.

### Step 7: Wire biome selection

File: src/pages/Index.tsx

- Ensure selectedBiome reaches MapView.
- Ensure backend requests include biome as already done in detections query params.

### Step 8: Validate thoroughly

- Switch filters (labels/date/confidence): marker positions must remain stable for same raw x/z.
- Zoom and pan aggressively: markers must stay attached to map features.
- Compare known Unity reference points against map landmarks.

---

## Handling non-ideal map images

If your image is not a perfect full-extent top-down capture:

1. Cropped image only:
   - You need crop-aware mapping (map range to sub-rectangle).
2. Rotated/skewed image:
   - You need affine/homography calibration, not simple min/max normalization.
3. Different axis direction:
   - You may need to remove inversion or swap axes.

Do not assume all maps can use the same direct formula unless capture conditions match Boreal.

---

## Testing Checklist

### Backend checks

- API returns percent values in 0..100.
- Same Unity coordinate returns same percent values across filter changes.
- Unsupported biome returns clear error.

### Frontend checks

- Correct image appears for target biome.
- Image is not stretched at base zoom.
- Wheel zoom anchors near cursor.
- Drag pan is smooth and clamped.
- Marker alignment remains correct across zoom levels.
- Popup remains visible and readable.

### Regression checks

- Non-target biomes keep existing behavior.
- Export and statistics flows still work.

---

## Suggested Refactor For Scale

As more maps are added, create a shared map profile config object.

Example shape:

- biomeId
- imageSrc
- width
- height
- minZoom
- maxZoom
- bounds: minX, maxX, minZ, maxZ
- invertY: true/false

Use this profile in both backend normalization and frontend rendering to avoid duplicated per-biome if statements.

---

## Current Boreal Reference Values

- Image: public/maps/object_topdown.png
- Image size: 1280 x 1280
- Unity bounds used for conversion:
  - X: 0..1000
  - Z: 0..1000
- Zoom range: 0.5..4.0
- Interaction: wheel zoom + drag pan + reset
