import { Orb, type OrbLook } from './thinking-orbs';

export type LoadingOrbPreset = 'working' | 'gyro' | 'spiral' | 'surge' | 'rings' | 'lighthouse';
export type LoadingOrbSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface LoadingOrbProps {
  /**
   * Animation preset.
   * - 'working': (Default) Active working state with cascading Saturn-style ring of light.
   * - 'gyro': 3D gyroscopic twisting sphere with counter-rotating poles.
   * - 'spiral': Mesmerizing 8-arm galaxy spiral, rich & hypnotic.
   * - 'surge': High-energy spin surge with elastic rebound.
   * - 'rings': Saturn-style cascading ring of light.
   * - 'lighthouse': Sweeping radar beam search effect.
   */
  variant?: LoadingOrbPreset;
  /**
   * Preset sizes:
   * - 'xs': 18px (inline chips, small button icons)
   * - 'sm': 24px (standard buttons, infinite scroll)
   * - 'md': 32px (default - modals, cards, standard spinners)
   * - 'lg': 40px (page suspense, screen headers)
   * - 'xl': 48px (featured showcases)
   * Or specify a custom numeric pixel size.
   */
  size?: LoadingOrbSize;
  /** Optional status text shown below the orb */
  label?: string;
  /** Optional secondary helper text */
  sublabel?: string;
  /** Render centered in a full-screen viewport */
  fullScreen?: boolean;
  /** Render inside a sleek elevated card */
  card?: boolean;
  /** Custom container class */
  className?: string;
  /** Color class for the orb SVG (default: text-brand-primary dark:text-blue-400) */
  colorClassName?: string;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 18,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
};

function getLook(variant: LoadingOrbPreset): OrbLook {
  switch (variant) {
    case 'gyro':
      return { state: 'working', variant: 'gyro' };
    case 'surge':
      return { state: 'retrying', variant: 'surge' };
    case 'spiral':
      return { state: 'background', variant: 'spiral' };
    case 'lighthouse':
      return { state: 'searching', variant: 'lighthouse' };
    case 'working':
    case 'rings':
    default:
      return { state: 'working' };
  }
}

export const LoadingOrb: React.FC<LoadingOrbProps> = ({
  variant = 'working',
  size = 'md',
  label,
  sublabel,
  fullScreen = false,
  card = false,
  className = '',
  colorClassName = 'text-brand-primary dark:text-blue-400',
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 32;
  const look = getLook(variant);

  const orbNode = (
    <Orb
      {...look}
      size={pixelSize}
      className={`${colorClassName} relative z-10 shrink-0`}
    />
  );

  // If no labels, and not card/fullscreen, render compact inline-flex
  if (!label && !sublabel && !fullScreen && !card) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {orbNode}
      </div>
    );
  }

  const content = (
    <div className={`flex flex-col items-center justify-center gap-2.5 text-center ${className}`}>
      {orbNode}
      {(label || sublabel) && (
        <div className="flex flex-col items-center gap-0.5 max-w-xs animate-in fade-in duration-200">
          {label && (
            <p className="text-xs font-normal text-slate-400 dark:text-slate-500 tracking-normal select-none">
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 dark:bg-slate-950/60 backdrop-blur-sm p-4">
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-2xl p-6 max-w-xs w-full flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  if (card) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800/80 shadow-md rounded-xl p-5 flex flex-col items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
