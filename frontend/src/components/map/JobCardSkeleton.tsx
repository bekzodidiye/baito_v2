import React from 'react';

interface JobCardSkeletonProps {
  count?: number;
  layout?: 'horizontal' | 'vertical' | 'list' | 'grid';
}

export const JobCardSkeleton: React.FC<JobCardSkeletonProps> = ({ 
  count = 4, 
  layout = 'list' 
}) => {
  const isHorizontal = layout === 'horizontal';
  const isGrid = layout === 'grid';
  const isList = layout === 'list' || layout === 'vertical';

  if (isHorizontal) {
    return (
      <div className="px-8 pt-1.5 pb-2 overflow-x-auto no-scrollbar flex gap-4 w-full">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="shrink-0 min-w-[calc(100vw-64px)] sm:min-w-[250px] sm:max-w-[250px] h-[140px] bg-white rounded-2xl p-3.5 border border-slate-100/90 shadow-2xs flex flex-col justify-between animate-pulse"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-200/80 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                <div className="h-3 bg-slate-200/90 rounded-md w-3/4" />
                <div className="h-2 bg-slate-100 rounded-md w-1/2" />
              </div>
            </div>
            <div className="space-y-1.5 my-1">
              <div className="h-4 bg-emerald-100/70 rounded-md w-2/5" />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-50">
              <div className="h-2 bg-slate-100 rounded-md w-1/2" />
              <div className="h-2 bg-slate-100 rounded-md w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isGrid) {
    return (
      <div className="grid grid-cols-2 gap-2.5 w-full content-start">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="w-full h-[150px] bg-white rounded-2xl p-3 border border-slate-100/90 shadow-2xs flex flex-col justify-between animate-pulse"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-200/80 shrink-0" />
              <div className="w-5 h-5 rounded-full bg-slate-100 shrink-0" />
            </div>
            <div className="space-y-1.5 my-1">
              <div className="h-3 bg-slate-200/90 rounded-md w-3/4" />
              <div className="h-2 bg-slate-100 rounded-md w-1/2" />
            </div>
            <div className="h-4 bg-emerald-100/70 rounded-md w-1/2" />
            <div className="flex items-center justify-between pt-1 border-t border-slate-50">
              <div className="h-2 bg-slate-100 rounded-md w-1/2" />
              <div className="h-2 bg-slate-100 rounded-md w-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List (1-column horizontal card) skeleton
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="w-full h-[88px] bg-white rounded-2xl p-3.5 border border-slate-100/90 shadow-2xs flex items-center gap-3.5 animate-pulse"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-200/80 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3.5 bg-slate-200/90 rounded-md w-3/5" />
            <div className="h-2.5 bg-slate-100 rounded-md w-1/3" />
            <div className="flex gap-2">
              <div className="h-2 bg-slate-100 rounded-md w-16" />
              <div className="h-2 bg-slate-100 rounded-md w-14" />
            </div>
          </div>
          <div className="flex flex-col items-end justify-between h-full py-0.5 shrink-0">
            <div className="w-4 h-4 rounded-full bg-slate-100" />
            <div className="h-5 bg-emerald-100/70 rounded-lg w-20" />
            <div className="h-2.5 bg-slate-100 rounded-md w-10" />
          </div>
        </div>
      ))}
    </div>
  );
};
