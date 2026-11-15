import React from 'react';

interface JobCardSkeletonProps {
  count?: number;
  layout?: 'horizontal' | 'vertical';
}

export const JobCardSkeleton: React.FC<JobCardSkeletonProps> = ({ 
  count = 3, 
  layout = 'horizontal' 
}) => {
  return (
    <div 
      className={
        layout === 'horizontal' 
          ? "px-8 pt-1.5 pb-2 overflow-x-auto no-scrollbar flex gap-4 w-full"
          : "grid grid-cols-1 md:grid-cols-2 gap-3 w-full content-start"
      }
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={
            layout === 'horizontal'
              ? "shrink-0 min-w-[calc(100vw-64px)] sm:min-w-[250px] sm:max-w-[250px] h-[172px] bg-white rounded-xl p-3.5 border border-slate-100/90 shadow-xs flex flex-col justify-between animate-pulse"
              : "w-full h-[162px] bg-white rounded-xl p-2.5 sm:p-3 border border-slate-100 shadow-xs flex flex-col justify-between animate-pulse"
          }
        >
          {/* Top Row: Avatar/Icon + Title & Company */}
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-200/80 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
              <div className="h-3 bg-slate-200/90 rounded-md w-3/4" />
              <div className="h-2 bg-slate-100 rounded-md w-1/2" />
            </div>
            <div className="w-5 h-5 rounded-full bg-slate-100 shrink-0" />
          </div>

          {/* Middle Row: Salary & Badges */}
          <div className="space-y-1.5 my-1">
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-emerald-100/80 rounded-md w-2/5" />
              <div className="h-2.5 bg-slate-100 rounded-md w-1/4" />
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="h-4 bg-slate-100 rounded-md w-14" />
              <div className="h-4 bg-slate-100 rounded-md w-16" />
            </div>
          </div>

          {/* Bottom Row: Location & Shift */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-50">
            <div className="flex items-center gap-1.5 w-3/5">
              <div className="w-3 h-3 rounded-full bg-slate-200/80 shrink-0" />
              <div className="h-2 bg-slate-100 rounded-md w-full" />
            </div>
            <div className="h-2 bg-slate-100 rounded-md w-10" />
          </div>
        </div>
      ))}
    </div>
  );
};
