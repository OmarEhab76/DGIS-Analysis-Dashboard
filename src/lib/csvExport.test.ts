import { describe, expect, it } from 'vitest';
import { buildDetectionsCsv, buildExportFilename } from './csvExport';
import { Detection } from '@/types/dashboard';

const sampleDetections: Detection[] = [
  {
    id: 1,
    name: 'Maple',
    timestamp: '2026-04-10T11:22:33Z',
    x: 10,
    y: 20,
    z: 30,
    confidence: 95,
    droneId: 7,
    percentX: 12.5,
    percentY: 55.5,
  },
  {
    id: 2,
    name: 'Wood, "Frog"',
    timestamp: '2026-04-10T12:22:33Z',
    x: 11,
    y: 21,
    z: 31,
    confidence: 84,
    droneId: 8,
    percentX: 13.5,
    percentY: 56.5,
  },
];

describe('csvExport', () => {
  it('builds CSV with expected header order and row values', () => {
    const csv = buildDetectionsCsv(sampleDetections);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('id,name,timestamp,x,y,z,confidence,droneId,percentX,percentY');
    expect(lines[1]).toBe('1,Maple,2026-04-10T11:22:33Z,10,20,30,95,7,12.5,55.5');
  });

  it('escapes commas and quotes in CSV fields', () => {
    const csv = buildDetectionsCsv(sampleDetections);
    const lines = csv.split('\r\n');

    expect(lines[2]).toContain('"Wood, ""Frog"""');
  });

  it('builds deterministic filename using tab, biome, and timestamp', () => {
    const filename = buildExportFilename('flora', 'temperate-forest', new Date('2026-04-11T06:07:08Z'));
    expect(filename).toBe('temperate-forest-flora-detections-2026-04-11-06-07-08.csv');
  });
});
