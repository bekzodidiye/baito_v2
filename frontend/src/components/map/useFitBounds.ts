import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { mapFeatureToRegionId, areDistrictNamesEqual, getFeatureBounds, formatDistrictName } from './mapUtils';
import { UZBEKISTAN_REGIONS } from './mapConstants';

interface UseFitBoundsProps {
  isMapReady: boolean;
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  regionsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  districtsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  filterLocation: string;
  lastFittedLocationRef: React.MutableRefObject<string>;
  geoJsonData: any;
  districtsGeoJsonData: any;
  isPanelExpanded?: boolean;
  onCameraSettle?: (location: string) => void;
}

interface BoundsTarget {
  bounds: L.LatLngBounds;
  maxZoom: number;
}

export const useFitBounds = ({
  isMapReady,
  mapInstanceRef,
  regionsGeoJsonLayerRef,
  districtsGeoJsonLayerRef,
  filterLocation,
  lastFittedLocationRef,
  geoJsonData,
  districtsGeoJsonData,
  isPanelExpanded = false,
  onCameraSettle
}: UseFitBoundsProps) => {
  const prevPanelExpandedRef = useRef(isPanelExpanded);
  const onCameraSettleRef = useRef(onCameraSettle);
  useEffect(() => {
    onCameraSettleRef.current = onCameraSettle;
  }, [onCameraSettle]);

  // Precompute bounds lookup map for regions & districts for O(1) instant resolution
  const { regionBoundsMap, districtBoundsMap, fullUzbekistanBounds } = useMemo(() => {
    const regMap = new Map<string, BoundsTarget>();
    const distMap = new Map<string, BoundsTarget>();
    let uzbBounds: L.LatLngBounds | null = null;

    if (geoJsonData?.features) {
      let overallMinLat = 90;
      let overallMaxLat = -90;
      let overallMinLng = 180;
      let overallMaxLng = -180;

      geoJsonData.features.forEach((feature: any) => {
        if (!feature.geometry) return;
        const b = getFeatureBounds(feature.geometry);
        const bounds = L.latLngBounds([b.minLat, b.minLng], [b.maxLat, b.maxLng]);
        const target: BoundsTarget = { bounds, maxZoom: 9.5 };

        if (b.minLat < overallMinLat) overallMinLat = b.minLat;
        if (b.maxLat > overallMaxLat) overallMaxLat = b.maxLat;
        if (b.minLng < overallMinLng) overallMinLng = b.minLng;
        if (b.maxLng > overallMaxLng) overallMaxLng = b.maxLng;

        const rawRegionId = feature.properties?.ADM1_EN || "";
        const mappedRegionId = mapFeatureToRegionId(rawRegionId);
        const uzName = feature.properties?.ADM1_UZ || "";
        const region = UZBEKISTAN_REGIONS.find(r => r.id === mappedRegionId);

        if (mappedRegionId) {
          regMap.set(mappedRegionId.toLowerCase(), target);
          regMap.set(`${mappedRegionId.toLowerCase()} viloyati`, target);
        }
        if (rawRegionId) regMap.set(rawRegionId.toLowerCase(), target);
        if (uzName) regMap.set(uzName.toLowerCase(), target);
        if (region) {
          regMap.set(region.name.toLowerCase(), target);
          regMap.set(`${region.name.toLowerCase()} viloyati`, target);
        }
      });

      if (overallMinLat < overallMaxLat) {
        uzbBounds = L.latLngBounds([overallMinLat, overallMinLng], [overallMaxLat, overallMaxLng]);
      }
    }

    if (districtsGeoJsonData?.features) {
      districtsGeoJsonData.features.forEach((feature: any) => {
        if (!feature.geometry) return;
        const shapeName = feature.properties?.shapeName || "";
        if (!shapeName) return;
        const b = getFeatureBounds(feature.geometry);
        const bounds = L.latLngBounds([b.minLat, b.minLng], [b.maxLat, b.maxLng]);
        const target: BoundsTarget = { bounds, maxZoom: 12.0 };

        const lower = shapeName.toLowerCase();
        distMap.set(lower, target);
        const formatted = formatDistrictName(shapeName).toLowerCase();
        distMap.set(formatted, target);
        const noQuotes = lower.replace(/['`ʻ’]/g, '');
        distMap.set(noQuotes, target);
      });
    }

    return {
      regionBoundsMap: regMap,
      districtBoundsMap: distMap,
      fullUzbekistanBounds: uzbBounds
    };
  }, [geoJsonData, districtsGeoJsonData]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    const locationChanged = lastFittedLocationRef.current !== filterLocation;
    const panelToggled = prevPanelExpandedRef.current !== isPanelExpanded;
    prevPanelExpandedRef.current = isPanelExpanded;

    if (!locationChanged && !panelToggled) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const paddingRight = (isPanelExpanded && isDesktop) ? 650 : 25;
    const animDuration = panelToggled && !locationChanged ? 0.45 : 0.65;

    let target: BoundsTarget | null = null;

    if (filterLocation === 'Barchasi') {
      const b = fullUzbekistanBounds || (regionsGeoJsonLayerRef.current?.getBounds().isValid() ? regionsGeoJsonLayerRef.current.getBounds() : null);
      if (b) {
        target = { bounds: b, maxZoom: 6.2 };
      }
    } else {
      const lower = filterLocation.toLowerCase().trim();
      const noQuotes = lower.replace(/['`ʻ’]/g, '');

      // 1. Direct region lookup
      target = regionBoundsMap.get(lower) || regionBoundsMap.get(noQuotes) || null;

      // 2. Partial region match (e.g. "Samarqand viloyati")
      if (!target) {
        for (const [key, bTarget] of regionBoundsMap.entries()) {
          if (lower.includes(key) || key.includes(lower)) {
            target = bTarget;
            break;
          }
        }
      }

      // 3. Direct district lookup
      if (!target) {
        target = districtBoundsMap.get(lower) || districtBoundsMap.get(noQuotes) || null;
      }

      // 4. District matching helper
      if (!target && districtsGeoJsonData?.features) {
        for (const f of districtsGeoJsonData.features) {
          const tumanName = f.properties?.shapeName || "";
          if (areDistrictNamesEqual(filterLocation, tumanName)) {
            const b = getFeatureBounds(f.geometry);
            target = {
              bounds: L.latLngBounds([b.minLat, b.minLng], [b.maxLat, b.maxLng]),
              maxZoom: 12.0
            };
            break;
          }
        }
      }
    }

    if (!target) {
      onCameraSettleRef.current?.(filterLocation);
      return;
    }

    lastFittedLocationRef.current = filterLocation;

    // Gracefully stop any running pan/zoom animation to prevent transform jitter
    map.stop();

    map.fitBounds(target.bounds, {
      paddingTopLeft: [25, 75],
      paddingBottomRight: [paddingRight, 40],
      maxZoom: target.maxZoom,
      animate: true,
      duration: animDuration
    });

    let settled = false;
    const handleSettle = () => {
      if (settled) return;
      settled = true;
      onCameraSettleRef.current?.(filterLocation);
    };

    map.once('moveend', handleSettle);
    const safetyTimer = setTimeout(handleSettle, Math.round(animDuration * 1000) + 50);

    return () => {
      clearTimeout(safetyTimer);
      map.off('moveend', handleSettle);
    };
  }, [
    isMapReady,
    filterLocation,
    isPanelExpanded,
    mapInstanceRef,
    lastFittedLocationRef,
    regionBoundsMap,
    districtBoundsMap,
    fullUzbekistanBounds,
    regionsGeoJsonLayerRef,
    districtsGeoJsonData
  ]);
};
