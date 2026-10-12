/** A tile that fails is replaced with its own square, not with a fixed picture.
 *
 *  The map's tiles come from `mt{0-3}.google.com/vt` — an undocumented endpoint
 *  that can stop answering at any time. The fallback for that day pointed every
 *  failed tile at one URL:
 *
 *      https://a.tile.openstreetmap.org/1/0/0.png
 *
 *  which is the whole world at zoom 1. A Google outage would not have drawn a
 *  plainer map; it would have drawn a grid of identical stretched world maps.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type L from 'leaflet';
import { osmFallbackUrl, tileErrorFallback } from './mapTileLayers';

const coords = (x: number, y: number, z: number) => ({ x, y, z }) as L.Coords;

const errorEvent = (tile: HTMLImageElement, at: L.Coords | undefined) =>
  ({ tile, coords: at }) as unknown as L.TileErrorEvent;

const img = () => {
  const el = { src: '', dataset: {} } as unknown as HTMLImageElement;
  return el;
};

describe('the URL a failed tile falls back to', () => {
  it('is the square that failed, not a fixed one', () => {
    expect(osmFallbackUrl(coords(21, 11, 5)))
      .toBe('https://tile.openstreetmap.org/5/21/11.png');
  });

  it('differs from tile to tile', () => {
    const a = osmFallbackUrl(coords(21, 11, 5));
    const b = osmFallbackUrl(coords(22, 11, 5));
    expect(a).not.toBe(b);
  });

  it('is never the whole world at zoom 1', () => {
    // The bug, named: every failed tile used to get this one picture.
    for (const c of [coords(0, 0, 0), coords(21, 11, 5), coords(400000, 300000, 19)]) {
      expect(osmFallbackUrl(c)).not.toContain('/1/0/0.png');
    }
  });

  it('gives up past the zoom OpenStreetMap serves', () => {
    expect(osmFallbackUrl(coords(1, 1, 20))).toBeNull();
    expect(osmFallbackUrl(coords(1, 1, 19))).not.toBeNull();
  });

  it('gives up rather than build a URL out of nothing', () => {
    expect(osmFallbackUrl(undefined)).toBeNull();
    expect(osmFallbackUrl(null)).toBeNull();
    expect(osmFallbackUrl({ x: NaN, y: 1, z: 5 } as L.Coords)).toBeNull();
  });
});

describe('what the handler does to the tile', () => {
  it('points it at its own square', () => {
    const tile = img();

    tileErrorFallback(errorEvent(tile, coords(21, 11, 5)));

    expect(tile.src).toBe('https://tile.openstreetmap.org/5/21/11.png');
  });

  it('only tries once, so a failing fallback cannot loop', () => {
    const tile = img();

    tileErrorFallback(errorEvent(tile, coords(21, 11, 5)));
    tileErrorFallback(errorEvent(tile, coords(99, 99, 9)));

    expect(tile.src).toBe('https://tile.openstreetmap.org/5/21/11.png');
  });

  it('leaves the tile alone when there is nowhere to fall back to', () => {
    const tile = img();

    tileErrorFallback(errorEvent(tile, coords(1, 1, 20)));

    expect(tile.src).toBe('');
    expect(tile.dataset.fallbackTried).toBeUndefined();
  });

  it('survives an event with no tile on it', () => {
    expect(() => tileErrorFallback(errorEvent(undefined as never, coords(1, 1, 5))))
      .not.toThrow();
  });
});

describe('the source itself', () => {
  it('holds no hardcoded tile picture any more', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'mapTileLayers.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/['"`]https:\/\/[^'"`]*\/1\/0\/0\.png/);
  });

  it('still hands every layer the fallback', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'mapTileLayers.ts'), 'utf8');
    expect(src.match(/\.on\('tileerror', tileErrorFallback\)/g)).toHaveLength(2);
  });
});
