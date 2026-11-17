import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { createTileLayers, MapType } from './mapTileLayers';
import { createClusterIcon } from './clusterIconFunction';

// Leaflet's canvas renderer repaints on a queued animation frame. When a map
// unmounts between the frame being queued and it running, the canvas and its
// 2d context are already gone and _clear()/_update() throw on a dead handle.
// Guarding the prototype once covers every renderer instance, including the
// per-pane ones Leaflet creates lazily and never exposes.
const canvasProto = (L as any).Canvas?.prototype;
if (canvasProto && !canvasProto.__baitoTeardownGuard) {
  for (const method of ['_redraw', '_update', '_clear', '_draw', '_updatePaths']) {
    const original = canvasProto[method];
    if (typeof original !== 'function') continue;
    canvasProto[method] = function (...args: any[]) {
      if (!this._ctx || !this._container) return;
      return original.apply(this, args);
    };
  }
  canvasProto.__baitoTeardownGuard = true;
}

// Zoom range of the job map. Kept here so the map options and the cluster guard
// below can never drift apart.
const MAP_MIN_ZOOM = 3;
const MAP_MAX_ZOOM = 20;

// leaflet.markercluster builds one DistanceGrid per zoom level:
//   for (var zoom = maxZoom; zoom >= minZoom; zoom--)
// A map that cannot name its max zoom — no zoom-bound layer attached, which
// happens mid-teardown or if a tile layer is ever moved to another map —
// answers getMaxZoom() with Infinity, and that loop then never ends: the tab
// hard-locks at 100% CPU with no error to show for it. The library offers no
// hook for this, so clamp it on the prototype, once.
const clusterProto = (L as any).MarkerClusterGroup?.prototype;
if (clusterProto && !clusterProto.__baitoZoomGuard) {
  const originalGenerate = clusterProto._generateInitialClusters;
  if (typeof originalGenerate === 'function') {
    clusterProto._generateInitialClusters = function (...args: any[]) {
      const map = this._map;
      if (map) {
        if (!Number.isFinite(map.getMaxZoom())) map.options.maxZoom = MAP_MAX_ZOOM;
        if (!Number.isFinite(map.getMinZoom())) map.options.minZoom = MAP_MIN_ZOOM;
      }
      return originalGenerate.apply(this, args);
    };
    clusterProto.__baitoZoomGuard = true;
  }
}

interface UseMapSetupProps {
  isPanelExpanded: boolean;
  isViloyatDashboard: boolean;
  onMapClick: () => void;
  mapType: MapType;
  jobsView?: 'map' | 'list';
}

export const useMapSetup = ({
  isPanelExpanded,
  isViloyatDashboard,
  onMapClick,
  mapType,
  jobsView,
}: UseMapSetupProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const regionsGroupRef = useRef<L.LayerGroup | null>(null);
  const userGroupRef = useRef<L.LayerGroup | null>(null);
  const labelsGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.Layer | null>(null);
  const [zoomLevel, setZoomLevel] = useState(5.1);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    if ((map as any)._labelLayer) {
      map.removeLayer((map as any)._labelLayer);
      delete (map as any)._labelLayer;
    }

    const { baseLayer, labelLayer } = createTileLayers(mapType, map);
    baseLayer.addTo(map);
    tileLayerRef.current = baseLayer;

    if (labelLayer) {
      labelLayer.addTo(map);
      (map as any)._labelLayer = labelLayer;
    }
  }, [mapType]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Prevent "Map container is already initialized" crashes during fast remounts
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        /* ignore dead instance error */
      }
      mapInstanceRef.current = null;
    }

    const map = L.map(container, {
      center: [41.2, 64.0],
      zoom: 5.0,
      // Pin the zoom range on the map itself. Without it Leaflet derives the
      // range from whatever tile layer happens to be attached, and a map with
      // none attached answers getMaxZoom() with Infinity — see the cluster
      // guard at the top of this file for what that does.
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    const { baseLayer } = createTileLayers(mapType, map);
    baseLayer.once('load', () => setIsMapLoading(false));
    baseLayer.addTo(map);
    tileLayerRef.current = baseLayer;

    // Fast initial unmasking
    const timer = setTimeout(() => setIsMapLoading(false), 150);

    // Debounce zoomLevel state updates so fitBounds animations (which fire
    // multiple rapid zoomend events) only trigger one React re-render once the
    // animation settles. This prevents the cascade where every intermediate
    // zoom level triggers useMapLabels + useJobMarkers to destroy and recreate
    // all DOM elements mid-animation.
    let zoomDebounce: ReturnType<typeof setTimeout> | null = null;
    map.on('zoomend', () => {
      if (zoomDebounce) clearTimeout(zoomDebounce);
      zoomDebounce = setTimeout(() => {
        setZoomLevel(map.getZoom());
      }, 120);
    });
    map.on('click', () => onMapClickRef.current());

    mapInstanceRef.current = map;

    regionsGroupRef.current = L.layerGroup().addTo(map);
    labelsGroupRef.current = L.layerGroup().addTo(map);

    markerGroupRef.current = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      chunkInterval: 50,
      chunkDelay: 10,
      animate: true,
      animateAddingMarkers: false,
      iconCreateFunction: (cluster: any) => createClusterIcon(cluster, map)
    }).addTo(map);

    userGroupRef.current = L.layerGroup().addTo(map);

    setIsMapReady(true);

    // Initial resize invalidation to ensure map canvas is properly sized on mount
    map.invalidateSize();
    const invalidate1 = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(timer);
      clearTimeout(invalidate1);
      setIsMapReady(false);
      const mapToTearDown = mapInstanceRef.current;
      if (mapToTearDown) {
        // Cancel any in-flight pan/zoom animation first: its next frame would
        // reach for a container that remove() has already torn down, which
        // throws "_leaflet_pos of undefined".
        mapToTearDown.stop();

        // Drain the layer groups before removing the map. The cluster group
        // adds markers on a chunked timer; left running, those chunks keep
        // drawing into a map that is on its way out. Detach each group first:
        // clearLayers() on a group that is still attached makes markercluster
        // rebuild its per-zoom grid, which is wasted work on teardown.
        for (const ref of [markerGroupRef, regionsGroupRef, userGroupRef, labelsGroupRef]) {
          try {
            const group = ref.current;
            if (!group) continue;
            mapToTearDown.removeLayer(group);
            group.clearLayers();
          } catch {
            /* group already torn down */
          }
        }

        mapToTearDown.remove();
        mapInstanceRef.current = null;
        markerGroupRef.current = null;
        regionsGroupRef.current = null;
        userGroupRef.current = null;
        labelsGroupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const currentMap = mapInstanceRef.current;
        if (!currentMap) return;
        if ((currentMap as any)._animatingZoom) {
          currentMap.once('zoomend', () => {
            currentMap.invalidateSize({ animate: false });
          });
          // Fallback in case zoomend fired or was skipped
          setTimeout(() => {
            currentMap.invalidateSize({ animate: false });
          }, 400);
          return;
        }
        currentMap.invalidateSize({ animate: false });
      }, 80);
    };

    scheduleInvalidate();
    const postTransitionTimer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize({ animate: false });
    }, 350);

    window.addEventListener('resize', scheduleInvalidate);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(scheduleInvalidate);
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleInvalidate);
      if (resizeObserver) resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      clearTimeout(postTransitionTimer);
    };
  }, [isPanelExpanded, jobsView]);

  useEffect(() => {
    if (jobsView === 'map' && mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize({ animate: false });
      const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize({ animate: false }), 60);
      const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize({ animate: false }), 180);
      const t3 = setTimeout(() => mapInstanceRef.current?.invalidateSize({ animate: false }), 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [jobsView]);

  return {
    mapContainerRef,
    mapInstanceRef,
    markerGroupRef,
    regionsGroupRef,
    userGroupRef,
    labelsGroupRef,
    tileLayerRef,
    zoomLevel,
    setZoomLevel,
    isMapLoading,
    isMapReady,
  };
};
