import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string | number; label: string | number }[];
  placeholder: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border ${isOpen ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-slate-200/80 hover:border-slate-300'} rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-semibold outline-none transition-all cursor-pointer shadow-3xs flex items-center justify-between`}
      >
        <span className={`block truncate ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={14} 
          className={`absolute right-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden"
          >
            <div className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(String(option.value));
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    String(value) === String(option.value) 
                      ? 'bg-brand-primary/5 text-brand-primary font-bold' 
                      : 'text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {option.label}
                  {String(value) === String(option.value) && (
                    <Check size={14} className="text-brand-primary" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
