import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { getLatLng } from './mapUtils';
import { Language } from '../../translations';
import { getJobCategory } from '../../utils/jobCategoryUtils';
import { JobMarkerPopup } from './JobMarkerPopup';
import { useUserLocationMarker } from './useUserLocationMarker';
import { createRoot } from 'react-dom/client';

export interface UseJobMarkersProps {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  markerGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  userGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  activeCluster: 'all' | 'cluster1' | 'cluster2';
  jobs: Job[];
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  userLocation: { lat: number; lng: number } | null;
  filterLocation: string;
  settledLocation?: string;
  setIsPanelExpanded: (expanded: boolean) => void;
  displayedJobs?: Job[];
  getDisplayedJobs?: () => Job[];
  language: Language;
  districtsGeoJsonData?: any;
  isVisible?: boolean;
}

/**
 * Creates the custom HTML DivIcon for a job marker pin.
 * Reflects selection state (border, pointer color, scale) without tearing down the layer.
 */
export const createJobMarkerIcon = (job: Job, isSelected: boolean, language: Language): L.DivIcon => {
  const category = getJobCategory(job);
  const borderColor = isSelected ? '#000666' : category.hexColor;
  const pointerColor = isSelected ? '#000666' : category.hexColor;

  const fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='14' x='2' y='7' rx='2' ry='2'/%3E%3Cpath d='M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'/%3E%3C/svg%3E";
  const logoHtml = job.logoUrl
    ? `<img src="${job.logoUrl}" alt="${job.company}" class="marker-logo-img" onerror="this.onerror=null; this.src='${fallbackSvg}';" />`
    : `<div class="marker-logo-placeholder bg-slate-100 text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>`;

  const jobHtml = `
    <div tabindex="0" role="button" aria-label="${job.title}" class="flex flex-col items-center justify-center cursor-pointer select-none transition-transform duration-200 ease-out origin-bottom hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 rounded-sm ${isSelected ? 'scale-110' : ''}" style="width: 44px; height: 42px;">
      <div class="relative flex items-center justify-center rounded-full bg-white shadow-sm" style="width: 26px !important; height: 26px !important; border: 2.5px solid ${borderColor};">
        ${logoHtml}
        <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" style="background-color: ${category.hexColor};"></span>
        <div class="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px]" style="border-t-color: ${pointerColor};"></div>
      </div>
      <div class="mt-0.5 text-white text-[7.5px] font-bold px-1.5 py-0.5 rounded shadow-xs max-w-[54px] truncate text-center leading-none ${isSelected ? 'font-black' : ''}" style="background-color: ${isSelected ? '#000666' : category.hexColor};">
        ${job.title}
      </div>
    </div>
  `;

  return L.divIcon({
    html: jobHtml,
    className: `custom-job-marker-${job.id}${isSelected ? ' marker-selected' : ''}`,
    iconSize: [44, 42],
    iconAnchor: [22, 21],
    popupAnchor: [0, -28]
  });
};

/**
 * Creates the DivIcon for a server-side cluster marker pin.
 */
export const createServerClusterMarkerIcon = (count: number): L.DivIcon => {
  const size = count < 10 ? 30 : count < 100 ? 36 : 42;
  const half = size / 2;
  const fontSize = count < 100 ? '11px' : '9.5px';
  const shadowClass = 'shadow-[0_4px_12px_rgba(0,6,102,0.3)]';

  return L.divIcon({
    html: `
      <div tabindex="0" role="button" aria-label="${count} ta ish o'rni" class="flex items-center justify-center rounded-full text-white font-extrabold ${shadowClass} select-none transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-primary"
           style="width: ${size}px; height: ${size}px; background-color: var(--color-brand-primary, #000666); line-height: ${size - 3}px; font-size: ${fontSize}; border: 2.5px solid white;">
        ${count}
      </div>
    `,
    className: `custom-server-cluster-marker cluster-count-${count}`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
};

/**
 * Prioritizes jobs for rendering as markers.
 * Guarantees that:
 * 1. The selected job is never omitted.
 * 2. Jobs visible in the current viewport bounds are prioritized over off-screen jobs,
 *    preventing jobs occurring after index 120 from being hidden when the user zooms into their area.
 * 3. Does not discard jobs unnecessarily when displayedJobs fits within capacity.
 */
export function getPrioritizedMapJobs(
  displayedJobs: Job[],
  selectedJobId: string | null | undefined,
  mapBounds: L.LatLngBounds | null,
  districtsGeoJsonData: any,
  maxPins: number = 500
): Job[] {
  if (displayedJobs.length <= maxPins) {
    return displayedJobs;
  }

  const selectedList: Job[] = [];
  const inViewport: Job[] = [];
  const outOfViewport: Job[] = [];

  const paddedBounds = mapBounds && typeof mapBounds.pad === 'function' && mapBounds.isValid()
    ? mapBounds.pad(0.1)
    : mapBounds;

  for (const job of displayedJobs) {
    if (selectedJobId && job.id === selectedJobId) {
      selectedList.push(job);
      continue;
    }

    if (paddedBounds && typeof paddedBounds.contains === 'function' && paddedBounds.isValid()) {
      const coords = getLatLng(job, districtsGeoJsonData);
      if (paddedBounds.contains([coords.lat, coords.lng])) {
        inViewport.push(job);
        continue;
      }
    }

    outOfViewport.push(job);
  }

  const prioritized = [...selectedList, ...inViewport, ...outOfViewport];
  return prioritized.slice(0, maxPins);
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
  settledLocation,
  setIsPanelExpanded,
  displayedJobs: propDisplayedJobs,
  getDisplayedJobs,
  language,
  districtsGeoJsonData,
  isVisible = true,
}: UseJobMarkersProps) => {
  const selectedJobRef = useRef(selectedJob);
  useEffect(() => {
    selectedJobRef.current = selectedJob;
  }, [selectedJob]);

  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Compute a stable signature so that background polling of jobs (which creates
  // new array references every 10s) does NOT tear down all Leaflet markers unless
  // the job IDs, statuses, bookmarks, or applications actually changed.
  const jobsSignature = useMemo(() => {
    return jobs.map(j => `${j.id}:${j.status}:${j.bookmarked}:${j.applied}`).join('|');
  }, [jobs]);

  const activeRootsRef = useRef<Map<string, import('react-dom/client').Root>>(new Map());

  // Stable references to created Leaflet markers for O(1) icon updates on selection changes
  const markersByIdRef = useRef<Map<string, { marker: L.Marker; job: Job }>>(new Map());
  const prevSelectedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      activeRootsRef.current.forEach(root => root.unmount());
      activeRootsRef.current.clear();
      markersByIdRef.current.clear();
    };
  }, []);

  // Synchronize selected marker visual state without destroying/recreating any layers
  useEffect(() => {
    const currentId = selectedJob?.id ?? null;
    const prevId = prevSelectedJobIdRef.current;
    if (currentId === prevId) return;

    // Reset previous selected marker
    if (prevId) {
      const prevEntry = markersByIdRef.current.get(prevId);
      if (prevEntry && !prevEntry.job.isCluster) {
        prevEntry.marker.setIcon(createJobMarkerIcon(prevEntry.job, false, language));
        prevEntry.marker.setZIndexOffset(0);
      }
    }

    // Highlight newly selected marker
    if (currentId) {
      const newEntry = markersByIdRef.current.get(currentId);
      if (newEntry && !newEntry.job.isCluster) {
        newEntry.marker.setIcon(createJobMarkerIcon(newEntry.job, true, language));
        newEntry.marker.setZIndexOffset(1000);
      }
    }

    prevSelectedJobIdRef.current = currentId;
  }, [selectedJob?.id, language]);

  useEffect(() => {
    if (!isVisible) return;

    const map = mapInstanceRef.current;
    const group = markerGroupRef.current;
    const userGroup = userGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    activeRootsRef.current.forEach(root => root.unmount());
    activeRootsRef.current.clear();
    markersByIdRef.current.clear();

    if (userGroup) {
      userGroup.clearLayers();
    }

    if (settledLocation !== undefined && filterLocation !== settledLocation) {
      return;
    }

    const rawDisplayedJobs = propDisplayedJobs || (getDisplayedJobs ? getDisplayedJobs() : []);
    const mapBounds = map.getBounds ? map.getBounds() : null;
    const prioritizedJobs = getPrioritizedMapJobs(
      rawDisplayedJobs,
      selectedJobRef.current?.id,
      mapBounds,
      districtsGeoJsonData,
      500
    );

    const markersToAdd: L.Marker[] = [];

    prioritizedJobs.forEach(job => {
      const coords = getLatLng(job, districtsGeoJsonData);

      if (activeCluster !== 'all') {
        const isVisibleOnMap = map.getBounds().contains([coords.lat, coords.lng]);
        if (!isVisibleOnMap) return;
      }

      if (job.isCluster) {
        const count = job.count || 1;
        const clusterIcon = createServerClusterMarkerIcon(count);
        const marker = L.marker([coords.lat, coords.lng], {
          icon: clusterIcon,
          zIndexOffset: 500,
        });

        marker.on('click', () => {
          map.setView([coords.lat, coords.lng], 10);
        });

        markersByIdRef.current.set(job.id, { marker, job });
        markersToAdd.push(marker);
        return;
      }

      const isSelected = selectedJobRef.current?.id === job.id;
      const jobIcon = createJobMarkerIcon(job, isSelected, language);

      const marker = L.marker([coords.lat, coords.lng], {
        icon: jobIcon,
        zIndexOffset: isSelected ? 1000 : 0
      });

      const category = getJobCategory(job);
      const categoryName = language === 'ru' ? category.nameRu : language === 'en' ? category.nameEn : category.nameUz;

      const popupNode = document.createElement('div');
      marker.bindPopup(popupNode, {
        closeButton: false,
        offset: [0, 0],
        autoPan: true,
        autoPanPadding: [20, 20]
      });

      marker.on('click', () => {
        setSelectedJob(job);
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

      markersByIdRef.current.set(job.id, { marker, job });
      markersToAdd.push(marker);
    });

    if (markersToAdd.length > 0) {
      if (typeof (group as any).addLayers === 'function') {
        (group as any).addLayers(markersToAdd);
      } else {
        markersToAdd.forEach(m => m.addTo(group));
      }
    }
  }, [activeCluster, jobsSignature, filterLocation, settledLocation, mapInstanceRef, markerGroupRef, language, districtsGeoJsonData, setSelectedJob, isVisible]);

  useUserLocationMarker({
    userGroupRef,
    userLocation,
    selectedJob,
    language,
    districtsGeoJsonData,
    isVisible
  });
};
