export type DashboardTab = 'flora' | 'fauna';

export type BiomeId =
  | 'temperate-forest'
  | 'boreal-forest'
  | 'coastal-desert'
  | 'mountain'
  | 'plains'
  | 'subtropical-desert';

export interface BiomeOption {
  id: BiomeId;
  label: string;
  hasDatabaseData: boolean;
}

export type LabelGroup = 'trees' | 'plants' | 'fauna';

export interface DashboardLabel {
  name: string;
  group: LabelGroup;
  count: number;
}

export interface BiomeLabelCatalog {
  fauna: string[];
  flora: {
    trees: string[];
    plants: string[];
  };
}

export interface Detection {
  id: number;
  name: string;
  timestamp: string;
  x: number;
  y: number;
  z: number;
  confidence: number;
  droneId: number;
  percentX: number;
  percentY: number;
}

export interface DashboardStats {
  totalDetections: number;
  totalTrees: number;
  totalPlants: string;
  areaScanned: number;
}

export interface Filters {
  dateFrom: string;
  dateTo: string;
  confidenceMin: number;
  selectedLabels: string[];
}
