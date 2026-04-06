import { useState, useMemo } from 'react';
import { DashboardLabel, DashboardTab, Detection } from '@/types/dashboard';
import { getLabelColorClass, getLabelShadowClass } from '@/lib/labelColors';
import { Plus, Minus, Locate } from 'lucide-react';

interface MapViewProps {
  activeTab: DashboardTab;
  detections: Detection[];
  labels: DashboardLabel[];
  hasLiveData: boolean;
  biomeLabel: string;
  isLoading?: boolean;
}

const MapView = ({ activeTab, detections, labels, hasLiveData, biomeLabel, isLoading = false }: MapViewProps) => {
  const [hoveredDetection, setHoveredDetection] = useState<Detection | null>(null);
  const [zoom, setZoom] = useState(1);

  const legendItems = useMemo(() => {
    const fallback =
      activeTab === 'flora'
        ? ['Hickory', 'Maple']
        : ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'];
    const detectionNames = Array.from(new Set(detections.map((item) => item.name)));
    const labelNames = Array.from(new Set(labels.map((item) => item.name)));
    const source = detectionNames.length > 0 ? detectionNames : labelNames.length > 0 ? labelNames : fallback;
    return source.map((name) => ({ name, color: getLabelColorClass(name) }));
  }, [activeTab, detections, labels]);

  return (
    <div className="relative flex-1 rounded-xl overflow-hidden bg-[hsl(140,25%,15%)] border border-border">
      {/* Map background pattern */}
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

      {/* Markers */}
      <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
        {!isLoading &&
          detections.map((d) => (
            <div
              key={d.id}
              className={`absolute w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150 ${getLabelColorClass(d.name)} ${getLabelShadowClass(d.name)}`}
              style={{ left: `${d.percentX}%`, top: `${d.percentY}%`, transform: 'translate(-50%, -50%)' }}
              onMouseEnter={() => setHoveredDetection(d)}
              onMouseLeave={() => setHoveredDetection(null)}
            />
          ))}
      </div>

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

      {/* Popup */}
      {hoveredDetection && (() => {
        const popupLeft = hoveredDetection.percentX > 60 ? hoveredDetection.percentX - 25 : hoveredDetection.percentX + 3;
        const popupTop = hoveredDetection.percentY > 60 ? hoveredDetection.percentY - 35 : hoveredDetection.percentY + 3;
        return (
          <div
            className="absolute z-20 w-52 bg-card/90 backdrop-blur-md rounded-xl border border-border p-3 shadow-lg pointer-events-none"
            style={{ left: `${popupLeft}%`, top: `${popupTop}%` }}
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
                { label: 'X-AXIS', value: hoveredDetection.x.toFixed(4) },
                { label: 'Y-AXIS', value: hoveredDetection.y.toFixed(4) },
                { label: 'Z-AXIS', value: hoveredDetection.z.toFixed(1) },
              ].map((a) => (
                <div key={a.label} className="bg-secondary rounded-md p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground">{a.label}</p>
                  <p className="text-xs font-bold text-foreground">{a.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg border border-border px-3 py-2">
        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Legend</p>
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-2 py-0.5">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-xs text-foreground">{item.name}</span>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button onClick={() => setZoom((z) => Math.min(z + 0.2, 3))} className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))} className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom(1)} className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors">
          <Locate className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MapView;
