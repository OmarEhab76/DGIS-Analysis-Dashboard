import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/dashboard/Navbar';
import Sidebar from '@/components/dashboard/Sidebar';
import MapView from '@/components/dashboard/MapView';
import { BiomeId, DashboardTab, Filters } from '@/types/dashboard';
import { getDetections, getLabels, getStats } from '@/lib/dashboardApi';
import { BIOME_NO_DATA_STATS, BIOME_OPTIONS, getBiomeLabels } from '@/data/mockData';

const Index = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('flora');
  const [selectedBiome, setSelectedBiome] = useState<BiomeId>('temperate-forest');
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    confidenceMin: 81,
    selectedLabels: [],
  });

  const activeBiome = useMemo(
    () => BIOME_OPTIONS.find((biome) => biome.id === selectedBiome) ?? BIOME_OPTIONS[0],
    [selectedBiome]
  );
  const hasLiveDatabaseData = activeBiome.hasDatabaseData;
  const expectedDbFile = selectedBiome === 'boreal-forest' ? 'DGIS_Boreal.db' : 'DGIS.db';

  const labelsQuery = useQuery({
    queryKey: ['dashboard-labels', selectedBiome, activeTab],
    queryFn: () =>
      hasLiveDatabaseData ? getLabels(activeTab, selectedBiome) : Promise.resolve(getBiomeLabels(selectedBiome, activeTab)),
  });

  useEffect(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      confidenceMin: 81,
      selectedLabels: [],
    });
  }, [selectedBiome]);

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
  }, [labelsQuery.data]);

  const detectionsQueryParams = useMemo(
    () => ({
      category: activeTab,
      labels: filters.selectedLabels,
      confidenceMin: filters.confidenceMin,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      biome: selectedBiome,
    }),
    [activeTab, filters.confidenceMin, filters.dateFrom, filters.dateTo, filters.selectedLabels, selectedBiome]
  );

  const detectionsQuery = useQuery({
    queryKey: ['dashboard-detections', detectionsQueryParams],
    queryFn: () => (hasLiveDatabaseData ? getDetections(detectionsQueryParams) : Promise.resolve([])),
  });

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', selectedBiome],
    queryFn: () => (hasLiveDatabaseData ? getStats(selectedBiome) : Promise.resolve(BIOME_NO_DATA_STATS)),
  });

  const hasApiError = hasLiveDatabaseData && (labelsQuery.isError || detectionsQuery.isError || statsQuery.isError);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedBiome={selectedBiome}
        biomeOptions={BIOME_OPTIONS}
        onBiomeChange={setSelectedBiome}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          selectedBiome={selectedBiome}
          labels={labelsQuery.data || []}
          isLoadingLabels={labelsQuery.isLoading}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <main className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
          {hasApiError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Could not load dashboard data for {activeBiome.label}. Ensure the API server is running and {expectedDbFile} exists.
            </div>
          )}
          <MapView
            activeTab={activeTab}
            detections={detectionsQuery.data || []}
            labels={labelsQuery.data || []}
            isLoading={detectionsQuery.isLoading}
            hasLiveData={hasLiveDatabaseData}
            biomeLabel={activeBiome.label}
            emptyDbFile={expectedDbFile}
            stats={statsQuery.data}
            isLoadingStats={statsQuery.isLoading}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
