import React from 'react';
import { motion } from 'motion/react';

export const MapLoadingSkeleton: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute top-3.5 left-3.5 right-3.5 z-30 max-w-md mx-auto pointer-events-none"
    >
      {/* Top Floating Search Bar Skeleton */}
      <div className="w-full h-11 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-lg border border-slate-200/90 flex items-center gap-3 animate-pulse">
        <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
        <div className="h-3.5 bg-slate-200 rounded-md w-48" />
        <div className="w-5 h-5 rounded-full bg-slate-200 ml-auto shrink-0" />
      </div>
    </motion.div>
  );
};
