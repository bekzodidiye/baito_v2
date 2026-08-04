import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { createTileLayers, MapType } from './mapTileLayers';

interface UseMapSetupProps {
  isPanelExpanded: boolean;
  isViloyatDashboard: boolean;
  onMapClick: () => void;
  mapType: MapType;
}

export const useMapSetup = ({
  isPanelExpanded,
  isViloyatDashboard,
  onMapClick,
  mapType,
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
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [41.2, 64.0],
      zoom: 5.1,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    const { baseLayer } = createTileLayers(mapType, map);
    baseLayer.once('load', () => setIsMapLoading(false));
    baseLayer.addTo(map);
    tileLayerRef.current = baseLayer;

    // Fast initial unmasking
    const timer = setTimeout(() => setIsMapLoading(false), 150);

    map.on('zoomend', () => setZoomLevel(map.getZoom()));
    map.on('click', () => onMapClickRef.current());

    mapInstanceRef.current = map;

    regionsGroupRef.current = L.layerGroup().addTo(map);
    labelsGroupRef.current = L.layerGroup().addTo(map);

    markerGroupRef.current = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      chunkInterval: 10,
      chunkDelay: 5,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const currentZoom = map.getZoom();

        let size = 26;
        let fontSize = '10px';
        let borderWidth = '2px';
        let shadowClass = 'shadow-[0_4px_12px_rgba(0,6,102,0.3)]';

        if (currentZoom < 4.0) {
          size = 14;
          fontSize = '7px';
          borderWidth = '1px';
          shadowClass = 'shadow-2xs';
        } else if (currentZoom < 4.8) {
          size = 17;
          fontSize = '8px';
          borderWidth = '1.2px';
          shadowClass = 'shadow-xs';
        } else if (currentZoom < 5.8) {
          size = 20;
          fontSize = '9px';
          borderWidth = '1.5px';
          shadowClass = 'shadow-xs';
        } else if (currentZoom < 7.0) {
          size = 23;
          fontSize = '9.5px';
          borderWidth = '1.8px';
          shadowClass = 'shadow-md';
        }

        const lineHeight = `${size - 3}px`;
        const half = size / 2;

        return L.divIcon({
          html: `
            <div class="flex items-center justify-center rounded-full text-white font-extrabold ${shadowClass} select-none transition-all duration-200 hover:scale-105" 
                 style="width: ${size}px; height: ${size}px; background-color: var(--color-brand-primary); line-height: ${lineHeight}; font-size: ${fontSize}; border: ${borderWidth} solid white;">
              ${count}
            </div>
          `,
          className: 'custom-cluster-marker',
          iconSize: [size, size],
          iconAnchor: [half, half]
        });
      }
    }).addTo(map);

    userGroupRef.current = L.layerGroup().addTo(map);

    setIsMapReady(true);

    // Initial resize invalidations to prevent blank map issues on mount
    map.invalidateSize();
    setTimeout(() => map.invalidateSize(), 200);
    setTimeout(() => map.invalidateSize(), 600);

    return () => {
      clearTimeout(timer);
      setIsMapReady(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
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

    map.invalidateSize();
    const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
    const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 450);

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isViloyatDashboard, isPanelExpanded]);

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
