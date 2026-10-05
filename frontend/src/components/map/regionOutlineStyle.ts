/** How a region is drawn on the jobs map: as a line, not a shape.
 *
 *  Each region used to be filled with a colour of its own — emerald, cyan,
 *  yellow, pink — over the map underneath. Twelve blocks of colour is a lot to
 *  look at before you have found anything, and it hides the map it sits on:
 *  the roads, the towns and the terrain a person is reading to place a job.
 *
 *  The boundary alone says the same thing. Which region is which is what the
 *  labels are for.
 */
export interface OutlineStyle {
  color: string;
  weight: number;
  opacity: number;
  fill: boolean;
  fillOpacity: number;
}

/** One colour for every boundary — a line dark enough to read over Google's
 *  roadmap, light enough not to shout. */
export const BOUNDARY_COLOUR = '#475569';

/** Not filtering: every boundary reads the same. */
export const RESTING: OutlineStyle = {
  color: BOUNDARY_COLOUR,
  weight: 1.4,
  opacity: 0.75,
  fill: false,
  fillOpacity: 0,
};

/** The region the filter is on: the same line, drawn firmly. */
export const SELECTED: OutlineStyle = {
  color: BOUNDARY_COLOUR,
  weight: 2.6,
  opacity: 1,
  fill: false,
  fillOpacity: 0,
};

/** The rest, while one is selected: still there, out of the way. */
export const MUTED: OutlineStyle = {
  color: BOUNDARY_COLOUR,
  weight: 1,
  opacity: 0.35,
  fill: false,
  fillOpacity: 0,
};

/** Under the cursor. A boundary that thickens is the whole hover state now —
 *  there is no fill left to darken. */
export const HOVERED: OutlineStyle = {
  color: BOUNDARY_COLOUR,
  weight: 2.6,
  opacity: 1,
  fill: false,
  fillOpacity: 0,
};

export const outlineFor = (
  { isFiltering, isActive }: { isFiltering: boolean; isActive: boolean },
): OutlineStyle => {
  if (!isFiltering) return RESTING;
  return isActive ? SELECTED : MUTED;
};
