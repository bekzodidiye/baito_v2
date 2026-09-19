import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { apiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { Settings, DollarSign, Building2, Phone, MapPin, Edit3, LogOut, ShieldCheck, HelpCircle } from 'lucide-react';
import { EmployerProfileInfo } from './EmployerProfileInfo';
import { motion } from 'motion/react';
import { EmployerPageHeader } from './EmployerPageHeader';
import { showToast } from '../../utils/toast';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { EmployerEditProfileModal } from './EmployerEditProfileModal';

export const EmployerProfile: React.FC = () => {
  const { language, balance } = useEmployer();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { userProfile, logout, setUserProfile } = useApp();

  // The fallback used to be 'Korzinka.uz' — a real retail brand, shown to any
  // employer who had not set a name yet.
  const companyName = userProfile?.firstName
    || (language === 'uz' ? 'Kompaniya' : language === 'ru' ? 'Компания' : 'Company');
  const isVerified = !!userProfile?.isVerified;
  const about = (userProfile?.aboutMe || '').trim();
  const region = (userProfile?.region || '').trim();

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-24 md:pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? 'Profil' : language === 'ru' ? 'Профиль' : "Profile"}
        description={language === 'uz' ? "Kompaniya ma'lumotlari va sozlamalarni boshqarish" : language === 'ru' ? "Управление данными компании и настройками" : "Manage company details and settings"}
        language={language}
        showPostButton={false}
      />

      {/* Two columns on a wide screen, the way the worker profile is laid
          out. Identity and account controls on the left, the data and the
          things you act on to the right. Below lg it stacks, which is what
          the single column was already doing. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <div className="lg:col-span-5 flex flex-col gap-5 w-full">
          {/* Profile Header */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative"
          >
            <div className="absolute top-4 right-4">
              {/* This used to be a window.prompt() that edited the company name and
                  nothing else - no address, no description, no way to correct a
                  phone number. The form below it already existed; it just had
                  nothing to open it. */}
              <button
                onClick={() => setIsEditModalOpen(true)} 
                className="p-2 text-slate-400 hover:text-brand-primary bg-slate-50 hover:bg-brand-primary/10 rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                title="Tahrirlash"
              >
                <Edit3 size={16} />
              </button>
            </div>

            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-primary-container text-white flex items-center justify-center text-3xl font-display font-black shadow-md border-4 border-white shrink-0">
              {companyName.charAt(0)}
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left mt-2 sm:mt-0">
              <h2 className="text-xl font-display font-black text-slate-800">{companyName}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                {isVerified ? (
                  <>
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                      {language === 'uz' ? 'Tasdiqlangan kompaniya' : language === 'ru' ? 'Проверенная компания' : "Verified Company"}
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} className="text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {language === 'uz' ? 'Tasdiqlanmagan' : language === 'ru' ? 'Не проверено' : 'Not verified'}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500 mt-3 max-w-sm">
                {/* This was a fixed sentence claiming every employer led a retail
                    network, regardless of what they actually do. */}
                {about || (language === 'uz'
                  ? "Kompaniya haqida ma'lumot qo'shilmagan."
                  : language === 'ru'
                    ? 'Описание компании не добавлено.'
                    : 'No company description yet.')}
              </p>
            </div>
          </motion.div>

          {/* Toggle Role Widget */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-slate-900 text-white rounded-2xl p-4.5 border border-slate-800 shadow-sm flex flex-col gap-2.5 shrink-0"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-brand-primary tracking-widest">
                  {language === 'uz' ? "FAOLIYAT TURI" : language === 'ru' ? "РЕЖИМ АККАУНТА" : "ACCOUNT MODE"}
                </p>
                <h3 className="font-display font-extrabold text-[11px] mt-0.5 text-slate-200 leading-snug">
                  {language === 'uz' ? "Ish beruvchi rejimi faol. Xodim rejimiga o'tish:" : language === 'ru' ? "Режим работодателя активен. Перейти в режим работника:" : "Employer mode is active. Switch to worker mode:"}
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                if (userProfile) {
                  setUserProfile({ ...userProfile, selectedRole: 'worker' });
                  (
                    language === 'uz' ? "Tizimga Xodim sifatida kirdingiz" : language === 'ru' ? "Вы вошли как Работник" : "You logged in as Worker"
                  );
                  setCurrentScreen('jobs');
                }
              }}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl font-display font-black text-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 shadow-sm"
            >
              {language === 'uz' ? "Xodim rejimiga o'tish" : language === 'ru' ? "Режим работника" : "Worker Mode"}
            </button>
          </motion.section>

          {/* Support and Logout */}
          <div className="flex flex-col gap-3 mt-2">
            <motion.button onClick={() => setCurrentScreen("help")}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="w-full bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 font-bold text-xs"
            >
              <HelpCircle size={16} className="stroke-[2.5]" />
              <span>{language === 'uz' ? "Qo'llab-quvvatlash xizmati" : language === 'ru' ? "Служба поддержки" : "Support service"}</span>
            </motion.button>

            <motion.button 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              onClick={() => logout()}
              className="w-full bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center justify-center gap-2 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 font-bold text-xs"
            >
              <LogOut size={16} className="stroke-[2.5]" />
              <span>{language === 'uz' ? "Tizimdan chiqish" : language === 'ru' ? "Выйти из системы" : "Log out"}</span>
            </motion.button>
          </div>

        </div>

        <div className="lg:col-span-7 flex flex-col gap-5 w-full">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button onClick={() => setCurrentScreen('payments')} 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col items-center sm:flex-row sm:justify-between gap-4 hover:shadow-md hover:border-brand-primary/20 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <DollarSign size={24} className="stroke-[2.5]" />
              </div>
              <div className="text-center sm:text-right flex-1">
                <h3 className="font-display font-black text-sm text-slate-800">
                  {Number(balance).toLocaleString()} UZS
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  {language === 'uz' ? "Hisobim" : language === 'ru' ? "Мой счет" : "My Account"}
                </p>
              </div>
            </motion.button>

            <motion.button onClick={() => setCurrentScreen("settings")}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col items-center sm:flex-row sm:justify-between gap-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Settings size={24} className="stroke-[2.5]" />
              </div>
              <div className="text-center sm:text-right flex-1">
                <h3 className="font-display font-black text-sm text-slate-800">
                  {language === 'uz' ? "Sozlamalar" : language === 'ru' ? "Настройки" : "Settings"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  {language === 'uz' ? "Tizim sozlamalari" : language === 'ru' ? "Настройки системы" : "System settings"}
                </p>
              </div>
            </motion.button>
          </div>

          {/* Info List */}
          <EmployerProfileInfo
            companyName={companyName}
            phone={userProfile?.phone || '+998 ** *** ** **'}
            region={region}
            language={language}
          />

        </div>
      </div>

      <EmployerEditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        language={language}
        currentName={companyName}
        currentPhone={userProfile?.phone || ''}
        currentAbout={about}
        currentRegion={region}
        onSave={async (fields) => {
          if (!userProfile) return;
          // aboutMe and region are the names this app uses; the API takes bio
          // and region. Same mapping useProfileScreen already applies for
          // workers. The request is awaited rather than fire-and-forget so a
          // failure reaches the form, which reports it instead of showing a
          // success toast over a change that did not save.
          await apiClient('/users/me', {
            method: 'PUT',
            body: JSON.stringify({
              name: fields.name,
              phone: fields.phone,
              bio: fields.about,
              region: fields.region,
            }),
          });
          setUserProfile({
            ...userProfile,
            firstName: fields.name,
            phone: fields.phone,
            aboutMe: fields.about,
            region: fields.region,
          });
        }}
      />

    </div>
  );
};
