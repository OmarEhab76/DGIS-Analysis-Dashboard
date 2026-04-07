import { BiomeId, BiomeLabelCatalog, BiomeOption, DashboardLabel, DashboardStats, DashboardTab, LabelGroup } from '@/types/dashboard';

export const BIOME_OPTIONS: BiomeOption[] = [
  { id: 'temperate-forest', label: 'Temperate Forest', hasDatabaseData: true },
  { id: 'boreal-forest', label: 'Boreal Forest', hasDatabaseData: true },
  { id: 'coastal-desert', label: 'Coastal Desert', hasDatabaseData: false },
  { id: 'mountain', label: 'Mountain', hasDatabaseData: false },
  { id: 'plains', label: 'Plains', hasDatabaseData: false },
  { id: 'subtropical-desert', label: 'Subtropical Desert', hasDatabaseData: false },
];

export const BIOME_LABEL_CATALOG: Record<BiomeId, BiomeLabelCatalog> = {
  'temperate-forest': {
    fauna: ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'],
    flora: {
      trees: ['Hickory', 'Maple'],
      plants: [],
    },
  },
  'boreal-forest': {
    fauna: ['Beaver', 'Lynx', 'Marten', 'Squirrel', 'Warbler', 'Woodpecker'],
    flora: {
      trees: ['Birch Tree', 'Conifer'],
      plants: [],
    },
  },
  'coastal-desert': {
    fauna: ['Desert Bighorn Sheep', 'Desert Tortoise', 'Desert Gazelle', 'Pelican', 'Rattlesnake', 'Seabird'],
    flora: {
      trees: ['Desert Willow'],
      plants: ['Agave', 'Cactus'],
    },
  },
  mountain: {
    fauna: ['Alpine Marmot', 'Elk', 'Golden Eagle', 'Grizzly Bear', 'Mountain Lion'],
    flora: {
      trees: ['Conifer'],
      plants: ['Edelweiss', 'Heather', 'Rhododendron'],
    },
  },
  plains: {
    fauna: [
      'Bison',
      'Black-footed Ferret',
      'Burrowing Owl',
      'Hyena',
      'Lion',
      'Ornate Box Turtle',
      'Pipit',
      'Plains Elephant',
      'Quail',
      'Zebra',
    ],
    flora: {
      trees: [],
      plants: ['Buffalograss'],
    },
  },
  'subtropical-desert': {
    fauna: ['Jerboa', 'Desert Scorpions', 'Fennec Fox', 'Dromedary Camel', 'Gecko', 'Horned Lizard'],
    flora: {
      trees: ['Date Palm'],
      plants: ['Aloe Vera Plant', 'Salvia Plant'],
    },
  },
};

function toLabels(names: string[], group: LabelGroup): DashboardLabel[] {
  return names.map((name) => ({ name, group, count: 0 }));
}

export function getBiomeLabels(biome: BiomeId, tab: DashboardTab): DashboardLabel[] {
  const config = BIOME_LABEL_CATALOG[biome];
  if (tab === 'fauna') {
    return toLabels(config.fauna, 'fauna');
  }

  return [...toLabels(config.flora.trees, 'trees'), ...toLabels(config.flora.plants, 'plants')];
}

export const BIOME_NO_DATA_STATS: DashboardStats = {
  totalDetections: 0,
  totalTrees: 0,
  totalPlants: '--',
  areaScanned: 0,
};
