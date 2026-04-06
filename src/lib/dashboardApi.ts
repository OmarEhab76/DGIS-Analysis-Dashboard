import { DashboardLabel, DashboardStats, DashboardTab, Detection } from '@/types/dashboard';

interface DetectionsQuery {
  category: DashboardTab;
  labels: string[];
  confidenceMin: number;
  dateFrom?: string;
  dateTo?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getLabels(category: DashboardTab) {
  return fetchJson<{ labels: DashboardLabel[] }>(`/api/labels?category=${category}`).then((data) => data.labels);
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

  return fetchJson<{ detections: Detection[] }>(`/api/detections?${search.toString()}`).then((data) => data.detections);
}

export function getStats() {
  return fetchJson<{ stats: DashboardStats }>('/api/stats').then((data) => data.stats);
}
