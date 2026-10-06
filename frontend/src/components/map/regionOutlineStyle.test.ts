/** The jobs map draws regions as lines, not as blocks of colour. */
import { describe, it, expect } from 'vitest';
import { outlineFor, RESTING, SELECTED, MUTED, HOVERED, BOUNDARY_COLOUR } from './regionOutlineStyle';

const ALL = [RESTING, SELECTED, MUTED, HOVERED];

describe('a region outline', () => {
  it('is never filled, in any state', () => {
    for (const style of ALL) {
      expect(style.fill).toBe(false);
      expect(style.fillOpacity).toBe(0);
    }
  });

  it('uses one colour for every boundary', () => {
    // Twelve regions in twelve colours is what this replaced.
    expect(new Set(ALL.map(s => s.color))).toEqual(new Set([BOUNDARY_COLOUR]));
  });

  it('draws every boundary alike when nothing is filtered', () => {
    expect(outlineFor({ isFiltering: false, isActive: false })).toBe(RESTING);
    expect(outlineFor({ isFiltering: false, isActive: true })).toBe(RESTING);
  });

  it('firms up the one being filtered and quiets the rest', () => {
    const active = outlineFor({ isFiltering: true, isActive: true });
    const other = outlineFor({ isFiltering: true, isActive: false });

    expect(active.weight).toBeGreaterThan(other.weight);
    expect(active.opacity).toBeGreaterThan(other.opacity);
  });

  it('keeps an unselected region visible rather than hiding it', () => {
    // The map is for finding work somewhere else too.
    expect(MUTED.opacity).toBeGreaterThan(0);
    expect(MUTED.weight).toBeGreaterThan(0);
  });
});
