import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapBounds } from '../../api/queries';

export interface UseMapViewportBoundsProps {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  isMapReady: boolean;
  debounceMs?: number;
}

export function useMapViewportBounds({
  mapInstanceRef,
  isMapReady,
  debounceMs = 400,
}: UseMapViewportBoundsProps) {
  const [viewportBounds, setViewportBounds] = useState<MapBounds | null>(null);
  const [isViewportReady, setIsViewportReady] = useState<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<MapBounds | null>(null);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isMapReady || !map) {
      setIsViewportReady(false);
      return;
    }

    const updateBounds = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (!mapInstanceRef.current) return;
        const currentMap = mapInstanceRef.current;
        const currentZoom = currentMap.getZoom();

        if (currentZoom > 9) {
          const rawBounds = currentMap.getBounds();
          if (!rawBounds || typeof rawBounds.isValid !== 'function' || !rawBounds.isValid()) {
            return;
          }

          const newBounds: MapBounds = {
            minLat: rawBounds.getSouth(),
            maxLat: rawBounds.getNorth(),
            minLng: rawBounds.getWest(),
            maxLng: rawBounds.getEast(),
          };

          const prev = lastBoundsRef.current;
          if (
            prev &&
            prev.minLat === newBounds.minLat &&
            prev.maxLat === newBounds.maxLat &&
            prev.minLng === newBounds.minLng &&
            prev.maxLng === newBounds.maxLng
          ) {
            setIsViewportReady(true);
            return;
          }

          lastBoundsRef.current = newBounds;
          setViewportBounds(newBounds);
          setIsViewportReady(true);
        } else {
          if (lastBoundsRef.current !== null) {
            lastBoundsRef.current = null;
            setViewportBounds(null);
          }
          setIsViewportReady(true);
        }
      }, debounceMs);
    };

    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    // Initial check when map is ready
    if (map.getZoom() > 9) {
      setIsViewportReady(false);
      updateBounds();
    } else {
      lastBoundsRef.current = null;
      setViewportBounds(null);
      setIsViewportReady(true);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
      setIsViewportReady(false);
    };
  }, [mapInstanceRef, isMapReady, debounceMs]);

  return { viewportBounds, isViewportReady };
}
