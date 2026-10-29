import { Orb, type OrbLook } from './thinking-orbs';

export type LoadingOrbPreset = 'working' | 'gyro' | 'spiral' | 'surge' | 'rings' | 'lighthouse';
export type LoadingOrbSize = 'sm' | 'md' | 'lg' | 'xl' | number;

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
   * - 'sm': 24px (buttons, small badges, inline chips)
   * - 'md': 40px (modals, cards, dropdowns)
   * - 'lg': 60px (page suspense, sections)
   * - 'xl': 80px (full-page initial load, hero)
   * Or specify a custom numeric pixel size.
   */
  size?: LoadingOrbSize;
  /** Optional status text shown below the orb */
  label?: string;
  /** Optional secondary helper text */
  sublabel?: string;
  /** Render centered in a full-screen viewport */
  fullScreen?: boolean;
  /** Render inside a sleek glassmorphic elevated card */
  card?: boolean;
  /** Custom container class */
  className?: string;
  /** Color class for the orb SVG (default: text-brand-primary) */
  colorClassName?: string;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 24,
  md: 40,
  lg: 60,
  xl: 80,
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
  colorClassName = 'text-brand-primary dark:text-indigo-400',
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40;
  const look = getLook(variant);

  const orbNode = (
    <div className="relative flex items-center justify-center">
      {/* Ambient glowing radial aura for large/xl loaders */}
      {pixelSize >= 40 && (
        <div
          className="absolute rounded-full bg-brand-primary/10 dark:bg-indigo-500/20 blur-xl pointer-events-none"
          style={{
            width: pixelSize * 1.6,
            height: pixelSize * 1.6,
          }}
        />
      )}
      <Orb
        {...look}
        size={pixelSize}
        className={`${colorClassName} relative z-10 transition-transform duration-300`}
      />
    </div>
  );

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3.5 text-center ${className}`}>
      {orbNode}
      {(label || sublabel) && (
        <div className="flex flex-col items-center gap-1 max-w-xs animate-in fade-in duration-300">
          {label && (
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 dark:bg-slate-950/60 backdrop-blur-md p-4">
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl p-8 max-w-sm w-full flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  if (card) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800/80 shadow-lg rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
