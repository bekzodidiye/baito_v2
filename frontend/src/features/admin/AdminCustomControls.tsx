import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className = "",
  containerClassName = "",
  name,
  id,
  'aria-label': ariaLabel,
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string }[]; 
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  name?: string;
  id?: string;
  'aria-label'?: string;
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const placeholderText = placeholder ?? a.chooseLabel;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

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

  const handleSelect = (val: string) => {
    onChange(val);
    if (selectRef.current) {
      selectRef.current.value = val;
      selectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${containerClassName}`} ref={containerRef}>
      {/* Hidden real select for testing-library & accessibility */}
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        name={name}
        id={id}
        aria-label={ariaLabel}
        className="sr-only pointer-events-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all cursor-pointer shadow-2xs ${className}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : <span className="text-slate-400 italic">{placeholderText}</span>}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-[240px] max-h-64 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 no-scrollbar animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected 
                    ? 'bg-brand-primary/10 text-brand-primary font-bold' 
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="text-brand-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export interface PortalSelectOption {
  value: string;
  label: string;
  color?: string;
  dot?: string;
}

export const PortalSelect = ({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  containerClassName = "",
  name,
  id,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  options: PortalSelectOption[];
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  name?: string;
  id?: string;
  'aria-label'?: string;
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const placeholderText = placeholder ?? a.chooseLabel;
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(280, options.length * 38 + 16);
    const minWidth = Math.max(rect.width, 170);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = openUpwards ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.left, (window.innerWidth || 1200) - minWidth - 8));

    setCoords({ top, left, width: minWidth });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    if (selectRef.current) {
      selectRef.current.value = val;
      selectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${containerClassName}`} onClick={(e) => e.stopPropagation()}>
      {/* Hidden real select for testing-library & accessibility */}
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        name={name}
        id={id}
        aria-label={ariaLabel}
        className="sr-only pointer-events-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/80 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-2xs ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedOption.dot}`} />}
          <span className="truncate">{selectedOption ? selectedOption.label : <span className="text-slate-400 italic">{placeholderText}</span>}</span>
        </span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          style={coords ? {
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            minWidth: `${coords.width}px`,
            zIndex: 9999,
          } : {
            position: 'fixed',
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto no-scrollbar"
        >
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-50/90 font-bold text-slate-900' 
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {opt.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.dot}`} />}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check size={13} className="text-brand-primary shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export const RoleSelect = ({
  value,
  onChange,
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  disabled?: boolean;
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const roleConfigs: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
    worker: {
      label: a.roleWorker,
      badgeClass: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 hover:bg-brand-primary/15',
      dotClass: 'bg-brand-primary',
    },
    employer: {
      label: a.roleEmployer,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      dotClass: 'bg-indigo-500',
    },
    admin: {
      label: 'Admin',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      dotClass: 'bg-purple-500',
    },
  };

  const currentRole = roleConfigs[value] || {
    label: value,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
    dotClass: 'bg-slate-400',
  };

  const roles = [
    { value: 'worker', ...roleConfigs.worker },
    { value: 'employer', ...roleConfigs.employer },
    { value: 'admin', ...roleConfigs.admin },
  ];

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 150;
    const dropdownWidth = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = openUpwards ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.left, (window.innerWidth || 1200) - dropdownWidth - 8));

    setCoords({ top, left });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const handleSelect = (newRole: string) => {
    onChange(newRole);
    if (selectRef.current) {
      selectRef.current.value = newRole;
      selectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      {/* Hidden real select for testing-library & accessibility */}
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-label="Foydalanuvchi roli"
        className="sr-only pointer-events-none"
      >
        <option value="worker">{a.roleWorker}</option>
        <option value="employer">{a.roleEmployer}</option>
        <option value="admin">Admin</option>
      </select>

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`font-bold text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${currentRole.badgeClass} ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentRole.dotClass}`} />
        <span>{currentRole.label}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ml-0.5 opacity-60 ${isOpen ? 'rotate-180 opacity-100' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          style={coords ? {
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 9999,
          } : {
            position: 'fixed',
            zIndex: 9999,
          }}
          className="w-44 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {roles.map((r) => {
            const isSelected = value === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(r.value);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-50/90 font-bold text-slate-900' 
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.dotClass}`} />
                  <span>{r.label}</span>
                </div>
                {isSelected && <Check size={13} className="text-brand-primary shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
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
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all w-[165px] justify-between cursor-pointer shadow-2xs"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon size={14} className="text-brand-primary shrink-0" />
          <span className="truncate">{value || "Sana tanlang"}</span>
        </span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 p-3.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 w-[280px] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer" type="button">
              <ChevronLeft size={16} />
            </button>
            <div className="font-extrabold text-slate-900 text-xs">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer" type="button">
              <ChevronRight size={16} />
            </button>
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
                  type="button"
                  onClick={() => handleDateSelect(d)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-brand-primary text-white font-extrabold shadow-sm shadow-brand-primary/30' 
                      : isToday
                      ? 'bg-brand-primary/10 text-brand-primary font-bold hover:bg-brand-primary/20'
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
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const language = useAuthStore(st => st.language);
  const t = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;

  const options = [
    { value: 'pending', label: t.statusPending || 'Kutilmoqda', color: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' },
    { value: 'open', label: t.statusOpen || 'Ochiq', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
    { value: 'confirmed', label: t.statusHired || 'Ishchi olindi', color: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20', dot: 'bg-brand-primary' },
    { value: 'in_progress', label: t.statusStarted || 'Ish boshlandi', color: 'bg-sky-50 text-sky-700 border-sky-200/80', dot: 'bg-sky-500' },
    { value: 'completed', label: t.statusFinished || 'Ish tugatildi', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', dot: 'bg-indigo-500' },
    { value: 'dispute', label: t.chipDispute || 'Nizo', color: 'bg-orange-50 text-orange-700 border-orange-200/80', dot: 'bg-orange-500' },
    { value: 'rejected', label: t.statusRejected || 'Rad etildi', color: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' },
    { value: 'cancelled', label: t.statusCancelledJob || 'Bekor qilindi', color: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' },
  ];

  const currentOption = options.find(o => o.value === value) || options[0];

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 290;
    const dropdownWidth = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = openUpwards ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.left, (window.innerWidth || 1200) - dropdownWidth - 8));

    setCoords({ top, left });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-2xs ${currentOption.color} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${currentOption.dot}`} />
        <span>{currentOption.label}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ml-0.5 opacity-60 ${isOpen ? 'rotate-180 opacity-100' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          style={coords ? {
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 9999,
          } : {
            position: 'fixed',
            zIndex: 9999,
          }}
          className="w-48 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto no-scrollbar"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                value === opt.value ? 'bg-slate-50/90 font-bold text-slate-900' : 'text-slate-600 font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                <span>{opt.label}</span>
              </div>
              {value === opt.value && <Check size={13} className="text-brand-primary" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
