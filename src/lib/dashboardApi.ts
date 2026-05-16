import { BiomeId, DashboardLabel, DashboardStats, DashboardTab, Detection } from '@/types/dashboard';

interface DetectionsQuery {
  category: DashboardTab;
  labels: string[];
  confidenceMin: number;
  biome?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ObservationImage {
  id: number;
  url: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getLabels(category: DashboardTab, biome?: string) {
  const search = new URLSearchParams({
    category,
  });

  if (biome) {
    search.set('biome', biome);
  }

  return fetchJson<{ labels: DashboardLabel[] }>(`/api/labels?${search.toString()}`).then((data) => data.labels);
}

export function getDetections(query: DetectionsQuery) {
  const search = new URLSearchParams({
    category: query.category,
    confidenceMin: String(query.confidenceMin),
    labels: query.labels.join(','),
  });

  if (query.dateFrom) {
    search.set('dateFrom', query.dateFrom);
  }
  if (query.dateTo) {
    search.set('dateTo', query.dateTo);
  }
  if (query.biome) {
    search.set('biome', query.biome);
  }

  return fetchJson<{ detections: Detection[] }>(`/api/detections?${search.toString()}`).then((data) => data.detections);
}

export function getStats(biome?: string) {
  const search = new URLSearchParams();
  if (biome) {
    search.set('biome', biome);
  }

  const suffix = search.toString();
  const url = suffix.length > 0 ? `/api/stats?${suffix}` : '/api/stats';
  return fetchJson<{ stats: DashboardStats }>(url).then((data) => data.stats);
}

export function getObservationImages(observationId: number, biome: BiomeId, signal?: AbortSignal) {
  const search = new URLSearchParams({ biome });
  return fetchJson<{ images: ObservationImage[] }>(
    `/api/observations/${observationId}/images?${search.toString()}`,
    { signal }
  ).then((data) => data.images);
}
