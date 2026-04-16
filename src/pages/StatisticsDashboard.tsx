import { Trees, Bug } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, ScatterChart, Scatter, ZAxis, CartesianGrid, Legend } from 'recharts';
import Navbar from '@/components/dashboard/Navbar';
import Sidebar from '@/components/dashboard/Sidebar';
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
  'rgb(2,44,34)',
  'rgb(4,60,46)',
  'rgb(6,78,59)',
  'rgb(6,95,70)',
  'rgb(5,120,87)',
  'rgb(4,143,105)',
  'rgb(6,173,124)',
  'rgb(16,185,129)',
  'rgb(52,211,153)',
  'rgb(110,231,183)',
  'rgb(167,243,208)',
];

const taxonomyMap: Record<string, string> = {
  // Fauna: Boreal Forest
  'Beaver': 'Mammals', 'Lynx': 'Mammals', 'Marten': 'Mammals', 'Squirrel': 'Mammals',
  'Warbler': 'Birds', 'Woodpecker': 'Birds',
  // Fauna: Coastal Desert
  'Desert Bighorn Sheep': 'Mammals', 'Desert Gazelle': 'Mammals',
  'Pelican': 'Birds', 'Seabird': 'Birds', 'Seabird (avg)': 'Birds',
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
  'Desert Scorpion': 'Arachnids', 'Desert Scorpions': 'Arachnids',

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

interface FloraMorphologySpeciesDimension {
  averageHeight: number;
  averageWidth: number;
}

interface FaunaMorphologySpeciesDimension {
  averageWeightKg: number;
  averageSizeCm: number;
}

type MorphologySpeciesDimension = FloraMorphologySpeciesDimension | FaunaMorphologySpeciesDimension;

interface MorphologyBubbleDatum {
  id: string;
  name: string;
  metricType: DashboardTab;
  xValue: number;
  yValue: number;
  averageHeight?: number;
  averageWidth?: number;
  averageWeightKg?: number;
  averageSizeCm?: number;
  count: number;
  bubbleSize: number;
  fill: string;
  stroke: string;
}

interface BaseTooltipProps<T> {
  active?: boolean;
  payload?: Array<{
    payload: T;
  }>;
}

const MORPHOLOGY_FLORA_SPECIES_DIMENSIONS: Record<string, FloraMorphologySpeciesDimension> = {
  'Birch Tree': {
    averageHeight: 22.5,
    averageWidth: 7.5,
  },
  'Conifer': {
    averageHeight: 40,
    averageWidth: 10,
  },
  'Date Palm': {
    averageHeight: 20,
    averageWidth: 6,
  },
  'Maple': {
    averageHeight: 27.5,
    averageWidth: 15,
  },
  'Hickory': {
    averageHeight: 30,
    averageWidth: 15,
  },
  'Desert Willow': {
    averageHeight: 7.5,
    averageWidth: 4.5,
  },
};

const MORPHOLOGY_FAUNA_SPECIES_DIMENSIONS: Record<string, FaunaMorphologySpeciesDimension> = {
  'Beaver': { averageWeightKg: 23, averageSizeCm: 82.5 },
  'Lynx': { averageWeightKg: 19, averageSizeCm: 95 },
  'Marten': { averageWeightKg: 1.25, averageSizeCm: 55 },
  'Squirrel': { averageWeightKg: 0.5, averageSizeCm: 35 },
  'Warbler': { averageWeightKg: 0.0165, averageSizeCm: 12.5 },
  'Woodpecker': { averageWeightKg: 0.21, averageSizeCm: 32.5 },
  'Desert Bighorn Sheep': { averageWeightKg: 92.5, averageSizeCm: 87.5 },
  'Desert Tortoise': { averageWeightKg: 5.5, averageSizeCm: 30 },
  'Desert Gazelle': { averageWeightKg: 20, averageSizeCm: 60 },
  'Pelican': { averageWeightKg: 8.5, averageSizeCm: 140 },
  'Rattlesnake': { averageWeightKg: 1.5, averageSizeCm: 105 },
  'Seabird (avg)': { averageWeightKg: 0.85, averageSizeCm: 50 },
  'Alpine Marmot': { averageWeightKg: 5.5, averageSizeCm: 60 },
  'Elk': { averageWeightKg: 325, averageSizeCm: 135 },
  'Golden Eagle': { averageWeightKg: 5, averageSizeCm: 85 },
  'Grizzly Bear': { averageWeightKg: 270, averageSizeCm: 125 },
  'Mountain Lion': { averageWeightKg: 75, averageSizeCm: 125 },
  'Bison': { averageWeightKg: 650, averageSizeCm: 175 },
  'Black-footed Ferret': { averageWeightKg: 1.1, averageSizeCm: 50 },
  'Burrowing Owl': { averageWeightKg: 0.2, averageSizeCm: 25 },
  'Hyena': { averageWeightKg: 60, averageSizeCm: 80 },
  'Lion': { averageWeightKg: 185, averageSizeCm: 110 },
  'Ornate Box Turtle': { averageWeightKg: 0.7, averageSizeCm: 12.5 },
  'Pipit': { averageWeightKg: 0.03, averageSizeCm: 16.5 },
  'Plains Elephant': { averageWeightKg: 4500, averageSizeCm: 325 },
  'Quail': { averageWeightKg: 0.175, averageSizeCm: 20 },
  'Zebra': { averageWeightKg: 325, averageSizeCm: 135 },
  'Jerboa': { averageWeightKg: 0.065, averageSizeCm: 12.5 },
  'Desert Scorpion': { averageWeightKg: 0.016, averageSizeCm: 7.5 },
  'Fennec Fox': { averageWeightKg: 1.15, averageSizeCm: 30 },
  'Dromedary Camel': { averageWeightKg: 500, averageSizeCm: 205 },
  'Gecko': { averageWeightKg: 0.06, averageSizeCm: 15 },
  'Horned Lizard': { averageWeightKg: 0.065, averageSizeCm: 10.5 },
  'Wood Frog': { averageWeightKg: 0.0135, averageSizeCm: 6.5 },
  'White-tailed Deer': { averageWeightKg: 90, averageSizeCm: 90 },
  'Red Fox': { averageWeightKg: 8.5, averageSizeCm: 42.5 },
  'Raccoon': { averageWeightKg: 7, averageSizeCm: 55 },
  'American Black Bear': { averageWeightKg: 180, averageSizeCm: 110 },
};

function isFaunaMorphologyDimension(
  dimensions: MorphologySpeciesDimension
): dimensions is FaunaMorphologySpeciesDimension {
  return 'averageWeightKg' in dimensions;
}

function buildNumericDomain(values: number[], fallback: [number, number]): [number, number] {
  if (values.length === 0) {
    return fallback;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return fallback;
  }

  if (minValue === maxValue) {
    const padding = Math.max(Math.abs(minValue) * 0.15, 1);
    return [Math.max(0, minValue - padding), maxValue + padding];
  }

  const padding = (maxValue - minValue) * 0.1;
  return [Math.max(0, minValue - padding), maxValue + padding];
}

function chooseTickStep(maxValue: number): number {
  if (maxValue <= 20) {
    return 5;
  }

  if (maxValue <= 100) {
    return 10;
  }

  if (maxValue <= 500) {
    return 50;
  }

  return 500;
}

function buildFixedTicks(domain: [number, number]): number[] {
  const upperBound = Math.max(0, domain[1]);
  const step = chooseTickStep(upperBound);
  const maxTick = Math.ceil(upperBound / step) * step;
  const ticks: number[] = [];

  for (let tick = 0; tick <= maxTick; tick += step) {
    ticks.push(tick);
  }

  return ticks;
}



const CustomPieTooltip = ({ active, payload }: BaseTooltipProps<{ name: string; value: number; percent: number }>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="w-56 border border-emerald-900/40 bg-[#0a2e21] p-3 text-foreground rounded shadow-lg shadow-black/50 outline-none z-50">
        <p className="text-sm font-semibold">{data.name}</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Count</span>
            <span className="font-medium">{data.value}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Percentage</span>
            <span className="font-medium">{data.percent}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }: BaseTooltipProps<{ name: string; count: number; taxonomyCategory: string; avgConfidencePercent: number; mapLabel: string }>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="w-52 border border-emerald-900/40 bg-[#0a2e21] p-3 text-foreground rounded shadow-lg shadow-black/50 outline-none z-50">
        <p className="text-sm font-semibold">{data.name}</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Count</span>
            <span className="font-medium">{data.count}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Taxonomy</span>
            <span className="max-w-[110px] truncate text-right font-medium" title={data.taxonomyCategory}>{data.taxonomyCategory}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Avg confidence</span>
            <span className="font-medium">{data.avgConfidencePercent.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Map</span>
            <span className="max-w-[110px] truncate text-right font-medium" title={data.mapLabel}>{data.mapLabel}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomHistogramTooltip = ({
  active,
  payload,
  activeBiomeLabel,
  categoryLabel,
}: BaseTooltipProps<{ rangeLabel: string; count: number; avgConfidence: number }> & { activeBiomeLabel: string; categoryLabel: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="w-56 border border-emerald-900/40 bg-[#0a2e21] p-3 text-foreground rounded shadow-lg shadow-black/50 outline-none z-50">
        <p className="text-sm font-semibold">Confidence Bin</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Range</span>
            <span className="font-medium">{data.rangeLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Detections</span>
            <span className="font-medium">{data.count}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Avg confidence</span>
            <span className="font-medium">{data.avgConfidence.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Map</span>
            <span className="max-w-[110px] truncate text-right font-medium" title={activeBiomeLabel}>{activeBiomeLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium">{categoryLabel}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomMorphologyTooltip = ({ active, payload, activeBiomeLabel }: BaseTooltipProps<MorphologyBubbleDatum> & { activeBiomeLabel: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MorphologyBubbleDatum;
    const isFaunaPoint = data.metricType === 'fauna';
    return (
      <div className="w-64 border border-emerald-900/40 bg-[#0a2e21] p-3 text-foreground rounded shadow-lg shadow-black/50 outline-none z-50">
        <p className="text-sm font-semibold">{data.name}</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{isFaunaPoint ? 'Animals on map' : 'Trees on map'}</span>
            <span className="font-medium">{data.count}</span>
          </div>
          {isFaunaPoint ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Avg weight</span>
                <span className="font-medium">{(data.averageWeightKg ?? 0).toFixed(3)} kg</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Avg length / height</span>
                <span className="font-medium">{(data.averageSizeCm ?? 0).toFixed(1)} cm</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Avg height</span>
                <span className="font-medium">{(data.averageHeight ?? 0).toFixed(1)} m</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Avg width</span>
                <span className="font-medium">{(data.averageWidth ?? 0).toFixed(1)} m</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Map</span>
            <span className="max-w-[120px] truncate text-right font-medium" title={activeBiomeLabel}>{activeBiomeLabel}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
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

  const densityValue = useMemo(() => {
    if (!statsQuery.data || !statsQuery.data.areaScanned) {
      return 0;
    }

    if (activeTab === 'fauna') {
      const totalAnimals = detectionsQuery.data?.length ?? 0;
      return Math.round(totalAnimals / statsQuery.data.areaScanned);
    }

    return Math.round(statsQuery.data.totalTrees / statsQuery.data.areaScanned);
  }, [activeTab, detectionsQuery.data, statsQuery.data]);

  const biodiversityIndex = useMemo(() => {
    if (!detectionsQuery.data || detectionsQuery.data.length === 0) return "0.00";
    
    const counts = detectionsQuery.data.reduce((acc, detection) => {
      acc[detection.name] = (acc[detection.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalIndividuals = detectionsQuery.data.length;
    
    const shannonIndex = (Object.values(counts) as number[]).reduce<number>((index: number, count) => {
      const pi = count / totalIndividuals;
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

  const conifersPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.conifers / floraTaxonomyStats.total) * 100) : 0;
  const broadleafPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.broadleaf / floraTaxonomyStats.total) * 100) : 0;
  const desertTropicalPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.desertTropical / floraTaxonomyStats.total) * 100) : 0;
  const herbsGroundPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.herbsGround / floraTaxonomyStats.total) * 100) : 0;
  const succulentsDesertPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.succulentsDesert / floraTaxonomyStats.total) * 100) : 0;
  const floweringMedicinalPct = floraTaxonomyStats.total > 0 ? Math.round((floraTaxonomyStats.floweringMedicinal / floraTaxonomyStats.total) * 100) : 0;

  const pieData = useMemo(() => {
    if (activeTab === 'fauna') {
      const data = [
        { name: 'Mammals', value: taxonomyStats.mammals, fill: 'rgb(74, 222, 128)', percent: mammalsPct },
        { name: 'Birds', value: taxonomyStats.birds, fill: 'rgb(253, 230, 138)', percent: birdsPct },
        { name: 'Reptiles', value: taxonomyStats.reptiles, fill: 'rgb(251, 113, 133)', percent: reptilesPct },
        { name: 'Amphibians', value: taxonomyStats.amphibians, fill: 'rgb(96, 165, 250)', percent: amphibiansPct },
        { name: 'Arachnids', value: taxonomyStats.arachnids, fill: 'rgb(192, 132, 252)', percent: arachnidsPct },
      ];
      return data.filter(d => d.value > 0);
    } else {
      const data = [
        { name: 'Gymnosperms', value: floraTaxonomyStats.conifers, fill: 'rgb(6, 78, 59)', percent: conifersPct },
        { name: 'Broadleaf', value: floraTaxonomyStats.broadleaf, fill: 'rgb(16, 185, 129)', percent: broadleafPct },
        { name: 'Desert / Tropical', value: floraTaxonomyStats.desertTropical, fill: 'rgb(252, 211, 77)', percent: desertTropicalPct },
        { name: 'Herbs / Ground', value: floraTaxonomyStats.herbsGround, fill: 'rgb(244, 114, 182)', percent: herbsGroundPct },
        { name: 'Succulents', value: floraTaxonomyStats.succulentsDesert, fill: 'rgb(251, 146, 60)', percent: succulentsDesertPct },
        { name: 'Flowering/Medicinal', value: floraTaxonomyStats.floweringMedicinal, fill: 'rgb(167, 139, 250)', percent: floweringMedicinalPct },
      ];
      return data.filter(d => d.value > 0);
    }
  }, [
    activeTab, taxonomyStats, floraTaxonomyStats,
    mammalsPct, birdsPct, reptilesPct, amphibiansPct, arachnidsPct,
    conifersPct, broadleafPct, desertTropicalPct, herbsGroundPct, succulentsDesertPct, floweringMedicinalPct
  ]);

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
    const labelScope = labelsQuery.data
      ? labelsQuery.data.map((label) => label.name)
      : sortedSpecies.map((species) => species[0]);

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
  }, [activeBiome.label, detectionsQuery.data, labelsQuery.data]);

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
        color: confidenceBinColors[index],
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

  const activeMorphologySpeciesDimensions = useMemo<Record<string, MorphologySpeciesDimension>>(
    () =>
      activeTab === 'fauna'
        ? MORPHOLOGY_FAUNA_SPECIES_DIMENSIONS
        : MORPHOLOGY_FLORA_SPECIES_DIMENSIONS,
    [activeTab]
  );

  const morphologyBubbleData = useMemo<MorphologyBubbleDatum[]>(() => {
    const detections = detectionsQuery.data ?? [];
    const counts: Record<string, number> = {};
    const labelScope = labelsQuery.data ? labelsQuery.data.map((label) => label.name) : Object.keys(activeMorphologySpeciesDimensions);

    detections.forEach((detection) => {
      const speciesName = detection.name;
      if (activeMorphologySpeciesDimensions[speciesName]) {
        counts[speciesName] = (counts[speciesName] || 0) + 1;
      }
    });

    const entries = Object.entries(activeMorphologySpeciesDimensions)
      .map(([speciesName, dimensions]) => {
        const count = counts[speciesName] || 0;
        const color = getLabelColorValue(speciesName, labelScope);
        const metricType = activeTab;

        if (isFaunaMorphologyDimension(dimensions)) {
          return {
            id: speciesName.toLowerCase().replace(/\s+/g, '-'),
            name: speciesName,
            metricType,
            xValue: dimensions.averageWeightKg,
            yValue: dimensions.averageSizeCm,
            averageWeightKg: dimensions.averageWeightKg,
            averageSizeCm: dimensions.averageSizeCm,
            count,
            bubbleSize: count,
            fill: color.replace(')', ' / 0.8)').replace('hsl', 'hsl'),
            stroke: color,
          };
        }

        return {
          id: speciesName.toLowerCase().replace(/\s+/g, '-'),
          name: speciesName,
          metricType,
          xValue: dimensions.averageWidth,
          yValue: dimensions.averageHeight,
          averageHeight: dimensions.averageHeight,
          averageWidth: dimensions.averageWidth,
          count,
          bubbleSize: count,
          fill: color.replace(')', ' / 0.8)').replace('hsl', 'hsl'),
          stroke: color,
        };
      })
      .filter((entry) => entry.count > 0);

    return entries;
  }, [activeMorphologySpeciesDimensions, activeTab, detectionsQuery.data, labelsQuery.data]);

  const morphologyChartConfig = useMemo(() => {
    if (activeTab === 'fauna') {
      const xDomain = buildNumericDomain(
        morphologyBubbleData.map((entry) => entry.xValue),
        [0, 100]
      );
      const yDomain = buildNumericDomain(
        morphologyBubbleData.map((entry) => entry.yValue),
        [0, 200]
      );
      const xTicks = buildFixedTicks(xDomain);
      const yTicks = buildFixedTicks(yDomain);

      return {
        title: 'Fauna Morphology Plot',
        subtitle: 'Average weight vs. length/height and number of animals on the selected map',
        xLabel: 'Weight (kg)',
        yLabel: 'Length / Height (cm)',
        xDomain: [0, xTicks[xTicks.length - 1] ?? 100] as [number, number],
        yDomain: [0, yTicks[yTicks.length - 1] ?? 200] as [number, number],
        xTicks,
        yTicks,
      };
    }

    const xTicks = buildFixedTicks([0, 25]);
    const yTicks = buildFixedTicks([0, 50]);

    return {
      title: 'Tree Morphology Plot',
      subtitle: 'Average dimensions vs. number of trees on the selected map',
      xLabel: 'Width (m)',
      yLabel: 'Height (m)',
      xDomain: [0, xTicks[xTicks.length - 1] ?? 25] as [number, number],
      yDomain: [0, yTicks[yTicks.length - 1] ?? 50] as [number, number],
      xTicks,
      yTicks,
    };
  }, [activeTab, morphologyBubbleData]);

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
            <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:flex-col lg:space-y-0 lg:gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {activeTab === 'fauna' ? 'Animal Density' : 'Tree Density'}
                      </p>
                      <p className="mt-2 text-4xl font-bold leading-none text-foreground">
                        {statsQuery.isLoading ? '--' : densityValue.toLocaleString()}
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

              <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5 lg:flex lg:flex-1 lg:flex-col">
                <h3 className="text-2xl font-semibold leading-none">{activeTab === 'fauna' ? 'Taxonomy Breakdown' : 'Flora Taxonomy Breakdown'}</h3>
                <p className="text-sm text-muted-foreground">Major category distribution</p>
                <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between lg:flex-1 lg:items-center">
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
                    className={`relative h-44 w-44 ${
                      (activeTab === 'fauna' && taxonomyStats.total === 0) || (activeTab === 'flora' && floraTaxonomyStats.total === 0) 
                        ? 'rounded-full bg-emerald-900/20' 
                        : ''
                    }`}
                  >
                    {pieData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius="65%"
                            outerRadius="100%"
                            stroke="none"
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            content={<CustomPieTooltip />} 
                            cursor={{fill: 'transparent'}} 
                            wrapperStyle={{ zIndex: 100 }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}

                    <div className="absolute inset-[17%] grid place-items-center rounded-full border border-emerald-900/40 bg-[#052015] pointer-events-none">
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
              <h3 className="text-2xl font-semibold leading-none">{morphologyChartConfig.title}</h3>
              <p className="text-sm text-muted-foreground">{morphologyChartConfig.subtitle}</p>

              <div className="mt-4 h-[350px] rounded-2xl border border-emerald-900/30 bg-[#041b13] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 0, right: 0, bottom: 28, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(16,185,129,0.16)" />
                    <XAxis
                      type="number"
                      dataKey="xValue"
                      name={morphologyChartConfig.xLabel}
                      domain={morphologyChartConfig.xDomain}
                      ticks={morphologyChartConfig.xTicks}
                      height={48}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(6, 78, 59, 0.4)' }}
                      label={{ value: morphologyChartConfig.xLabel, position: 'bottom', offset: 8, fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="yValue"
                      name={morphologyChartConfig.yLabel}
                      domain={morphologyChartConfig.yDomain}
                      ticks={morphologyChartConfig.yTicks}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(6, 78, 59, 0.4)' }}
                      label={{ value: morphologyChartConfig.yLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                    />
                    <ZAxis type="number" dataKey="bubbleSize" range={[140, 760]} />
                    <RechartsTooltip
                      content={<CustomMorphologyTooltip activeBiomeLabel={activeBiome.label} />}
                      cursor={{ stroke: 'rgba(16, 185, 129, 0.35)', strokeDasharray: '4 4' }}
                      wrapperStyle={{ zIndex: 100 }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                      iconType="circle"
                    />
                    {morphologyBubbleData.map((entry) => (
                      <Scatter
                        key={`morphology-scatter-${entry.id}`}
                        name={entry.name}
                        data={[entry]}
                        fill={entry.fill}
                        isAnimationActive={false}
                      >
                        <Cell
                          fill={entry.fill}
                          stroke={entry.stroke}
                          strokeWidth={2}
                          fillOpacity={0.88}
                        />
                      </Scatter>
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
                {morphologyBubbleData.length === 0 && (
                  <div className="mt-2 flex justify-center">
                    <p className="rounded-md bg-[#041b13]/90 px-3 py-1 text-xs text-muted-foreground">
                      No morphology detections for the current filters.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5 min-h-[310px]">
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

              <div className="mt-8 relative h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={confidenceHistogramStats.bins}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barCategoryGap={6}
                  >
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <RechartsTooltip 
                      content={<CustomHistogramTooltip activeBiomeLabel={activeBiome.label} categoryLabel={confidenceCategoryLabel} />} 
                      cursor={{ fill: 'rgba(6, 78, 59, 0.1)' }}
                      wrapperStyle={{ zIndex: 100 }} 
                    />
                    <Bar dataKey="height" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {confidenceHistogramStats.bins.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          fillOpacity={entry.count > 0 ? 0.95 : 0.3}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-900/40 bg-[#062519]/90 p-5 min-h-[380px] flex flex-col">
              <h3 className="text-2xl font-semibold leading-none">Species Count</h3>
              <p className="text-sm text-muted-foreground">Comparing the frequency of top species</p>

              <div className="relative mt-8 flex flex-1 w-full h-[250px] min-h-[250px]">
                {speciesCountStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={speciesCountStats}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(6, 78, 59, 0.4)' }}
                        tickLine={false}
                        interval={0}
                        tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}...` : value}
                      />
                      <YAxis 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(6, 78, 59, 0.4)' }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip 
                        content={<CustomBarTooltip />} 
                        cursor={{ fill: 'rgba(6, 78, 59, 0.1)' }}
                        wrapperStyle={{ zIndex: 100 }} 
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        {speciesCountStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    No species data available
                  </div>
                )}
                
                {speciesCountStats.length > 0 && (
                  <>
                    <span className="absolute -left-2 top-1/2 -ml-3 -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-wider text-muted-foreground pointer-events-none">
                      Count
                    </span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-muted-foreground pointer-events-none">
                      Species
                    </span>
                  </>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
