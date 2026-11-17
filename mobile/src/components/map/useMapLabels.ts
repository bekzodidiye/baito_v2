import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { mapFeatureToRegionId, areDistrictNamesEqual, getDistrictColor } from './mapUtils';
import { translateRegion, Language } from '../../translations';

interface UseMapLabelsProps {
  isMapReady: boolean;
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  labelsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  filterLocation: string;
  settledLocation?: string;
  zoomLevel: number;
  geoJsonData: any;
  districtsGeoJsonData: any;
  language: Language;
  jobs: Job[];
  regionCentersRef: React.MutableRefObject<Map<string, [number, number]>>;
  districtCentersRef: React.MutableRefObject<Map<string, [number, number]>>;
  findDistrictFeature: (locationName: string) => any;
  getJobCountForLocation: (name: string) => number;
}

export const useMapLabels = ({
  isMapReady,
  mapInstanceRef,
  labelsGroupRef,
  filterLocation,
  settledLocation,
  zoomLevel,
  geoJsonData,
  districtsGeoJsonData,
  language,
  jobs,
  regionCentersRef,
  districtCentersRef,
  findDistrictFeature,
  getJobCountForLocation
}: UseMapLabelsProps) => {
  const getJobCountRef = useRef(getJobCountForLocation);
  useEffect(() => {
    getJobCountRef.current = getJobCountForLocation;
  }, [getJobCountForLocation]);

  const jobsCountSignature = useMemo(() => {
    if (!jobs || jobs.length === 0) return '0';
    return `${jobs.length}-${jobs.filter(j => j.status === 'open').length}`;
  }, [jobs]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !labelsGroupRef.current) return;
    
    // Do not tear down and reconstruct label DOM elements while camera is actively flying
    if (settledLocation !== undefined && filterLocation !== settledLocation) {
      return;
    }

    let animationFrameId: number = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let zoomEndHandler: (() => void) | null = null;

    const renderLabels = () => {
      if (!labelsGroupRef.current) return;
      labelsGroupRef.current.clearLayers();
      
      if (zoomLevel < 3.5) return;

      const activeLoc = settledLocation || filterLocation;
      const isActiveFilter = activeLoc !== 'Barchasi';

      if (zoomLevel < 7.8 && geoJsonData) {
        geoJsonData.features.forEach((feature: any) => {
          const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
          const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
          if (!region) return;
          
          const center = regionCentersRef.current.get(region.id) || region.center;
          if (!center) return;
          
          const isSelected = activeLoc.toLowerCase().includes(region.id.toLowerCase());
          
          let activeRegionIdForDistrict: string | null = null;
          if (districtsGeoJsonData && isActiveFilter) {
            const matchedDistrict = findDistrictFeature(activeLoc);
            if (matchedDistrict?.properties?.regionId) {
              activeRegionIdForDistrict = matchedDistrict.properties.regionId;
            }
          }
          
          const isDistrictOfThisRegion = activeRegionIdForDistrict === region.id;
          const isRegionActive = isSelected || isDistrictOfThisRegion;
          
          if (isActiveFilter && isRegionActive && zoomLevel >= 7.0) return;
          if (isActiveFilter && !isRegionActive && zoomLevel >= 7.8) return;
          
          const translatedName = translateRegion(region.id, language).toUpperCase();
          const regionJobsCount = getJobCountRef.current(region.id) || getJobCountRef.current(region.name);

          let textSizeClass = 'text-[9.5px] md:text-[10.5px]';
          let badgeSizeClass = 'text-[8px] h-4 min-w-[14px] px-1 ml-1 border';
          let containerPadding = 'px-2.5 py-1 shadow-md border border-slate-200/90';

          if (zoomLevel < 4.2) {
            textSizeClass = 'text-[7.5px]';
            badgeSizeClass = 'text-[7px] h-3 min-w-[10px] px-0.5 ml-0.5 border-[0.5px]';
            containerPadding = 'px-1.5 py-0.5 shadow-xs border border-slate-200/80';
          } else if (zoomLevel < 5.5) {
            textSizeClass = 'text-[8.5px]';
            badgeSizeClass = 'text-[7.5px] h-3.5 min-w-[12px] px-1 ml-0.5 border-[0.5px]';
            containerPadding = 'px-2 py-0.5 shadow-sm border border-slate-200/80';
          }

          let badgeHtml = '';
          if (regionJobsCount > 0) {
            badgeHtml = `<div class="flex items-center justify-center rounded-full bg-brand-primary text-white font-bold ${badgeSizeClass} border-white/60 shadow-xs">${regionJobsCount}</div>`;
          }

          const borderStyle = isRegionActive ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-slate-200/90';

          const icon = L.divIcon({
            className: 'region-center-label-container',
            html: `<div class="flex items-center justify-center bg-white/95 backdrop-blur-md rounded-full ${containerPadding} ${borderStyle} transition-all pointer-events-none -translate-x-1/2 -translate-y-1/2">
              <span class="font-extrabold ${textSizeClass} tracking-wide whitespace-nowrap text-brand-dark">${translatedName}</span>
              ${badgeHtml}
            </div>`,
            iconSize: null as any,
          });
          
          L.marker(center as [number, number], { 
            icon, 
            interactive: false,
            pane: "tooltipPane",
            zIndexOffset: isRegionActive ? 900 : 500
          }).addTo(labelsGroupRef.current!);
        });
      }

      if (zoomLevel >= 7.0 && districtsGeoJsonData && isActiveFilter) {
        let activeRegionId: string | null = null;
        const matchedRegion = UZBEKISTAN_REGIONS.find(r => activeLoc.toLowerCase().includes(r.id.toLowerCase()));
        if (matchedRegion) {
          activeRegionId = matchedRegion.id;
        } else {
          const matchedDistrict = findDistrictFeature(activeLoc);
          if (matchedDistrict?.properties?.regionId) {
            activeRegionId = matchedDistrict.properties.regionId;
          }
        }

        const visibleDistricts = districtsGeoJsonData.features.filter((f: any) => {
          if (!activeRegionId) return true;
          return f.properties && f.properties.regionId === activeRegionId;
        });

        visibleDistricts.forEach((feature: any) => {
          const tumanName = feature?.properties?.shapeName || "";
          if (!tumanName) return;

          const center = districtCentersRef.current.get(tumanName);
          if (!center) return;

          const isSelected = areDistrictNamesEqual(activeLoc, tumanName);
          const districtColor = getDistrictColor(tumanName);
          const translatedTumanName = translateRegion(tumanName, language);
          const tumanLabelText = translatedTumanName
            .replace(" tumani", " t.")
            .replace(" shahri", " sh.")
            .replace(" rayon", " r.")
            .replace(" Rayon", " R.")
            .replace(" district", " dist.");
            
          const tumanJobsCount = getJobCountRef.current(tumanName);

          let badgeHtml = '';
          if (tumanJobsCount > 0) {
            badgeHtml = `<div class="flex items-center justify-center rounded-full text-white font-bold text-[7px] h-3.5 min-w-[14px] px-1 shadow-sm mt-0.5" style="background-color: ${districtColor}; border: 1px solid white;">${tumanJobsCount}</div>`;
          }

          const fontSizeClass = zoomLevel < 8.5 ? 'text-[6.5px]' : 'text-[7.5px] md:text-[8.5px]';

          const icon = L.divIcon({
            className: 'district-center-label-container',
            html: `<div class="flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <span class="font-bold ${fontSizeClass} whitespace-nowrap" style="color: ${districtColor}; text-shadow: 1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white;">${tumanLabelText}</span>
              ${badgeHtml}
            </div>`,
            iconSize: null as any,
          });
          
          L.marker(center as [number, number], { 
            icon, 
            interactive: false,
            pane: "tooltipPane",
            zIndexOffset: isSelected ? 1000 : 800
          }).addTo(labelsGroupRef.current!);
        });
      }
    };

    if ((map as any)._animatingZoom) {
      zoomEndHandler = () => {
        timer = setTimeout(renderLabels, 30);
      };
      map.once('zoomend', zoomEndHandler);
      timer = setTimeout(renderLabels, 850);
    } else {
      animationFrameId = requestAnimationFrame(renderLabels);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (timer) clearTimeout(timer);
      if (zoomEndHandler) map.off('zoomend', zoomEndHandler);
    };
  }, [isMapReady, filterLocation, settledLocation, zoomLevel, geoJsonData, districtsGeoJsonData, language, jobsCountSignature]);
};
