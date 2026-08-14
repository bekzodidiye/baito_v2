import React from 'react';
import { ClipboardList } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';

interface JobDetailsTasksProps {
  tasks: string[];
}

export const JobDetailsTasks: React.FC<JobDetailsTasksProps> = ({ tasks }) => {
  const { language } = useApp();
  const t = translations[language];

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={20} className="text-brand-primary" />
        <h3 className="text-lg font-bold text-brand-primary tracking-tight">
          {t.jobTasks || "Ish vazifalari"}
        </h3>
      </div>
      <div className="space-y-3">
        {tasks.map((task, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 transition-all hover:bg-slate-100/80 cursor-default"
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {idx + 1}
            </div>
            <p className="text-slate-800 text-sm font-medium leading-tight">{task}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
