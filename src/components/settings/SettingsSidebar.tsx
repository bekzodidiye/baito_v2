import React from 'react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { 
  Settings, 
  Lock, 
  HelpCircle, 
  HelpCircle as FaqIcon, 
  BookOpen, 
  FileText, 
  Headphones, 
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

export const SettingsSidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen, language } = useApp();
  const t = translations[language];

  const navItems = [
    {
      section: language === 'uz' ? 'SOZLAMALAR' : language === 'ru' ? 'НАСТРОЙКИ' : 'SETTINGS',
      items: [
        {
          id: 'sozlamalar',
          label: language === 'uz' ? 'Umumiy sozlamalar' : language === 'ru' ? 'Общие настройки' : 'General Settings',
          icon: Settings,
        },
        {
          id: 'xavfsizlik',
          label: language === 'uz' ? 'Xavfsizlik & Kirish' : language === 'ru' ? 'Безопасность' : 'Security & Login',
          icon: Lock,
        },
      ],
    },
    {
      section: language === 'uz' ? "YORDAM & SHARTLAR" : language === 'ru' ? 'ПОМОЩЬ И УСЛОВИЯ' : 'HELP & TERMS',
      items: [
        {
          id: 'yordam',
          label: language === 'uz' ? 'Yordam markazi' : language === 'ru' ? 'Центр помощи' : 'Help Center',
          icon: HelpCircle,
        },
        {
          id: 'faq',
          label: language === 'uz' ? 'Ko\'p beriladigan savollar' : language === 'ru' ? 'Частые вопросы' : 'FAQ',
          icon: FaqIcon,
        },
        {
          id: 'qollanma',
          label: language === 'uz' ? 'Foydalanish qo\'llanmasi' : language === 'ru' ? 'Руководство' : 'User Guide',
          icon: BookOpen,
        },
        {
          id: 'shartlar',
          label: language === 'uz' ? 'Foydalanish shartlari' : language === 'ru' ? 'Условия использования' : 'Terms of Service',
          icon: FileText,
        },
        {
          id: 'support-chat',
          label: language === 'uz' ? 'Qo\'llab-quvvatlash chati' : language === 'ru' ? 'Чат поддержки' : 'Support Chat',
          icon: Headphones,
        },
      ],
    },
  ];

  return (
    <aside id="settings-internal-sidebar" className="hidden md:flex flex-col w-72 shrink-0 bg-white border-r border-slate-200/80 p-5 font-sans overflow-y-auto h-full">
      <div className="mb-6 px-2 space-y-3">
        <button
          onClick={() => setCurrentScreen('xarita')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-600 hover:text-brand-primary hover:bg-slate-100/80 font-semibold text-xs transition-colors cursor-pointer border border-slate-200/80"
        >
          <ArrowLeft size={14} />
          <span>{language === 'uz' ? 'Asosiy menyu' : language === 'ru' ? 'Главное меню' : 'Main Menu'}</span>
        </button>

        <div>
          <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
            {language === 'uz' ? 'Sozlamalar va Yordam' : language === 'ru' ? 'Настройки и Помощь' : 'Settings & Help'}
          </h2>
          <p className="text-[12px] text-slate-500 font-medium mt-0.5">
            {language === 'uz' ? 'Hisobingiz va ilovani moslashtiring' : language === 'ru' ? 'Настройте ваш аккаунт и приложение' : 'Customize your account and app'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {navItems.map((grp, idx) => (
          <div key={idx} className="space-y-1.5">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 px-3 block">
              {grp.section}
            </span>
            <div className="space-y-1">
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentScreen(item.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer group ${
                      isActive 
                        ? 'bg-brand-primary text-white shadow-xs' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100 text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
