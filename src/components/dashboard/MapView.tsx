import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BiomeId, DashboardLabel, DashboardStats, DashboardTab, Detection } from '@/types/dashboard';
import { getLabelMarkerStyle, getLabelStyle } from '@/lib/labelColors';
import { Plus, Minus, Locate } from 'lucide-react';
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
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ active: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const [hoveredDetection, setHoveredDetection] = useState<Detection | null>(null);
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

  const hasNoDatabaseObservations =
    hasLiveData && !isLoading && !isLoadingStats && Number(stats?.totalDetections ?? 0) === 0;

  const totalAnimals = useMemo(
    () => labels.filter((label) => label.group === 'fauna').reduce((sum, label) => sum + label.count, 0),
    [labels]
  );

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

  return (
    <div className="relative flex-1 rounded-xl overflow-hidden bg-[hsl(140,25%,15%)] border border-border">
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
              detections.map((d) => (
                <div
                  key={d.id}
                  className="absolute w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150"
                  style={{
                    left: `${d.percentX}%`,
                    top: `${d.percentY}%`,
                    transform: 'translate(-50%, -50%)',
                    ...getLabelMarkerStyle(d.name, labelScope),
                  }}
                  onMouseEnter={() => setHoveredDetection(d)}
                  onMouseLeave={() => setHoveredDetection(null)}
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
          detections.map((d) => (
            <div
              key={d.id}
              className="absolute w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150"
              style={{
                left: `${d.percentX}%`,
                top: `${d.percentY}%`,
                transform: 'translate(-50%, -50%)',
                ...getLabelMarkerStyle(d.name, labelScope),
              }}
              onMouseEnter={() => setHoveredDetection(d)}
              onMouseLeave={() => setHoveredDetection(null)}
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
            className="absolute z-20 w-52 bg-card/90 backdrop-blur-md rounded-xl border border-border p-3 shadow-lg pointer-events-none"
            style={hoveredPopupStyle}
          >
            <div className="w-full h-24 rounded-lg bg-secondary mb-2 flex items-center justify-center overflow-hidden">
              <span className="text-3xl">🌿</span>
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
