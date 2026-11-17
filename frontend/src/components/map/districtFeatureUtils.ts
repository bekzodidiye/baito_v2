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
  filterLocRef: React.MutableRefObject<string>,
  isPanelExpandedRef?: React.MutableRefObject<boolean>
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
  
  layer.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsPanelExpanded(false);
    }
    setFilterLocation(tumanName);
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
