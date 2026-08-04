import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { mapFeatureToRegionId, areDistrictNamesEqual, getDistrictColor } from './mapUtils';
import { translateRegion, Language } from '../../translations';

interface UseRegionPolygonsProps {
  isMapReady: boolean;
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  regionsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  labelsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  setIsPanelExpanded: (expanded: boolean) => void;
  geoJsonData: any;
  districtsGeoJsonData: any;
  zoomLevel: number;
  jobs: Job[];
  lastFittedLocationRef: React.MutableRefObject<string>;
  language: Language;
}

export const useRegionPolygons = ({
  isMapReady,
  mapInstanceRef,
  regionsGroupRef,
  labelsGroupRef,
  filterLocation,
  setFilterLocation,
  setIsPanelExpanded,
  geoJsonData,
  districtsGeoJsonData,
  zoomLevel,
  jobs,
  lastFittedLocationRef,
  language,
}: UseRegionPolygonsProps) => {
  // Refs for layer separation
  const regionsGeoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const districtsGeoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const currentDistrictsRegionIdRef = useRef<string | null>(null);
  
  // Keep latest state in refs for Leaflet closures
  const filterLocRef = useRef(filterLocation);
  const districtCentersRef = useRef(new Map<string, [number, number]>());
  const regionCentersRef = useRef(new Map<string, [number, number]>());
  const setFilterLocationRef = useRef(setFilterLocation);
  const setIsPanelExpandedRef = useRef(setIsPanelExpanded);
  
  useEffect(() => { filterLocRef.current = filterLocation; }, [filterLocation]);
  useEffect(() => { setFilterLocationRef.current = setFilterLocation; }, [setFilterLocation]);
  useEffect(() => { setIsPanelExpandedRef.current = setIsPanelExpanded; }, [setIsPanelExpanded]);

  // Fast job counts getter
  const getJobCountForLocation = (tumanName: string) => {
    if (!jobs || jobs.length === 0) return 0;
    const lowerName = tumanName.toLowerCase();
    let count = 0;
    jobs.forEach(j => {
      const loc = (j.rawLocation || j.location || "").toLowerCase();
      if (loc && (loc.includes(lowerName) || areDistrictNamesEqual(loc, tumanName))) {
        count++;
      }
    });
    return count;
  };
  const districtFeatureMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!districtsGeoJsonData || !districtsGeoJsonData.features) return map;
    districtsGeoJsonData.features.forEach((f: any) => {
      const shapeName = f.properties?.shapeName;
      if (shapeName) {
        map.set(shapeName.toLowerCase(), f);
      }
    });
    return map;
  }, [districtsGeoJsonData]);

  // Helper for fast district feature matching
  const findDistrictFeature = (locationName: string) => {
    if (!locationName || locationName === 'Barchasi') return null;
    const exact = districtFeatureMap.get(locationName.toLowerCase());
    if (exact) return exact;
    if (!districtsGeoJsonData?.features) return null;
    return districtsGeoJsonData.features.find((f: any) =>
      f.properties && areDistrictNamesEqual(locationName, f.properties.shapeName || "")
    ) || null;
  };

  // 1. Initialize Regions Layer ONCE
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = regionsGroupRef.current;
    if (!map || !group || !geoJsonData) return;
    
    if (!regionsGeoJsonLayerRef.current) {
      const geoJsonLayer = L.geoJSON(geoJsonData, {
        style: (feature) => {
          const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
          const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
          return {
            color: region ? region.color : "#94a3b8",
            weight: 1.5,
            opacity: 0.7,
            fillColor: region ? region.color : "#94a3b8",
            fillOpacity: 0.25,
            fillRule: 'nonzero',
            fill: true,
            className: region ? `region-polygon-${region.id}` : ''
          };
        },
        onEachFeature: (feature, layer) => {
          const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
          const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
          if (!region) return;
          
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setFilterLocationRef.current(region.id);
            setIsPanelExpandedRef.current(false);
            if ((layer as any).getBounds) {
              map.fitBounds((layer as any).getBounds(), {
                paddingTopLeft: [15, 80],
                paddingBottomRight: [15, 110],
                maxZoom: 9.8,
                animate: true,
                duration: 1.0
              });
              lastFittedLocationRef.current = region.id;
            }
          });
          
          layer.on('mouseover', () => {
            const currentFilter = filterLocRef.current;
            const isSelectedNow = currentFilter.toLowerCase().includes(region.id.toLowerCase());
            const isActiveFilter = currentFilter !== 'Barchasi';
            
            let isRegionActive = isSelectedNow;
            if (isActiveFilter && !isSelectedNow && districtsGeoJsonData) {
               const matched = findDistrictFeature(currentFilter);
               if (matched && matched.properties.regionId === region.id) {
                   isRegionActive = true;
               }
            }

            (layer as L.Path).setStyle({
              fillOpacity: isRegionActive ? 0.40 : 0.35,
              weight: isRegionActive ? 2.4 : 2.0,
              opacity: 0.85
            });
          });
          
          layer.on('mouseout', () => {
            const currentFilter = filterLocRef.current;
            const isSelectedNow = currentFilter.toLowerCase().includes(region.id.toLowerCase());
            const isActiveFilter = currentFilter !== 'Barchasi';
            
            let isRegionActive = isSelectedNow;
            if (isActiveFilter && !isSelectedNow && districtsGeoJsonData) {
               const matched = findDistrictFeature(currentFilter);
               if (matched && matched.properties.regionId === region.id) {
                   isRegionActive = true;
               }
            }

            let fillOpacity = 0.25;
            let weight = 1.5;
            let opacity = 0.7;
            
            if (isActiveFilter) {
              if (isRegionActive) {
                fillOpacity = 0.35;
                weight = 2.2;
                opacity = 0.85;
              } else {
                fillOpacity = 0.12;
                weight = 1.0;
                opacity = 0.4;
              }
            }
            
            (layer as L.Path).setStyle({
              fillColor: region.color,
              fillOpacity: fillOpacity,
              weight: weight,
              opacity: opacity
            });
          });
        }
      });
      regionsGeoJsonLayerRef.current = geoJsonLayer;
    }

    if (regionsGeoJsonLayerRef.current && !group.hasLayer(regionsGeoJsonLayerRef.current)) {
      regionsGeoJsonLayerRef.current.addTo(group);
    }
  }, [isMapReady, geoJsonData, mapInstanceRef, regionsGroupRef]);

  // 2. Update Regions Layer Style when filterLocation changes
  useEffect(() => {
     if (!regionsGeoJsonLayerRef.current) return;
     
     let activeRegionIdForDistrict: string | null = null;
     if (districtsGeoJsonData && filterLocation !== 'Barchasi') {
        const matchedDistrict = findDistrictFeature(filterLocation);
        if (matchedDistrict?.properties?.regionId) {
          activeRegionIdForDistrict = matchedDistrict.properties.regionId;
        }
     }
     
     regionsGeoJsonLayerRef.current.eachLayer((layer: any) => {
        const regionId = mapFeatureToRegionId(layer.feature?.properties?.ADM1_EN || "");
        const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
        if (!region) return;
        
        const isSelected = filterLocation.toLowerCase().includes(regionId.toLowerCase());
        const isActiveFilter = filterLocation !== 'Barchasi';
        const isDistrictOfThisRegion = activeRegionIdForDistrict === regionId;
        const isRegionActive = isSelected || isDistrictOfThisRegion;
        
        let fillOpacity = 0.25;
        let weight = 1.5;
        let opacity = 0.7;
        
        if (isActiveFilter) {
          if (isRegionActive) {
            fillOpacity = 0.35;
            weight = 2.2;
            opacity = 0.85;
          } else {
            fillOpacity = 0.12;
            weight = 1.0;
            opacity = 0.4;
          }
        }
        
        layer.setStyle({
          color: region.color,
          weight: weight,
          opacity: opacity,
          fillColor: region.color,
          fillOpacity: fillOpacity,
          fillRule: 'nonzero',
          fill: true,
        });
     });
     
  }, [isMapReady, filterLocation, districtsGeoJsonData]);

  // 3. Render / Update Districts Layer (reuse layer if region is unchanged)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = regionsGroupRef.current;
    if (!map || !group || !districtsGeoJsonData) return;
    
    let selectedRegion = UZBEKISTAN_REGIONS.find(r => filterLocation.toLowerCase().includes(r.id.toLowerCase()));
    
    if (!selectedRegion) {
      const matchedDistrict = findDistrictFeature(filterLocation);
      if (matchedDistrict?.properties?.regionId) {
        selectedRegion = UZBEKISTAN_REGIONS.find(r => r.id === matchedDistrict.properties.regionId);
      }
    }
    
    if (!selectedRegion) {
      if (districtsGeoJsonLayerRef.current) {
        group.removeLayer(districtsGeoJsonLayerRef.current);
        districtsGeoJsonLayerRef.current = null;
        currentDistrictsRegionIdRef.current = null;
      }
      return;
    }

    const isRegionFilterSelected = UZBEKISTAN_REGIONS.some(r => 
      filterLocation.toLowerCase() === r.id.toLowerCase() ||
      filterLocation.toLowerCase() === r.name.toLowerCase() ||
      filterLocation.toLowerCase().includes(r.id.toLowerCase() + ' viloyati') ||
      filterLocation.toLowerCase().includes(r.name.toLowerCase() + ' viloyati')
    );
    
    const isAnyDistrictOfThisRegionSelected = !isRegionFilterSelected && districtsGeoJsonData.features.some((f: any) => 
      f.properties && 
      f.properties.regionId === selectedRegion?.id && 
      areDistrictNamesEqual(filterLocation, f.properties.shapeName || "")
    );

    const getDistrictStyle = (feature: any) => {
      const tumanName = feature?.properties?.shapeName || "";
      const isSelected = !isRegionFilterSelected && areDistrictNamesEqual(filterLocation, tumanName);
      const districtColor = getDistrictColor(tumanName);
      
      let weight = 1.2;
      let opacity = 0.6;
      let fillOpacity = 0.18;
      
      if (isAnyDistrictOfThisRegionSelected) {
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
      
      return {
        color: districtColor,
        weight: weight,
        opacity: opacity,
        fillColor: districtColor,
        fillOpacity: fillOpacity,
        fillRule: 'nonzero' as L.FillRule,
        fill: true
      };
    };

    // Fast-path: If the layer for this region ALREADY exists, just update styles instantly!
    if (districtsGeoJsonLayerRef.current && currentDistrictsRegionIdRef.current === selectedRegion.id) {
      districtsGeoJsonLayerRef.current.setStyle(getDistrictStyle);
      return;
    }

    // Rebuild layer when entering a new region
    if (districtsGeoJsonLayerRef.current) {
      group.removeLayer(districtsGeoJsonLayerRef.current);
      districtsGeoJsonLayerRef.current = null;
    }

    const filteredFeatures = districtsGeoJsonData.features.filter((f: any) => f.properties && f.properties.regionId === selectedRegion.id);
    
    if (filteredFeatures.length === 0) return;

    // Fast calculation of job counts per district
    const districtJobsCount = new Map<string, number>();
    filteredFeatures.forEach((f: any) => {
      const tumanName = f.properties?.shapeName || "";
      if (!tumanName) return;
      districtJobsCount.set(tumanName, getJobCountForLocation(tumanName));
    });
    
    const districtsLayer = L.geoJSON({
      type: "FeatureCollection",
      features: filteredFeatures
    } as any, {
      style: getDistrictStyle,
      onEachFeature: (feature, layer) => {
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
          setFilterLocationRef.current(tumanName);
          setIsPanelExpandedRef.current(false);
          
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
      }
    });
    
    districtsGeoJsonLayerRef.current = districtsLayer;
    currentDistrictsRegionIdRef.current = selectedRegion.id;
    districtsLayer.addTo(group);
  }, [filterLocation, districtsGeoJsonData, jobs, language, mapInstanceRef, regionsGroupRef]);

  // 3.5 Handle External Filter Changes to Fit Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || filterLocation === 'Barchasi') return;
    
    if (lastFittedLocationRef.current !== filterLocation) {
      setTimeout(() => {
        if (!mapInstanceRef.current) return;
        const currentMap = mapInstanceRef.current;
        let foundAndFitted = false;
        
        // Try to fit region bounds
        if (regionsGeoJsonLayerRef.current) {
          const layers = regionsGeoJsonLayerRef.current.getLayers();
          for (const layer of layers) {
            const feature = (layer as any).feature;
            const rawRegionId = feature?.properties?.ADM1_EN || "";
            const mappedRegionId = mapFeatureToRegionId(rawRegionId);
            
            const isMatch = filterLocation.toLowerCase().includes(mappedRegionId.toLowerCase()) || 
                            filterLocation.toLowerCase().includes(rawRegionId.toLowerCase()) ||
                            (feature?.properties?.ADM1_UZ && filterLocation.toLowerCase().includes(feature.properties.ADM1_UZ.toLowerCase()));
            
            if (mappedRegionId && isMatch) {
              if ((layer as any).getBounds) {
                currentMap.fitBounds((layer as any).getBounds(), {
                  paddingTopLeft: [15, 80],
                  paddingBottomRight: [15, 110],
                  maxZoom: 9.8,
                  animate: true,
                  duration: 1.0
                });
                lastFittedLocationRef.current = filterLocation;
                foundAndFitted = true;
              }
              break;
            }
          }
        }
        
        // If not region, try district bounds
        if (!foundAndFitted && districtsGeoJsonLayerRef.current) {
          const layers = districtsGeoJsonLayerRef.current.getLayers();
          for (const layer of layers) {
            const feature = (layer as any).feature;
            const tumanName = feature?.properties?.shapeName || "";
            if (areDistrictNamesEqual(filterLocation, tumanName)) {
              if ((layer as any).getBounds) {
                currentMap.fitBounds((layer as any).getBounds(), {
                  paddingTopLeft: [15, 80],
                  paddingBottomRight: [15, 110],
                  maxZoom: 12.0,
                  animate: true,
                  duration: 0.8
                });
                lastFittedLocationRef.current = filterLocation;
                foundAndFitted = true;
              }
              break;
            }
          }
        }
      }, 50);
    }
  }, [isMapReady, filterLocation, mapInstanceRef, lastFittedLocationRef, geoJsonData, districtsGeoJsonData]);

  // Pre-calculate Region and District centers ONCE on GeoJSON load to eliminate zoom lag
  useEffect(() => {
    if (!geoJsonData || !geoJsonData.features) return;
    geoJsonData.features.forEach((feature: any) => {
      const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
      const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
      if (!region) return;
      if (!regionCentersRef.current.has(region.id)) {
        try {
          const layer = L.geoJSON(feature);
          const bounds = layer.getBounds();
          const c = bounds.getCenter();
          regionCentersRef.current.set(region.id, [c.lat, c.lng]);
        } catch (e) {
          if (region.center) {
            regionCentersRef.current.set(region.id, region.center);
          }
        }
      }
    });
  }, [geoJsonData]);

  useEffect(() => {
    if (!districtsGeoJsonData || !districtsGeoJsonData.features) return;
    districtsGeoJsonData.features.forEach((f: any) => {
      const tumanName = f.properties?.shapeName || "";
      if (!tumanName || districtCentersRef.current.has(tumanName)) return;
      try {
        const layer = L.geoJSON(f);
        const bounds = layer.getBounds();
        const c = bounds.getCenter();
        districtCentersRef.current.set(tumanName, [c.lat, c.lng]);
      } catch (e) {
        // ignore
      }
    });
  }, [districtsGeoJsonData]);

  // 4. Update Labels (Regions and Districts) dynamically based on Zoom Level
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !labelsGroupRef.current) return;
    
    let animationFrameId: number;

    animationFrameId = requestAnimationFrame(() => {
      if (!labelsGroupRef.current) return;
      labelsGroupRef.current.clearLayers();
      
      // Show region labels starting from global overview zoom level 3.5
      if (zoomLevel < 3.5) return;

      const isActiveFilter = filterLocation !== 'Barchasi';

      // 1. Render Region Labels when zoom is moderate (zoomLevel < 7.8) or showing overview
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
          
          // If a specific district is selected and zoom level is close (>= 7.0), let district labels handle it
          if (isActiveFilter && isRegionActive && zoomLevel >= 7.0) return;
          
          // If another region/district is filtered, hide non-active region labels only on very close district zooms (>= 7.8)
          if (isActiveFilter && !isRegionActive && zoomLevel >= 7.8) return;
          
          const translatedName = translateRegion(region.id, language).toUpperCase();
          const regionJobsCount = getJobCountForLocation(region.id) || getJobCountForLocation(region.name);

          // Proportional badge and text scale matching zoom levels smoothly
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
      
      // 2. Render District Labels when zoom is detailed (zoomLevel >= 7.8 or zoomLevel >= 6.5 with active region filter)
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
