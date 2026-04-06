import { DashboardStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
  hasLiveData?: boolean;
}

const StatsCards = ({ stats, isLoading = false, hasLiveData = true }: StatsCardsProps) => {
  const showNoData = !isLoading && !hasLiveData;

  const cards = [
    {
      label: 'Total Detections',
      value: showNoData ? '--' : stats ? stats.totalDetections.toLocaleString() : '--',
      iconSrc: '/icons/Total Detections.svg',
      color: 'text-primary',
    },
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
    {
      label: 'Area Scanned',
      value: showNoData ? '--' : stats ? `${stats.areaScanned}` : '--',
      unit: showNoData ? undefined : 'km²',
      iconSrc: '/icons/Area Scanned.svg',
      color: 'text-primary',
    },
  ];

  return (
    <div>
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
            <img src={c.iconSrc} alt={`${c.label} Icon`} className={`w-6 h-6 ${c.color} opacity-60`} />
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
