import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Tanlang", 
  className = "",
  containerClassName = ""
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: {value: string; label: string}[]; 
  placeholder?: string;
  className?: string;
  containerClassName?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${containerClassName}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all ${className}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : <span className="text-slate-400 italic">{placeholder}</span>}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-[220px] max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 py-1 no-scrollbar animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                value === opt.value 
                  ? 'bg-blue-50 text-blue-700 font-bold' 
                  : 'text-slate-700 hover:bg-slate-50 font-medium'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const CustomDatePicker = ({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (date: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentMonth, setCurrentMonth] = useState(new Date(value || new Date()));

  useEffect(() => {
    if (value) setCurrentMonth(new Date(value));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);
  
  const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
  
  const handleDateSelect = (day: number) => {
    const yy = currentMonth.getFullYear();
    const mm = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all w-[160px] justify-between"
      >
        <span className="flex items-center gap-2"><CalendarIcon size={16} className="text-slate-400"/> {value || "Sana tanlang"}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 w-[280px] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={18} /></button>
            <div className="font-bold text-slate-800 text-sm">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(d => (
              <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {blanks.map(b => <div key={`blank-${b}`} className="w-8 h-8" />)}
            {days.map(d => {
              const isSelected = value === `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).toDateString();
              
              return (
                <button
                  key={d}
                  onClick={() => handleDateSelect(d)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                    isSelected 
                      ? 'bg-brand-primary text-white font-bold shadow-md shadow-brand-primary/30' 
                      : isToday
                      ? 'bg-blue-50 text-brand-primary font-bold hover:bg-blue-100'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const StatusSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { value: 'open', label: 'Ariza ochiq', color: 'bg-slate-50 text-slate-700 border-slate-200' },
    { value: 'confirmed', label: 'Ishchi olindi', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'in_progress', label: 'Ish boshlandi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'completed', label: 'Ish tugatildi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'cancelled', label: 'Ish bekor qilindi', color: 'bg-red-50 text-red-700 border-red-200' },
  ];

  const currentOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide border focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all ${currentOption.color}`}
      >
        <span>{currentOption.label}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-50 flex items-center justify-between ${value === opt.value ? 'bg-slate-50/80 font-semibold text-slate-900' : 'text-slate-600'}`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <div className={`w-1.5 h-1.5 rounded-full ${opt.color.split(' ')[0].replace('bg-', 'bg-').replace('50', '500')}`} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
