import React from 'react';
import { Bell, Globe, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MODAL_TRANSLATIONS } from './MenuTranslations';

export const SettingsContent: React.FC = () => {
  const { language, setLanguage, setCurrentScreen } = useApp();
  const t = MODAL_TRANSLATIONS[language];

  return (
    <div className="space-y-5">
      {/* Notifications */}
      <div className="space-y-3">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Bell size={12} />
          <span>{t.notifications}</span>
        </h5>
        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/55 transition-colors rounded-xl border border-slate-100 cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-slate-700">{t.notifyNewJobs}</span>
              <span className="text-[10px] text-slate-400">{t.notifyNewJobsDesc}</span>
            </div>
            <input type="checkbox" defaultChecked className="accent-brand-primary w-4 h-4 rounded" />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/55 transition-colors rounded-xl border border-slate-100 cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-slate-700">{t.notifyAppStatus}</span>
              <span className="text-[10px] text-slate-400">{t.notifyAppStatusDesc}</span>
            </div>
            <input type="checkbox" defaultChecked className="accent-brand-primary w-4 h-4 rounded" />
          </label>
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3 pt-2">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Globe size={12} />
          <span>{t.appLanguage}</span>
        </h5>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setLanguage('uz')}
            className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              language === 'uz' ? 'bg-brand-surface-low border-brand-primary text-brand-primary' : language === 'ru' ? 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100' : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
            }`}
          >
            O'zbekcha
          </button>
          <button
            onClick={() => setLanguage('ru')}
            className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              language === 'ru'
                ? 'bg-brand-surface-low border-brand-primary text-brand-primary'
                : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Русский
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              language === 'en'
                ? 'bg-brand-surface-low border-brand-primary text-brand-primary'
                : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-3 pt-2">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Shield size={12} />
          <span>{t.security}</span>
        </h5>
        <button onClick={() => setCurrentScreen('xavfsizlik')} className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-100 transition-colors text-left flex items-center justify-between cursor-pointer">
          <span>{t.changePassword}</span>
          <span className="text-[10px] text-slate-400">{t.unchanged}</span>
        </button>
      </div>
    </div>
  );
};
