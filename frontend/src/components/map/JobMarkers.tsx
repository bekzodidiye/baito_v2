import React, { useEffect, useState, useMemo } from 'react';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import Supercluster from 'supercluster';
import { Job } from '../../types';
import { getLatLng } from './mapUtils';
import { getJobCategory } from '../../utils/jobCategoryUtils';
import { Language } from '../../translations';
import { JobMarkerPopup } from './JobMarkerPopup';

interface JobMarkersProps {
  jobs: Job[];
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  activeCluster: 'all' | 'cluster1' | 'cluster2';
  filterLocation: string;
  language: Language;
  districtsGeoJsonData?: any;
  isVisible?: boolean;
}

export const JobMarkers: React.FC<JobMarkersProps> = ({
  jobs,
  selectedJob,
  setSelectedJob,
  activeCluster,
  filterLocation,
  language,
  districtsGeoJsonData,
  isVisible = true,
}) => {
  const map = useMap();
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState<number>(5);

  useEffect(() => {
    if (!map) return;

    const updateBoundsAndZoom = () => {
      const b = map.getBounds();
      if (b) {
        setBounds([
          b.getSouthWest().lng(),
          b.getSouthWest().lat(),
          b.getNorthEast().lng(),
          b.getNorthEast().lat(),
        ]);
      }
      setZoom(map.getZoom() || 5);
    };

    updateBoundsAndZoom();

    const listener = map.addListener('idle', updateBoundsAndZoom);
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  const supercluster = useMemo(() => {
    const sc = new Supercluster({
      radius: 80,
      maxZoom: 16,
    });
    
    // Convert jobs to GeoJSON features for supercluster
    const points = jobs.map(job => {
      const coords = getLatLng(job, districtsGeoJsonData);
      return {
        type: 'Feature' as const,
        properties: { cluster: false, jobId: job.id, job },
        geometry: {
          type: 'Point' as const,
          coordinates: [coords.lng, coords.lat]
        }
      };
    });

    sc.load(points);
    return sc;
  }, [jobs, districtsGeoJsonData]);

  const clusters = useMemo(() => {
    if (!bounds || !supercluster) return [];
    return supercluster.getClusters(bounds, zoom);
  }, [bounds, zoom, supercluster]);

  if (!isVisible || !map) return null;

  return (
    <>
      {clusters.map(cluster => {
        const [lng, lat] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount, jobId, job } = cluster.properties;

        if (isCluster) {
          // Render Cluster Marker
          return (
            <AdvancedMarker
              key={`cluster-${cluster.id}`}
              position={{ lat, lng }}
              onClick={() => {
                const expansionZoom = supercluster.getClusterExpansionZoom(cluster.id as number);
                map.setZoom(expansionZoom);
                map.panTo({ lat, lng });
              }}
              zIndex={50}
            >
              <div className="flex items-center justify-center w-10 h-10 bg-brand-primary text-white rounded-full font-bold shadow-md border-2 border-white hover:scale-110 transition-transform cursor-pointer">
                {pointCount}
              </div>
            </AdvancedMarker>
          );
        }

        // Render Single Job Marker
        const isSelected = selectedJob?.id === jobId;
        const category = getJobCategory(job);
        const borderColor = isSelected ? '#000666' : category.hexColor;
        const pointerColor = isSelected ? '#000666' : category.hexColor;

        const logoHtml = job.logoUrl
          ? `<img src="${job.logoUrl}" alt="${job.company}" class="w-full h-full object-cover rounded-full" onError="this.src='https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150'" />`
          : `<div class="w-full h-full bg-slate-100 text-slate-500 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>`;

        return (
          <AdvancedMarker
            key={`job-${jobId}`}
            position={{ lat, lng }}
            onClick={() => setSelectedJob(job)}
            zIndex={isSelected ? 100 : 40}
          >
            <div 
              className="flex flex-col items-center justify-center cursor-pointer select-none transition-transform duration-200 ease-out origin-bottom hover:scale-110 focus:outline-none relative" 
              style={{ width: '44px', height: '42px', marginTop: '-21px' }} // adjust anchor manually in DOM via AdvancedMarker? Actually AdvancedMarker handles anchor, so no need for negative margin. We can just style the wrapper.
            >
              <div className="relative flex items-center justify-center rounded-full bg-white shadow-sm pointer-events-auto" style={{ width: '26px', height: '26px', border: `2.5px solid ${borderColor}` }}>
                <div dangerouslySetInnerHTML={{ __html: logoHtml }} className="w-full h-full rounded-full overflow-hidden pointer-events-none" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: category.hexColor }}></span>
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px]" style={{ borderTopColor: pointerColor }}></div>
              </div>
              <div className="mt-0.5 text-white text-[7.5px] font-bold px-1.5 py-0.5 rounded shadow-xs max-w-[54px] truncate text-center leading-none pointer-events-auto" style={{ backgroundColor: category.hexColor }}>
                {job.title}
              </div>
            </div>
            
            {isSelected && (
              <div className="absolute bottom-[48px] left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl z-[9999]" style={{ minWidth: '220px' }}>
                <JobMarkerPopup 
                  job={job}
                  category={category}
                  categoryName={language === 'ru' ? category.nameRu : language === 'en' ? category.nameEn : category.nameUz}
                  setSelectedJob={setSelectedJob}
                  closePopup={() => setSelectedJob(null)}
                />
              </div>
            )}
          </AdvancedMarker>
        );
      })}
    </>
  );
};
