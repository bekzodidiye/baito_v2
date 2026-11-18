import L from 'leaflet';

export type MapType = 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';

class CachedTileLayer extends L.TileLayer {
  _pxBoundsToTileRange(bounds: L.Bounds): L.Bounds {
    if (!bounds || !bounds.min || !bounds.max) {
      return new L.Bounds([0, 0], [0, 0]);
    }
    const tileSize = this.getTileSize();
    const edgeBuffer = (this.options as any).edgeBufferTiles ?? 2;
    const min = bounds.min.unscaleBy(tileSize).floor().subtract([edgeBuffer, edgeBuffer]);
    const max = bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]).add([edgeBuffer, edgeBuffer]);
    return new L.Bounds(min, max);
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = super.createTile(coords, done) as HTMLImageElement;
    tile.decoding = 'async';
    return tile;
  }

  healTiles(): void {
    if (!(this as any)._map) return;
    const tiles = (this as any)._tiles;
    if (!tiles) return;

    let hasBroken = false;
    for (const key in tiles) {
      const el = tiles[key]?.el as HTMLImageElement | undefined;
      if (el && (!el.complete || el.naturalWidth === 0)) {
        hasBroken = true;
        break;
      }
    }
    if (hasBroken) {
      this.redraw();
    }
  }

  onAdd(map: L.Map): this {
    super.onAdd(map);
    this.healTiles();
    return this;
  }
}

export const createCachedTileLayer = (urlTemplate: string, options: L.TileLayerOptions): L.TileLayer => {
  return new CachedTileLayer(urlTemplate, options);
};

/** OpenStreetMap's highest zoom. Past it there is no tile to fall back to. */
const OSM_MAX_ZOOM = 19;

/** The same square from OpenStreetMap, for a tile the base layer could not load.
 *
 *  This used to be one fixed URL — `.../1/0/0.png`, the whole world at zoom 1 —
 *  handed to every tile that failed. The map does not come from OpenStreetMap;
 *  it comes from an undocumented Google endpoint that can stop answering at any
 *  time, and on the day it does this was the fallback: a grid of identical
 *  stretched world maps where the map used to be.
 */
export const osmFallbackUrl = (coords?: L.Coords | null): string | null => {
  if (!coords || coords.z > OSM_MAX_ZOOM) return null;
  const { x, y, z } = coords;
  if ([x, y, z].some(n => typeof n !== 'number' || !Number.isFinite(n))) return null;
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
};

/** High-availability secondary fallback from CartoDB Voyager if OSM is throttled or fails. */
export const cartoFallbackUrl = (coords?: L.Coords | null): string | null => {
  if (!coords || coords.z > 20) return null;
  const { x, y, z } = coords;
  if ([x, y, z].some(n => typeof n !== 'number' || !Number.isFinite(n))) return null;
  const subdomains = ['a', 'b', 'c', 'd'];
  const s = subdomains[Math.abs(x + y) % subdomains.length];
  return `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
};

/** Put that square in place of the tile that failed, once. */
export const tileErrorFallback = (e: L.TileErrorEvent): void => {
  const target = e.tile as HTMLImageElement | undefined;
  // Retrying a tile that already fell back would loop if the fallback fails too.
  if (!target || target.dataset.fallbackTried) return;
  const url = osmFallbackUrl(e.coords);
  if (!url) return;
  target.dataset.fallbackTried = 'true';

  // If the initial fallback to OSM fails (e.g. temporary network drop during sleep),
  // try CartoDB Voyager as a high-reliability secondary fallback.
  if (typeof target.addEventListener === 'function') {
    const onOsmError = () => {
      target.removeEventListener('error', onOsmError);
      if (!target.dataset.secondaryTried) {
        target.dataset.secondaryTried = 'true';
        const backupUrl = cartoFallbackUrl(e.coords);
        if (backupUrl) {
          target.src = backupUrl;
        }
      }
    };
    target.addEventListener('error', onOsmError, { once: true });
  }

  target.src = url;
};

/**
 * Scans a Leaflet map for any failed, blank, or broken base tiles (naturalWidth === 0
 * or !complete) and reloads them cleanly. If any layer has broken tiles,
 * it triggers a fresh redraw of that tile layer.
 */
export const healMapTiles = (map?: L.Map | null): number => {
  if (!map) return 0;
  let healedCount = 0;

  try {
    const container = map.getContainer ? map.getContainer() : null;
    if (container) {
      const tileImages = container.querySelectorAll<HTMLImageElement>('img.leaflet-tile');
      tileImages.forEach((img) => {
        if (!img.complete || img.naturalWidth === 0) {
          healedCount++;
          delete img.dataset.fallbackTried;
          delete img.dataset.secondaryTried;
          const src = img.src;
          if (src) {
            img.src = '';
            img.src = src;
          }
        }
      });
    }

    map.eachLayer((layer) => {
      if (typeof (layer as any).healTiles === 'function') {
        (layer as any).healTiles();
      } else if (layer instanceof L.TileLayer) {
        const tiles = (layer as any)._tiles;
        if (tiles) {
          let brokenInLayer = false;
          for (const key in tiles) {
            const el = tiles[key]?.el as HTMLImageElement | undefined;
            if (el && (!el.complete || el.naturalWidth === 0)) {
              brokenInLayer = true;
              break;
            }
          }
          if (brokenInLayer) {
            layer.redraw();
          }
        }
      }
    });
  } catch (err) {
    console.warn('[healMapTiles] Error healing map tiles:', err);
  }

  return healedCount;
};

// TileLayer instances are cached per map, never globally: a Leaflet layer can
// only belong to one map at a time. Handing the same instance to a second map
// silently unregisters it from the first, which then reports getMaxZoom() as
// Infinity and hangs leaflet.markercluster in an endless loop. The tile images
// themselves stay shared through tileMemoryCache, which is where the win is.
const layerCacheByMap = new WeakMap<L.Map, Map<MapType, { baseLayer: L.TileLayer; labelLayer: L.TileLayer | null }>>();

export const createTileLayers = (mapType: MapType, map: L.Map) => {
  let mapCache = layerCacheByMap.get(map);
  if (!mapCache) {
    mapCache = new Map();
    layerCacheByMap.set(map, mapCache);
  }
  const cached = mapCache.get(mapType);
  if (cached) return cached;

  let baseLayer: L.TileLayer;
  let labelLayer: L.TileLayer | null = null;

  const defaultTileOptions: L.TileLayerOptions & { edgeBufferTiles?: number } = {
    updateWhenIdle: false,
    updateWhenZooming: true,
    updateInterval: 30,
    keepBuffer: 8,
    edgeBufferTiles: 2,
    tileSize: 256,
    maxNativeZoom: 19,
    maxZoom: 20,
  };

  if (mapType === 'sputnik') {
    baseLayer = createCachedTileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      ...defaultTileOptions,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    });
  } else if (mapType === 'gibrid') {
    baseLayer = createCachedTileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      ...defaultTileOptions,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    });
    
    let labelsPane = map.getPane('labelsPane');
    if (!labelsPane) {
      labelsPane = map.createPane('labelsPane');
      labelsPane.style.zIndex = '500';
      labelsPane.style.pointerEvents = 'none';
    }

    labelLayer = createCachedTileLayer('https://{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
      ...defaultTileOptions,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      pane: 'labelsPane',
      attribution: '&copy; Google Maps'
    });
  } else if (mapType === 'tungi') {
    baseLayer = createCachedTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      ...defaultTileOptions,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxNativeZoom: 19
    });
  } else if (mapType === 'relyef') {
    baseLayer = createCachedTileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      ...defaultTileOptions,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    });
  } else if (mapType === 'retro') {
    baseLayer = createCachedTileLayer('https://{s}.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      ...defaultTileOptions,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    });
  } else {
    baseLayer = createCachedTileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      ...defaultTileOptions,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    });
  }

  baseLayer.on('tileerror', tileErrorFallback);
  if (labelLayer) {
    labelLayer.on('tileerror', tileErrorFallback);
  }

  const layers = { baseLayer, labelLayer };
  mapCache.set(mapType, layers);

  return layers;
};

