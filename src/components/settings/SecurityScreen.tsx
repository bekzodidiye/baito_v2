import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, ChevronRight, Search, Shield, Lock, ShieldCheck, Fingerprint, Smartphone, Monitor, Tablet, ShieldAlert, X, Check } from 'lucide-react';

export const SecurityScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [passData, setPassData] = useState({ current: '', newPass: '', confirm: '' });
  const [passSuccess, setPassSuccess] = useState(false);

  const [activeSessions, setActiveSessions] = useState([
    { id: 'dev-1', type: 'phone', name: 'iPhone 14 Pro', location: "Toshkent, O'zbekiston • Hozir faol", current: true },
    { id: 'dev-2', type: 'pc', name: 'Windows PC • Chrome', location: '2 soat oldin • Samarkand', current: false },
    { id: 'dev-3', type: 'tablet', name: 'iPad Air', location: 'Kecha, 18:42 • Toshkent', current: false },
  ]);

  const handleLogoutSession = (id: string) => {
    setActiveSessions(activeSessions.filter(s => s.id !== id));
    window.dispatchEvent(new CustomEvent("global-toast", { detail: "Qurilmadan chiqildi" }));
  };

  const handleLogoutAllOther = () => {
    setActiveSessions(activeSessions.filter(s => s.current));
    window.dispatchEvent(new CustomEvent("global-toast", { detail: "Barcha boshqa qurilmalardan chiqildi!" }));
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passData.current || !passData.newPass) return;
    if (passData.newPass !== passData.confirm) {
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "Yangi parollar mos kelmadi" }));
      return;
    }
    setPassSuccess(true);
    setTimeout(() => {
      setShowPasswordModal(false);
      setPassSuccess(false);
      setPassData({ current: '', newPass: '', confirm: '' });
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "Parol muvaffaqiyatli o'zgartirildi" }));
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-background text-brand-text">
      {/* Top Navigation Bar */}
      <header className="md:hidden sticky top-0 w-full bg-brand-surface z-20 flex justify-between items-center px-5 py-4 border-b border-brand-outline-variant shadow-2xs">
        <button 
          onClick={() => setCurrentScreen('sozlamalar')}
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
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
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
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${twoFactorEnabled ? 'bg-brand-primary' : 'bg-slate-300'}`}
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
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
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${biometricsEnabled ? 'bg-brand-primary' : 'bg-slate-300'}`}
                onClick={() => setBiometricsEnabled(!biometricsEnabled)}
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
            {activeSessions.map((session, idx) => (
              <React.Fragment key={session.id}>
                {idx > 0 && <div className="h-px bg-slate-100 ml-[72px]" />}
                <div className="flex items-center p-4">
                  <div className="w-10 h-10 bg-brand-surface-low rounded-xl flex items-center justify-center mr-4 shrink-0">
                    {session.type === 'phone' ? <Smartphone className="text-slate-600" size={20} /> : session.type === 'pc' ? <Monitor className="text-slate-600" size={20} /> : <Tablet className="text-slate-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-brand-text">{session.name}</h3>
                    <p className="text-[13px] text-brand-text-variant">{session.location}</p>
                  </div>
                  {session.current ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  ) : (
                    <button onClick={() => handleLogoutSession(session.id)} className="text-red-600 text-[13px] font-bold hover:underline cursor-pointer">Chiqish</button>
                  )}
                </div>
              </React.Fragment>
            ))}
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
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Parolni O'zgartirish</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Joriy Parol</label>
                <input
                  type="password"
                  required
                  value={passData.current}
                  onChange={(e) => setPassData({ ...passData, current: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Yangi Parol</label>
                <input
                  type="password"
                  required
                  value={passData.newPass}
                  onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Yangi Parolni Tasdiqlang</label>
                <input
                  type="password"
                  required
                  value={passData.confirm}
                  onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer">Bekor qilish</button>
                <button type="submit" className="px-4 py-2 bg-brand-primary text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer">
                  {passSuccess ? <Check size={14} /> : null}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

