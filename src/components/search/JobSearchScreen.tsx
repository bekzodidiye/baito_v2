import React from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

import { SearchFilterSection } from './SearchFilterSection';
import { JobCardItem } from './JobCardItem';
import { JobCardSkeleton } from '../map/JobCardSkeleton';
import { JobSearchModalDetail } from './JobSearchModalDetail';
import { MapViewCallout } from './MapViewCallout';
import { DesktopJobDetailsPanel } from './DesktopJobDetailsPanel';
import { useJobSearchScreen } from '../../hooks/useJobSearchScreen';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { SearchSidebar } from './SearchSidebar';
import { JobSortHeader } from './JobSortHeader';

export const JobSearchScreen: React.FC = () => {
  const {
    language, t, toggleBookmark, applyToJob, filterLocation, setFilterLocation,
    setShowRegionSelector, setCurrentScreen, searchTerm, setSearchTerm,
    filterType, setFilterType, filterCategory, setFilterCategory,
    sortBy, setSortBy, selectedJob, setSelectedJob, visibleCount, isLoadingMore,
    isSortDropdownOpen, setIsSortDropdownOpen, sortedJobs, activeDesktopJob,
    hasActiveJobToday, applicationsTodayCount, getJobsCountSummary,
    handleLoadMore, clearFilters, requestLocation, isRequestingLocation
  } = useJobSearchScreen();

  const hasMore = visibleCount < sortedJobs.length;

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore,
    rootMargin: '250px',
  });

  const SCHEDULE_FILTERS = [
    { key: 'Barchasi', label: t.allJobs },
    { key: "To'liq bandlik", label: t.fullTime },
    { key: "Smenali grafik", label: t.shiftSchedule },
    { key: "Erkin grafik", label: t.freeSchedule }
  ];

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-4 pt-16 md:pt-4 px-4 md:pl-8 md:pr-6 lg:pl-10 lg:pr-8 w-full max-w-full overflow-x-hidden">
      {/* 1. MOBILE ONLY VIEW */}
      <div className="flex flex-col gap-5 md:hidden">
        <SearchFilterSection 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterLocation={filterLocation}
          setFilterLocation={setFilterLocation}
          filterType={filterType}
          setFilterType={setFilterType}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          setShowRegionSelector={setShowRegionSelector}
        />

        <JobSortHeader
          language={language}
          t={t}
          getJobsCountSummary={getJobsCountSummary}
          hasActiveJobToday={hasActiveJobToday}
          applicationsTodayCount={applicationsTodayCount}
          requestLocation={requestLocation}
          isRequestingLocation={isRequestingLocation}
          sortBy={sortBy}
          setSortBy={setSortBy}
          isSortDropdownOpen={isSortDropdownOpen}
          setIsSortDropdownOpen={setIsSortDropdownOpen}
        />

        <div className="grid grid-cols-1 gap-4">
          {sortedJobs.slice(0, visibleCount).map((job, idx) => (
            <JobCardItem 
              key={job.id}
              job={job}
              idx={idx}
              onClick={() => setSelectedJob(job)}
              toggleBookmark={toggleBookmark}
            />
          ))}

          {sortedJobs.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 shadow-xs">
              <Briefcase size={36} className="mx-auto text-slate-300 mb-2.5" />
              <p className="font-sans font-bold text-slate-700 text-sm">{t.noMatchingJobs}</p>
              <p className="text-slate-400 text-xs mt-1">{t.changeFiltersTry}</p>
            </div>
          )}

          <MapViewCallout setCurrentScreen={setCurrentScreen} />
        </div>

        {/* Intersection Observer Sentinel for Mobile */}
        {hasMore && (
          <div ref={sentinelRef} className="py-4">
            {isLoadingMore ? (
              <JobCardSkeleton count={2} layout="vertical" />
            ) : (
              <div className="h-4" />
            )}
          </div>
        )}
      </div>

      {/* 2. DESKTOP ADAPTED SPLIT VIEW */}
      <div className="hidden md:grid grid-cols-12 gap-5 lg:gap-6 items-start w-full min-w-0">
        <SearchSidebar 
          t={t}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setShowRegionSelector={setShowRegionSelector}
          filterLocation={filterLocation}
          setFilterLocation={setFilterLocation}
          filterType={filterType}
          setFilterType={setFilterType}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
          clearFilters={clearFilters}
          language={language}
          SCHEDULE_FILTERS={SCHEDULE_FILTERS}
          requestLocation={requestLocation}
          isRequestingLocation={isRequestingLocation}
        />

        {/* Middle Column */}
        <section className="col-span-4 min-w-0 flex flex-col gap-4 overflow-y-auto h-[calc(100vh-32px)] pr-1 md:pl-2 no-scrollbar">
          <div className="flex justify-between items-center sticky top-0 bg-brand-background/95 backdrop-blur-md py-2 z-10">
            <h2 className="font-display font-extrabold text-xs text-slate-800 leading-tight">
              {getJobsCountSummary()}
            </h2>
          </div>

          <div className="flex flex-col gap-3.5">
            {sortedJobs.slice(0, visibleCount).map((job, idx) => (
              <JobCardItem 
                key={job.id}
                job={job}
                idx={idx}
                isActive={activeDesktopJob?.id === job.id}
                onClick={() => setSelectedJob(job)}
                toggleBookmark={toggleBookmark}
              />
            ))}

            {sortedJobs.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 shadow-xs">
                <Briefcase size={36} className="mx-auto text-slate-300 mb-2.5" />
                <p className="font-sans font-bold text-slate-700 text-sm">{t.noMatchingJobs}</p>
                <p className="text-slate-400 text-xs mt-1">{t.changeFiltersTry}</p>
              </div>
            )}

            <MapViewCallout setCurrentScreen={setCurrentScreen} />
          </div>

          {/* Intersection Observer Sentinel for Desktop */}
          {hasMore && (
            <div ref={sentinelRef} className="py-2">
              {isLoadingMore ? (
                <JobCardSkeleton count={2} layout="vertical" />
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}
        </section>

        {/* Right Details Panel */}
        <section className="col-span-5 min-w-0 sticky top-4 h-[calc(100vh-32px)] flex flex-col no-scrollbar">
          <DesktopJobDetailsPanel 
            activeJob={activeDesktopJob}
            toggleBookmark={toggleBookmark}
            applyToJob={applyToJob}
            selectedJob={selectedJob}
            setSelectedJob={setSelectedJob}
          />
        </section>
      </div>

      {/* Mobile Detail Overlay */}
      <AnimatePresence>
        {selectedJob && (
          <div className="md:hidden">
            <JobSearchModalDetail 
              selectedJob={selectedJob}
              setSelectedJob={setSelectedJob}
              toggleBookmark={toggleBookmark}
              applyToJob={applyToJob}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
