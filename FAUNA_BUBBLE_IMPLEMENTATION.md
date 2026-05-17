# Fauna Bubble Clustering Implementation

## Goal
Implement adaptive "many animals in area" bubbles on the dot-map dashboard for fauna detections, with strict hover behavior:

- Create a bubble when `5+` detections of the **same label** are close.
- "Close" means:
  - `|x1 - x2| <= 50`
  - `|z1 - z2| <= 50`
- Bubble color must match the label color.
- Bubbles must update automatically with active filters.
- Hover behavior:
  - If the pointer is on a point, show the existing point tooltip.
  - If the pointer stops inside a bubble area that has no point under cursor, show bubble tooltip.
  - If a small bubble overlaps a big bubble, hovering overlap should prefer the small bubble.

## File Changed
- `src/components/dashboard/MapView.tsx`

## What Was Added

### 1. Bubble Data Model and Constants
Added types and constants:

- `FaunaDensityBubble`
- `HoveredBubbleState`
- `FAUNA_CLUSTER_AXIS_DISTANCE = 50`
- `FAUNA_CLUSTER_MIN_POINTS = 5`
- `BUBBLE_AREA_PADDING_PERCENT = 1.4`
- `BUBBLE_AREA_MIN_SIZE_PERCENT = 4`
- `BUBBLE_HOVER_DELAY_MS = 320`

Purpose:
- Keep clustering logic explicit and configurable.
- Keep hover delay and visual sizing predictable.

### 2. Label Color Integration
Updated imports to include:

- `getLabelColorValue`

Purpose:
- Bubble fill/border/glow uses the same computed label color as points/legend.

### 3. New Hover State and Refs
Added:

- `mapRootRef`
- `bubbleHoverTimerRef`
- `hoveredBubble` state

Purpose:
- Compute tooltip position relative to the correct surface.
- Delay bubble tooltip until cursor stops.
- Track currently hovered bubble independently from point hover.

### 4. Bubble Hover Scheduling
Added handlers:

- `scheduleBubbleHover(...)`
- `handleBubbleMouseEnter(...)`
- `handleBubbleMouseMove(...)`
- `handleBubbleMouseLeave(...)`
- `clearBubbleHoverTimer(...)`

Behavior:
- Enter/move inside bubble starts/reset a delayed timer.
- Bubble tooltip appears only after `BUBBLE_HOVER_DELAY_MS`.
- Leaving bubble cancels timer and clears bubble tooltip.
- If a point is hovered, bubble tooltip is blocked.

### 5. Fauna Cluster Detection (Adaptive to Filters)
Added `useMemo` that computes `faunaDensityBubbles` from current `detections`.

How it works:
- Runs only when:
  - `activeTab === 'fauna'`
  - data is not loading
  - at least 5 detections exist
- Groups detections by `label`.
- For each label group, builds connected components (BFS):
  - Two detections are connected if both axis constraints are satisfied:
    - `abs(dx) <= 30` and `abs(dz) <= 30`
- Keeps components with `>= 5` detections.
- Converts each component to a screen bubble:
  - Uses min/max `percentX` and `percentY` of points.
  - Adds padding and minimum visual size.
  - Clamps bubble area to map bounds.
- Stores tooltip ranges from real-space values:
  - `minX`, `maxX`, `minZ`, `maxZ`

Why it is adaptive:
- `detections` already come from active filters (labels/date/confidence/tab/biome).
- When filters change, `detections` changes, and bubbles recompute automatically.

### 6. Overlap Priority: Small Bubble over Big Bubble
Added sorting before returning bubbles:

- Sort by area descending (`largest first`).
- Render order means later elements appear on top.
- Smaller bubbles render above larger ones and receive hover first in overlaps.

Result:
- In overlapping regions, stopping mouse on the small bubble shows small bubble info.

### 7. Bubble Rendering
Rendered bubbles in both map modes:

- Map image mode (transformed map container)
- Fallback/non-map mode

Visual style:
- Rounded ellipse/circle area
- Semi-transparent fill (`opacity: 0.22`)
- Same label color for fill, border, and glow
- Point markers remain above bubbles (`z-10`), bubbles below (`z-0`)

### 8. Bubble Tooltip
Added bubble tooltip popup with:

- Title: `"Area with many <label> detections"`
- Cluster count
- `X Range: minX to maxX`
- `Z Range: minZ to maxZ`

Display rule:
- `!hoveredDetection && hoveredBubble && hoveredBubblePopupStyle`
- This preserves point-tooltip priority.

### 9. State Safety on Interaction Changes
Added effects:

- If a point becomes hovered:
  - clear bubble timer
  - hide bubble tooltip
- If filtered results remove current hovered bubble:
  - hide stale bubble tooltip

Purpose:
- Prevent stale or conflicting tooltips.

## Verification

Build was executed successfully after implementation and after overlap-priority update:

- `npm run build` -> success

Notes:
- Existing bundle-size warnings are pre-existing and unrelated to this feature.

## Summary of Behavior Now

1. Fauna-only clustering bubbles appear for dense same-label groups (5+ points, x/z proximity rule).
2. Bubble colors match label colors.
3. Bubbles adapt instantly to filters because they derive from filtered detections.
4. Point hover always has priority over bubble hover.
5. Bubble tooltip appears only on stationary hover in bubble area without a point.
6. In overlap between big and small bubbles, small bubble has hover priority.
