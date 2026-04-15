import { Trees, Bug } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/dashboard/Navbar';
import Sidebar from '@/components/dashboard/Sidebar';
import { toast } from '@/components/ui/sonner';
import { BIOME_NO_DATA_STATS, BIOME_OPTIONS, getBiomeLabels } from '@/data/mockData';
import { buildDetectionsCsv, buildExportFilename, downloadCsvFile } from '@/lib/csvExport';
import { getDetections, getLabels, getStats } from '@/lib/dashboardApi';
import { BiomeId, DashboardTab, Filters } from '@/types/dashboard';

const speciesBars = [
  { name: 'Lavender', height: 57, color: 'bg-violet-400/80' },
  { name: 'Sunflower', height: 78, color: 'bg-amber-200' },
  { name: 'Loropetalum', height: 40, color: 'bg-rose-400/90' },
  { name: 'Vines', height: 28, color: 'bg-emerald-700/70' },
];

const confidenceBars = [
  { label: '50%', value: 5 },
  { label: '55%', value: 7 },
  { label: '60%', value: 9 },
  { label: '65%', value: 11 },
  { label: '70%', value: 14 },
  { label: '75%', value: 20 },
  { label: '80%', value: 28 },
  { label: '85%', value: 42 },
  { label: '90%', value: 82 },
  { label: '95%', value: 66 },
  { label: '100%', value: 48 },
];

const StatisticsDashboard = () => {
  const navigate = useNavigate();
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

  const treeDensity = useMemo(() => {
    if (!statsQuery.data || !statsQuery.data.areaScanned) return 0;
    return Math.round(statsQuery.data.totalTrees / statsQuery.data.areaScanned);
  }, [statsQuery.data]);

  const biodiversityIndex = useMemo(() => {
    if (!detectionsQuery.data || detectionsQuery.data.length === 0) return "0.00";
    
    const counts = detectionsQuery.data.reduce((acc, detection) => {
      acc[detection.name] = (acc[detection.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalIndividuals = detectionsQuery.data.length;
    
    const shannonIndex = Object.values(counts).reduce<number>((index: number, count: any) => {
      const pi = (count as number) / totalIndividuals;
      return index - (pi * Math.log(pi));
    }, 0);
    
    return shannonIndex.toFixed(2);
  }, [detectionsQuery.data]);

  const hasApiError = hasLiveDatabaseData && (labelsQuery.isError || detectionsQuery.isError || statsQuery.isError);
  const isExportDisabled = labelsQuery.isLoading || detectionsQuery.isLoading;

  const handleExportReport = useCallback(() => {
    const detections = detectionsQuery.data ?? [];
    if (detections.length === 0) {
      toast.error('No points found for the current filters.');
      return;
    }

    const csvContent = buildDetectionsCsv(detections);
    const filename = buildExportFilename(activeTab, selectedBiome);
    downloadCsvFile(csvContent, filename);
    toast.success(`Exported ${detections.length} points to CSV.`);
  }, [activeTab, detectionsQuery.data, selectedBiome]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedBiome={selectedBiome}
        biomeOptions={BIOME_OPTIONS}
        onBiomeChange={setSelectedBiome}
        actionLabel="Dot-Map Dashboard"
        actionIconSrc="/icons/Dot-Map%20Dashboard.svg"
        onActionClick={() => navigate('/')}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          selectedBiome={selectedBiome}
          labels={labelsQuery.data || []}
          isLoadingLabels={labelsQuery.isLoading}
          onExportReport={handleExportReport}
          isExportDisabled={isExportDisabled}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_10%,rgba(35,90,64,0.18),transparent_30%),radial-gradient(circle_at_90%_90%,rgba(37,87,62,0.14),transparent_32%)] p-3 sm:p-4">
          {hasApiError && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Could not load dashboard data for {activeBiome.label}. Ensure the API server is running and {expectedDbFile} exists.
            </div>
          )}
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.3fr]">
            <div className="space-y-4 min-w-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Tree Density</p>
                      <p className="mt-2 text-4xl font-bold leading-none text-foreground">
                        {statsQuery.isLoading ? '--' : treeDensity.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-full bg-emerald-500/10 p-2 text-primary">
                      <Trees className="h-5 w-5" />
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Biodiversity Index</p>
                      <p className="mt-2 text-4xl font-bold leading-none text-foreground">
                        {detectionsQuery.isLoading ? '--' : biodiversityIndex}
                      </p>
                    </div>
                    <div className="rounded-full bg-amber-300/10 p-2 text-amber-200">
                      <Bug className="h-5 w-5" />
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5">
                <h3 className="text-2xl font-semibold leading-none">Taxonomy Breakdown</h3>
                <p className="text-sm text-muted-foreground">Major category distribution</p>
                <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3 text-sm min-w-[180px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Mammals</span>
                      <span className="font-semibold">60%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-200" /> Birds</span>
                      <span className="font-semibold">25%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Reptiles</span>
                      <span className="font-semibold">15%</span>
                    </div>
                  </div>

                  <div
                    className="relative h-44 w-44 rounded-full"
                    style={{
                      background:
                        'conic-gradient(rgb(74 222 128) 0deg 216deg, rgb(253 230 138) 216deg 306deg, rgb(251 113 133) 306deg 360deg)',
                    }}
                  >
                    <div className="absolute inset-[17%] grid place-items-center rounded-full border border-emerald-900/40 bg-[#052015]">
                      <div className="text-center">
                        <p className="text-4xl font-bold leading-none">32</p>
                        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Species</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5 min-h-[310px]">
              <h3 className="text-2xl font-semibold leading-none">Tree Morphology Plot</h3>
              <p className="text-sm text-muted-foreground">Dimensional clustering based on height and width</p>

              <div className="relative mt-5 h-[250px] rounded-2xl border border-emerald-900/30 bg-[#041b13]">
                <span className="absolute left-4 top-4 rounded bg-rose-500/20 px-2 py-1 text-[10px] font-semibold text-rose-300">TALL/THIN</span>
                <span className="absolute right-4 top-4 rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300">GIANTS</span>
                <span className="absolute left-4 bottom-4 rounded bg-amber-300/20 px-2 py-1 text-[10px] font-semibold text-amber-200">SMALL/DELICATE</span>
                <span className="absolute right-4 bottom-4 rounded bg-slate-300/10 px-2 py-1 text-[10px] font-semibold text-slate-300">SHORT/SPRAWLING</span>

                <div className="absolute inset-x-8 bottom-8 border-t border-emerald-900/30" />
                <div className="absolute bottom-8 left-8 top-8 border-l border-emerald-900/30" />

                <span className="absolute -left-6 top-1/2 -rotate-90 text-[10px] uppercase tracking-wider text-muted-foreground">Height (m)</span>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-muted-foreground">Width (m)</span>

                <span className="absolute left-[11%] top-[22%] h-3.5 w-3.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]" />
                <span className="absolute left-[16%] top-[30%] h-2 w-2 rounded-full bg-rose-400/80 shadow-[0_0_8px_rgba(251,113,133,0.7)]" />
                <span className="absolute left-[22%] top-[20%] h-2.5 w-2.5 rounded-full bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.8)]" />

                <span className="absolute left-[12%] top-[78%] h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(253,230,138,0.8)]" />
                <span className="absolute left-[21%] top-[70%] h-1.5 w-1.5 rounded-full bg-amber-200/70 shadow-[0_0_8px_rgba(253,230,138,0.6)]" />

                <span className="absolute left-[77%] top-[22%] h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                <span className="absolute left-[81%] top-[25%] h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.9)]" />
                <span className="absolute left-[85%] top-[19%] h-3.5 w-3.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />

                <span className="absolute left-[73%] top-[65%] h-2.5 w-2.5 rounded-full bg-slate-200 shadow-[0_0_10px_rgba(226,232,240,0.7)]" />
                <span className="absolute left-[79%] top-[70%] h-3 w-3 rounded-full bg-slate-100 shadow-[0_0_10px_rgba(248,250,252,0.8)]" />
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5 min-h-[280px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold leading-none">Confidence Score Distribution</h3>
                  <p className="text-sm text-muted-foreground">Count of detections across confidence thresholds</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg. Conf.</p>
                  <p className="text-lg font-semibold text-primary">78.4%</p>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex h-40 items-end gap-1">
                  {confidenceBars.map((bar) => (
                    <div key={bar.label} className="flex-1">
                      <div
                        className={`w-full rounded-t ${bar.value >= 90 ? 'bg-emerald-400' : bar.value >= 80 ? 'bg-emerald-600' : 'bg-emerald-900/60'}`}
                        style={{ height: `${bar.value}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-11 text-[10px] text-muted-foreground">
                  {confidenceBars.map((bar) => (
                    <span key={bar.label} className="text-center">
                      {bar.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5 min-h-[280px]">
              <h3 className="text-2xl font-semibold leading-none">Species Count</h3>
              <p className="text-sm text-muted-foreground">Comparing the frequency of different species</p>

              <div className="mt-8 h-44 border-l border-b border-emerald-900/40 px-6 pb-3">
                <div className="flex h-full items-end justify-between gap-6">
                  {speciesBars.map((item) => (
                    <div key={item.name} className="flex flex-1 flex-col items-center gap-2">
                      <div className={`w-full max-w-[64px] rounded-t-md ${item.color}`} style={{ height: `${item.height}%` }} />
                      <span className="text-[10px] text-muted-foreground text-center">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="-rotate-90 origin-left translate-y-6">Count</span>
                <span>Category</span>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
