# Map Implementation Guide (AI-Executable Version)

This document is written so you can hand it directly to any AI coding model and get a consistent implementation with minimal back-and-forth.

## 1) Scope and Goal

Implement a map mode where:

1. Backend converts Unity coordinates to stable map percentages.
2. Frontend renders a native-size map image.
3. Frontend supports map-like zoom and pan.
4. Markers remain perfectly aligned during zoom/pan.
5. Popup positioning remains readable and on-screen.
6. Existing non-map biomes continue working without regressions.

Current repository baseline already contains this behavior for boreal-forest. Use this guide to reproduce the same quality for new biomes/maps.

---

## 2) Current Working Reference (Do Not Guess)

Use these exact known-good references:

1. Backend detections API implementation: server/index.cjs
2. Frontend map rendering and interactions: src/components/dashboard/MapView.tsx
3. Biome selection wiring: src/pages/Index.tsx

Current Boreal constants:

1. Image path: public/maps/object_topdown.png
2. Image native size: 1280 x 1280
3. Unity bounds: X 0..1000, Z 0..1000
4. Zoom range: 0.5..4.0

---

## 3) Mandatory Inputs Before Any AI Starts Coding

For each new map/biome, collect these first. If any is missing, AI must stop and ask.

1. biomeId: Example mountain
2. dbFile: Example DGIS_Mountain.db
3. mapImagePath: Example /maps/mountain_topdown.png
4. mapWidthPx: Native width in pixels
5. mapHeightPx: Native height in pixels
6. worldBounds:
   - minX
   - maxX
   - minZ
   - maxZ
7. axisRules:
   - xMapsToHorizontal: true or false
   - zMapsToVertical: true or false
   - invertY: true or false
8. mapCoverage:
   - full-extent top-down capture OR cropped/partial
9. zoomLimits:
   - minZoom
   - maxZoom

Input JSON template:

```json
{
  "biomeId": "mountain",
  "dbFile": "DGIS_Mountain.db",
  "mapImagePath": "/maps/mountain_topdown.png",
  "mapWidthPx": 2048,
  "mapHeightPx": 2048,
  "worldBounds": {
    "minX": 0,
    "maxX": 2000,
    "minZ": 0,
    "maxZ": 2000
  },
  "axisRules": {
    "xMapsToHorizontal": true,
    "zMapsToVertical": true,
    "invertY": true
  },
  "mapCoverage": "full-extent",
  "zoomLimits": {
    "minZoom": 0.5,
    "maxZoom": 4
  }
}
```

---

## 4) Implementation Contract (What AI Must Deliver)

The AI implementation is complete only when all items below are true.

1. Backend returns percentX and percentY in range 0..100.
2. Same raw X/Z point maps to same percentX/percentY regardless of filters.
3. Map image displays at native dimensions at zoom = 1.
4. Wheel zoom is anchored at cursor location.
5. Drag pan is clamped (no empty-space runaway behavior).
6. Markers are rendered in the same transformed layer as the map image.
7. Popup remains visible and does not clip out of viewport.
8. Existing biomes and statistics/export flows remain unchanged.

---

## 5) Backend Implementation Spec

Target file: server/index.cjs

### 5.1 Add or confirm biome config entry

In BIOME_CONFIG, ensure the target biome exists with:

1. Correct dbPath
2. Correct flora/fauna labels

### 5.2 Use fixed world bounds for map-enabled biomes

Inside /api/detections, mapping must use fixed bounds for map-enabled biomes.

Required formulas:

1. percentX = normalize(x, minX, maxX)
2. percentYRaw = normalize(z, minZ, maxZ)
3. percentY = invertY ? (100 - percentYRaw) : percentYRaw
4. Clamp both outputs to 0..100

Important:

1. Do not compute bounds from filtered rows for map-enabled biomes.
2. Dynamic bounds cause marker drift when filters change.
3. Keep dynamic-bounds behavior only for biomes that explicitly require it.

### 5.3 Preferred scalable structure

If refactoring, add projection metadata in BIOME_CONFIG:

```js
mapProjection: {
  mode: 'fixed',
  minX: 0,
  maxX: 1000,
  minZ: 0,
  maxZ: 1000,
  invertY: true
}
```

Then use this config to avoid scattered per-biome if blocks.

### 5.4 Backend safety checks

AI must preserve:

1. Existing unsupported biome 400 behavior
2. Existing DB unavailable 500 behavior
3. Existing response shape for detections

---

## 6) Frontend Implementation Spec

Primary target file: src/components/dashboard/MapView.tsx

### 6.1 Map profile values

For map-enabled biome, define:

1. image source
2. map width
3. map height
4. min zoom
5. max zoom

### 6.2 Transform model (must match exactly)

Use one stage containing image + markers with:

1. transform: translate(panX, panY) scale(zoom)
2. transformOrigin: top left

Never place markers outside this transformed stage for map mode.

### 6.3 Zoom behavior

Wheel zoom requirements:

1. Prevent default wheel scroll
2. Compute cursor anchor relative to viewport
3. Convert anchor to map coordinates before zoom
4. Recompute pan so anchor remains under cursor after zoom
5. Clamp zoom to minZoom/maxZoom

### 6.4 Pan behavior

Pointer drag requirements:

1. Capture pointer on pointer down
2. Compute delta from drag start
3. Apply candidate pan
4. Clamp pan using scaled map size and viewport size
5. Release pointer on pointer up/leave

### 6.5 Center/reset behavior

Reset button must:

1. Set zoom to 1
2. Center map in viewport
3. Apply pan clamping after centering

### 6.6 Marker placement

Marker position:

1. left = percentX%
2. top = percentY%
3. transform: translate(-50%, -50%)

### 6.7 Popup placement

For map mode popup:

1. Convert marker percent to transformed pixel coordinates:
   - markerX = (percentX / 100) * mapWidth * zoom + panX
   - markerY = (percentY / 100) * mapHeight * zoom + panY
2. Choose preferred side relative to marker
3. Clamp popup box to viewport padding bounds

### 6.8 Non-map behavior isolation

Ensure non-map biomes retain existing view behavior and styling.

---

## 7) Wiring and Data Flow

Target file: src/pages/Index.tsx

AI must verify:

1. selectedBiome is passed into MapView
2. detections query includes biome
3. labels query includes biome
4. stats query includes biome

Do not change query contracts unless required.

---

## 8) Edge Cases and Decision Rules

If map image is not ideal, simple min/max normalization may be wrong.

1. Cropped map image:
   - Need crop-offset aware mapping to sub-rectangle.
2. Rotated/skewed image:
   - Need affine/homography calibration.
3. Axis mismatch:
   - May require axis swap and/or invertY false.

Rule: if mapCoverage is not full-extent top-down, AI must warn and request calibration inputs before coding.

---

## 9) Validation Procedure (AI Must Execute)

### 9.1 Backend validation

1. Call /api/detections for target biome with no filters.
2. Call again with narrowed labels/date/confidence.
3. For a known detection id, confirm stable percentX/percentY mapping behavior for same coordinate basis.
4. Confirm all percent outputs are in 0..100.

### 9.2 Frontend validation

1. Open target biome and confirm correct image is shown.
2. At zoom 1, verify image appears at native ratio (no base stretch).
3. Wheel zoom near corners and center; anchor should hold visually.
4. Drag in all directions; map should clamp correctly.
5. Hover markers at multiple zoom levels; popup stays readable and inside viewport.
6. Toggle filters and ensure markers remain aligned with map features.

### 9.3 Regression validation

1. Switch to non-target biomes and verify existing behavior unchanged.
2. Verify export still works.
3. Verify statistics dashboard still loads.

---

## 10) Definition of Done

All conditions below must be true:

1. Build succeeds.
2. Target biome map mode works with stable mapping.
3. Manual validation checklist passes.
4. No regression in non-target biomes.
5. Code is organized so additional maps can be added without repeating large if blocks.

---

## 11) AI Handoff Prompt (Copy/Paste)

Use this when giving work to another AI model.

```text
You are implementing map mode in this repository. Follow MAP_IMPLEMENTATION_GUIDE.md strictly.

Constraints:
1) Do not change unrelated behavior.
2) Keep API response contracts stable.
3) Prefer config-driven map profiles over hardcoded biome branches.
4) Keep marker-map alignment exact during zoom/pan.

Inputs for this run:
<PASTE THE INPUT JSON HERE>

Tasks:
1) Update backend mapping in server/index.cjs using fixed world bounds for the target biome.
2) Update frontend map mode in src/components/dashboard/MapView.tsx with native-size image, cursor-anchored zoom, clamped pan, and popup clamping.
3) Verify biome wiring in src/pages/Index.tsx.
4) Run validation from the guide and report pass/fail per check.

Output format required:
1) Changed files list
2) Summary of logic changes
3) Validation results checklist
4) Any assumptions or missing calibration data
```

---

## 12) Boreal Example (Reference Inputs)

```json
{
  "biomeId": "boreal-forest",
  "dbFile": "DGIS_Boreal.db",
  "mapImagePath": "/maps/object_topdown.png",
  "mapWidthPx": 1280,
  "mapHeightPx": 1280,
  "worldBounds": {
    "minX": 0,
    "maxX": 1000,
    "minZ": 0,
    "maxZ": 1000
  },
  "axisRules": {
    "xMapsToHorizontal": true,
    "zMapsToVertical": true,
    "invertY": true
  },
  "mapCoverage": "full-extent",
  "zoomLimits": {
    "minZoom": 0.5,
    "maxZoom": 4
  }
}
```
