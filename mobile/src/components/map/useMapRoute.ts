import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteInfo } from '../../services/routingService';

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

    // 3. Single clean primary road route polyline
    const coreColor = '#2563eb';
    const shadowColor = '#1e3a8a';
    const coreWeight = 5;
    const shadowWeight = 8;

    // Casing / Shadow Polyline for depth and contrast
    const shadowLine = L.polyline(activeRoute.coordinates, {
      pane: 'routePane',
      color: shadowColor,
      weight: shadowWeight,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    // Vibrant Primary Route Line
    const coreLine = L.polyline(activeRoute.coordinates, {
      pane: 'routePane',
      color: coreColor,
      weight: coreWeight,
      opacity: 1.0,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    shadowLine.bringToFront();
    coreLine.bringToFront();

    // 4. Doorstep / Off-road Access Connector Lines (Google & Yandex Maps style)
    const firstRoadPoint = activeRoute.coordinates[0];
    const lastRoadPoint = activeRoute.coordinates[activeRoute.coordinates.length - 1];
    const originPoint: [number, number] = [activeRoute.origin.lat, activeRoute.origin.lng];
    const destPoint: [number, number] = [activeRoute.destination.lat, activeRoute.destination.lng];

    // From user origin to road entry
    const originDist = map.distance(originPoint, firstRoadPoint);
    if (originDist > 6) {
      L.polyline([originPoint, firstRoadPoint], {
        pane: 'routePane',
        color: '#2563eb',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '4, 6',
        lineCap: 'round',
      }).addTo(routeGroup);
    }

    // From road exit into exact building doorstep
    const destDist = map.distance(lastRoadPoint, destPoint);
    if (destDist > 6) {
      L.polyline([lastRoadPoint, destPoint], {
        pane: 'routePane',
        color: '#dc2626',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '4, 6',
        lineCap: 'round',
      }).addTo(routeGroup);
    }

    // 5. Origin Marker "A" (Start Point with subtle glowing pulse)
    const originIcon = L.divIcon({
      className: 'route-origin-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <span style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 13px; font-family: system-ui, -apple-system, sans-serif; z-index: 2;">
            A
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker(originPoint, { icon: originIcon, zIndexOffset: 1000 })
      .bindTooltip(activeRoute.origin.name, { direction: 'top', permanent: false })
      .addTo(routeGroup);

    // 6. Destination Marker "B" (Teardrop Needle grounded on target coordinate)
    const rawDestName = activeRoute.destination.company || activeRoute.destination.name || '';
    const cleanDestLabel = rawDestName.replace(/[<>"']/g, '').trim();
    const truncatedLabel = cleanDestLabel.length > 20 ? `${cleanDestLabel.slice(0, 18)}…` : cleanDestLabel;

    const destinationIcon = L.divIcon({
      className: 'route-destination-pin',
      html: `
        <div style="position: relative; width: 40px; height: 48px; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
          ${truncatedLabel ? `
            <div style="position: absolute; top: -18px; white-space: nowrap; background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); z-index: 10;">
              ${truncatedLabel}
            </div>
          ` : ''}
          <div style="position: relative; width: 34px; height: 34px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 18px rgba(220, 38, 38, 0.45); z-index: 2;">
            <div style="transform: rotate(45deg); color: #ffffff; font-weight: 900; font-size: 13px; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center;">
              B
            </div>
          </div>
          <div style="position: absolute; bottom: 0; width: 14px; height: 5px; background: rgba(0, 0, 0, 0.28); border-radius: 50%; filter: blur(0.8px); z-index: 1;"></div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
    });

    L.marker(destPoint, { icon: destinationIcon, zIndexOffset: 1000 })
      .bindTooltip(activeRoute.destination.name, { direction: 'top', permanent: false })
      .addTo(routeGroup);

    // 7. Fit bounds including origin, destination, and road coordinates
    const allPoints = [originPoint, destPoint, ...activeRoute.coordinates];
    const bounds = L.latLngBounds(allPoints);
    if (bounds.isValid()) {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      // On desktop, MapRouteCard floats at bottom-left (width ~380px), on mobile at bottom
      const paddingLeft = isDesktop ? 420 : 30;
      const paddingBottom = isDesktop ? 50 : 220;
      map.fitBounds(bounds, {
        paddingTopLeft: [paddingLeft, 70],
        paddingBottomRight: [50, paddingBottom],
        maxZoom: 16,
        animate: true,
        duration: 0.8,
      });
    }
  }, [activeRoute, isPanelExpanded, mapInstanceRef]);

  // Clear layers when route is dismissed
  useEffect(() => {
    if (!activeRoute && routeGroupRef.current) {
      routeGroupRef.current.clearLayers();
    }
  }, [activeRoute]);
};
