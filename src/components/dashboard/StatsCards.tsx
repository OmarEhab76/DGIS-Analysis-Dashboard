import { Scan, TreePine, Flower2, Map } from 'lucide-react';
import { DashboardStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

const StatsCards = ({ stats, isLoading = false }: StatsCardsProps) => {
  const cards = [
    { label: 'Total Detections', value: stats ? stats.totalDetections.toLocaleString() : '--', icon: Scan, color: 'text-primary' },
    { label: 'Total Trees', value: stats ? stats.totalTrees.toLocaleString() : '--', icon: TreePine, color: 'text-primary' },
    { label: 'Total Plants', value: stats ? stats.totalPlants : '-', icon: Flower2, color: 'text-primary' },
    { label: 'Area Scanned', value: stats ? `${stats.areaScanned}` : '--', unit: 'km²', icon: Map, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : c.value}
              {c.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{c.unit}</span>}
            </p>
          </div>
          <c.icon className={`w-6 h-6 ${c.color} opacity-60`} />
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
