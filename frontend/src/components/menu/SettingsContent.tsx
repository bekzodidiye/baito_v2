import React, { useState, useEffect, Suspense } from 'react';
import { translations } from '../../translations';
import { 
  Settings, Lock, HelpCircle, BookOpen, ShieldCheck, FileText, Headphones, 
  ChevronRight, Globe, Briefcase, MessageCircle, Bell, Info, Loader2 
} from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { updateUserProfileApi } from '../../api/queries';
import { useAuthStore } from "../../store/useAuthStore";
import { useUIStore } from "../../store/useUIStore";

const SecurityScreen = React.lazy(() => import('../settings/SecurityScreen').then(m => ({ default: m.SecurityScreen })));
const HelpScreen = React.lazy(() => import('../settings/HelpScreen').then(m => ({ default: m.HelpScreen })));
const FaqScreen = React.lazy(() => import('../settings/FaqScreen').then(m => ({ default: m.FaqScreen })));
const QollanmaScreen = React.lazy(() => import('../settings/QollanmaScreen').then(m => ({ default: m.QollanmaScreen })));
const PrivacyScreen = React.lazy(() => import('../settings/PrivacyScreen').then(m => ({ default: m.PrivacyScreen })));
const ShartlarScreen = React.lazy(() => import('../settings/ShartlarScreen').then(m => ({ default: m.ShartlarScreen })));
const SupportChatScreen = React.lazy(() => import('../settings/SupportChatScreen').then(m => ({ default: m.SupportChatScreen })));

interface SettingsContentProps {
  onClose?: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({ onClose }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
  const setLanguage = useAuthStore(s => s.setLanguage);
  const userProfile = useAuthStore(s => s.userProfile);
  const setUserProfile = useAuthStore(s => s.setUserProfile);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const t = translations[language];
  const isEmployer = userProfile?.selectedRole === 'employer';

  const activeSettingsTab = useUIStore(s => s.activeSettingsTab);
  const setActiveSettingsTab = useUIStore(s => s.setActiveSettingsTab);

  // Synchronize if user navigates via internal links inside the tabs
  useEffect(() => {
    const validTabs: Array<typeof activeSettingsTab> = ['settings', 'security', 'help', 'faq', 'guide', 'privacy', 'terms', 'support-chat'];
    if (validTabs.includes(currentScreen as any) && currentScreen !== activeSettingsTab) {
      setActiveSettingsTab(currentScreen as any);
    }
  }, [currentScreen, activeSettingsTab, setActiveSettingsTab]);

  const [newJobsNotifications, setNewJobsNotifications] = useState(userProfile?.notify_new_jobs ?? true);
  const [interviewNotifications, setInterviewNotifications] = useState(userProfile?.notify_interviews ?? true);
  const [generalNotifications, setGeneralNotifications] = useState(userProfile?.notify_general ?? true);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (key: 'notify_new_jobs' | 'notify_interviews' | 'notify_general', value: boolean, setter: (val: boolean) => void) => {
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
      setter(!value); // Revert on failure
    } finally {
      setIsUpdating(false);
    }
  };

  const subNavItems = [
    {
      section: language === 'uz' ? 'SOZLAMALAR' : language === 'ru' ? 'НАСТРОЙКИ' : 'SETTINGS',
      items: [
        {
          id: 'settings' as const,
          label: language === 'uz' ? 'Umumiy sozlamalar' : language === 'ru' ? 'Общие настройки' : 'General Settings',
          icon: Settings,
        },
        {
          id: 'security' as const,
          label: language === 'uz' ? 'Xavfsizlik & Kirish' : language === 'ru' ? 'Безопасность' : 'Security & Login',
          icon: Lock,
        },
      ],
    },
    {
      section: language === 'uz' ? 'YORDAM & SHARTLAR' : language === 'ru' ? 'ПОМОЩЬ И УСЛОВИЯ' : 'HELP & TERMS',
      items: [
        {
          id: 'help' as const,
          label: language === 'uz' ? 'Yordam markazi' : language === 'ru' ? 'Центр помощи' : 'Help Center',
          icon: HelpCircle,
        },
        {
          id: 'faq' as const,
          label: language === 'uz' ? "Ko'p beriladigan savollar" : language === 'ru' ? 'Частые вопросы' : 'FAQ',
          icon: HelpCircle,
        },
        {
          id: 'guide' as const,
          label: language === 'uz' ? "Foydalanish qo'llanmasi" : language === 'ru' ? 'Руководство' : 'User Guide',
          icon: BookOpen,
        },
        {
          id: 'privacy' as const,
          label: language === 'uz' ? 'Maxfiylik siyosati' : language === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy',
          icon: ShieldCheck,
        },
        {
          id: 'terms' as const,
          label: language === 'uz' ? 'Foydalanish shartlari' : language === 'ru' ? 'Условия использования' : 'Terms of Service',
          icon: FileText,
        },
        {
          id: 'support-chat' as const,
          label: language === 'uz' ? "Qo'llab-quvvatlash chati" : language === 'ru' ? 'Чат поддержки' : 'Support Chat',
          icon: Headphones,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-0 overflow-hidden">
      {/* Desktop Sub-Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-white border-r border-slate-100 p-5 font-sans overflow-y-auto">
        <div className="mb-6 px-2 space-y-1">
          <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
            {language === 'uz' ? 'Sozlamalar va Yordam' : language === 'ru' ? 'Настройки и Помощь' : 'Settings & Help'}
          </h2>
          <p className="text-[12px] text-slate-500 font-medium">
            {language === 'uz' ? 'Hisobingiz va ilovani moslashtiring' : language === 'ru' ? 'Настройте ваш аккаунт и приложение' : 'Customize your account and app'}
          </p>
        </div>

        <div className="space-y-6">
          {subNavItems.map((grp, idx) => (
            <div key={idx} className="space-y-1.5">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 px-3 block">
                {grp.section}
              </span>
              <div className="space-y-1">
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSettingsTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSettingsTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={17} className={`stroke-[2.2] ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight size={15} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-brand-surface">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center p-8">
              <Loader2 size={24} className="animate-spin text-brand-primary" />
            </div>
          }
        >
          {activeSettingsTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-brand-surface space-y-6">
              {/* Mobile-only Account Section */}
              <section className="md:hidden">
                <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">{t.settingsAccount}</h2>
                <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
                  <button 
                    type="button"
                    onClick={() => {
                      onClose?.();
                      setCurrentScreen('security');
                    }}
                    className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                        <Lock size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-brand-text">{t.security}</p>
                      </div>
                    </div>
                    <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
                  </button>
                </div>
              </section>

              {/* Preferences Section */}
              <section>
                <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">{t.settingsPreferences}</h2>
                <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
                  <div className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group relative cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                        <Globe size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-brand-text">{t.appLanguage}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-brand-text-variant font-medium">
                        {language === "uz" ? "O'zbek" : language === "ru" ? "Русский" : "English"}
                      </span>
                      <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
                    </div>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                      <option value="uz">O'zbek</option>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Notifications Section */}
              <section>
                <div className="flex items-center justify-between mb-3 px-2">
                  <h2 className="text-[12px] text-brand-primary uppercase tracking-wider font-bold">{t.notifications}</h2>
                  {isUpdating && <Loader2 size={16} className="animate-spin text-brand-primary" />}
                </div>
                <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
                  <button 
                    type="button"
                    className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100 cursor-pointer"
                    onClick={() => handleToggle('notify_new_jobs', !newJobsNotifications, setNewJobsNotifications)}
                    disabled={isUpdating}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                        <Briefcase size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-brand-text">{isEmployer ? (language === 'uz' ? 'Yangi arizalar' : language === 'ru' ? 'Новые отклики' : 'New applicants') : t.notifyNewJobs}</p>
                        <p className="text-[13px] text-brand-text-variant mt-0.5 font-medium">{isEmployer ? (language === 'uz' ? "E'loningizga tushgan arizalar haqida" : language === 'ru' ? 'О новых откликах на ваши вакансии' : 'About new applications for your jobs') : t.notifyNewJobsDesc}</p>
                      </div>
                    </div>
                    
                    <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${newJobsNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-xs ${newJobsNotifications ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </button>

                  <button 
                    type="button"
                    className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100 cursor-pointer"
                    onClick={() => handleToggle('notify_interviews', !interviewNotifications, setInterviewNotifications)}
                    disabled={isUpdating}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                        <MessageCircle size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-brand-text">{isEmployer ? (language === 'uz' ? 'Yangi xabarlar' : language === 'ru' ? 'Новые сообщения' : 'New messages') : t.notifyChat}</p>
                        <p className="text-[13px] text-brand-text-variant mt-0.5 font-medium">{isEmployer ? (language === 'uz' ? 'Nomzodlardan kelgan xabarlar haqida' : language === 'ru' ? 'О сообщениях от кандидатов' : 'About messages from candidates') : t.notifyOffers}</p>
                      </div>
                    </div>
                    
                    <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${interviewNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-xs ${interviewNotifications ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </button>

                  <button 
                    type="button"
                    className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group cursor-pointer"
                    onClick={() => handleToggle('notify_general', !generalNotifications, setGeneralNotifications)}
                    disabled={isUpdating}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                        <Bell size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-brand-text">{t.notifyGeneral}</p>
                        <p className="text-[13px] text-brand-text-variant mt-0.5 font-medium">{t.notifySystem}</p>
                      </div>
                    </div>
                    
                    <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${generalNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-xs ${generalNotifications ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </button>
                </div>
              </section>

              {/* About Section */}
              <section>
                <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">{t.settingsExtra}</h2>
                <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
                  <div className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                        <Info size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-brand-text">{t.settingsAbout}</p>
                      </div>
                    </div>
                    <span className="text-[14px] text-brand-text-variant font-medium">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}</span>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      onClose?.();
                      setCurrentScreen('help');
                    }}
                    className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group cursor-pointer md:hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                        <HelpCircle size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-brand-text">{t.settingsHelpCenter}</p>
                      </div>
                    </div>
                    <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeSettingsTab === 'security' && (
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
              <SecurityScreen />
            </div>
          )}

          {activeSettingsTab === 'help' && (
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
              <HelpScreen />
            </div>
          )}

          {activeSettingsTab === 'faq' && (
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
              <FaqScreen />
            </div>
          )}

          {activeSettingsTab === 'guide' && (
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
              <QollanmaScreen />
            </div>
          )}

          {activeSettingsTab === 'privacy' && (
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
              <PrivacyScreen />
            </div>
          )}

          {activeSettingsTab === 'terms' && (
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
              <ShartlarScreen />
            </div>
          )}

          {activeSettingsTab === 'support-chat' && (
            <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
              <SupportChatScreen />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};
