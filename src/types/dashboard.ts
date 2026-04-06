export type DashboardTab = 'flora' | 'fauna';

export type LabelGroup = 'trees' | 'fauna';

export interface DashboardLabel {
  name: string;
  group: LabelGroup;
  count: number;
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
