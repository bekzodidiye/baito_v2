/**
 * Shrink the map boundary data.
 *
 * The source files carry seven decimal places — centimetre precision — and
 * enough vertices to trace a district fence post by post: 38,766 points for
 * fourteen regions and 176,076 for the districts, 5.1 MB in all. Every one of
 * those points is downloaded, parsed, and turned into an SVG path node by
 * Leaflet before the map appears, and none of that detail survives contact
 * with the screen: at the zoom where the whole country fits, one pixel spans
 * roughly 3.5 km.
 *
 * Two reductions, both chosen to stay under a pixel at the zoom each layer is
 * actually viewed at:
 *
 *   Douglas-Peucker    drops vertices that lie within TOLERANCE of the line
 *                      between their neighbours.
 *   5 decimal places   1.1 m. Rounding is applied to a shared grid, so a
 *                      vertex on a border between two regions rounds the same
 *                      way from both sides and the shapes stay flush.
 *
 * Run after replacing a source file:
 *
 *     node scripts/simplify-geojson.mjs
 *
 * Output goes to src/data/geo/, which is imported with ?url so Vite gives each
 * file a content-hashed name. That is what makes them safe to cache forever:
 * change the data and the URL changes with it.
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = [
  {
    from: 'data/source/uzbekistan_regions_std.json',
    to: 'src/data/geo/uzbekistan_regions.json',
    // ~56 m. Regions are only ever shown with the whole country in frame.
    tolerance: 0.0005,
  },
  {
    from: 'data/source/uzbekistan_districts.json',
    to: 'src/data/geo/uzbekistan_districts.json',
    // ~22 m. Districts are viewed zoomed in, so they keep more detail.
    tolerance: 0.0002,
  },
];

const DECIMALS = 5;

/** Perpendicular distance simplification, iterative to avoid deep recursion. */
function simplifyRing(points, tolerance) {
  if (points.length < 5) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const tol2 = tolerance * tolerance;

  while (stack.length) {
    const [a, b] = stack.pop();
    if (b <= a + 1) continue;
    const [x1, y1] = points[a];
    const [x2, y2] = points[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const den = dx * dx + dy * dy;
    let worst = -1;
    let worstAt = -1;

    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d;
      if (den === 0) {
        d = (px - x1) ** 2 + (py - y1) ** 2;
      } else {
        let t = ((px - x1) * dx + (py - y1) * dy) / den;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        d = (px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2;
      }
      if (d > worst) {
        worst = d;
        worstAt = i;
      }
    }

    if (worst > tol2) {
      keep[worstAt] = 1;
      stack.push([a, worstAt], [worstAt, b]);
    }
  }

  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  // A ring needs four positions to close; hand back the original rather than
  // emit a degenerate polygon.
  return out.length >= 4 ? out : points;
}

const isPosition = (v) => Array.isArray(v) && typeof v[0] === 'number';
const isRing = (v) => Array.isArray(v) && isPosition(v[0]);

function simplifyCoordinates(coords, tolerance) {
  if (!Array.isArray(coords) || isPosition(coords)) return coords;
  if (isRing(coords)) return simplifyRing(coords, tolerance);
  return coords.map((c) => simplifyCoordinates(c, tolerance));
}

const round = (v) =>
  Array.isArray(v)
    ? v.map(round)
    : typeof v === 'number' && !Number.isInteger(v)
      ? Number(v.toFixed(DECIMALS))
      : v;

function countPositions(coords) {
  if (!Array.isArray(coords)) return 0;
  if (isPosition(coords)) return 1;
  let n = 0;
  for (const c of coords) n += countPositions(c);
  return n;
}

let totalBefore = 0;
let totalAfter = 0;

for (const { from, to, tolerance } of SOURCES) {
  const src = join(root, from);
  const data = JSON.parse(readFileSync(src, 'utf8'));

  let before = 0;
  let after = 0;
  for (const feature of data.features) {
    const geom = feature.geometry;
    if (!geom?.coordinates) continue;
    before += countPositions(geom.coordinates);
    geom.coordinates = round(simplifyCoordinates(geom.coordinates, tolerance));
    after += countPositions(geom.coordinates);
  }

  const out = JSON.stringify(data);
  writeFileSync(join(root, to), out);

  const gzBefore = gzipSync(readFileSync(src), { level: 6 }).length;
  const gzAfter = gzipSync(Buffer.from(out), { level: 6 }).length;
  totalBefore += gzBefore;
  totalAfter += gzAfter;

  const mb = (n) => (n / 1e6).toFixed(2);
  console.log(
    `${to.split('/').pop()}\n` +
      `  nuqtalar: ${before.toLocaleString()} -> ${after.toLocaleString()} ` +
      `(-${Math.round(100 * (1 - after / before))}%)\n` +
      `  hajm:     ${mb(statSync(src).size)} MB -> ${mb(out.length)} MB   ` +
      `gzip ${mb(gzBefore)} -> ${mb(gzAfter)} MB\n` +
      `  tolerans: ${tolerance} (~${Math.round(tolerance * 111000)} m)`,
  );
}

console.log(
  `\njami gzip: ${(totalBefore / 1e6).toFixed(2)} MB -> ${(totalAfter / 1e6).toFixed(2)} MB ` +
    `(-${Math.round(100 * (1 - totalAfter / totalBefore))}%)`,
);
