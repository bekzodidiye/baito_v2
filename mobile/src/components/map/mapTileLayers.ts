import L from 'leaflet';

export type MapType = 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';

// Global memory cache for tile images to eliminate network latency when filtering or panning
const tileMemoryCache = new Map<string, string>();
const MAX_TILE_CACHE = 800;

export class CachedTileLayer extends L.TileLayer {
  private _activeTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private _recoveryInProgress = false;
  private _recoveryCount = 0;
  private readonly _maxRecoveries = 3;

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
    const tile = document.createElement('img');
    tile.decoding = 'async';
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
      } catch {
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

    // Hanging tile guard: if a tile server drops or hangs TCP connection,
    // prevent tab from spinning "Loading..." forever by failing over to reliable OSM
    const timeout = setTimeout(() => {
      this._activeTimeouts.delete(timeout);
      if (!tile.complete || tile.naturalWidth === 0) {
        if (!tile.dataset.fallbackTried) {
          tile.dataset.fallbackTried = 'true';
          const fallback = osmFallbackUrl(coords);
          if (fallback && tile.src !== fallback) {
            tile.src = fallback;
          }
        }
      }
    }, 2500);
    this._activeTimeouts.add(timeout);

    const origOnload = tile.onload;
    tile.onload = (e) => {
      clearTimeout(timeout);
      this._activeTimeouts.delete(timeout);
      if (typeof origOnload === 'function') origOnload.call(tile, e);
    };

    const origOnerror = tile.onerror;
    tile.onerror = (e) => {
      clearTimeout(timeout);
      this._activeTimeouts.delete(timeout);
      if (typeof origOnerror === 'function') origOnerror.call(tile, e);
    };

    tile.src = url;
    return tile;
  }

  resetRecovery(): void {
    this._recoveryInProgress = false;
    this._recoveryCount = 0;
  }

  isRecoveryInProgress(): boolean {
    return this._recoveryInProgress;
  }

  getRecoveryCount(): number {
    return this._recoveryCount;
  }

  healTiles(): void {
    if (!(this as any)._map) return;
    if (this._recoveryInProgress) return;
    const tiles = (this as any)._tiles;
    if (!tiles) return;

    let hasLoading = false;
    let hasBroken = false;

    for (const key in tiles) {
      const el = tiles[key]?.el as HTMLImageElement | undefined;
      if (!el) continue;
      if (!el.complete) {
        hasLoading = true;
      } else if (el.naturalWidth === 0) {
        hasBroken = true;
      }
    }

    // If tiles are still actively loading, do NOT redraw or disrupt in-flight requests
    if (hasLoading) {
      return;
    }

    // Only attempt recovery if there are confirmed broken tiles and retry limit is not exceeded
    if (hasBroken && this._recoveryCount < this._maxRecoveries) {
      this._recoveryInProgress = true;
      this._recoveryCount++;
      this.redraw();
    }
  }

  private _onLayerLoad = (): void => {
    this._recoveryInProgress = false;
  };

  onAdd(map: L.Map): this {
    super.onAdd(map);
    this.off('load', this._onLayerLoad);
    this.on('load', this._onLayerLoad);
    return this;
  }

  onRemove(map: L.Map): this {
    for (const timeout of this._activeTimeouts) {
      clearTimeout(timeout);
    }
    this._activeTimeouts.clear();
    this.resetRecovery();
    this.off('load', this._onLayerLoad);
    return super.onRemove(map);
  }
}

export const createCachedTileLayer = (urlTemplate: string, options: L.TileLayerOptions): L.TileLayer => {
  return new CachedTileLayer(urlTemplate, options);
};

const OSM_MAX_ZOOM = 19;

export const osmFallbackUrl = (coords?: L.Coords | null): string | null => {
  if (!coords || coords.z > OSM_MAX_ZOOM) return null;
  const { x, y, z } = coords;
  if ([x, y, z].some(n => typeof n !== 'number' || !Number.isFinite(n))) return null;
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
};

export const cartoFallbackUrl = (coords?: L.Coords | null): string | null => {
  if (!coords || coords.z > 20) return null;
  const { x, y, z } = coords;
  if ([x, y, z].some(n => typeof n !== 'number' || !Number.isFinite(n))) return null;
  const subdomains = ['a', 'b', 'c', 'd'];
  const s = subdomains[Math.abs(x + y) % subdomains.length];
  return `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
};

export const osmSecondaryFallbackUrl = (coords?: L.Coords | null): string | null => {
  if (!coords || coords.z > OSM_MAX_ZOOM) return null;
  const { x, y, z } = coords;
  if ([x, y, z].some(n => typeof n !== 'number' || !Number.isFinite(n))) return null;
  const subdomains = ['a', 'b', 'c'];
  const s = subdomains[Math.abs(x + y) % subdomains.length];
  return `https://${s}.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png`;
};

export const tileErrorFallback = (e: L.TileErrorEvent): void => {
  const target = e.tile as HTMLImageElement | undefined;
  if (!target || target.dataset.fallbackTried) return;
  const isAlreadyOsm = target.src && target.src.includes('tile.openstreetmap.org');
  const url = isAlreadyOsm ? (osmSecondaryFallbackUrl(e.coords) || cartoFallbackUrl(e.coords)) : osmFallbackUrl(e.coords);
  if (!url) return;
  target.dataset.fallbackTried = 'true';

  if (typeof target.addEventListener === 'function') {
    const onOsmError = () => {
      target.removeEventListener('error', onOsmError);
      if (!target.dataset.secondaryTried) {
        target.dataset.secondaryTried = 'true';
        const backupUrl = osmSecondaryFallbackUrl(e.coords) || cartoFallbackUrl(e.coords);
        if (backupUrl) {
          target.src = backupUrl;
        }
      }
    };
    target.addEventListener('error', onOsmError, { once: true });
  }

  target.src = url;
};

export const healMapTiles = (map?: L.Map | null): number => {
  if (!map) return 0;
  let healedCount = 0;

  try {
    const container = map.getContainer ? map.getContainer() : null;
    if (container) {
      const tileImages = container.querySelectorAll<HTMLImageElement>('img.leaflet-tile');
      tileImages.forEach((img) => {
        // Only target confirmed broken tiles (complete === true AND naturalWidth === 0).
        // Never touch tiles that are still actively loading (!complete).
        if (img.complete && img.naturalWidth === 0) {
          const retries = Number(img.dataset.healRetries || '0');
          if (retries < 3) {
            healedCount++;
            img.dataset.healRetries = String(retries + 1);
            delete img.dataset.fallbackTried;
            delete img.dataset.secondaryTried;
            const src = img.src;
            if (src) {
              img.src = '';
              img.src = src;
            }
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
          let hasLoading = false;
          let brokenInLayer = false;
          for (const key in tiles) {
            const el = tiles[key]?.el as HTMLImageElement | undefined;
            if (el) {
              if (!el.complete) {
                hasLoading = true;
              } else if (el.naturalWidth === 0) {
                brokenInLayer = true;
              }
            }
          }
          if (brokenInLayer && !hasLoading) {
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
    updateWhenZooming: false,
    updateInterval: 100,
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
    baseLayer = createCachedTileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      ...defaultTileOptions,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

