import L from 'leaflet';

export type MapType = 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';

// Global memory cache for tile images to eliminate network latency when filtering or panning
const tileMemoryCache = new Map<string, string>();
const MAX_TILE_CACHE = 800;

class CachedTileLayer extends L.TileLayer {
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img');
    L.DomEvent.on(tile, 'selectstart', L.DomEvent.preventDefault);
    L.DomEvent.on(tile, 'dragstart', L.DomEvent.preventDefault);

    tile.alt = '';
    tile.setAttribute('role', 'presentation');

    const url = this.getTileUrl(coords);

    // Instant sync load from memory cache if available
    if (tileMemoryCache.has(url)) {
      tile.src = tileMemoryCache.get(url)!;
      setTimeout(() => done(undefined, tile), 0);
      return tile;
    }

    tile.onload = () => {
      try {
        if (tileMemoryCache.size > MAX_TILE_CACHE) {
          const firstKey = tileMemoryCache.keys().next().value;
          if (firstKey) tileMemoryCache.delete(firstKey);
        }
        tileMemoryCache.set(url, tile.src);
      } catch (e) {
        // Fallback gracefully
      }
      done(undefined, tile);
    };

    tile.onerror = (e) => {
      done(e as any, tile);
    };

    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
    }

    tile.src = url;
    return tile;
  }
}

export const createCachedTileLayer = (urlTemplate: string, options: L.TileLayerOptions): L.TileLayer => {
  return new CachedTileLayer(urlTemplate, options);
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

  const defaultTileOptions: L.TileLayerOptions = {
    updateWhenIdle: false,
    updateWhenZooming: false,
    keepBuffer: 16, // Keep up to 16 rows/cols of off-screen tiles in memory buffer
    tileSize: 256,
    maxNativeZoom: 19,
    maxZoom: 20,
    crossOrigin: 'anonymous',
  };

  const tileErrorFallback = (e: L.TileErrorEvent) => {
    const target = e.tile as HTMLImageElement;
    if (target && !target.dataset.fallbackTried) {
      target.dataset.fallbackTried = 'true';
      target.src = 'https://a.tile.openstreetmap.org/1/0/0.png';
    }
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

