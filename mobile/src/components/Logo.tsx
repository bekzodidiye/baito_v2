import React from 'react';

interface LogoProps {
  className?: string;
  sizeClassName?: string; // e.g. "text-xl", "text-lg", "text-2xl"
}

export const Logo: React.FC<LogoProps> = ({ className = '', sizeClassName = 'text-xl' }) => {
  const colorClass = className.includes('text-') ? '' : 'text-brand-primary';
  return (
    <div className={`flex items-center gap-0.5 select-none font-display ${colorClass} ${sizeClassName} ${className}`}>
      {/* Icon Frame - Squircle with thick border */}
      <div 
        className="flex items-center justify-center border-[2.5px] border-current rounded-[28%] w-[1.55em] h-[1.55em] shrink-0"
        style={{ borderRadius: '28%' }}
      >
        <span className="font-extrabold text-[1.05em] leading-none text-center select-none tracking-normal">
          B
        </span>
      </div>
      {/* "aito" Text - Same font size and weight as the B inside */}
      <span className="font-extrabold tracking-tight leading-none">
        aito
      </span>
    </div>
  );
};
