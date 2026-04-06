import { Species, Detection } from '@/types/dashboard';

export const species: Species[] = [
  { id: 'maple', name: 'Maple', type: 'tree', color: 'maple', count: 280 },
  { id: 'oak', name: 'Oak', type: 'tree', color: 'sunflower', count: 124 },
  { id: 'pine', name: 'Pine', type: 'tree', color: 'success', count: 67 },
  { id: 'lavender', name: 'Lavender', type: 'plant', color: 'lavender', count: 842 },
  { id: 'sunflower', name: 'Sunflower', type: 'plant', color: 'sunflower', count: 85 },
  { id: 'loropetalum', name: 'Loropetalum chinense', type: 'plant', color: 'maple', count: 92 },
];

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

export const detections: Detection[] = Array.from({ length: 80 }, (_, i) => {
  const sp = species[i % species.length];
  return {
    id: `d-${i}`,
    speciesId: sp.id,
    x: rand(3, 97),
    y: rand(5, 95),
    confidence: rand(75, 99),
    xAxis: rand(0, 10),
    yAxis: rand(20, 60),
    zAxis: rand(10, 50),
  };
});

export const stats = {
  totalDetections: 1190,
  totalTrees: 282,
  totalPlants: 908,
  areaScanned: 2.4,
};
