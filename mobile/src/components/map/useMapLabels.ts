import React, { useEffect } from 'react';
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
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !labelsGroupRef.current) return;
    
    let animationFrameId: number;

    animationFrameId = requestAnimationFrame(() => {
      if (!labelsGroupRef.current) return;
      labelsGroupRef.current.clearLayers();
      
      if (zoomLevel < 3.5) return;

      const isActiveFilter = filterLocation !== 'Barchasi';

      if (zoomLevel < 7.8 && geoJsonData) {
        geoJsonData.features.forEach((feature: any) => {
          const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
          const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
          if (!region) return;
          
          const center = regionCentersRef.current.get(region.id) || region.center;
          if (!center) return;
          
          const isSelected = filterLocation.toLowerCase().includes(region.id.toLowerCase());
          
          let activeRegionIdForDistrict: string | null = null;
          if (districtsGeoJsonData && isActiveFilter) {
            const matchedDistrict = findDistrictFeature(filterLocation);
            if (matchedDistrict?.properties?.regionId) {
              activeRegionIdForDistrict = matchedDistrict.properties.regionId;
            }
          }
          
          const isDistrictOfThisRegion = activeRegionIdForDistrict === region.id;
          const isRegionActive = isSelected || isDistrictOfThisRegion;
          
          if (isActiveFilter && isRegionActive && zoomLevel >= 7.0) return;
          if (isActiveFilter && !isRegionActive && zoomLevel >= 7.8) return;
          
          const translatedName = translateRegion(region.id, language).toUpperCase();
          const regionJobsCount = getJobCountForLocation(region.id) || getJobCountForLocation(region.name);

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

          let countBadge = '';
          if (regionJobsCount > 0) {
            countBadge = `<span class="flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full font-extrabold border-indigo-200 ${badgeSizeClass}">${regionJobsCount}</span>`;
          }
          
          const icon = L.divIcon({
            className: 'region-center-label-container',
            html: `<div class="flex items-center -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-white/95 rounded-full pointer-events-none ${containerPadding}">
              <span class="${isRegionActive ? 'font-black text-blue-700' : 'font-extrabold text-slate-800'} ${textSizeClass} tracking-wide">${translatedName}</span>
              ${countBadge}
            </div>`,
            iconSize: null as any,
          });
          
          L.marker(center as [number, number], { 
            icon, 
            interactive: false,
            pane: "tooltipPane",
            zIndexOffset: isRegionActive ? 1000 : 800
          }).addTo(labelsGroupRef.current!);
        });
      }
      
      const shouldShowDistricts = (zoomLevel >= 7.8) || (zoomLevel >= 6.5 && isActiveFilter);

      if (shouldShowDistricts && districtsGeoJsonData) {
        let selectedRegion = UZBEKISTAN_REGIONS.find(r => filterLocation.toLowerCase().includes(r.id.toLowerCase()));
        
        if (!selectedRegion && isActiveFilter) {
          const matchedDistrict = findDistrictFeature(filterLocation);
          if (matchedDistrict?.properties?.regionId) {
            selectedRegion = UZBEKISTAN_REGIONS.find(r => r.id === matchedDistrict.properties.regionId);
          }
        }
        
        const filteredFeatures = (!isActiveFilter || !selectedRegion)
          ? districtsGeoJsonData.features
          : districtsGeoJsonData.features.filter((f: any) => f.properties && f.properties.regionId === selectedRegion?.id);
        const renderedLabels = new Set<string>();
        
        filteredFeatures.forEach((f: any) => {
          const tumanName = f.properties?.shapeName || "";
          if (renderedLabels.has(tumanName)) return;
          renderedLabels.add(tumanName);
          
          const center = districtCentersRef.current.get(tumanName);
          if (!center) return;
          
          const isRegionFilterSelected = UZBEKISTAN_REGIONS.some(r => 
            filterLocation.toLowerCase() === r.id.toLowerCase() ||
            filterLocation.toLowerCase() === r.name.toLowerCase()
          );
          
          const isSelected = !isRegionFilterSelected && areDistrictNamesEqual(filterLocation, tumanName);
          const districtColor = getDistrictColor(tumanName);
          
          const translatedTumanName = translateRegion(tumanName, language);
          const tumanLabelText = translatedTumanName
            .replace(" tumani", " t.")
            .replace(" shahri", " sh.")
            .replace(" rayon", " r.")
            .replace(" Rayon", " R.")
            .replace(" district", " dist.");
            
          const tumanJobsCount = getJobCountForLocation(tumanName);

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
    });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isMapReady, filterLocation, zoomLevel, geoJsonData, districtsGeoJsonData, language, jobs]);
};
