import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteInfo } from '../../services/routingService';
import { useUIStore } from '../../store/useUIStore';

interface UseMapRouteProps {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  routeGroupRef?: React.MutableRefObject<L.LayerGroup | null>;
  activeRoute: RouteInfo | null;
  isPanelExpanded?: boolean;
}

export const useMapRoute = ({
  mapInstanceRef,
  routeGroupRef: externalRouteGroupRef,
  activeRoute,
  isPanelExpanded = false,
}: UseMapRouteProps) => {
  const localRouteGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = externalRouteGroupRef || localRouteGroupRef;
  const activeRouteMode = useUIStore(s => s.activeRouteMode) || 'car';

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Create a dedicated route pane so route polylines are ALWAYS above map tiles & region boundaries
    let routePane = map.getPane('routePane');
    if (!routePane) {
      routePane = map.createPane('routePane');
      routePane.style.zIndex = '450';
      routePane.style.pointerEvents = 'none';
    }

    // 2. Ensure routeGroup is attached to current active map instance
    if (!routeGroupRef.current || !map.hasLayer(routeGroupRef.current)) {
      routeGroupRef.current = L.layerGroup().addTo(map);
    }

    const routeGroup = routeGroupRef.current;
    routeGroup.clearLayers();

    if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length < 2) {
      return;
    }

    // 3. Dynamic styling based on selected travel mode
    let coreColor = '#2563eb';
    let shadowColor = '#1e3a8a';
    let coreWeight = 5;
    let shadowWeight = 8;
    let dashArray: string | undefined = undefined;

    if (activeRouteMode === 'walking') {
      coreColor = '#2563eb';
      shadowColor = '#1e3a8a';
      coreWeight = 5;
      shadowWeight = 8;
      dashArray = '5, 8'; // Pedestrian dotted/dashed navigation path
    } else if (activeRouteMode === 'transit') {
      coreColor = '#059669'; // Emerald transit line
      shadowColor = '#064e3b';
      coreWeight = 6;
      shadowWeight = 9;
    }

    // Casing / Shadow Polyline for depth and contrast
    const shadowLine = L.polyline(activeRoute.coordinates, {
      pane: 'routePane',
      color: shadowColor,
      weight: shadowWeight,
      opacity: 0.45,
      dashArray,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    // Vibrant Primary Route Line
    const coreLine = L.polyline(activeRoute.coordinates, {
      pane: 'routePane',
      color: coreColor,
      weight: coreWeight,
      opacity: 1.0,
      dashArray,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    shadowLine.bringToFront();
    coreLine.bringToFront();

    // 5. User Origin Marker (Pulsing Radar Pin)
    const originIcon = L.divIcon({
      className: 'route-origin-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
          <span style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37, 99, 235, 0.4); animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35); z-index: 2;"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([activeRoute.origin.lat, activeRoute.origin.lng], { icon: originIcon, zIndexOffset: 1000 })
      .bindTooltip(activeRoute.origin.name, { direction: 'top', permanent: false })
      .addTo(routeGroup);

    // 6. Job Destination Marker (Emerald Pin)
    const destinationIcon = L.divIcon({
      className: 'route-destination-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%); pointer-events: none;">
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
      iconSize: [44, 44],
      iconAnchor: [22, 44],
    });

    L.marker([activeRoute.destination.lat, activeRoute.destination.lng], { icon: destinationIcon, zIndexOffset: 1000 })
      .bindTooltip(activeRoute.destination.name, { direction: 'top', permanent: false })
      .addTo(routeGroup);

    // 7. Fit bounds to the route with room for the route card
    const bounds = L.latLngBounds(activeRoute.coordinates);
    if (bounds.isValid()) {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      // On desktop, MapRouteCard floats at bottom-left (width ~380px), on mobile at bottom
      const paddingLeft = isDesktop ? 440 : 40;
      const paddingBottom = isDesktop ? 60 : 320;
      map.fitBounds(bounds, {
        paddingTopLeft: [paddingLeft, 80],
        paddingBottomRight: [60, paddingBottom],
        maxZoom: 16,
        animate: true,
        duration: 0.8,
      });
    }
  }, [activeRoute, activeRouteMode, isPanelExpanded, mapInstanceRef]);

  // Clear layers when route is dismissed
  useEffect(() => {
    if (!activeRoute && routeGroupRef.current) {
      routeGroupRef.current.clearLayers();
    }
  }, [activeRoute]);
};
