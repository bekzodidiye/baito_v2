import React from 'react';
import { User, Briefcase, MapPin, AlignLeft, Sparkles } from 'lucide-react';
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
    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.04)] flex flex-col gap-6 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-primary/[0.03] to-transparent rounded-bl-full z-0 pointer-events-none" />
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-8 h-8 rounded-full bg-brand-primary/[0.08] flex items-center justify-center shrink-0">
          <User size={16} className="text-brand-primary stroke-[2.5]" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
          {language === 'uz' ? "Batafsil ma'lumot" : language === 'ru' ? 'Подробная информация' : "Detailed info"}
        </h3>
      </div>

      <div className="flex flex-col gap-5 relative z-10">
        
        {/* Profession & Region Grid */}
        {(profession || region) && (
          <div className="grid grid-cols-2 gap-3">
            {profession && (
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col gap-2 transition-all hover:bg-slate-50 hover:shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Briefcase size={14} className="stroke-[2.5]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Profession'}</span>
                </div>
                <p className="text-[13px] font-bold text-slate-800 leading-tight">{profession}</p>
              </div>
            )}

            {region && (
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col gap-2 transition-all hover:bg-slate-50 hover:shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin size={14} className="stroke-[2.5]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Region'}</span>
                </div>
                <p className="text-[13px] font-bold text-slate-800 leading-tight">{region}</p>
              </div>
            )}
          </div>
        )}

        {/* About Me */}
        {aboutMe && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-500">
              <AlignLeft size={14} className="stroke-[2.5]" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider">{language === 'uz' ? "O'zim haqimda" : language === 'ru' ? 'О себе' : 'About Me'}</h4>
            </div>
            <div className="bg-gradient-to-br from-brand-primary/[0.02] to-transparent p-4 rounded-2xl border border-brand-primary/[0.05]">
              <p className="text-[14px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{aboutMe}</p>
            </div>
          </div>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Sparkles size={14} className="stroke-[2.5]" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider">{language === 'uz' ? "Ko'nikmalar" : language === 'ru' ? 'Навыки' : 'Skills'}</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span 
                  key={index} 
                  className="px-3.5 py-1.5 bg-white text-slate-700 text-[12px] font-bold rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-brand-primary/30 hover:text-brand-primary"
                >
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
