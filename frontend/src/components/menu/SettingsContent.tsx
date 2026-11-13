import React, { useState } from 'react';
import { Bell, Globe, Lock, ChevronRight, Loader2, Info } from 'lucide-react';
import { translations } from '../../translations';
import { MODAL_TRANSLATIONS } from './MenuTranslations';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAuthStore } from "../../store/useAuthStore";
import { updateUserProfileApi } from '../../api/queries';

interface SettingsContentProps {
  onClose?: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({ onClose }) => {
  const { setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
  const setLanguage = useAuthStore(s => s.setLanguage);
  const userProfile = useAuthStore(s => s.userProfile);
  const setUserProfile = useAuthStore(s => s.setUserProfile);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const t = translations[language];
  const mt = MODAL_TRANSLATIONS[language];
  const isEmployer = userProfile?.selectedRole === 'employer';

  const [newJobsNotifications, setNewJobsNotifications] = useState(userProfile?.notify_new_jobs ?? true);
  const [interviewNotifications, setInterviewNotifications] = useState(userProfile?.notify_interviews ?? true);
  const [generalNotifications, setGeneralNotifications] = useState(userProfile?.notify_general ?? true);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (
    key: 'notify_new_jobs' | 'notify_interviews' | 'notify_general',
    value: boolean,
    setter: (val: boolean) => void
  ) => {
    setter(value);
    if (!isLoggedIn) return;
    setIsUpdating(true);
    try {
      await updateUserProfileApi({ [key]: value });
      if (userProfile) {
        setUserProfile({ ...userProfile, [key]: value });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setter(!value);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Section */}
      <div className="space-y-3">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Globe size={13} className="text-brand-primary" />
          <span>{mt.appLanguage}</span>
        </h5>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setLanguage('uz')}
            className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              language === 'uz'
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm shadow-brand-primary/20'
                : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            O'zbekcha
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ru')}
            className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              language === 'ru'
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm shadow-brand-primary/20'
                : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Русский
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              language === 'en'
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm shadow-brand-primary/20'
                : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="space-y-3 pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pt-2">
            <Bell size={13} className="text-brand-primary" />
            <span>{mt.notifications}</span>
          </h5>
          {isUpdating && (
            <Loader2 size={13} className="animate-spin text-brand-primary mt-2" />
          )}
        </div>

        <div className="space-y-2">
          {/* Job / Application notifications */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleToggle('notify_new_jobs', !newJobsNotifications, setNewJobsNotifications)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-100 text-left cursor-pointer group"
          >
            <div className="flex flex-col gap-0.5 pr-2">
              <span className="text-xs font-bold text-slate-700">
                {isEmployer
                  ? (language === 'uz' ? 'Yangi arizalar' : language === 'ru' ? 'Новые отклики' : 'New applicants')
                  : mt.notifyNewJobs}
              </span>
              <span className="text-[10px] text-slate-400">
                {isEmployer
                  ? (language === 'uz' ? "E'loningizga tushgan arizalar haqida" : language === 'ru' ? 'О новых откликах на ваши вакансии' : 'About new applications for your jobs')
                  : mt.notifyNewJobsDesc}
              </span>
            </div>
            <div className={`w-10 h-5.5 rounded-full relative transition-colors duration-200 shrink-0 ${newJobsNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-200 shadow-xs ${newJobsNotifications ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </button>

          {/* Messages / Chat notifications */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleToggle('notify_interviews', !interviewNotifications, setInterviewNotifications)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-100 text-left cursor-pointer group"
          >
            <div className="flex flex-col gap-0.5 pr-2">
              <span className="text-xs font-bold text-slate-700">
                {isEmployer
                  ? (language === 'uz' ? 'Yangi xabarlar' : language === 'ru' ? 'Новые сообщения' : 'New messages')
                  : (language === 'uz' ? 'Xabarlar bildirishnomasi' : language === 'ru' ? 'Уведомления сообщений' : 'Message notifications')}
              </span>
              <span className="text-[10px] text-slate-400">
                {isEmployer
                  ? (language === 'uz' ? 'Nomzodlardan kelgan xabarlar haqida' : language === 'ru' ? 'О сообщениях от кандидатов' : 'About messages from candidates')
                  : (language === 'uz' ? 'Yangi kelgan xabarlar haqida bildirishnoma' : language === 'ru' ? 'О новых входящих сообщениях' : 'About incoming messages')}
              </span>
            </div>
            <div className={`w-10 h-5.5 rounded-full relative transition-colors duration-200 shrink-0 ${interviewNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-200 shadow-xs ${interviewNotifications ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </button>

          {/* General / System notifications */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleToggle('notify_general', !generalNotifications, setGeneralNotifications)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-100 text-left cursor-pointer group"
          >
            <div className="flex flex-col gap-0.5 pr-2">
              <span className="text-xs font-bold text-slate-700">
                {t.notifyGeneral}
              </span>
              <span className="text-[10px] text-slate-400">
                {t.notifySystem}
              </span>
            </div>
            <div className={`w-10 h-5.5 rounded-full relative transition-colors duration-200 shrink-0 ${generalNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-200 shadow-xs ${generalNotifications ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Security Section (Change Password) */}
      <div className="space-y-3 pt-1 border-t border-slate-100">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pt-2">
          <Lock size={13} className="text-brand-primary" />
          <span>{mt.security}</span>
        </h5>
        <button
          type="button"
          onClick={() => {
            onClose?.();
            setCurrentScreen('security');
          }}
          className="w-full p-3 bg-slate-50 hover:bg-slate-100/80 text-slate-700 font-bold text-xs rounded-xl border border-slate-100 transition-colors text-left flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
              <Lock size={14} />
            </div>
            <span className="text-xs font-bold text-slate-800">{mt.changePassword}</span>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
        </button>
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <Info size={12} className="text-slate-400" />
          Baito Platform
        </span>
        <span>v{__APP_VERSION__}</span>
      </div>
    </div>
  );
};
