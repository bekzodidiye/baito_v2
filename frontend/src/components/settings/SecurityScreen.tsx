import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, ChevronRight, Search, Shield, Lock, ShieldCheck, Fingerprint, Smartphone, Monitor, Tablet, ShieldAlert, Loader2 } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { fetchActiveSessionsApi, logoutSessionApi, logoutAllOtherSessionsApi, changePasswordApi, updateUserProfileApi } from '../../api/queries';
import { useAuthStore } from '../../store/useAuthStore';
export const SecurityScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { userProfile, setUserProfile } = useApp();
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userProfile?.two_factor_enabled ?? false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(userProfile?.biometrics_enabled ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [passData, setPassData] = useState({ current: '', newPass: '', confirm: '' });
  const [passSuccess, setPassSuccess] = useState(false);

  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const sessions = await fetchActiveSessionsApi();
      setActiveSessions(sessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleLogoutSession = async (id: string) => {
    try {
      await logoutSessionApi(id);
      setActiveSessions(activeSessions.filter(s => s.id !== id));
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "Qurilmadan chiqildi" }));
    } catch (error) {
      console.error("Failed to logout session:", error);
    }
  };

  const handleLogoutAllOther = async () => {
    try {
      const res = await logoutAllOtherSessionsApi();
      if (res.success) {
        // Reload sessions to get the remaining one
        await loadSessions();
        window.dispatchEvent(new CustomEvent("global-toast", { detail: "Barcha boshqa qurilmalardan chiqildi!" }));
      }
    } catch (error) {
      console.error("Failed to logout all other sessions:", error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passData.current || !passData.newPass) return;
    if (passData.newPass !== passData.confirm) {
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "Yangi parollar mos kelmadi" }));
      return;
    }
    
    try {
      await changePasswordApi({ current_password: passData.current, new_password: passData.newPass });
      setPassSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassSuccess(false);
        setPassData({ current: '', newPass: '', confirm: '' });
        window.dispatchEvent(new CustomEvent("global-toast", { detail: "Parol muvaffaqiyatli o'zgartirildi" }));
      }, 1000);
    } catch (error: any) {
      console.error("Failed to change password:", error);
      window.dispatchEvent(new CustomEvent("global-toast", { detail: error.message || "Xatolik yuz berdi" }));
    }
  };

  const handleToggleSetting = async (key: 'two_factor_enabled' | 'biometrics_enabled', value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    setIsUpdating(true);
    try {
      await updateUserProfileApi({ [key]: value });
      if (userProfile) {
        setUserProfile({ ...userProfile, [key]: value });
      }
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
      setter(!value); // Revert on failure
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "Saqlashda xatolik yuz berdi" }));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-background text-brand-text">
      {/* Top Navigation Bar */}
      <header className="md:hidden sticky top-0 w-full bg-brand-surface z-20 flex justify-between items-center px-5 py-4 border-b border-brand-outline-variant shadow-2xs">
        <button 
          onClick={() => setCurrentScreen('settings')}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-brand-surface-low transition-colors active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="text-brand-primary" />
        </button>
        <h1 className="text-[20px] font-semibold text-brand-primary">Xavfsizlik</h1>
        <button onClick={() => setShowSearch(!showSearch)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-brand-surface-low transition-colors active:scale-95 cursor-pointer">
          <Search className="text-brand-primary" />
        </button>
      </header>

      {showSearch && (
        <div className="pt-4 px-5 max-w-4xl mx-auto w-full">
          <input
            type="text"
            placeholder="Xavfsizlik bo'limlaridan izlash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          />
        </div>
      )}

      <main className="md:pt-8 flex-1 overflow-y-auto pt-6 pb-12 px-5 max-w-4xl mx-auto w-full">
        {/* Brand Illustration */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-brand-primary-container/5 rounded-2xl flex items-center justify-center mb-3">
            <ShieldCheck size={42} className="text-brand-primary z-10" />
          </div>
          <p className="text-[13px] text-brand-text-variant text-center max-w-xs">
            Hisobingizni xavfsiz saqlash va kirishlarni boshqarish
          </p>
        </div>

        {/* Security Main Settings */}
        <div className="mb-6">
          <h2 className="text-[12px] uppercase tracking-wider text-brand-text-variant mb-3 px-2 font-bold">Asosiy himoya</h2>
          <div className="bg-brand-surface-lowest rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            
            <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center p-4 hover:bg-brand-surface-low transition-colors active:scale-95 cursor-pointer">
              <div className="w-10 h-10 bg-brand-primary-container/10 rounded-xl flex items-center justify-center mr-4 shrink-0">
                <Lock className="text-brand-primary" size={20} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-[15px] font-semibold text-brand-text">Parolni o'zgartirish</h3>
                <p className="text-[13px] text-brand-text-variant">Xavfsizlikni oshirish uchun yangilang</p>
              </div>
              <ChevronRight className="text-brand-outline-variant" size={20} />
            </button>
            <div className="h-px bg-brand-outline-variant/30 ml-[72px]"></div>

            {/* 2FA */}
            <div className="flex items-center p-4">
              <div className="w-10 h-10 bg-brand-primary-container/10 rounded-xl flex items-center justify-center mr-4 shrink-0">
                <ShieldCheck className="text-brand-primary" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-brand-text">Ikki bosqichli autentifikatsiya</h3>
                <p className="text-[13px] text-brand-text-variant">{twoFactorEnabled ? 'Yoqilgan' : 'O\'chirilgan'}</p>
              </div>
              <button 
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${twoFactorEnabled ? 'bg-brand-primary' : 'bg-slate-300'} ${isUpdating ? 'opacity-50' : ''}`}
                onClick={() => handleToggleSetting('two_factor_enabled', !twoFactorEnabled, setTwoFactorEnabled)}
                disabled={isUpdating}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${twoFactorEnabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="h-px bg-brand-outline-variant/30 ml-[72px]"></div>

            {/* Biometrics */}
            <div className="flex items-center p-4">
              <div className="w-10 h-10 bg-brand-primary-container/10 rounded-xl flex items-center justify-center mr-4 shrink-0">
                <Fingerprint className="text-brand-primary" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-brand-text">Biometrik kirish</h3>
                <p className="text-[13px] text-brand-text-variant">{biometricsEnabled ? 'Face ID / Barmoq izi' : 'O\'chirilgan'}</p>
              </div>
              <button 
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${biometricsEnabled ? 'bg-brand-primary' : 'bg-slate-300'} ${isUpdating ? 'opacity-50' : ''}`}
                onClick={() => handleToggleSetting('biometrics_enabled', !biometricsEnabled, setBiometricsEnabled)}
                disabled={isUpdating}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${biometricsEnabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3 px-2">
            <h2 className="text-[12px] uppercase tracking-wider text-brand-text-variant font-bold">Faol seanslar</h2>
            <span className="bg-brand-primary-container text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{activeSessions.length} TA QURILMA</span>
          </div>
          <div className="bg-brand-surface-lowest rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              {loadingSessions ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="animate-spin text-brand-primary" />
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="p-6 text-center text-brand-text-variant text-sm">
                  Hech qanday faol sessiya topilmadi.
                </div>
              ) : (
                activeSessions.map((session, index) => {
                  const isCurrent = index === 0; // The first one returned by order_by(last_active_at) is likely current, or we just highlight the most recent
                  // Basic mapping for icons based on device name
                  const deviceNameStr = (session.device_name || '').toLowerCase();
                  let Icon = Smartphone;
                  if (deviceNameStr.includes('pc') || deviceNameStr.includes('windows') || deviceNameStr.includes('mac') || deviceNameStr.includes('linux')) Icon = Monitor;
                  else if (deviceNameStr.includes('ipad') || deviceNameStr.includes('tablet')) Icon = Tablet;
                  
                  // Format last_active
                  const lastActiveDate = new Date(session.last_active_at);
                  const formattedTime = lastActiveDate.toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                  return (
                    <React.Fragment key={session.id}>
                      {index > 0 && <div className="h-px bg-slate-100 ml-[72px]" />}
                      <div className="p-4 flex items-center justify-between hover:bg-brand-surface-low transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-primary-container/10 flex items-center justify-center shrink-0 border border-brand-primary/10">
                            <Icon size={20} className="text-brand-primary" />
                          </div>
                          <div>
                            <p className="text-[15px] font-semibold text-brand-text flex items-center gap-2">
                              {session.device_name || 'Noma\'lum qurilma'}
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>}
                            </p>
                            <p className="text-[13px] text-brand-text-variant mt-0.5 font-medium flex items-center gap-1.5">
                              {isCurrent ? 'Hozir faol' : formattedTime} • {session.ip_address || 'Noma\'lum IP'}
                            </p>
                          </div>
                        </div>
                        
                        {!isCurrent && (
                          <button 
                            onClick={() => handleLogoutSession(session.id)}
                            className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            Chiqish
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
          </div>
        </div>

        {/* Logout All */}
        <div className="mb-10">
          <div className="bg-brand-primary-container text-white p-5 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-[16px] font-bold mb-1">Shubhali faollikni ko'rdingizmi?</h3>
              <p className="text-white/90 text-[12px] mb-3">Barcha boshqa qurilmalardan bitta tugma bilan chiqing.</p>
              <button onClick={handleLogoutAllOther} className="bg-white text-brand-primary px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-transform cursor-pointer">
                Barcha qurilmalardan chiqish
              </button>
            </div>
            <ShieldAlert className="absolute -bottom-6 -right-6 w-28 h-28 text-white/10 pointer-events-none" />
          </div>
        </div>
      </main>

      {/* Password Modal */}
      <ChangePasswordModal
        showPasswordModal={showPasswordModal}
        setShowPasswordModal={setShowPasswordModal}
        passData={passData}
        setPassData={setPassData}
        passSuccess={passSuccess}
        handleChangePassword={handleChangePassword}
      />
    </div>
  );
};
