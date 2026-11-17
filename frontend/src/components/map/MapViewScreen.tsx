import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import 'leaflet/dist/leaflet.css';

import { getLatLng } from './mapUtils';
import { useMapViewScreen } from '../../hooks/useMapViewScreen';

// Modular UI Components
import { MapBreadcrumbs } from './MapBreadcrumbs';
import { FloatingSearchBar } from './FloatingSearchBar';
import { JobSummaryCard } from './JobSummaryCard';
import { MapActionButtons } from './MapActionButtons';
import { JobDetailModal } from './JobDetailModal';
import { RegionSelector } from '../RegionSelector';
import { MapLoadingSkeleton } from './MapLoadingSkeleton';

import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface MapViewScreenProps {
  className?: string;
  preview?: boolean;
}

export const MapViewScreen: React.FC<MapViewScreenProps> = ({ 
  className = "h-[calc(100vh-56px-64px)] md:h-screen mt-14 md:mt-0",
  preview = false
}) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const isPreview = preview || currentScreen === 'landing';
  
  const mapScreenData = useMapViewScreen();

  const {
    language,
    t,
    toggleBookmark,
    applyToJob,
    filterLocation,
    setFilterLocation,
    showRegionSelector,
    setShowRegionSelector,
    selectedJob,
    setSelectedJob,
    activeCluster,
    isRefreshing,
    isMapLoading,
    isPanelExpanded,
    setIsPanelExpanded,
    mapType,
    setMapType,
    locationToast,
    mapContainerRef,
    mapInstanceRef,
    breadcrumbItems,
    handleBreadcrumbBack,
    userLocation,
    isLocating,
    distanceToSelectedJob,
    handleCalculateDistance,
    getDisplayedJobs,
    handleRefresh,
    handleJobSelect,
    handleLocationAction,
    panToCoords
  } = mapScreenData;

  return (
    <div className={`relative w-full overflow-hidden bg-slate-100 z-0 isolate ${className}`}>
      
      {/* Real Map Canvas Container */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full z-0" 
        style={{ background: 'var(--color-brand-surface-low)' }}
      />

      {/* Map Refreshing / Loading Skeleton Overlay */}
      <AnimatePresence>
        {(isRefreshing) && <MapLoadingSkeleton />}
      </AnimatePresence>

      {/* Embedded Region/District Selector in Map Box */}
      {!isPreview && showRegionSelector && (
        <RegionSelector embedded />
      )}

      {!isPreview && !showRegionSelector && !selectedJob && filterLocation !== 'Barchasi' && (
        <MapBreadcrumbs 
          breadcrumbItems={breadcrumbItems} 
          handleBreadcrumbBack={handleBreadcrumbBack} 
        />
      )}

      {!isPreview && !showRegionSelector && !selectedJob && filterLocation === 'Barchasi' && (
        <FloatingSearchBar 
          setShowRegionSelector={setShowRegionSelector} 
          isPanelExpanded={isPanelExpanded}
        />
      )}

      {!isPreview && !showRegionSelector && (
        <>
          <MapActionButtons 
            isRefreshing={isRefreshing}
            handleRefresh={handleRefresh}
            handleResetMap={handleLocationAction}
            onZoomIn={() => mapInstanceRef.current?.zoomIn()}
            onZoomOut={() => mapInstanceRef.current?.zoomOut()}
            mapType={mapType}
            setMapType={setMapType}
            isPanelExpanded={isPanelExpanded}
          />

          <JobSummaryCard 
            isPanelExpanded={isPanelExpanded}
            setIsPanelExpanded={setIsPanelExpanded}
            activeCluster={activeCluster}
            displayedJobs={getDisplayedJobs()}
            selectedJob={selectedJob}
            handleJobSelect={handleJobSelect}
            toggleBookmark={toggleBookmark}
            userLocation={userLocation}
            filterLocation={filterLocation}
            isRefreshing={isRefreshing}
            handleRefresh={handleRefresh}
            handleResetMap={handleLocationAction}
            onZoomIn={() => mapInstanceRef.current?.zoomIn()}
            onZoomOut={() => mapInstanceRef.current?.zoomOut()}
            mapType={mapType}
            setMapType={setMapType}
          />
        </>
      )}

      {/* Geolocation Toast Notice */}
      <AnimatePresence>
        {locationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.12)] flex items-center gap-2.5 max-w-[90vw] sm:max-w-md bg-white border border-slate-100/80 pointer-events-auto"
          >
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              locationToast.type === 'success' ? 'bg-emerald-500 animate-pulse' :
              locationToast.type === 'error' ? 'bg-red-500' : 'bg-indigo-500'
            }`} />
            <p className="text-xs font-bold text-slate-800 leading-snug">
              {locationToast.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Overlay Modal Drawer */}
      <AnimatePresence>
        {selectedJob && currentScreen !== 'landing' && (
          <JobDetailModal 
            selectedJob={selectedJob}
            setSelectedJob={setSelectedJob}
            toggleBookmark={toggleBookmark}
            applyToJob={applyToJob}
            distanceToSelectedJob={distanceToSelectedJob}
            handleCalculateDistance={handleCalculateDistance}
            isLocating={isLocating}
            onOpenOnMap={() => {
              const district = selectedJob.location.includes(',') 
                ? selectedJob.location.split(',')[1].trim() 
                : selectedJob.location;
              setFilterLocation(district);
              const coords = getLatLng(selectedJob);
              panToCoords(coords.lat, coords.lng, 15.0);
              setSelectedJob(null);
              setIsPanelExpanded(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
