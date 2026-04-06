import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/dashboard/Navbar';
import Sidebar from '@/components/dashboard/Sidebar';
import StatsCards from '@/components/dashboard/StatsCards';
import MapView from '@/components/dashboard/MapView';
import { DashboardTab, Filters } from '@/types/dashboard';
import { getDetections, getLabels, getStats } from '@/lib/dashboardApi';

const Index = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('flora');
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    confidenceMin: 81,
    selectedLabels: [],
  });

  const labelsQuery = useQuery({
    queryKey: ['dashboard-labels', activeTab],
    queryFn: () => getLabels(activeTab),
  });

  useEffect(() => {
    if (!labelsQuery.data) {
      return;
    }

    const allowed = new Set(labelsQuery.data.map((label) => label.name));
    setFilters((previous) => {
      const kept = previous.selectedLabels.filter((label) => allowed.has(label));
      if (kept.length > 0) {
        return { ...previous, selectedLabels: kept };
      }
      return { ...previous, selectedLabels: labelsQuery.data.map((label) => label.name) };
    });
  }, [activeTab, labelsQuery.data]);

  const detectionsQueryParams = useMemo(
    () => ({
      category: activeTab,
      labels: filters.selectedLabels,
      confidenceMin: filters.confidenceMin,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    [activeTab, filters.confidenceMin, filters.dateFrom, filters.dateTo, filters.selectedLabels]
  );

  const detectionsQuery = useQuery({
    queryKey: ['dashboard-detections', detectionsQueryParams],
    queryFn: () => getDetections(detectionsQueryParams),
  });

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getStats,
  });

  const hasApiError = labelsQuery.isError || detectionsQuery.isError || statsQuery.isError;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          labels={labelsQuery.data || []}
          isLoadingLabels={labelsQuery.isLoading}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <main className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
          {hasApiError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Could not load dashboard data from DGIS database. Ensure the API server is running and DGIS.db exists.
            </div>
          )}
          <StatsCards stats={statsQuery.data} isLoading={statsQuery.isLoading} />
          <MapView activeTab={activeTab} detections={detectionsQuery.data || []} isLoading={detectionsQuery.isLoading} />
        </main>
      </div>
    </div>
  );
};

export default Index;
