import React from 'react';
import { User, Briefcase, MapPin, Wrench } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

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
    <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-3xs flex flex-col gap-4 shrink-0 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-bl-[100px] z-0 pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-1 relative z-10">
        <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center">
          <User size={14} className="text-brand-primary stroke-[2.5]" />
        </div>
        <h3 className="text-sm font-black text-slate-800 tracking-tight">
          {language === 'uz' ? "Batafsil ma'lumot" : language === 'ru' ? 'Подробная информация' : "Detailed info"}
        </h3>
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          {profession && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/80 flex flex-col gap-1.5 hover:bg-slate-100/50 transition-colors">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Briefcase size={12} className="stroke-[2.5]" />
                <p className="text-[9px] font-extrabold uppercase tracking-widest">{language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Profession'}</p>
              </div>
              <p className="text-[13px] font-bold text-slate-800 leading-snug">{profession}</p>
            </div>
          )}

          {region && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/80 flex flex-col gap-1.5 hover:bg-slate-100/50 transition-colors">
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin size={12} className="stroke-[2.5]" />
                <p className="text-[9px] font-extrabold uppercase tracking-widest">{language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Region'}</p>
              </div>
              <p className="text-[13px] font-bold text-slate-800 leading-snug">{region}</p>
            </div>
          )}
        </div>

        {aboutMe && (
          <div className="flex flex-col gap-2 mt-1">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{language === 'uz' ? "O'zim haqimda" : language === 'ru' ? 'О себе' : 'About Me'}</h4>
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium bg-brand-surface-low/30 p-3.5 rounded-xl border border-brand-primary/5">{aboutMe}</p>
          </div>
        )}

        {skills && skills.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{language === 'uz' ? "Ko'nikmalar" : language === 'ru' ? 'Навыки' : 'Skills'}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, index) => (
                <span key={index} className="px-3 py-1.5 bg-brand-primary/5 text-brand-primary text-[11px] font-bold rounded-lg border border-brand-primary/10 transition-colors hover:bg-brand-primary/10">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
