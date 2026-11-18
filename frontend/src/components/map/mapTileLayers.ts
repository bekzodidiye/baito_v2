import L from 'leaflet';

export type MapType = 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';

class CachedTileLayer extends L.TileLayer {
  _pxBoundsToTileRange(bounds: L.Bounds): L.Bounds {
    if (!bounds || !bounds.min || !bounds.max) {
      return new L.Bounds([0, 0], [0, 0]);
    }
    const tileSize = this.getTileSize();
    const edgeBuffer = (this.options as any).edgeBufferTiles ?? 3;
    const min = bounds.min.unscaleBy(tileSize).floor().subtract([edgeBuffer, edgeBuffer]);
    const max = bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]).add([edgeBuffer, edgeBuffer]);
    return new L.Bounds(min, max);
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = super.createTile(coords, done) as HTMLImageElement;
    tile.decoding = 'async';
    return tile;
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

/** Put that square in place of the tile that failed, once. */
export const tileErrorFallback = (e: L.TileErrorEvent): void => {
  const target = e.tile as HTMLImageElement | undefined;
  // Retrying a tile that already fell back would loop if the fallback fails too.
  if (!target || target.dataset.fallbackTried) return;
  const url = osmFallbackUrl(e.coords);
  if (!url) return;
  target.dataset.fallbackTried = 'true';
  target.src = url;
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
    keepBuffer: 16,
    edgeBufferTiles: 3,
    tileSize: 256,
    maxNativeZoom: 19,
    maxZoom: 20,
    crossOrigin: 'anonymous',
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

