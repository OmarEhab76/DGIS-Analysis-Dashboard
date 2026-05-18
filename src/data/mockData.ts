import { BiomeId, BiomeLabelCatalog, BiomeOption, DashboardLabel, DashboardStats, DashboardTab, LabelGroup } from '@/types/dashboard';

export const BIOME_OPTIONS: BiomeOption[] = [
  { id: 'temperate-forest', label: 'Temperate Forest', hasDatabaseData: true },
  { id: 'boreal-forest', label: 'Boreal Forest', hasDatabaseData: true },
  { id: 'mountain', label: 'Mountain', hasDatabaseData: true },
  { id: 'plains', label: 'Plains', hasDatabaseData: true },
  { id: 'subtropical-desert', label: 'Subtropical Desert', hasDatabaseData: true },
];

export const BIOME_LABEL_CATALOG: Record<BiomeId, BiomeLabelCatalog> = {
  'temperate-forest': {
    fauna: ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'],
    flora: {
      trees: ['Conifer', 'Cypress', 'Pine Tree'],
      plants: [],
    },
  },
  'boreal-forest': {
    fauna: ['Beaver', 'Lynx', 'Marten', 'Squirrel', 'Warbler', 'Woodpecker'],
    flora: {
      trees: ['Conifer'],
      plants: [],
    },
  },
  mountain: {
    fauna: ['Alpine Marmot', 'Elk', 'Golden Eagle', 'Grizzly Bear', 'Mountain Lion'],
    flora: {
      trees: ['Conifer', 'Pine Tree'],
      plants: ['Heather'],
    },
  },
  plains: {
    fauna: [
      'Bison',
      'Black-footed Ferret',
      'Hyena',
      'Lion',
      'Ornate Box Turtle',
      'Pipit',
      'Elephant',
      'Quail',
      'Zebra',
    ],
    flora: {
      trees: [],
      plants: [],
    },
  },
  'subtropical-desert': {
    fauna: ['Jerboa', 'Desert Scorpion', 'Fennec Fox', 'Dromedary Camel', 'Gecko', 'Horned Lizard'],
    flora: {
      trees: [],
      plants: ['Aloe Vera Plant', 'Salvia Plant', 'Cactus', 'Prickly Pear Cactus'],
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
  totalPlants: 0,
  areaScanned: 0,
};
