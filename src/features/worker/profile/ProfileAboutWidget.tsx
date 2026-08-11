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
    <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col gap-3.5 shrink-0">
      <div className="flex items-center gap-2 mb-1">
        <User size={16} className="text-brand-primary" />
        <h3 className="text-xs font-black text-slate-800">
          {language === 'uz' ? "Batafsil ma'lumot" : language === 'ru' ? 'Подробная информация' : "Detailed info"}
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {profession && (
          <div className="flex items-start gap-2.5">
            <Briefcase size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Profession'}</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{profession}</p>
            </div>
          </div>
        )}

        {region && (
          <div className="flex items-start gap-2.5">
            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Region'}</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{region}</p>
            </div>
          </div>
        )}

        {aboutMe && (
          <div className="flex flex-col gap-1.5 mt-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'uz' ? "O'zim haqimda" : language === 'ru' ? 'О себе' : 'About Me'}</p>
            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">{aboutMe}</p>
          </div>
        )}

        {skills && skills.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-1.5">
              <Wrench size={12} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'uz' ? "Ko'nikmalar" : language === 'ru' ? 'Навыки' : 'Skills'}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {skills.map((skill, index) => (
                <span key={index} className="px-2.5 py-1 bg-brand-surface-low text-brand-primary text-[10px] font-bold rounded-lg border border-brand-primary/10">
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
