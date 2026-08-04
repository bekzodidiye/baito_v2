import React from 'react';

export const ChatSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-2rem)] bg-brand-background relative pt-0 max-w-5xl mx-auto w-full animate-pulse">
      {/* Skeleton Top App Bar */}
      <header className="sticky top-0 w-full z-30 bg-white shadow-2xs border-b border-slate-100">
        <div className="w-full max-w-5xl mx-auto flex justify-between items-center px-4 h-16">
          <div className="flex items-center gap-3 w-full">
            {/* Back Button Skeleton */}
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
            
            {/* Avatar & Details Skeletons */}
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex flex-col gap-1.5 w-1/3">
                <div className="h-3.5 bg-slate-200 rounded-md w-32" />
                <div className="h-2.5 bg-slate-100 rounded-md w-16" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-full bg-slate-200" />
            <div className="w-9 h-9 rounded-full bg-slate-200" />
          </div>
        </div>
      </header>

      {/* Skeleton Messages Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 flex flex-col space-y-5 overflow-hidden">
        {/* Date stamp skeleton */}
        <div className="flex justify-center my-2">
          <div className="h-5 bg-slate-100 rounded-full w-16" />
        </div>

        {/* Bubble Left 1 */}
        <div className="flex items-end gap-2 max-w-[75%] self-start">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="flex flex-col gap-1">
            <div className="h-10 bg-white border border-slate-100 rounded-2xl rounded-bl-none w-48 shadow-xs" />
            <div className="h-2 bg-slate-100 rounded w-8 ml-1" />
          </div>
        </div>

        {/* Bubble Right 1 */}
        <div className="flex items-end gap-2 max-w-[75%] self-end flex-row-reverse">
          <div className="flex flex-col gap-1 items-end">
            <div className="h-12 bg-slate-200 rounded-2xl rounded-br-none w-56 shadow-xs" />
            <div className="h-2 bg-slate-100 rounded w-8 mr-1" />
          </div>
        </div>

        {/* Bubble Left 2 */}
        <div className="flex items-end gap-2 max-w-[75%] self-start">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="flex flex-col gap-1">
            <div className="h-16 bg-white border border-slate-100 rounded-2xl rounded-bl-none w-64 shadow-xs" />
            <div className="h-2 bg-slate-100 rounded w-8 ml-1" />
          </div>
        </div>

        {/* Bubble Right 2 */}
        <div className="flex items-end gap-2 max-w-[75%] self-end flex-row-reverse">
          <div className="flex flex-col gap-1 items-end">
            <div className="h-10 bg-slate-200 rounded-2xl rounded-br-none w-36 shadow-xs" />
            <div className="h-2 bg-slate-100 rounded w-8 mr-1" />
          </div>
        </div>
      </main>

      {/* Skeleton Footer Input Bar */}
      <footer className="sticky bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] px-4 py-3 z-30">
        <div className="w-full max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 h-11 bg-slate-100 rounded-full" />
          <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
        </div>
      </footer>
    </div>
  );
};
