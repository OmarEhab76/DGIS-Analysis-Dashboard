import { Detection, DashboardTab, BiomeId } from '@/types/dashboard';

const CSV_COLUMNS: Array<keyof Detection> = [
  'id',
  'name',
  'timestamp',
  'x',
  'y',
  'z',
  'confidence',
  'droneId',
  'percentX',
  'percentY',
];

function escapeCsvCell(value: string | number): string {
  const normalized = String(value ?? '');
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function buildDetectionsCsv(detections: Detection[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = detections.map((detection) => CSV_COLUMNS.map((column) => escapeCsvCell(detection[column])).join(','));
  return [header, ...rows].join('\r\n');
}

export function buildExportFilename(tab: DashboardTab, biome: BiomeId, now = new Date()): string {
  const isoLike = now.toISOString().replace(/[:T]/g, '-').replace(/\..+$/, '');
  return `${biome}-${tab}-detections-${isoLike}.csv`;
}

export function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
