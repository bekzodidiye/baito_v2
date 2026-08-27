import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

interface DrawerMenuItemProps {
  item: any;
  index: number;
}

export const DrawerMenuItem: React.FC<DrawerMenuItemProps> = ({ item, index }) => {
  const Icon = item.icon;
  const isHighlight = 'highlight' in item && item.highlight;
  const isDanger = 'isDanger' in item && item.isDanger;
  
  let buttonClass = '';
  let iconWrapperClass = '';
  
  if (isHighlight) {
    buttonClass = 'bg-brand-primary text-white hover:bg-brand-primary/95 shadow-[0_4px_12px_rgba(0,6,102,0.12)] my-1';
    iconWrapperClass = 'bg-white/20 text-white';
  } else if (isDanger) {
    buttonClass = 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 mt-2 border border-dashed border-rose-200/50';
    iconWrapperClass = 'bg-rose-50 text-rose-500 group-hover:bg-rose-100 group-hover:text-rose-600';
  } else if (item.active) {
    buttonClass = 'bg-brand-primary/5 text-brand-primary';
    iconWrapperClass = 'bg-brand-primary/10 text-brand-primary';
  } else {
    buttonClass = 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
    iconWrapperClass = 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700';
  }

  return (
    <motion.button
      key={item.id}
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.2 }}
      onClick={item.action}
      className={`group flex items-center justify-between w-full p-3 rounded-xl font-bold text-xs text-left transition-all cursor-pointer border-0 relative ${buttonClass}`}
      type="button"
    >
      <div className="flex items-center gap-3.5">
        <span className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${iconWrapperClass}`}>
          <Icon size={16} className="stroke-[2.2]" />
        </span>
        <span>{item.label}</span>
      </div>
      <ChevronRight 
        size={14} 
        className={`transition-all duration-200 ${
          isHighlight
            ? 'text-white/80 group-hover:translate-x-0.5'
            : isDanger
            ? 'text-rose-300 group-hover:text-rose-500 group-hover:translate-x-0.5'
            : item.active 
            ? 'text-brand-primary translate-x-0' 
            : 'text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5'
        }`} 
      />
      
      {!isHighlight && !isDanger && item.active && (
        <span className="absolute left-0 top-3 bottom-3 w-1 bg-brand-primary rounded-r-md" />
      )}
    </motion.button>
  );
};
