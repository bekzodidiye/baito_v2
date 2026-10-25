import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  dotBg?: string;
  icon?: React.ReactNode;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  'aria-label': string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  variant?: 'default' | 'pill' | 'subtle';
  minWidth?: number;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
  'aria-label': ariaLabel,
  className = '',
  triggerClassName = '',
  disabled = false,
  align = 'left',
  variant = 'default',
  minWidth,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hiddenSelectRef = useRef<HTMLSelectElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(260, options.length * 38 + 16);
    const resolvedMinWidth = minWidth ?? (variant === 'pill' ? 180 : Math.max(rect.width, 180));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = openUpwards ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
    let left = align === 'right' 
      ? rect.right - resolvedMinWidth 
      : rect.left;

    // Viewport bounding clamp
    left = Math.max(8, Math.min(left, (window.innerWidth || 1200) - resolvedMinWidth - 8));

    setCoords({
      top,
      left,
      width: resolvedMinWidth,
    });
  }, [align, minWidth, options.length, variant]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    if (hiddenSelectRef.current) {
      hiddenSelectRef.current.value = val;
      hiddenSelectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Determine trigger styles based on variant
  const getTriggerStyles = () => {
    if (variant === 'pill') {
      return `px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
        isOpen
          ? 'bg-brand-primary/10 text-brand-primary'
          : 'text-slate-800 hover:text-brand-primary hover:bg-slate-100/80'
      }`;
    }

    if (variant === 'subtle') {
      return `px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer flex items-center justify-between border border-transparent hover:border-slate-200`;
    }

    // Default style (Sidebar and general inputs)
    return `w-full bg-white hover:bg-slate-50/70 border ${
      isOpen ? 'border-brand-primary ring-2 ring-brand-primary/15' : 'border-slate-200/90 hover:border-slate-300'
    } text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all cursor-pointer flex items-center justify-between`;
  };

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Hidden real select for testing-library & form accessibility */}
      <select
        ref={hiddenSelectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-label={ariaLabel}
        className="sr-only pointer-events-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Visual Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${getTriggerStyles()} ${triggerClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption?.dotBg && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotBg}`} aria-hidden="true" />
          )}
          {selectedOption?.icon}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder || ''}
          </span>
        </span>
        <ChevronDown
          size={variant === 'pill' ? 13 : 15}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-brand-primary' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Floating Popover via Portal */}
      {isOpen && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-1.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-60 overflow-y-auto no-scrollbar py-0.5 space-y-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-brand-primary/10 text-brand-primary font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      {option.dotBg && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${option.dotBg}`} aria-hidden="true" />
                      )}
                      {option.icon}
                      <span className="truncate">{option.label}</span>
                    </span>
                    {isSelected && (
                      <Check size={14} className="text-brand-primary shrink-0 ml-2" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
