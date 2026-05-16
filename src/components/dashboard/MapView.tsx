import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BiomeId, DashboardLabel, DashboardStats, DashboardTab, Detection } from '@/types/dashboard';
import { getLabelColorValue, getLabelMarkerStyle, getLabelStyle } from '@/lib/labelColors';
import { getObservationImages, ObservationImage } from '@/lib/dashboardApi';
import { Plus, Minus, Locate, X } from 'lucide-react';
import StatsCards from '@/components/dashboard/StatsCards';

interface MapProfile {
  src: string;
  alt: string;
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
}

const MAP_PROFILES: Partial<Record<BiomeId, MapProfile>> = {
  'temperate-forest': {
    src: '/maps/temperate_Forest.png',
    alt: 'Temperate forest terrain map',
    width: 1280,
    height: 1280,
    minZoom: 0.5,
    maxZoom: 4,
  },
  'boreal-forest': {
    src: '/maps/object_topdown.png',
    alt: 'Boreal forest terrain map',
    width: 1280,
    height: 1280,
    minZoom: 0.5,
    maxZoom: 4,
  },
  mountain: {
    src: '/maps/Mountain.png',
    alt: 'Mountain terrain map',
    width: 1280,
    height: 1280,
    minZoom: 0.5,
    maxZoom: 4,
  },
  plains: {
    src: '/maps/Plains.png',
    alt: 'Plains terrain map',
    width: 1280,
    height: 1280,
    minZoom: 0.5,
    maxZoom: 4,
  },
  'subtropical-desert': {
    src: '/maps/subtropical_desert.png',
    alt: 'Subtropical desert terrain map',
    width: 1280,
    height: 1280,
    minZoom: 0.5,
    maxZoom: 4,
  },
};

interface MapViewProps {
  activeTab: DashboardTab;
  detections: Detection[];
  labels: DashboardLabel[];
  selectedBiome: BiomeId;
  hasLiveData: boolean;
  biomeLabel: string;
  emptyDbFile?: string;
  stats?: DashboardStats;
  isLoadingStats?: boolean;
  isLoading?: boolean;
}

interface FaunaDensityBubble {
  id: string;
  label: string;
  color: string;
  count: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface HoveredBubbleState {
  bubble: FaunaDensityBubble;
  surfaceX: number;
  surfaceY: number;
}

const FAUNA_CLUSTER_AXIS_DISTANCE = 30;
const FAUNA_CLUSTER_MIN_POINTS = 5;
const BUBBLE_AREA_PADDING_PERCENT = 1.4;
const BUBBLE_AREA_MIN_SIZE_PERCENT = 4;
const BUBBLE_HOVER_DELAY_MS = 320;

const MapView = ({
  activeTab,
  detections,
  labels,
  selectedBiome,
  hasLiveData,
  biomeLabel,
  emptyDbFile,
  stats,
  isLoadingStats = false,
  isLoading = false,
}: MapViewProps) => {
  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ active: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const bubbleHoverTimerRef = useRef<number | null>(null);
  const [hoveredDetection, setHoveredDetection] = useState<Detection | null>(null);
  const [hoveredBubble, setHoveredBubble] = useState<HoveredBubbleState | null>(null);
  const [observationImages, setObservationImages] = useState<ObservationImage[]>([]);
  const [observationImagesLoading, setObservationImagesLoading] = useState(false);
  const [observationImagesError, setObservationImagesError] = useState<string | null>(null);
  const [observationImageIndex, setObservationImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const mapProfile = MAP_PROFILES[selectedBiome];
  const isMapMode = Boolean(mapProfile);

  const clampPan = useCallback((candidatePan: { x: number; y: number }, nextZoom: number, viewportWidth: number, viewportHeight: number) => {
    if (!mapProfile) {
      return candidatePan;
    }

    const scaledWidth = mapProfile.width * nextZoom;
    const scaledHeight = mapProfile.height * nextZoom;

    const minX = scaledWidth > viewportWidth ? viewportWidth - scaledWidth : (viewportWidth - scaledWidth) / 2;
    const maxX = scaledWidth > viewportWidth ? 0 : (viewportWidth - scaledWidth) / 2;
    const minY = scaledHeight > viewportHeight ? viewportHeight - scaledHeight : (viewportHeight - scaledHeight) / 2;
    const maxY = scaledHeight > viewportHeight ? 0 : (viewportHeight - scaledHeight) / 2;

    return {
      x: Math.min(maxX, Math.max(minX, candidatePan.x)),
      y: Math.min(maxY, Math.max(minY, candidatePan.y)),
    };
  }, [mapProfile]);

  const centerMapView = useCallback((nextZoom = 1) => {
    if (!mapProfile) {
      return;
    }

    const viewport = mapViewportRef.current;
    if (!viewport) {
      return;
    }

    const centerPan = {
      x: (viewport.clientWidth - mapProfile.width * nextZoom) / 2,
      y: (viewport.clientHeight - mapProfile.height * nextZoom) / 2,
    };

    setZoom(nextZoom);
    setPan(clampPan(centerPan, nextZoom, viewport.clientWidth, viewport.clientHeight));
  }, [clampPan, mapProfile]);

  const zoomMapTo = useCallback((nextZoomRaw: number, anchor?: { x: number; y: number }) => {
    if (!mapProfile) {
      return;
    }

    const viewport = mapViewportRef.current;
    if (!viewport) {
      return;
    }

    const nextZoom = Math.min(mapProfile.maxZoom, Math.max(mapProfile.minZoom, nextZoomRaw));
    if (Math.abs(nextZoom - zoom) < 0.0001) {
      return;
    }

    const anchorX = anchor?.x ?? viewport.clientWidth / 2;
    const anchorY = anchor?.y ?? viewport.clientHeight / 2;
    const mapX = (anchorX - pan.x) / zoom;
    const mapY = (anchorY - pan.y) / zoom;

    const nextPan = {
      x: anchorX - mapX * nextZoom,
      y: anchorY - mapY * nextZoom,
    };

    setZoom(nextZoom);
    setPan(clampPan(nextPan, nextZoom, viewport.clientWidth, viewport.clientHeight));
  }, [clampPan, mapProfile, pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!isMapMode) {
      return;
    }

    centerMapView(1);
  }, [centerMapView, isMapMode]);

  useEffect(() => {
    if (!isMapMode) {
      return;
    }

    const onResize = () => {
      const viewport = mapViewportRef.current;
      if (!viewport) {
        return;
      }

      setPan((previousPan) =>
        clampPan(previousPan, zoom, viewport.clientWidth, viewport.clientHeight)
      );
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [clampPan, isMapMode, zoom]);

  const handleMapWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!isMapMode) {
      return;
    }

    event.preventDefault();

    const viewport = mapViewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const anchor = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomMapTo(zoom * factor, anchor);
  }, [isMapMode, zoom, zoomMapTo]);

  const handleMapPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMapMode) {
      return;
    }

    const viewport = mapViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    setIsDragging(true);
  }, [isMapMode, pan.x, pan.y]);

  const handleMapPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMapMode || !dragStateRef.current.active) {
      return;
    }

    const viewport = mapViewportRef.current;
    if (!viewport) {
      return;
    }

    const nextPan = {
      x: dragStateRef.current.startPanX + (event.clientX - dragStateRef.current.startX),
      y: dragStateRef.current.startPanY + (event.clientY - dragStateRef.current.startY),
    };

    setPan(clampPan(nextPan, zoom, viewport.clientWidth, viewport.clientHeight));
  }, [clampPan, isMapMode, zoom]);

  const handleMapPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMapMode) {
      return;
    }

    const viewport = mapViewportRef.current;
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current.active = false;
    setIsDragging(false);
  }, [isMapMode]);

  const clearBubbleHoverTimer = useCallback(() => {
    if (bubbleHoverTimerRef.current !== null) {
      window.clearTimeout(bubbleHoverTimerRef.current);
      bubbleHoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearBubbleHoverTimer(), [clearBubbleHoverTimer]);

  const scheduleBubbleHover = useCallback(
    (bubble: FaunaDensityBubble, event: React.MouseEvent<HTMLDivElement>) => {
      if (hoveredDetection) {
        return;
      }

      const surface = isMapMode ? mapViewportRef.current : mapRootRef.current;
      if (!surface) {
        return;
      }

      const rect = surface.getBoundingClientRect();
      const surfaceX = event.clientX - rect.left;
      const surfaceY = event.clientY - rect.top;

      clearBubbleHoverTimer();
      bubbleHoverTimerRef.current = window.setTimeout(() => {
        if (!hoveredDetection) {
          setHoveredBubble({ bubble, surfaceX, surfaceY });
        }
      }, BUBBLE_HOVER_DELAY_MS);
    },
    [clearBubbleHoverTimer, hoveredDetection, isMapMode]
  );

  const handleBubbleMouseEnter = useCallback(
    (bubble: FaunaDensityBubble, event: React.MouseEvent<HTMLDivElement>) => {
      scheduleBubbleHover(bubble, event);
    },
    [scheduleBubbleHover]
  );

  const handleBubbleMouseMove = useCallback(
    (bubble: FaunaDensityBubble, event: React.MouseEvent<HTMLDivElement>) => {
      scheduleBubbleHover(bubble, event);
    },
    [scheduleBubbleHover]
  );

  const handleBubbleMouseLeave = useCallback(() => {
    clearBubbleHoverTimer();
    setHoveredBubble(null);
  }, [clearBubbleHoverTimer]);

  const handleDetectionClick = useCallback((event: React.MouseEvent<HTMLDivElement>, detection: Detection) => {
    event.stopPropagation();
    setHoveredDetection(detection);
  }, []);

  const labelScope = useMemo(() => {
    const fallback =
      activeTab === 'flora'
        ? ['Hickory', 'Maple']
        : ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'];
    const names = Array.from(new Set([...labels.map((item) => item.name), ...detections.map((item) => item.name)]));
    return names.length > 0 ? names : fallback;
  }, [activeTab, detections, labels]);

  const legendItems = useMemo(() => {
    const fallback =
      activeTab === 'flora'
        ? ['Hickory', 'Maple']
        : ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'];
    const detectionNames = Array.from(new Set(detections.map((item) => item.name)));
    const labelNames = Array.from(new Set(labels.map((item) => item.name)));
    const source = detectionNames.length > 0 ? detectionNames : labelNames.length > 0 ? labelNames : fallback;
    return source.map((name) => ({ name }));
  }, [activeTab, detections, labels]);

  const faunaDensityBubbles = useMemo<FaunaDensityBubble[]>(() => {
    if (activeTab !== 'fauna' || isLoading || detections.length < FAUNA_CLUSTER_MIN_POINTS) {
      return [];
    }

    const detectionsByLabel = new Map<string, Detection[]>();
    detections.forEach((detection) => {
      const bucket = detectionsByLabel.get(detection.name) ?? [];
      bucket.push(detection);
      detectionsByLabel.set(detection.name, bucket);
    });

    const bubbles: FaunaDensityBubble[] = [];

    detectionsByLabel.forEach((labelDetections, label) => {
      if (labelDetections.length < FAUNA_CLUSTER_MIN_POINTS) {
        return;
      }

      const visited = new Array(labelDetections.length).fill(false);
      for (let start = 0; start < labelDetections.length; start += 1) {
        if (visited[start]) {
          continue;
        }

        const queue = [start];
        const componentIndices: number[] = [];
        visited[start] = true;

        while (queue.length > 0) {
          const current = queue.shift();
          if (current === undefined) {
            continue;
          }

          componentIndices.push(current);
          const source = labelDetections[current];

          for (let other = 0; other < labelDetections.length; other += 1) {
            if (visited[other]) {
              continue;
            }

            const target = labelDetections[other];
            const xDistance = Math.abs(source.x - target.x);
            const zDistance = Math.abs(source.z - target.z);
            if (xDistance <= FAUNA_CLUSTER_AXIS_DISTANCE && zDistance <= FAUNA_CLUSTER_AXIS_DISTANCE) {
              visited[other] = true;
              queue.push(other);
            }
          }
        }

        if (componentIndices.length < FAUNA_CLUSTER_MIN_POINTS) {
          continue;
        }

        const componentDetections = componentIndices.map((index) => labelDetections[index]);
        const minPercentX = Math.min(...componentDetections.map((point) => point.percentX));
        const maxPercentX = Math.max(...componentDetections.map((point) => point.percentX));
        const minPercentY = Math.min(...componentDetections.map((point) => point.percentY));
        const maxPercentY = Math.max(...componentDetections.map((point) => point.percentY));

        const centerX = (minPercentX + maxPercentX) / 2;
        const centerY = (minPercentY + maxPercentY) / 2;
        const rawWidth = (maxPercentX - minPercentX) + BUBBLE_AREA_PADDING_PERCENT * 2;
        const rawHeight = (maxPercentY - minPercentY) + BUBBLE_AREA_PADDING_PERCENT * 2;
        const widthPercent = Math.max(rawWidth, BUBBLE_AREA_MIN_SIZE_PERCENT);
        const heightPercent = Math.max(rawHeight, BUBBLE_AREA_MIN_SIZE_PERCENT);
        const leftPercent = Math.max(0, Math.min(100 - widthPercent, centerX - widthPercent / 2));
        const topPercent = Math.max(0, Math.min(100 - heightPercent, centerY - heightPercent / 2));

        bubbles.push({
          id: `${label}-${componentDetections[0].id}-${componentDetections.length}`,
          label,
          color: getLabelColorValue(label, labelScope),
          count: componentDetections.length,
          minX: Math.min(...componentDetections.map((point) => point.x)),
          maxX: Math.max(...componentDetections.map((point) => point.x)),
          minZ: Math.min(...componentDetections.map((point) => point.z)),
          maxZ: Math.max(...componentDetections.map((point) => point.z)),
          leftPercent,
          topPercent,
          widthPercent,
          heightPercent,
        });
      }
    });

    return [...bubbles].sort((a, b) => {
      const areaA = a.widthPercent * a.heightPercent;
      const areaB = b.widthPercent * b.heightPercent;
      return areaB - areaA;
    });
  }, [activeTab, detections, isLoading, labelScope]);

  const hasNoDatabaseObservations =
    hasLiveData && !isLoading && !isLoadingStats && Number(stats?.totalDetections ?? 0) === 0;

  const totalAnimals = useMemo(
    () => labels.filter((label) => label.group === 'fauna').reduce((sum, label) => sum + label.count, 0),
    [labels]
  );

  useEffect(() => {
    if (hoveredDetection) {
      clearBubbleHoverTimer();
      setHoveredBubble(null);
    }
  }, [clearBubbleHoverTimer, hoveredDetection]);

  useEffect(() => {
    if (hoveredBubble && !faunaDensityBubbles.some((bubble) => bubble.id === hoveredBubble.bubble.id)) {
      setHoveredBubble(null);
    }
  }, [faunaDensityBubbles, hoveredBubble]);

  useEffect(() => {
    if (!hoveredDetection) {
      setObservationImages([]);
      setObservationImagesLoading(false);
      setObservationImagesError(null);
      setObservationImageIndex(0);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setObservationImages([]);
    setObservationImagesLoading(true);
    setObservationImagesError(null);
    setObservationImageIndex(0);

    getObservationImages(hoveredDetection.id, selectedBiome, controller.signal)
      .then((images) => {
        if (cancelled) {
          return;
        }
        setObservationImages(images);
      })
      .catch((error: Error) => {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }
        setObservationImagesError('Could not load photos for this observation.');
      })
      .finally(() => {
        if (!cancelled) {
          setObservationImagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hoveredDetection, selectedBiome]);

  const hasObservationImages = observationImages.length > 0;
  const activeObservationImage = hasObservationImages
    ? observationImages[observationImageIndex % observationImages.length]
    : null;

  const showPreviousObservationImage = useCallback(() => {
    setObservationImageIndex((currentIndex) => {
      if (observationImages.length === 0) {
        return 0;
      }
      return (currentIndex - 1 + observationImages.length) % observationImages.length;
    });
  }, [observationImages.length]);

  const showNextObservationImage = useCallback(() => {
    setObservationImageIndex((currentIndex) => {
      if (observationImages.length === 0) {
        return 0;
      }
      return (currentIndex + 1) % observationImages.length;
    });
  }, [observationImages.length]);

  const hoveredPopupStyle = useMemo(() => {
    if (!hoveredDetection) {
      return null;
    }

    if (!mapProfile) {
      const popupLeft = hoveredDetection.percentX > 60 ? hoveredDetection.percentX - 25 : hoveredDetection.percentX + 3;
      const popupTop = hoveredDetection.percentY > 60 ? hoveredDetection.percentY - 35 : hoveredDetection.percentY + 3;
      return { left: `${popupLeft}%`, top: `${popupTop}%` };
    }

    const viewport = mapViewportRef.current;
    if (!viewport) {
      return { left: '16px', top: '16px' };
    }

    const markerX = (hoveredDetection.percentX / 100) * mapProfile.width * zoom + pan.x;
    const markerY = (hoveredDetection.percentY / 100) * mapProfile.height * zoom + pan.y;
    const popupWidth = 208;
    const popupHeight = 220;

    const desiredLeft = markerX + (markerX > viewport.clientWidth * 0.6 ? -popupWidth - 12 : 12);
    const desiredTop = markerY + (markerY > viewport.clientHeight * 0.6 ? -popupHeight - 12 : 12);

    const clampedLeft = Math.min(viewport.clientWidth - popupWidth - 8, Math.max(8, desiredLeft));
    const clampedTop = Math.min(viewport.clientHeight - popupHeight - 8, Math.max(8, desiredTop));

    return { left: `${clampedLeft}px`, top: `${clampedTop}px` };
  }, [hoveredDetection, mapProfile, pan.x, pan.y, zoom]);

  const hoveredBubblePopupStyle = useMemo(() => {
    if (!hoveredBubble || hoveredDetection) {
      return null;
    }

    const surface = isMapMode ? mapViewportRef.current : mapRootRef.current;
    if (!surface) {
      return { left: '16px', top: '16px' };
    }

    const popupWidth = 260;
    const popupHeight = 130;
    const desiredLeft = hoveredBubble.surfaceX + (hoveredBubble.surfaceX > surface.clientWidth * 0.6 ? -popupWidth - 12 : 12);
    const desiredTop = hoveredBubble.surfaceY + (hoveredBubble.surfaceY > surface.clientHeight * 0.6 ? -popupHeight - 12 : 12);
    const clampedLeft = Math.min(surface.clientWidth - popupWidth - 8, Math.max(8, desiredLeft));
    const clampedTop = Math.min(surface.clientHeight - popupHeight - 8, Math.max(8, desiredTop));

    return { left: `${clampedLeft}px`, top: `${clampedTop}px` };
  }, [hoveredBubble, hoveredDetection, isMapMode]);

  return (
    <div ref={mapRootRef} className="relative flex-1 rounded-xl overflow-hidden bg-[hsl(140,25%,15%)] border border-border">
      {/* Map background */}
      {mapProfile ? (
        <div
          ref={mapViewportRef}
          className={`absolute inset-0 overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleMapWheel}
          onPointerDown={handleMapPointerDown}
          onPointerMove={handleMapPointerMove}
          onPointerUp={handleMapPointerUp}
          onPointerLeave={handleMapPointerUp}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: `${mapProfile.width}px`,
              height: `${mapProfile.height}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <img
              src={mapProfile.src}
              alt={mapProfile.alt}
              className="block"
              style={{ width: `${mapProfile.width}px`, height: `${mapProfile.height}px` }}
              draggable={false}
            />

            {!isLoading &&
              faunaDensityBubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className="absolute rounded-full border cursor-default z-0"
                  style={{
                    left: `${bubble.leftPercent}%`,
                    top: `${bubble.topPercent}%`,
                    width: `${bubble.widthPercent}%`,
                    height: `${bubble.heightPercent}%`,
                    backgroundColor: bubble.color,
                    borderColor: bubble.color,
                    boxShadow: `0 0 16px ${bubble.color}`,
                    opacity: 0.22,
                  }}
                  onMouseEnter={(event) => handleBubbleMouseEnter(bubble, event)}
                  onMouseMove={(event) => handleBubbleMouseMove(bubble, event)}
                  onMouseLeave={handleBubbleMouseLeave}
                />
              ))}

            {!isLoading &&
              detections.map((d) => (
                <div
                  key={d.id}
                  className="absolute w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150 z-10"
                  style={{
                    left: `${d.percentX}%`,
                    top: `${d.percentY}%`,
                    transform: 'translate(-50%, -50%)',
                    ...getLabelMarkerStyle(d.name, labelScope),
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => handleDetectionClick(event, d)}
                />
              ))}
          </div>
        </div>
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 20% 50%, hsl(100, 30%, 25%) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 30%, hsl(90, 25%, 20%) 0%, transparent 40%),
                radial-gradient(ellipse at 50% 80%, hsl(110, 20%, 18%) 0%, transparent 45%),
                radial-gradient(ellipse at 80% 70%, hsl(95, 30%, 22%) 0%, transparent 35%)
              `,
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234ade80' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </>
      )}

      {/* Stats cards overlaid on the map */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <StatsCards
          activeTab={activeTab}
          stats={stats}
          totalAnimals={totalAnimals}
          isLoading={isLoadingStats}
          hasLiveData={hasLiveData}
        />
      </div>

      {/* Markers */}
      {!isMapMode && (
      <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
        {!isLoading &&
          faunaDensityBubbles.map((bubble) => (
            <div
              key={bubble.id}
              className="absolute rounded-full border cursor-default z-0"
              style={{
                left: `${bubble.leftPercent}%`,
                top: `${bubble.topPercent}%`,
                width: `${bubble.widthPercent}%`,
                height: `${bubble.heightPercent}%`,
                backgroundColor: bubble.color,
                borderColor: bubble.color,
                boxShadow: `0 0 16px ${bubble.color}`,
                opacity: 0.22,
              }}
              onMouseEnter={(event) => handleBubbleMouseEnter(bubble, event)}
              onMouseMove={(event) => handleBubbleMouseMove(bubble, event)}
              onMouseLeave={handleBubbleMouseLeave}
            />
          ))}

        {!isLoading &&
          detections.map((d) => (
            <div
              key={d.id}
              className="absolute w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150 z-10"
              style={{
                left: `${d.percentX}%`,
                top: `${d.percentY}%`,
                transform: 'translate(-50%, -50%)',
                ...getLabelMarkerStyle(d.name, labelScope),
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => handleDetectionClick(event, d)}
            />
          ))}
      </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center text-sm text-foreground bg-background/20">
          Loading detections...
        </div>
      )}

      {!isLoading && !hasLiveData && (
        <div className="absolute inset-0 grid place-items-center text-center px-6 bg-background/20">
          <div className="max-w-sm rounded-lg border border-border bg-card/90 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">No detection data yet for {biomeLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">Labels are available for exploration, but database observations for this map are not connected yet.</p>
          </div>
        </div>
      )}

      {hasNoDatabaseObservations && (
        <div className="absolute inset-0 grid place-items-center text-center px-6 bg-background/20">
          <div className="max-w-sm rounded-lg border border-border bg-card/90 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">No observations yet for {biomeLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {emptyDbFile ? `${emptyDbFile} does not contain records yet.` : 'This biome database does not contain records yet.'}
            </p>
          </div>
        </div>
      )}

      {/* Popup */}
      {hoveredDetection && hoveredPopupStyle && (
          <div
            className="absolute z-20 w-52 bg-card/90 backdrop-blur-md rounded-xl border border-border p-3 shadow-lg pointer-events-auto"
            style={hoveredPopupStyle}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="relative w-full h-24 rounded-lg bg-secondary mb-2 flex items-center justify-center overflow-hidden">
              <button
                type="button"
                className="absolute right-1.5 top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-white hover:bg-red-500"
                onClick={() => setHoveredDetection(null)}
                aria-label="Close detection popup"
              >
                <X className="h-3 w-3" />
              </button>
              {observationImagesLoading && (
                <span className="text-xs text-muted-foreground">Loading photos...</span>
              )}
              {!observationImagesLoading && observationImagesError && (
                <span className="text-xs text-destructive text-center px-2">{observationImagesError}</span>
              )}
              {!observationImagesLoading && !observationImagesError && activeObservationImage && (
                <img
                  src={activeObservationImage.url}
                  alt={`${hoveredDetection.name} observation`}
                  className="relative z-0 h-full w-full object-cover"
                />
              )}
              {!observationImagesLoading && !observationImagesError && !activeObservationImage && (
                <span className="text-xs text-muted-foreground">No photo for this observation</span>
              )}

              {!observationImagesLoading && !observationImagesError && observationImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-1 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white hover:bg-black/70"
                    onClick={showPreviousObservationImage}
                    aria-label="Show previous observation photo"
                  >
                    {'<'}
                  </button>
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white hover:bg-black/70"
                    onClick={showNextObservationImage}
                    aria-label="Show next observation photo"
                  >
                    {'>'}
                  </button>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                    {observationImageIndex + 1}/{observationImages.length}
                  </div>
                </>
              )}
            </div>
            <p className="font-semibold text-foreground text-sm mb-2">{hoveredDetection.name}</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</span>
              <span className="text-xs font-bold text-primary">{hoveredDetection.confidence}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5 mb-3">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${hoveredDetection.confidence}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'X-AXIS', value: hoveredDetection.x.toFixed(2) },
                { label: 'Y-AXIS', value: hoveredDetection.y.toFixed(2) },
                { label: 'Z-AXIS', value: hoveredDetection.z.toFixed(2) },
              ].map((a) => (
                <div key={a.label} className="bg-secondary rounded-md p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground">{a.label}</p>
                  <p className="text-xs font-bold text-foreground">{a.value}</p>
                </div>
              ))}
            </div>
          </div>
      )}

      {!hoveredDetection && hoveredBubble && hoveredBubblePopupStyle && (
        <div
          className="absolute z-20 w-[260px] bg-card/90 backdrop-blur-md rounded-xl border border-border p-3 shadow-lg pointer-events-none"
          style={hoveredBubblePopupStyle}
        >
          <p className="font-semibold text-foreground text-sm mb-1">
            Area with many {hoveredBubble.bubble.label} detections
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            {hoveredBubble.bubble.count} detections in this cluster
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-md p-2 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">X Range</p>
              <p className="text-xs font-bold text-foreground">
                {hoveredBubble.bubble.minX.toFixed(2)} to {hoveredBubble.bubble.maxX.toFixed(2)}
              </p>
            </div>
            <div className="bg-secondary rounded-md p-2 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Z Range</p>
              <p className="text-xs font-bold text-foreground">
                {hoveredBubble.bubble.minZ.toFixed(2)} to {hoveredBubble.bubble.maxZ.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg border border-border px-3 py-2">
        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Legend</p>
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-2 py-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={getLabelStyle(item.name, labelScope)} />
            <span className="text-xs text-foreground">{item.name}</span>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => {
            if (isMapMode) {
              zoomMapTo(zoom + 0.2);
              return;
            }

            setZoom((z) => Math.min(z + 0.2, 3));
          }}
          className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (isMapMode) {
              zoomMapTo(zoom - 0.2);
              return;
            }

            setZoom((z) => Math.max(z - 0.2, 0.5));
          }}
          className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (isMapMode) {
              centerMapView(1);
              return;
            }

            setZoom(1);
          }}
          className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
        >
          <Locate className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MapView;

