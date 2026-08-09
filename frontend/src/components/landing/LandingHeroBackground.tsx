import React from 'react';

export const LandingHeroBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Background photo - authentic active shift workforce atmosphere */}
      <img 
        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80" 
        alt="Baito active daily shift work atmosphere" 
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover opacity-10 filter brightness-105 contrast-105 object-center mix-blend-multiply transition-all duration-500"
      />
      {/* Soft brand gradient overlays for seamless light theme blending */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/90 via-white/80 to-sky-50/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-50/90" />
      
      {/* Subtle geometric dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.25]" 
        style={{
          backgroundImage: `radial-gradient(#2563EB 0.75px, transparent 0.75px)`,
          backgroundSize: `24px 24px`
        }}
      />

      {/* Ambient glow halos */}
      <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-5 w-[400px] h-[400px] bg-sky-200/40 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};
