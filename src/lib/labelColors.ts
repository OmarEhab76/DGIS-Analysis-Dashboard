const explicitColorClasses: Record<string, string> = {
  Hickory: 'bg-success',
  Maple: 'bg-maple',
  'Wood Frog': 'bg-success',
  'White-tailed Deer': 'bg-sunflower',
  'Red Fox': 'bg-maple',
  Raccoon: 'bg-lavender',
  'American Black Bear': 'bg-primary',
};

const colorPalette = ['bg-success', 'bg-maple', 'bg-sunflower', 'bg-lavender', 'bg-primary'];

const shadowPaletteByColor: Record<string, string> = {
  'bg-success': 'shadow-[0_0_8px_hsl(var(--success))]',
  'bg-maple': 'shadow-[0_0_8px_hsl(var(--danger))]',
  'bg-sunflower': 'shadow-[0_0_8px_hsl(var(--warning))]',
  'bg-lavender': 'shadow-[0_0_8px_hsl(var(--lavender))]',
  'bg-primary': 'shadow-[0_0_8px_hsl(var(--primary))]',
};

function hashLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getPaletteColor(label: string) {
  const index = hashLabel(label) % colorPalette.length;
  return colorPalette[index];
}

export function getLabelColorClass(label: string) {
  return explicitColorClasses[label] ?? getPaletteColor(label);
}

export function getLabelShadowClass(label: string) {
  const colorClass = getLabelColorClass(label);
  return shadowPaletteByColor[colorClass] ?? '';
}
