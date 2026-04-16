import { Trees, Bug } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/dashboard/Navbar';
import Sidebar from '@/components/dashboard/Sidebar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { toast } from '@/components/ui/sonner';
import { BIOME_NO_DATA_STATS, BIOME_OPTIONS, getBiomeLabels } from '@/data/mockData';
import { buildDetectionsCsv, buildExportFilename, downloadCsvFile } from '@/lib/csvExport';
import { getDetections, getLabels, getStats } from '@/lib/dashboardApi';
import { getLabelColorValue } from '@/lib/labelColors';
import { BiomeId, DashboardTab, Filters } from '@/types/dashboard';

const CONFIDENCE_BIN_START = 50;
const CONFIDENCE_BIN_END = 100;
const CONFIDENCE_BIN_STEP = 5;

const confidenceBinStarts = Array.from(
  { length: ((CONFIDENCE_BIN_END - CONFIDENCE_BIN_START) / CONFIDENCE_BIN_STEP) + 1 },
  (_, index) => CONFIDENCE_BIN_START + (index * CONFIDENCE_BIN_STEP)
);

const confidenceBinColors = [
  'bg-[rgb(2,44,34)]',
  'bg-[rgb(4,60,46)]',
  'bg-[rgb(6,78,59)]',
  'bg-[rgb(6,95,70)]',
  'bg-[rgb(5,120,87)]',
  'bg-[rgb(4,143,105)]',
  'bg-[rgb(6,173,124)]',
  'bg-[rgb(16,185,129)]',
  'bg-[rgb(52,211,153)]',
  'bg-[rgb(110,231,183)]',
  'bg-[rgb(167,243,208)]',
];

const taxonomyMap: Record<string, string> = {
  // Fauna: Boreal Forest
  'Beaver': 'Mammals', 'Lynx': 'Mammals', 'Marten': 'Mammals', 'Squirrel': 'Mammals',
  'Warbler': 'Birds', 'Woodpecker': 'Birds',
  // Fauna: Coastal Desert
  'Desert Bighorn Sheep': 'Mammals', 'Desert Gazelle': 'Mammals',
  'Pelican': 'Birds', 'Seabird': 'Birds',
  'Desert Tortoise': 'Reptiles', 'Rattlesnake': 'Reptiles',
  // Fauna: Mountain
  'Alpine Marmot': 'Mammals', 'Elk': 'Mammals', 'Grizzly Bear': 'Mammals', 'Mountain Lion': 'Mammals',
  'Golden Eagle': 'Birds',
  // Fauna: Plains
  'Bison': 'Mammals', 'Black-footed Ferret': 'Mammals', 'Hyena': 'Mammals', 'Lion': 'Mammals', 'Plains Elephant': 'Mammals', 'Zebra': 'Mammals',
  'Burrowing Owl': 'Birds', 'Pipit': 'Birds', 'Quail': 'Birds',
  'Ornate Box Turtle': 'Reptiles',
  // Fauna: Subtropical Desert
  'Jerboa': 'Mammals', 'Fennec Fox': 'Mammals', 'Dromedary Camel': 'Mammals',
  'Gecko': 'Reptiles', 'Horned Lizard': 'Reptiles',
  // Fauna: New Additions
  'Wood Frog': 'Amphibians',
  'White-tailed Deer': 'Mammals',
  'Red Fox': 'Mammals',
  'Raccoon': 'Mammals',
  'American Black Bear': 'Mammals',
  'Desert Scorpion': 'Arachnids',

  // Flora: Trees - Gymnosperms
  'Conifer': 'Gymnosperms (Conifers)',
  // Flora: Trees - Angiosperms (Broadleaf)
  'Birch Tree': 'Broadleaf Trees', 'Hickory': 'Broadleaf Trees', 'Maple': 'Broadleaf Trees',
  // Flora: Trees - Angiosperms (Desert/Tropical)
  'Desert Willow': 'Desert / Tropical Trees', 'Date Palm': 'Desert / Tropical Trees',
  // Flora: Shrubs & Herbs (Ground Plants)
  'Buffalograss': 'Herbs / Ground Plants', 'Edelweiss': 'Herbs / Ground Plants', 'Heather': 'Herbs / Ground Plants', 'Rhododendron': 'Herbs / Ground Plants',
  // Flora: Succulents & Desert Plants
  'Agave': 'Succulents & Desert Plants', 'Cactus': 'Succulents & Desert Plants', 'Aloe Vera Plant': 'Succulents & Desert Plants',
  // Flora: Flowering/Medicinal Plants
  'Salvia Plant': 'Flowering/Medicinal Plants',
};

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

  const taxonomyStats = useMemo(() => {
    if (activeTab !== 'fauna' || !detectionsQuery.data || detectionsQuery.data.length === 0) {
      return { mammals: 0, birds: 0, reptiles: 0, amphibians: 0, arachnids: 0, total: 0 };
    }

    let mammals = 0;
    let birds = 0;
    let reptiles = 0;
    let amphibians = 0;
    let arachnids = 0;

    detectionsQuery.data.forEach((d) => {
      const tax = taxonomyMap[d.name];
      if (tax === 'Mammals') mammals++;
      else if (tax === 'Birds') birds++;
      else if (tax === 'Reptiles') reptiles++;
      else if (tax === 'Amphibians') amphibians++;
      else if (tax === 'Arachnids') arachnids++;
    });

    return { mammals, birds, reptiles, amphibians, arachnids, total: mammals + birds + reptiles + amphibians + arachnids };
  }, [activeTab, detectionsQuery.data]);

  const floraTaxonomyStats = useMemo(() => {
    let conifers = 0;
    let broadleaf = 0;
    let desertTropical = 0;
    let herbsGround = 0;
    let succulentsDesert = 0;
    let floweringMedicinal = 0;

    if (activeTab === 'flora' && detectionsQuery.data && detectionsQuery.data.length > 0) {
      detectionsQuery.data.forEach((d) => {
        const tax = taxonomyMap[d.name];
        if (tax === 'Gymnosperms (Conifers)') conifers++;
        else if (tax === 'Broadleaf Trees') broadleaf++;
        else if (tax === 'Desert / Tropical Trees') desertTropical++;
        else if (tax === 'Herbs / Ground Plants') herbsGround++;
        else if (tax === 'Succulents & Desert Plants') succulentsDesert++;
        else if (tax === 'Flowering/Medicinal Plants') floweringMedicinal++;
      });
    }

    return {
      conifers,
      broadleaf,
      desertTropical,
      herbsGround,
      succulentsDesert,
      floweringMedicinal,
      total: conifers + broadleaf + desertTropical + herbsGround + succulentsDesert + floweringMedicinal
    };
  }, [activeTab, detectionsQuery.data]);

  const mammalsPct = taxonomyStats.total > 0 ? Math.round((taxonomyStats.mammals / taxonomyStats.total) * 100) : 0;
  const birdsPct = taxonomyStats.total > 0 ? Math.round((taxonomyStats.birds / taxonomyStats.total) * 100) : 0;
  const reptilesPct = taxonomyStats.total > 0 ? Math.round((taxonomyStats.reptiles / taxonomyStats.total) * 100) : 0;
  const amphibiansPct = taxonomyStats.total > 0 ? Math.round((taxonomyStats.amphibians / taxonomyStats.total) * 100) : 0;
  const arachnidsPct = taxonomyStats.total > 0 ? Math.round((taxonomyStats.arachnids / taxonomyStats.total) * 100) : 0;

  const mammalsAngle = taxonomyStats.total > 0 ? (taxonomyStats.mammals / taxonomyStats.total) * 360 : 0;
  const birdsAngle = taxonomyStats.total > 0 ? (taxonomyStats.birds / taxonomyStats.total) * 360 : 0;
  const reptilesAngle = taxonomyStats.total > 0 ? (taxonomyStats.reptiles / taxonomyStats.total) * 360 : 0;
  const amphibiansAngle = taxonomyStats.total > 0 ? (taxonomyStats.amphibians / taxonomyStats.total) * 360 : 0;
  const arachnidsAngle = taxonomyStats.total > 0 ? (taxonomyStats.arachnids / taxonomyStats.total) * 360 : 0;

  const grad1 = mammalsAngle;
  const grad2 = grad1 + birdsAngle;
  const grad3 = grad2 + reptilesAngle;
  const grad4 = grad3 + amphibiansAngle;
  const taxonomyGradient = taxonomyStats.total > 0
    ? `conic-gradient(rgb(74 222 128) 0deg ${grad1}deg, rgb(253 230 138) ${grad1}deg ${grad2}deg, rgb(251 113 133) ${grad2}deg ${grad3}deg, rgb(96 165 250) ${grad3}deg ${grad4}deg, rgb(192 132 252) ${grad4}deg 360deg)`
    : 'none';

  const conifersPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.conifers / floraTaxonomyStats.total) * 100) : 0;
  const broadleafPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.broadleaf / floraTaxonomyStats.total) * 100) : 0;
  const desertTropicalPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.desertTropical / floraTaxonomyStats.total) * 100) : 0;
  const herbsGroundPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.herbsGround / floraTaxonomyStats.total) * 100) : 0;
  const succulentsDesertPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.succulentsDesert / floraTaxonomyStats.total) * 100) : 0;
  const floweringMedicinalPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.floweringMedicinal / floraTaxonomyStats.total) * 100) : 0;

  const conifersAngle = floraTaxonomyStats.total > 0 ? (floraTaxonomyStats.conifers / floraTaxonomyStats.total) * 360 : 0;
  const broadleafAngle = floraTaxonomyStats.total > 0 ? (floraTaxonomyStats.broadleaf / floraTaxonomyStats.total) * 360 : 0;
  const desertTropicalAngle = floraTaxonomyStats.total > 0 ? (floraTaxonomyStats.desertTropical / floraTaxonomyStats.total) * 360 : 0;
  const herbsGroundAngle = floraTaxonomyStats.total > 0 ? (floraTaxonomyStats.herbsGround / floraTaxonomyStats.total) * 360 : 0;
  const succulentsDesertAngle = floraTaxonomyStats.total > 0 ? (floraTaxonomyStats.succulentsDesert / floraTaxonomyStats.total) * 360 : 0;
  const floweringMedicinalAngle = floraTaxonomyStats.total > 0 ? (floraTaxonomyStats.floweringMedicinal / floraTaxonomyStats.total) * 360 : 0;

  const fGrad1 = conifersAngle;
  const fGrad2 = fGrad1 + broadleafAngle;
  const fGrad3 = fGrad2 + desertTropicalAngle;
  const fGrad4 = fGrad3 + herbsGroundAngle;
  const fGrad5 = fGrad4 + succulentsDesertAngle;

  const floraTaxonomyGradient = floraTaxonomyStats.total > 0
    ? `conic-gradient(rgb(6 78 59) 0deg ${fGrad1}deg, rgb(16 185 129) ${fGrad1}deg ${fGrad2}deg, rgb(252 211 77) ${fGrad2}deg ${fGrad3}deg, rgb(244 114 182) ${fGrad3}deg ${fGrad4}deg, rgb(251 146 60) ${fGrad4}deg ${fGrad5}deg, rgb(167 139 250) ${fGrad5}deg 360deg)`
    : 'none';

  const speciesCountStats = useMemo(() => {
    if (!detectionsQuery.data || detectionsQuery.data.length === 0) {
      return [];
    }

    const speciesAggregates = detectionsQuery.data.reduce((acc, detection) => {
      if (!acc[detection.name]) {
        acc[detection.name] = {
          count: 0,
          confidenceSum: 0,
        };
      }

      acc[detection.name].count += 1;
      acc[detection.name].confidenceSum += detection.confidence;
      return acc;
    }, {} as Record<string, { count: number; confidenceSum: number }>);

    const sortedSpecies = (Object.entries(speciesAggregates) as [string, { count: number; confidenceSum: number }][])
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    if (sortedSpecies.length === 0) return [];

    const maxCount = sortedSpecies[0][1].count;
    const labelScope = sortedSpecies.map((s) => s[0]);

    return sortedSpecies.map(([name, summary]) => ({
      name,
      count: summary.count,
      maxCount,
      taxonomyCategory: taxonomyMap[name] ?? 'Uncategorized',
      avgConfidencePercent: summary.count > 0 ? summary.confidenceSum / summary.count : 0,
      mapLabel: activeBiome.label,
      height: Math.max(Math.round((summary.count / maxCount) * 100), 5),
      color: getLabelColorValue(name, labelScope),
    }));
  }, [activeBiome.label, detectionsQuery.data]);

  const confidenceHistogramStats = useMemo(() => {
    const detections = detectionsQuery.data ?? [];
    const binMap = new Map<number, { count: number; confidenceSum: number }>();

    confidenceBinStarts.forEach((binStart) => {
      binMap.set(binStart, { count: 0, confidenceSum: 0 });
    });

    detections.forEach((detection) => {
      const clampedConfidence = Math.max(
        CONFIDENCE_BIN_START,
        Math.min(CONFIDENCE_BIN_END, detection.confidence)
      );
      const binStart =
        clampedConfidence === CONFIDENCE_BIN_END
          ? CONFIDENCE_BIN_END
          : Math.floor(clampedConfidence / CONFIDENCE_BIN_STEP) * CONFIDENCE_BIN_STEP;

      const summary = binMap.get(binStart);
      if (!summary) {
        return;
      }

      summary.count += 1;
      summary.confidenceSum += detection.confidence;
    });

    const bins = confidenceBinStarts.map((binStart, index) => {
      const summary = binMap.get(binStart) ?? { count: 0, confidenceSum: 0 };
      const avgConfidence = summary.count > 0 ? summary.confidenceSum / summary.count : 0;
      const rangeLabel =
        binStart === CONFIDENCE_BIN_END
          ? `${CONFIDENCE_BIN_END}%`
          : `${binStart}-${binStart + (CONFIDENCE_BIN_STEP - 1)}%`;

      return {
        label: `${binStart}%`,
        rangeLabel,
        count: summary.count,
        avgConfidence,
        colorClass: confidenceBinColors[index],
      };
    });

    const maxCount = bins.reduce((maximum, bin) => Math.max(maximum, bin.count), 0);
    const totalConfidenceSum = detections.reduce((sum, detection) => sum + detection.confidence, 0);
    const overallAvgConfidence = detections.length > 0 ? totalConfidenceSum / detections.length : 0;

    return {
      bins: bins.map((bin) => {
        if (maxCount === 0) {
          return { ...bin, height: 4 };
        }

        const scaledHeight = Math.round((bin.count / maxCount) * 100);
        return {
          ...bin,
          height: bin.count === 0 ? 4 : Math.max(scaledHeight, 8),
        };
      }),
      overallAvgConfidence,
    };
  }, [detectionsQuery.data]);

  const confidenceCategoryLabel = activeTab === 'flora' ? 'Flora' : 'Fauna';

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
                <h3 className="text-2xl font-semibold leading-none">{activeTab === 'fauna' ? 'Taxonomy Breakdown' : 'Flora Taxonomy Breakdown'}</h3>
                <p className="text-sm text-muted-foreground">Major category distribution</p>
                <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3 text-sm min-w-[180px]">
                    {activeTab === 'fauna' ? (
                      <>
                        {taxonomyStats.mammals > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Mammals</span>
                            <span className="font-semibold text-right w-16">{taxonomyStats.mammals} <span className="text-xs font-normal text-muted-foreground">({mammalsPct}%)</span></span>
                          </div>
                        )}
                        {taxonomyStats.birds > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-200" /> Birds</span>
                            <span className="font-semibold text-right w-16">{taxonomyStats.birds} <span className="text-xs font-normal text-muted-foreground">({birdsPct}%)</span></span>
                          </div>
                        )}
                        {taxonomyStats.reptiles > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Reptiles</span>
                            <span className="font-semibold text-right w-16">{taxonomyStats.reptiles} <span className="text-xs font-normal text-muted-foreground">({reptilesPct}%)</span></span>
                          </div>
                        )}
                        {taxonomyStats.amphibians > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Amphibians</span>
                            <span className="font-semibold text-right w-16">{taxonomyStats.amphibians} <span className="text-xs font-normal text-muted-foreground">({amphibiansPct}%)</span></span>
                          </div>
                        )}
                        {taxonomyStats.arachnids > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> Arachnids</span>
                            <span className="font-semibold text-right w-16">{taxonomyStats.arachnids} <span className="text-xs font-normal text-muted-foreground">({arachnidsPct}%)</span></span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {floraTaxonomyStats.conifers > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-900" /> Gymnosperms</span>
                            <span className="font-semibold text-right w-16">{floraTaxonomyStats.conifers} <span className="text-xs font-normal text-muted-foreground">({conifersPct}%)</span></span>
                          </div>
                        )}
                        {floraTaxonomyStats.broadleaf > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Broadleaf</span>
                            <span className="font-semibold text-right w-16">{floraTaxonomyStats.broadleaf} <span className="text-xs font-normal text-muted-foreground">({broadleafPct}%)</span></span>
                          </div>
                        )}
                        {floraTaxonomyStats.desertTropical > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /> Desert / Tropical</span>
                            <span className="font-semibold text-right w-16">{floraTaxonomyStats.desertTropical} <span className="text-xs font-normal text-muted-foreground">({desertTropicalPct}%)</span></span>
                          </div>
                        )}
                        {floraTaxonomyStats.herbsGround > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-pink-400" /> Herbs / Ground</span>
                            <span className="font-semibold text-right w-16">{floraTaxonomyStats.herbsGround} <span className="text-xs font-normal text-muted-foreground">({herbsGroundPct}%)</span></span>
                          </div>
                        )}
                        {floraTaxonomyStats.succulentsDesert > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> Succulents</span>
                            <span className="font-semibold text-right w-16">{floraTaxonomyStats.succulentsDesert} <span className="text-xs font-normal text-muted-foreground">({succulentsDesertPct}%)</span></span>
                          </div>
                        )}
                        {floraTaxonomyStats.floweringMedicinal > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> Flowering/Medicinal</span>
                            <span className="font-semibold text-right w-16">{floraTaxonomyStats.floweringMedicinal} <span className="text-xs font-normal text-muted-foreground">({floweringMedicinalPct}%)</span></span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div
                    className={`relative h-44 w-44 rounded-full ${
                      (activeTab === 'fauna' && taxonomyStats.total === 0) || (activeTab === 'flora' && floraTaxonomyStats.total === 0) 
                        ? 'bg-emerald-900/20' 
                        : ''
                    }`}
                    style={{
                      background: activeTab === 'fauna' ? taxonomyGradient : floraTaxonomyGradient,
                    }}
                  >
                    <div className="absolute inset-[17%] grid place-items-center rounded-full border border-emerald-900/40 bg-[#052015]">
                      <div className="text-center">
                        <p className="text-4xl font-bold leading-none">{activeTab === 'fauna' ? taxonomyStats.total : floraTaxonomyStats.total}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Classified</p>
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
                  <p className="text-lg font-semibold text-primary">
                    {detectionsQuery.isLoading ? '--' : `${confidenceHistogramStats.overallAvgConfidence.toFixed(1)}%`}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex h-40 items-end gap-1.5">
                  {confidenceHistogramStats.bins.map((bin) => (
                    <div key={bin.label} className="flex flex-1">
                      <HoverCard openDelay={120}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className={`w-full rounded-t-sm border border-emerald-950/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${bin.colorClass} ${bin.count > 0 ? 'opacity-95 hover:opacity-100' : 'opacity-30'}`}
                            style={{ height: `${bin.height}%` }}
                            aria-label={`Show confidence details for ${bin.rangeLabel} bin`}
                          />
                        </HoverCardTrigger>
                        <HoverCardContent side="top" align="center" className="w-56 border-emerald-900/40 bg-[#0a2e21] p-3 text-foreground">
                          <p className="text-sm font-semibold">Confidence Bin</p>
                          <div className="mt-2 space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Range</span>
                              <span className="font-medium">{bin.rangeLabel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Detections</span>
                              <span className="font-medium">{bin.count}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Avg confidence</span>
                              <span className="font-medium">{bin.avgConfidence.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Map</span>
                              <span className="max-w-[110px] truncate text-right font-medium" title={activeBiome.label}>{activeBiome.label}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Category</span>
                              <span className="font-medium">{confidenceCategoryLabel}</span>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-11 text-[10px] text-muted-foreground">
                  {confidenceHistogramStats.bins.map((bin) => (
                    <span key={bin.label} className="text-center">
                      {bin.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5 min-h-[380px] flex flex-col">
              <h3 className="text-2xl font-semibold leading-none">Species Count</h3>
              <p className="text-sm text-muted-foreground">Comparing the frequency of top species</p>

              <div className="relative mt-8 flex flex-1 w-full pl-4">
                <span className="absolute -left-2 top-1/2 -ml-3 -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Count
                </span>

                <div className="flex w-full h-[220px] gap-3">
                  <div className="flex h-[200px] w-8 flex-col justify-between text-right text-[10px] text-muted-foreground">
                    <span>{speciesCountStats.length > 0 ? speciesCountStats[0].maxCount : 100}</span>
                    <span>{speciesCountStats.length > 0 ? Math.round(speciesCountStats[0].maxCount * 0.75) : 75}</span>
                    <span>{speciesCountStats.length > 0 ? Math.round(speciesCountStats[0].maxCount * 0.5) : 50}</span>
                    <span>{speciesCountStats.length > 0 ? Math.round(speciesCountStats[0].maxCount * 0.25) : 25}</span>
                    <span>0</span>
                  </div>

                  <div className="flex flex-1 flex-col w-full h-full">
                    <div className="flex h-[200px] w-full items-end justify-between gap-4 border-b border-l border-emerald-900/40 px-4">
                      {speciesCountStats.length > 0 ? (
                        speciesCountStats.map((item) => (
                          <div key={item.name} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                            <HoverCard openDelay={160}>
                              <HoverCardTrigger asChild>
                                <button
                                  type="button"
                                  className="w-full max-w-[64px] cursor-pointer appearance-none rounded-t-sm border-0 bg-transparent p-0 opacity-90 transition-all group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  style={{ height: `${item.height}%`, backgroundColor: item.color }}
                                  aria-label={`Show details for ${item.name}`}
                                />
                              </HoverCardTrigger>
                              <HoverCardContent side="top" align="center" className="w-52 border-emerald-900/40 bg-[#0a2e21] p-3 text-foreground">
                                <p className="text-sm font-semibold">{item.name}</p>
                                <div className="mt-2 space-y-1 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Count</span>
                                    <span className="font-medium">{item.count}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Taxonomy</span>
                                    <span className="max-w-[110px] truncate text-right font-medium" title={item.taxonomyCategory}>{item.taxonomyCategory}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Avg confidence</span>
                                    <span className="font-medium">{item.avgConfidencePercent.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Map</span>
                                    <span className="max-w-[110px] truncate text-right font-medium" title={item.mapLabel}>{item.mapLabel}</span>
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                            <div className="absolute -bottom-6 w-full text-center">
                              <span 
                                className="block truncate px-1 text-[10px] text-muted-foreground" 
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                          No species data available
                        </div>
                      )}
                    </div>
                    <div className="mt-8 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                      Species
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
