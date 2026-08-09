import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';

interface JobDetailsRequirementsProps {
  requirements: string[];
  warning: string;
}

export const JobDetailsRequirements: React.FC<JobDetailsRequirementsProps> = ({
  requirements,
  warning,
}) => {
  const { language } = useApp();
  const t = translations[language];

  return (
    <div className="space-y-6 mt-6 mb-8">
      {/* Requirements */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={20} className="text-emerald-600" />
          <h3 className="text-lg font-bold text-brand-primary tracking-tight">
            {t.requirements || "Talablar va shartlar"}
          </h3>
        </div>
        <ul className="space-y-2.5 pl-1">
          {requirements.map((req, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2 shrink-0"></span>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">{req}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Warning Notice */}
      <div className="bg-amber-100/80 text-amber-950 p-4 rounded-xl border border-amber-300/60 flex gap-3 items-start">
        <AlertTriangle size={20} className="text-amber-700 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-0.5">
            {t.importantNote || "Muhim eslatma"}
          </p>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            {warning}
          </p>
        </div>
      </div>
    </div>
  );
};
