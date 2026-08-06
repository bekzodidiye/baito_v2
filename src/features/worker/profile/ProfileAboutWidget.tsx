import React from 'react';
import { Briefcase, MapPin, AlignLeft, Sparkles } from 'lucide-react';
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
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
      
      <h3 className="text-sm font-bold text-slate-800">
        {language === 'uz' ? "Batafsil ma'lumot" : language === 'ru' ? 'Подробная информация' : "Detailed info"}
      </h3>

      <div className="flex flex-col gap-3">
        
        {/* Profession & Region Compact Rows */}
        {(profession || region) && (
          <div className="flex flex-col gap-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            {profession && (
              <div className="flex items-start gap-2.5">
                <Briefcase size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-slate-400 leading-none mb-1">{language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Profession'}</span>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{profession}</span>
                </div>
              </div>
            )}

            {profession && region && <div className="h-px bg-slate-100 w-full" />}

            {region && (
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-slate-400 leading-none mb-1">{language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Region'}</span>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{region}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* About Me */}
        {aboutMe && (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <AlignLeft size={12} className="shrink-0" />
              <h4 className="text-[10px] font-semibold">{language === 'uz' ? "O'zim haqimda" : language === 'ru' ? 'О себе' : 'About Me'}</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              {aboutMe}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Sparkles size={12} className="shrink-0" />
              <h4 className="text-[10px] font-semibold">{language === 'uz' ? "Ko'nikmalar" : language === 'ru' ? 'Навыки' : 'Skills'}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, index) => (
                <span 
                  key={index} 
                  className="px-2.5 py-1 bg-white text-slate-600 text-[11px] font-medium rounded-lg border border-slate-200"
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
