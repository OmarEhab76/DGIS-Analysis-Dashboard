import { describe, expect, it } from 'vitest';
import { getLabelColorValue, getLabelMarkerStyle, getLabelStyle } from './labelColors';

describe('labelColors', () => {
  it('assigns unique colors for every label in the same category scope', () => {
    const scope = ['Beaver', 'Lynx', 'Marten', 'Squirrel', 'Warbler', 'Woodpecker'];
    const colors = scope.map((label) => getLabelColorValue(label, scope));

    expect(new Set(colors).size).toBe(scope.length);
  });

  it('returns stable colors regardless of incoming scope order', () => {
    const scopeA = ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'];
    const scopeB = [...scopeA].reverse();

    expect(getLabelColorValue('Red Fox', scopeA)).toBe(getLabelColorValue('Red Fox', scopeB));
  });

  it('reuses the same color in generic and marker styles', () => {
    const scope = ['Hickory', 'Maple'];
    const color = getLabelColorValue('Maple', scope);

    expect(getLabelStyle('Maple', scope).backgroundColor).toBe(color);
    expect(getLabelMarkerStyle('Maple', scope).backgroundColor).toBe(color);
    expect(getLabelMarkerStyle('Maple', scope).boxShadow).toContain(color);
  });
});