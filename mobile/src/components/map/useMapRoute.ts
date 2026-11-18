import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteInfo } from '../../services/routingService';

interface UseMapRouteProps {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  activeRoute: RouteInfo | null;
  isPanelExpanded?: boolean;
}

export const useMapRoute = ({
  mapInstanceRef,
  activeRoute,
  isPanelExpanded = false,
}: UseMapRouteProps) => {
  const routeGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!routeGroupRef.current) {
      routeGroupRef.current = L.layerGroup().addTo(map);
    }

    const routeGroup = routeGroupRef.current;
    routeGroup.clearLayers();

    if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length < 2) {
      return;
    }

    // 1. Casing / Shadow Polyline for elevation depth
    L.polyline(activeRoute.coordinates, {
      color: '#1e3a8a',
      weight: 8,
      opacity: 0.3,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    // 2. Vibrant Primary Route Line
    L.polyline(activeRoute.coordinates, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    // 3. User Origin Marker (Pulsing Radar Pin)
    const originIcon = L.divIcon({
      className: 'route-origin-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
          <span style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35); z-index: 2;"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    L.marker([activeRoute.origin.lat, activeRoute.origin.lng], { icon: originIcon })
      .bindTooltip(activeRoute.origin.name, { direction: 'top', permanent: false })
      .addTo(routeGroup);

    // 4. Job Destination Marker (Emerald Pin)
    const destinationIcon = L.divIcon({
      className: 'route-destination-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
          <div style="position: absolute; width: 40px; height: 40px; background: rgba(5, 150, 105, 0.25); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 36px; height: 36px; background: #059669; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2); color: white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div style="position: absolute; bottom: 2px; width: 8px; height: 8px; background: #059669; transform: rotate(45deg); border-right: 2px solid white; border-bottom: 2px solid white;"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    L.marker([activeRoute.destination.lat, activeRoute.destination.lng], { icon: destinationIcon })
      .bindTooltip(activeRoute.destination.name, { direction: 'top', permanent: false })
      .addTo(routeGroup);

    // 5. Fit bounds to the route nicely
    const bounds = L.latLngBounds(activeRoute.coordinates);
    if (bounds.isValid()) {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      const paddingRight = (isPanelExpanded && isDesktop) ? 660 : 70;
      map.fitBounds(bounds, {
        paddingTopLeft: [70, 70],
        paddingBottomRight: [paddingRight, 70],
        maxZoom: 16,
        animate: true,
        duration: 0.8,
      });
    }

    return () => {
      if (routeGroupRef.current) {
        routeGroupRef.current.clearLayers();
      }
    };
  }, [activeRoute, isPanelExpanded, mapInstanceRef]);

  // Teardown route group when unmounting
  useEffect(() => {
    return () => {
      const map = mapInstanceRef.current;
      if (map && routeGroupRef.current) {
        try {
          map.removeLayer(routeGroupRef.current);
          routeGroupRef.current = null;
        } catch {
          /* ignore */
        }
      }
    };
  }, [mapInstanceRef]);
};
