import L from 'leaflet';
import { areDistrictNamesEqual } from './mapUtils';
import { translateRegion, Language } from '../../translations';
import { BOUNDARY_COLOUR, HOVERED, outlineFor } from './regionOutlineStyle';
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
      <span class="font-bold text-xs" style="color: ${BOUNDARY_COLOUR}">${tumanLabelText}</span>
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
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsPanelExpanded(false);
    }
    
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
  
  layer.on('mouseover', function (this: L.Path) {
    const currentFilter = filterLocRef.current;
    const isRegionFilt = UZBEKISTAN_REGIONS.some(r => 
      currentFilter.toLowerCase() === r.id.toLowerCase() ||
      currentFilter.toLowerCase() === r.name.toLowerCase()
    );
    const isSelected = !isRegionFilt && areDistrictNamesEqual(currentFilter, tumanName);
    
    if (!isSelected) {
      this.setStyle({ ...HOVERED, weight: HOVERED.weight * 0.8 });
    }
  });
  
  layer.on('mouseout', function (this: L.Path) {
    const currentFilter = filterLocRef.current;
    const isRegionFilt = UZBEKISTAN_REGIONS.some(r => 
      currentFilter.toLowerCase() === r.id.toLowerCase() ||
      currentFilter.toLowerCase() === r.name.toLowerCase()
    );
    const isAnyDistFilt = !isRegionFilt && currentFilter !== 'Barchasi';
    const isSelected = !isRegionFilt && areDistrictNamesEqual(currentFilter, tumanName);
    
    const base = outlineFor({ isFiltering: isAnyDistFilt, isActive: isSelected });
    this.setStyle({ ...base, weight: base.weight * 0.8 });
  });
};
