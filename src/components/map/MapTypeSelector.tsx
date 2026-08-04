import React from 'react';
import { Map, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MapTypeSelectorProps {
  mapType: 'xarita' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';
  setMapType: (type: 'xarita' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro') => void;
}

export const MapTypeSelector: React.FC<MapTypeSelectorProps> = ({
  mapType,
  setMapType,
}) => {
  const isHybrid = mapType === 'gibrid';

  const toggleMapType = () => {
    if (isHybrid) {
      setMapType('xarita');
    } else {
      setMapType('gibrid');
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="pointer-events-auto flex items-center justify-center"
    >
      {/* The main circular toggle button */}
      <motion.button
        onClick={toggleMapType}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.92 }}
        title={isHybrid ? "Oddiy xaritaga oʻtish" : "Gibrid xaritaga oʻtish"}
        className="relative w-11 h-11 rounded-full flex items-center justify-center bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 hover:border-slate-200/80 active:border-brand-primary/20 cursor-pointer transition-colors duration-200"
      >
        {/* Dynamic Glowing Status Border (blue for hybrid, neutral for standard) */}
        <motion.div 
          className="absolute inset-0 rounded-full border-2 border-transparent"
          animate={{
            borderColor: isHybrid ? 'var(--color-brand-primary-container)' : '#e2e8f0',
            boxShadow: isHybrid ? '0 0 12px rgba(26,35,126,0.15)' : 'none',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Dynamic mini mode indicator dot on top right */}
        <span className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white transition-all duration-300 z-20 ${
          isHybrid ? 'bg-emerald-500 scale-110 shadow-sm' : 'bg-slate-300'
        }`} />

        {/* Animated Icon Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isHybrid ? 'hybrid' : 'standard'}
            initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex items-center justify-center z-10"
          >
            {isHybrid ? (
              <Layers size={19} className="text-brand-primary" />
            ) : (
              <Map size={19} className="text-slate-600" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
