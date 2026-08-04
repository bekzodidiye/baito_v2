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
          : "grid grid-cols-1 gap-4 w-full"
      }
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={
            layout === 'horizontal'
              ? "shrink-0 min-w-[calc(100vw-64px)] sm:min-w-[250px] sm:max-w-[250px] h-[172px] bg-white rounded-xl p-3.5 border border-slate-100/90 shadow-xs flex flex-col justify-between animate-pulse"
              : "w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3 animate-pulse"
          }
        >
          {/* Top Row: Avatar/Icon + Title & Company */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200/80 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2 py-0.5">
              <div className="h-3.5 bg-slate-200/90 rounded-md w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
            </div>
            <div className="w-6 h-6 rounded-full bg-slate-100 shrink-0" />
          </div>

          {/* Middle Row: Salary & Badges */}
          <div className="space-y-2 my-1">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-emerald-100/80 rounded-md w-2/5" />
              <div className="h-3 bg-slate-100 rounded-md w-1/4" />
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <div className="h-5 bg-slate-100 rounded-md w-16" />
              <div className="h-5 bg-slate-100 rounded-md w-20" />
            </div>
          </div>

          {/* Bottom Row: Location & Shift */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-50">
            <div className="flex items-center gap-1.5 w-3/5">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200/80 shrink-0" />
              <div className="h-2.5 bg-slate-100 rounded-md w-full" />
            </div>
            <div className="h-2.5 bg-slate-100 rounded-md w-12" />
          </div>
        </div>
      ))}
    </div>
  );
};
