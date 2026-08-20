import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { getLatLng } from './mapUtils';
import { Language } from '../../translations';
import { getJobCategory } from '../../utils/jobCategoryUtils';
import { JobMarkerPopup } from './JobMarkerPopup';
import { useUserLocationMarker } from './useUserLocationMarker';
import { createRoot } from 'react-dom/client';

interface UseJobMarkersProps {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  markerGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  userGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  activeCluster: 'all' | 'cluster1' | 'cluster2';
  jobs: Job[];
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  userLocation: { lat: number; lng: number } | null;
  filterLocation: string;
  setIsPanelExpanded: (expanded: boolean) => void;
  getDisplayedJobs: () => Job[];
  language: Language;
  districtsGeoJsonData?: any;
  isVisible?: boolean;
}

export const useJobMarkers = ({
  mapInstanceRef,
  markerGroupRef,
  userGroupRef,
  activeCluster,
  jobs,
  selectedJob,
  setSelectedJob,
  userLocation,
  filterLocation,
  setIsPanelExpanded,
  getDisplayedJobs,
  language,
  districtsGeoJsonData,
  isVisible = true,
}: UseJobMarkersProps) => {
  const selectedJobRef = useRef(selectedJob);
  useEffect(() => {
    selectedJobRef.current = selectedJob;
  }, [selectedJob]);

  const activeRootsRef = useRef<Map<string, import('react-dom/client').Root>>(new Map());

  useEffect(() => {
    return () => {
      activeRootsRef.current.forEach(root => root.unmount());
      activeRootsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const map = mapInstanceRef.current;
    const group = markerGroupRef.current;
    const userGroup = userGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    activeRootsRef.current.forEach(root => root.unmount());
    activeRootsRef.current.clear();

    if (userGroup) {
      userGroup.clearLayers();
    }

    const displayedJobs = getDisplayedJobs();
    const maxPinsToRender = 120;
    const truncatedJobs = displayedJobs.slice(0, maxPinsToRender);

    truncatedJobs.forEach(job => {
      const coords = getLatLng(job, districtsGeoJsonData);
      
      const isVisibleOnMap = map.getBounds().contains([coords.lat, coords.lng]);
      if (!isVisibleOnMap && activeCluster !== 'all') return;

      const isSelected = selectedJobRef.current?.id === job.id;
      const category = getJobCategory(job);
      const categoryName = language === 'ru' ? category.nameRu : language === 'en' ? category.nameEn : category.nameUz;

      const borderColor = isSelected ? '#000666' : category.hexColor;
      const pointerColor = isSelected ? '#000666' : category.hexColor;

      const logoHtml = job.logoUrl
        ? `<img src="${job.logoUrl}" alt="${job.company}" class="marker-logo-img" />`
        : `<div class="marker-logo-placeholder bg-slate-100 text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>`;

      const jobHtml = `
        <div tabindex="0" role="button" aria-label="${job.title}" class="flex flex-col items-center justify-center cursor-pointer select-none transition-transform duration-200 ease-out origin-bottom hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 rounded-sm" style="width: 44px; height: 42px;">
          <div class="relative flex items-center justify-center rounded-full bg-white shadow-sm" style="width: 26px !important; height: 26px !important; border: 2.5px solid ${borderColor};">
            ${logoHtml}
            <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" style="background-color: ${category.hexColor};"></span>
            <div class="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px]" style="border-t-color: ${pointerColor};"></div>
          </div>
          <div class="mt-0.5 text-white text-[7.5px] font-bold px-1.5 py-0.5 rounded shadow-xs max-w-[54px] truncate text-center leading-none" style="background-color: ${category.hexColor};">
            ${job.title}
          </div>
        </div>
      `;

      const jobIcon = L.divIcon({
        html: jobHtml,
        className: `custom-job-marker-${job.id}`,
        iconSize: [44, 42],
        iconAnchor: [22, 21],
        popupAnchor: [0, -28]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: jobIcon });

      const popupNode = document.createElement('div');
      marker.bindPopup(popupNode, {
        closeButton: false,
        offset: [0, 0],
        autoPan: true,
        autoPanPadding: [20, 20]
      });

      marker.on('popupopen', () => {
        let root = activeRootsRef.current.get(job.id);
        if (!root) {
          root = createRoot(popupNode);
          activeRootsRef.current.set(job.id, root);
        }
        
        root.render(
          <JobMarkerPopup 
            job={job}
            category={category}
            categoryName={categoryName}
            setSelectedJob={setSelectedJob}
            closePopup={() => marker.closePopup()}
          />
        );

        // Immediate and next-frame update to guarantee the popup is positioned dead center right on top of the pin
        marker.getPopup()?.update();
        requestAnimationFrame(() => {
          marker.getPopup()?.update();
        });
        setTimeout(() => {
          marker.getPopup()?.update();
        }, 30);
      });

      marker.on('popupclose', () => {
        const root = activeRootsRef.current.get(job.id);
        if (root) {
          setTimeout(() => {
            root.unmount();
            activeRootsRef.current.delete(job.id);
          }, 300);
        }
      });

      marker.addTo(group);
    });

    const handleMoveEnd = () => {
      setTimeout(() => {
        if (mapInstanceRef.current && filterLocation === 'Barchasi') {
        }
      }, 100);
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [activeCluster, jobs, filterLocation, mapInstanceRef, markerGroupRef, language, districtsGeoJsonData, setSelectedJob, isVisible]);

  useUserLocationMarker({
    userGroupRef,
    userLocation,
    selectedJob,
    language,
    districtsGeoJsonData,
    isVisible
  });
};
