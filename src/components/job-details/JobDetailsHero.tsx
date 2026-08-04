import React from 'react';
import { Clock } from 'lucide-react';
import { Job } from '../../types';
import { getJobHeroImage } from '../../utils/jobDetailHelpers';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';

interface JobDetailsHeroProps {
  selectedJob: Job;
}

export const JobDetailsHero: React.FC<JobDetailsHeroProps> = ({ selectedJob }) => {
  const { language } = useApp();
  const t = translations[language];

  const heroImage = getJobHeroImage(selectedJob);
  const durationVal = selectedJob.durationLabel || (language === 'uz' ? "12 soat" : language === 'ru' ? "12 часов" : "12 hours");

  return (
    <section className="relative w-full h-48 sm:h-56 md:h-60 overflow-hidden shrink-0 bg-slate-100">
      <img 
        className="w-full h-full object-cover" 
        src={heroImage} 
        alt={selectedJob.title} 
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&auto=format&fit=crop&q=80') {
            target.src = 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&auto=format&fit=crop&q=80';
          }
        }}
      />
      <div className="absolute top-4 left-4 bg-rose-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
        <Clock size={16} className="stroke-[2.5]" />
        <span className="text-xs font-bold tracking-tight">
          {t.timeLeft ? t.timeLeft.replace('{duration}', durationVal) : `${durationVal} qoldi`}
        </span>
      </div>
    </section>
  );
};
