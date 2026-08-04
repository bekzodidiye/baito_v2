import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { getLatLng, calculateDistance } from './mapUtils';
import { Language } from '../../translations';
import { getJobCategory } from '../../utils/jobCategoryUtils';

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

  // Keep track of active roots for cleanup
  const activeRootsRef = useRef<Map<string, import('react-dom/client').Root>>(new Map());

  // Cleanup all active React roots when component unmounts or map refreshes
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

    // Reset previous layer elements and roots
    group.clearLayers();
    activeRootsRef.current.forEach(root => root.unmount());
    activeRootsRef.current.clear();

    if (userGroup) {
      userGroup.clearLayers();
    }

    const displayedJobs = getDisplayedJobs();
    
    // Limit to a maximum of 120 pins to prevent Leaflet from lagging under high pin density
    const maxPinsToRender = 120;
    const truncatedJobs = displayedJobs.slice(0, maxPinsToRender);

    // Render individual jobs inside the filtered zone
    truncatedJobs.forEach(job => {
      const coords = getLatLng(job, districtsGeoJsonData);
      
      // Visibility check (Map Performance optimization)
      const isVisible = map.getBounds().contains([coords.lat, coords.lng]);
      if (!isVisible && activeCluster !== 'all') return;

      const isSelected = selectedJobRef.current?.id === job.id;
      const category = getJobCategory(job);
      const categoryName = language === 'ru' ? category.nameRu : language === 'en' ? category.nameEn : category.nameUz;

      const borderColor = isSelected ? '#000666' : category.hexColor;
      const pointerColor = isSelected ? '#000666' : category.hexColor;

      const logoHtml = job.logoUrl
        ? `<img src="${job.logoUrl}" alt="${job.company}" class="marker-logo-img" />`
        : `<div class="marker-logo-placeholder bg-slate-100 text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>`;

      const jobHtml = `
        <div class="flex flex-col items-center justify-center cursor-pointer select-none transition-transform duration-200 ease-out origin-bottom hover:scale-110" style="width: 44px; height: 42px;">
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
        iconAnchor: [22, 21]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: jobIcon });

      const popupNode = document.createElement('div');
      marker.bindPopup(popupNode, {
        closeButton: false,
        offset: [0, -15]
      });

      marker.on('popupopen', async () => {
        const { createRoot } = await import('react-dom/client');
        let root = activeRootsRef.current.get(job.id);
        if (!root) {
          root = createRoot(popupNode);
          activeRootsRef.current.set(job.id, root);
        }
        
        root.render(
          <div className="font-sans text-left min-w-[180px] max-w-[240px]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${category.badgeBg} ${category.badgeText}`}>
                {categoryName}
              </span>
              <span className="text-[9px] font-semibold text-brand-secondary ml-auto">{job.salary}</span>
            </div>
            <h4 className="text-xs font-bold text-brand-primary leading-tight font-display mb-1 truncate">{job.title}</h4>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[10px] text-brand-text-variant font-semibold truncate">{job.company}</p>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
              <p className="text-[9px] text-brand-text-variant font-medium whitespace-nowrap">{job.time}</p>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-brand-text-variant/80 border-t border-brand-surface-low pt-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span className="truncate">{job.location}</span>
            </div>
            <button 
              className="w-full mt-2 bg-brand-primary text-white text-[10px] font-bold py-1.5 rounded active:scale-95 transition-transform cursor-pointer border-none"
              onClick={() => {
                setSelectedJob(job);
                marker.closePopup();
              }}
            >
              Batafsil
            </button>
          </div>
        );
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

    // Handle map move to re-render pins if necessary
    const handleMoveEnd = () => {
      // Small delay to allow zoom animations to complete
      setTimeout(() => {
        if (mapInstanceRef.current && filterLocation === 'Barchasi') {
           // We can trigger a re-render here if needed, but react will handle it via state
        }
      }, 100);
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [activeCluster, jobs, filterLocation, mapInstanceRef, markerGroupRef, language, districtsGeoJsonData, setSelectedJob, isVisible]);

  // Separate effect for user location and routing line
  useEffect(() => {
    if (!isVisible) return;

    const userGroup = userGroupRef.current;
    if (!userGroup) return;

    userGroup.clearLayers();

    if (userLocation) {
      const userHtml = `
        <div class="relative flex items-center justify-center" style="width: 40px; height: 40px;">
          <div class="w-4 h-4 bg-brand-primary rounded-full border-2 border-white shadow-lg relative z-10"></div>
          <span class="absolute w-8 h-8 rounded-full bg-brand-primary/40 animate-pulse"></span>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-location-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      
      const userLocationTooltip = language === 'ru' ? "Ваше местоположение" : language === 'en' ? "Your location" : "Sizning joylashuvingiz";

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindTooltip(userLocationTooltip, { permanent: false, direction: 'top' })
        .addTo(userGroup);

      if (selectedJob) {
        const jobCoords = getLatLng(selectedJob, districtsGeoJsonData);
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-brand-primary').trim() || '#000666';
        L.polyline(
          [[userLocation.lat, userLocation.lng], [jobCoords.lat, jobCoords.lng]],
          {
            color: primaryColor,
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.8
          }
        ).addTo(userGroup);
      }
    }
  }, [userLocation, selectedJob, language, userGroupRef, districtsGeoJsonData, isVisible]);
};
