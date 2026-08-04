import React from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowRight, Rocket, Building2, UserCheck } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface LandingStatsProps {
  onSelectRole?: (role: 'worker' | 'employer') => void;
}

export const LandingStats: React.FC<LandingStatsProps> = ({ onSelectRole }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  

  const handleStart = (role: 'worker' | 'employer') => {
    if (onSelectRole) {
      onSelectRole(role);
    } else {
      setCurrentScreen('login');
    }
  };

  return (
    <section className="py-12 lg:py-16 bg-slate-950 text-white font-sans relative overflow-hidden min-h-[calc(100vh-4.5rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-black">
          <Rocket size={14} className="text-amber-400" />
          <span>Bugunoq Boshlang</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black max-w-3xl mx-auto leading-tight">
          G'oyangiz va mehnatingizni qadrlaydigan eng tezkor xizmat
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => handleStart('worker')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]"
          >
            <UserCheck size={16} />
            <span>Ishchi sifatida boshlash</span>
          </button>

          <button
            onClick={() => handleStart('employer')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Building2 size={16} />
            <span>Ish beruvchi bo'lish</span>
          </button>
        </div>
      </div>
    </section>
  );
};
