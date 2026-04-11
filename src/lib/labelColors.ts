function hashLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getScope(label: string, labelScope: string[] = []) {
  const unique = Array.from(new Set(labelScope.map((name) => name.trim()).filter(Boolean)));
  if (!unique.includes(label)) {
    unique.push(label);
  }

  return unique.sort((a, b) => a.localeCompare(b));
}

function getLabelHue(label: string, labelScope: string[] = []) {
  const scope = getScope(label, labelScope);
  const index = scope.findIndex((name) => name === label);
  const total = Math.max(scope.length, 1);

  const scopeSeed = hashLabel(scope.join('|')) % 360;
  const hueStep = 360 / total;

  return (scopeSeed + index * hueStep) % 360;
}

export function getLabelColorValue(label: string, labelScope: string[] = []) {
  const hue = getLabelHue(label, labelScope);
  return `hsl(${hue.toFixed(1)} 70% 52%)`;
}

export function getLabelStyle(label: string, labelScope: string[] = []) {
  return { backgroundColor: getLabelColorValue(label, labelScope) };
}

export function getLabelMarkerStyle(label: string, labelScope: string[] = []) {
  const color = getLabelColorValue(label, labelScope);
  return {
    backgroundColor: color,
    boxShadow: `0 0 8px ${color}`,
  };
}
