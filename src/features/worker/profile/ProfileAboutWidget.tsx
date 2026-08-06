import React from 'react';
import { User, Briefcase, MapPin, AlignLeft, Sparkles } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { motion } from 'motion/react';

interface ProfileAboutWidgetProps {
  language: 'uz' | 'ru' | 'en';
}

export const ProfileAboutWidget: React.FC<ProfileAboutWidgetProps> = ({ language }) => {
  const { userProfile } = useApp();

  if (!userProfile) return null;

  const { aboutMe, profession, region, skills } = userProfile;
  const hasContent = aboutMe || profession || region || (skills && skills.length > 0);
  
  if (!hasContent) return null;

  return (
    <div className="bg-white rounded-[24px] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      
      {/* Top subtle gradient line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary/40 via-brand-secondary/40 to-brand-primary/40 opacity-50" />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-primary/10 to-brand-primary/5 flex items-center justify-center shadow-inner">
            <User size={18} className="text-brand-primary stroke-[2.5]" />
          </div>
          <h3 className="text-[17px] font-black text-slate-800 tracking-tight">
            {language === 'uz' ? "Batafsil ma'lumot" : language === 'ru' ? 'Подробная информация' : "Detailed info"}
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          
          {/* Profession Item */}
          {profession && (
            <div className="flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-slate-50/80 group/item border border-transparent hover:border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/item:scale-105 group-hover/item:rotate-3 group-hover/item:shadow-sm">
                <Briefcase size={20} className="text-indigo-500 stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Profession'}</span>
                <p className="text-[15px] font-extrabold text-slate-800">{profession}</p>
              </div>
            </div>
          )}

          {/* Region Item */}
          {region && (
            <div className="flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-slate-50/80 group/item border border-transparent hover:border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/item:scale-105 group-hover/item:-rotate-3 group-hover/item:shadow-sm">
                <MapPin size={20} className="text-emerald-500 stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Region'}</span>
                <p className="text-[15px] font-extrabold text-slate-800">{region}</p>
              </div>
            </div>
          )}

          {/* About Me */}
          {aboutMe && (
            <div className="p-3.5 rounded-2xl transition-all duration-300 hover:bg-slate-50/80 border border-transparent hover:border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <AlignLeft size={14} className="text-amber-500 stroke-[2.5]" />
                </div>
                <h4 className="text-[12px] font-bold text-slate-600 uppercase tracking-widest">{language === 'uz' ? "O'zim haqimda" : language === 'ru' ? 'О себе' : 'About Me'}</h4>
              </div>
              <p className="text-[14px] text-slate-600 leading-relaxed font-medium bg-white p-4 rounded-2xl border border-slate-100 shadow-sm italic">
                "{aboutMe}"
              </p>
            </div>
          )}

          {/* Skills */}
          {skills && skills.length > 0 && (
            <div className="p-3.5 rounded-2xl transition-all duration-300 hover:bg-slate-50/80 border border-transparent hover:border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-cyan-500 stroke-[2.5]" />
                </div>
                <h4 className="text-[12px] font-bold text-slate-600 uppercase tracking-widest">{language === 'uz' ? "Ko'nikmalar" : language === 'ru' ? 'Навыки' : 'Skills'}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span 
                    key={index} 
                    className="px-4 py-2 bg-gradient-to-b from-white to-slate-50 text-brand-primary text-[13px] font-extrabold rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md hover:-translate-y-0.5 cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
