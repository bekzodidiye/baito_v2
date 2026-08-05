import React from 'react';
import { Camera, MapPin, Briefcase, Star, Award, Edit2 } from 'lucide-react';

interface ProfileHeroProps {
  profileName: string;
  profileRole: string;
  profileImage: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rating: number;
  completedJobsCount: number;
  t: any;
  onEditClick: () => void;
  region?: string;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  profileName,
  profileRole,
  profileImage,
  fileInputRef,
  handlePhotoUpload,
  rating,
  completedJobsCount,
  t,
  onEditClick,
  region
}) => {
  return (
    <>
      {/* Profile Hero Section */}
      <section className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-3xs flex flex-col items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-brand-primary/5 via-brand-primary/10 to-brand-primary/5 z-0" />
        
        {/* Top Right Edit Button */}
        <button 
          onClick={onEditClick}
          className="absolute top-3.5 right-3.5 z-20 bg-white/90 hover:bg-white text-slate-700 hover:text-brand-primary px-3 py-1.5 rounded-full font-sans font-bold text-xs shadow-2xs border border-slate-200/80 flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-95"
          title={t.editProfile}
        >
          <Edit2 size={13} className="stroke-[2.2]" />
          <span>{t.editProfile}</span>
        </button>

        <div className="relative mt-4 z-10">
          <div className="w-28 h-28 rounded-full border-4 border-white overflow-hidden shadow-md bg-brand-surface-low flex items-center justify-center">
            <img 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              alt={profileName}
              src={profileImage}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80';
              }}
            />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 bg-brand-primary hover:bg-brand-primary/95 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-xs cursor-pointer active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <Camera size={14} className="stroke-[2.2]" />
          </button>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            onChange={handlePhotoUpload} 
            className="hidden" 
          />
        </div>

        <div className="text-center mt-4 z-10 w-full">
          <h2 className="font-display text-lg font-black text-slate-800 tracking-tight">{profileName}</h2>
          <p className="text-xs text-brand-primary font-bold mt-1 uppercase tracking-wider">{profileRole}</p>
          
          {region && (
            <div className="flex items-center justify-center gap-1.5 mt-2 text-slate-500 text-[11px] font-semibold">
              <MapPin size={12} className="text-slate-400" />
              <span>{region}</span>
            </div>
          )}
        </div>
      </section>

      {/* Completion & Reputation Stats */}
      <section className="bg-white rounded-xl p-4 flex justify-between items-center border border-slate-100 shadow-3xs shrink-0">
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="flex items-center gap-1 text-brand-primary">
            <Briefcase size={14} className="stroke-[2.2]" />
            <p className="font-display font-black text-slate-800 text-sm">{completedJobsCount}</p>
          </div>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{t.jobs}</p>
        </div>
        
        <div className="w-px h-8 bg-slate-100" />
        
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={14} className="fill-amber-500 stroke-[2]" />
            <p className="font-display font-black text-slate-800 text-sm">{rating.toFixed(1)}</p>
          </div>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{t.rating}</p>
        </div>

      </section>
    </>
  );
};
