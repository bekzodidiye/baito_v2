import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export const MapLoadingSkeleton: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 pointer-events-none bg-slate-950/30 backdrop-blur-[2px] flex flex-col justify-between p-4"
    >
      {/* Top Floating Search Bar Skeleton */}
      <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-2xl p-2.5 shadow-md border border-slate-100/80 flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-slate-200 rounded-md w-2/3" />
          <div className="h-2.5 bg-slate-100 rounded-md w-1/3" />
        </div>
        <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
      </div>

      {/* Centered Reload Spinner Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        <div className="px-5 py-3.5 rounded-2xl bg-slate-900/95 border border-slate-700/90 shadow-2xl flex items-center gap-3 text-white pointer-events-auto">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
          <span className="text-xs font-black tracking-wide text-slate-100">Xarita yuklanmoqda...</span>
        </div>
      </div>

      {/* Map Pins / Cluster Pulse Skeletons in Background */}
      <div className="relative w-full flex-1 my-auto flex items-center justify-center opacity-40">
        {/* Animated Cluster Pulse Pin 1 */}
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 animate-ping absolute" />
            <div className="w-9 h-9 rounded-full bg-white shadow-md border border-brand-primary/30 flex items-center justify-center p-1">
              <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Animated Cluster Pulse Pin 2 */}
        <div className="absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 animate-ping absolute" />
            <div className="w-10 h-10 rounded-full bg-white shadow-md border border-emerald-500/30 flex items-center justify-center p-1">
              <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
