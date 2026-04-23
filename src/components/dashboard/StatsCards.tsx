import { DashboardStats, DashboardTab } from '@/types/dashboard';
import { PawPrint } from 'lucide-react';

interface StatsCardsProps {
  activeTab: DashboardTab;
  stats?: DashboardStats;
  totalAnimals?: number;
  isLoading?: boolean;
  hasLiveData?: boolean;
}

const StatsCards = ({ activeTab, stats, totalAnimals = 0, isLoading = false, hasLiveData = true }: StatsCardsProps) => {
  const showNoData = !isLoading && !hasLiveData;

  const detectionCard = {
    label: 'Total Detections',
    value: showNoData ? '--' : stats ? stats.totalDetections.toLocaleString() : '--',
    iconSrc: '/icons/Total Detections.svg',
    color: 'text-primary',
  };

  const areaScannedCard = {
    label: 'Area Scanned',
    value: showNoData ? '--' : stats ? `${stats.areaScanned}` : '--',
    unit: showNoData ? undefined : 'km²',
    iconSrc: '/icons/Area Scanned.svg',
    color: 'text-primary',
  };

  const cards =
    activeTab === 'fauna'
      ? [
          detectionCard,
          {
            label: 'Total Animals',
            value: showNoData ? '--' : totalAnimals.toLocaleString(),
            icon: PawPrint,
            color: '#13EC5B',
          },
          areaScannedCard,
        ]
      : [
          detectionCard,
          {
            label: 'Total Trees',
            value: showNoData ? '--' : stats ? stats.totalTrees.toLocaleString() : '--',
            iconSrc: '/icons/Total Trees.svg',
            color: 'text-primary',
          },
          {
            label: 'Total Plants',
            value: showNoData ? '--' : stats ? stats.totalPlants : '-',
            iconSrc: '/icons/Total Plants.svg',
            color: 'text-primary',
          },
          areaScannedCard,
        ];

  const gridClassName = activeTab === 'fauna' ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-4 gap-3';

  return (
    <div>
      <div className={gridClassName}>
        {cards.map((c) => (
          <div key={c.label} className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '...' : c.value}
                {c.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{c.unit}</span>}
              </p>
            </div>
            {'icon' in c ? (
              <c.icon className="w-6 h-6 opacity-60" style={{ color: c.color }} aria-hidden="true" />
            ) : (
              <img src={c.iconSrc} alt={`${c.label} Icon`} className={`w-6 h-6 ${c.color} opacity-60`} />
            )}
          </div>
        ))}
      </div>
      {showNoData && (
        <p className="text-xs text-muted-foreground mt-2 px-1">Live statistics are only available for Temperate Forest at the moment.</p>
      )}
    </div>
  );
};

export default StatsCards;
