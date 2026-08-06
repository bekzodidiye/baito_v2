import React from 'react';
import { Briefcase, MapPin } from 'lucide-react';
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
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col">
      
      <h3 className="text-[15px] font-bold text-slate-800 mb-2">
        {language === 'uz' ? "Batafsil ma'lumot" : language === 'ru' ? 'Подробная информация' : "Detailed info"}
      </h3>

      <div className="flex flex-col">
        
        {/* Profession Row */}
        {profession && (
          <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-full bg-brand-primary/[0.04] flex items-center justify-center shrink-0">
              <Briefcase size={14} className="text-brand-primary stroke-[2]" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">
                {language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Profession'}
              </span>
              <span className="text-[13px] font-semibold text-slate-700 leading-tight">{profession}</span>
            </div>
          </div>
        )}

        {/* Region Row */}
        {region && (
          <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-full bg-brand-primary/[0.04] flex items-center justify-center shrink-0">
              <MapPin size={14} className="text-brand-primary stroke-[2]" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">
                {language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Region'}
              </span>
              <span className="text-[13px] font-semibold text-slate-700 leading-tight">{region}</span>
            </div>
          </div>
        )}

        {/* About Me */}
        {aboutMe && (
          <div className="py-3 border-b border-slate-50 last:border-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-2 block">
              {language === 'uz' ? "O'zim haqimda" : language === 'ru' ? 'О себе' : 'About Me'}
            </span>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              {aboutMe}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="py-3 border-b border-slate-50 last:border-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-2.5 block">
              {language === 'uz' ? "Ko'nikmalar" : language === 'ru' ? 'Навыки' : 'Skills'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, index) => (
                <span 
                  key={index} 
                  className="px-2.5 py-1 bg-slate-50 text-slate-600 text-[11px] font-medium rounded-lg border border-slate-100/50"
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
