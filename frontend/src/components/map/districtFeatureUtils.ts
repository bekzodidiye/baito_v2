import L from 'leaflet';
import { areDistrictNamesEqual, getDistrictColor } from './mapUtils';
import { translateRegion, Language } from '../../translations';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import React from 'react';

export const createDistrictOnEachFeature = (
  language: Language,
  districtJobsCount: Map<string, number>,
  setFilterLocation: (loc: string) => void,
  setIsPanelExpanded: (expanded: boolean) => void,
  map: L.Map,
  lastFittedLocationRef: React.MutableRefObject<string>,
  filterLocRef: React.MutableRefObject<string>
) => (feature: any, layer: L.Layer) => {
  const tumanName = feature.properties.shapeName || "Tuman";
  const districtColor = getDistrictColor(tumanName);
  const count = districtJobsCount.get(tumanName) || 0;
  const translatedTumanName = translateRegion(tumanName, language);
  const tumanLabelText = translatedTumanName
    .replace(" tumani", " t.")
    .replace(" shahri", " sh.")
    .replace(" rayon", " r.")
    .replace(" Rayon", " R.")
    .replace(" district", " dist.");
  
  const tooltipContent = `
    <div class="flex flex-col items-center">
      <span class="font-bold text-xs" style="color: ${districtColor}">${tumanLabelText}</span>
      <span class="text-[10px] font-medium text-slate-500">${count} ${language === 'ru' ? 'вакансий' : language === 'en' ? 'jobs' : 'ta ish'}</span>
    </div>
  `;
  
  layer.bindTooltip(tooltipContent, {
    permanent: false,
    direction: 'center',
    className: 'district-hover-tooltip'
  });
  
  layer.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    setFilterLocation(tumanName);
    setIsPanelExpanded(false);
    
    if ((layer as any).getBounds) {
      map.fitBounds((layer as any).getBounds(), {
        paddingTopLeft: [15, 80],
        paddingBottomRight: [15, 110],
        maxZoom: 12.0,
        animate: true,
        duration: 0.8
      });
      lastFittedLocationRef.current = tumanName;
    }
  });
  
  layer.on('mouseover', function () {
    const currentFilter = filterLocRef.current;
    const isRegionFilt = UZBEKISTAN_REGIONS.some(r => 
      currentFilter.toLowerCase() === r.id.toLowerCase() ||
      currentFilter.toLowerCase() === r.name.toLowerCase()
    );
    const isSelected = !isRegionFilt && areDistrictNamesEqual(currentFilter, tumanName);
    
    if (!isSelected) {
      (this as L.Path).setStyle({
        fillOpacity: 0.32,
        weight: 2.0
      });
    }
  });
  
  layer.on('mouseout', function () {
    const currentFilter = filterLocRef.current;
    const isRegionFilt = UZBEKISTAN_REGIONS.some(r => 
      currentFilter.toLowerCase() === r.id.toLowerCase() ||
      currentFilter.toLowerCase() === r.name.toLowerCase()
    );
    const isAnyDistFilt = !isRegionFilt && currentFilter !== 'Barchasi';
    const isSelected = !isRegionFilt && areDistrictNamesEqual(currentFilter, tumanName);
    
    let weight = 1.2;
    let opacity = 0.6;
    let fillOpacity = 0.18;
    
    if (isAnyDistFilt) {
      if (isSelected) {
        weight = 2.4;
        opacity = 0.85;
        fillOpacity = 0.32;
      } else {
        weight = 1.0;
        opacity = 0.4;
        fillOpacity = 0.12;
      }
    }
    
    (this as L.Path).setStyle({
      fillOpacity: fillOpacity,
      weight: weight,
      opacity: opacity
    });
  });
};
