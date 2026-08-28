import React, { useState } from 'react';
import { AdminUser } from './types';
import { Phone, Mail, MapPin, EyeOff, Eye, MonitorSmartphone, Target, CreditCard, Sparkles } from 'lucide-react';
import { UserDocumentsSection } from './UserDocumentsSection';

interface UserTabsMainProps {
  user: AdminUser;
  activeTab: number;
}

export const UserTabsMain: React.FC<UserTabsMainProps> = ({ user, activeTab }) => {
  const [showPassport, setShowPassport] = useState(false);

  if (activeTab === 1) {
    return (
      <div className="space-y-4">
        {/* Personal Info Grid */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Phone size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Telefon raqam</span>
              <div className="text-[13px] font-black text-slate-900">{user.phone || '+998 90 123 45 67'}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Email manzil</span>
              <div className="text-[13px] font-bold text-slate-900">{user.email || 'Kiritilmagan'}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Viloyat</span>
              <div className="text-[13px] font-bold text-slate-900">{user.region || 'Kiritilmagan'}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
              <MonitorSmartphone size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Qurilma</span>
              <div className="text-[13px] font-bold text-slate-900">{(!user.sourceApp || user.sourceApp === 'Web') ? 'Web (Brauzer)' : 'Mobil qurilma'}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
              <Target size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Manba</span>
              <div className="text-[13px] font-bold text-slate-900">{(!user.sourceApp || user.sourceApp === 'Web') ? 'Veb sayt' : user.sourceApp}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Bank karta</span>
              <div className="text-[13px] font-bold text-slate-900 font-mono">{user.bankCardMask || 'Kiritilmagan'}</div>
            </div>
          </div>
        </div>

        {/* Company Name (Employer only) */}
        {user.role === 'employer' && (
          <div className="p-5 bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50">
            <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-1">Kompaniya Nomi:</span>
            <strong className="text-[15px] font-black text-slate-900">{user.companyName || 'Kiritilmagan'}</strong>
          </div>
        )}

        <div className="p-5 bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-1">Pasport / ID karta seriyasi:</span>
            <strong className="text-[15px] font-black text-slate-900 font-mono tracking-widest">
              {showPassport ? (user.passportSeries || 'Kiritilmagan') : (user.passportSeries ? user.passportSeries.substring(0,2) + ' ********' : 'Kiritilmagan')}
            </strong>
          </div>
          <button
            onClick={() => setShowPassport(!showPassport)}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-slate-600 flex items-center gap-2 cursor-pointer transition-colors border border-slate-200"
          >
            {showPassport ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="text-xs">{showPassport ? 'Yashirish' : 'Ko\'rish'}</span>
          </button>
        </div>

        {/* Passport images */}
        <UserDocumentsSection user={user} />
      </div>
    );
  }

  if (activeTab === 2) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 p-5 space-y-5">
          <div>
            <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-1">Kasb & Mutaxassislik</span>
            <div className="text-[15px] font-black text-brand-primary">{user.category || 'Qurilish Ustasi'}</div>
          </div>
          
          <div>
            <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-2">Ko'nikmalar</span>
            {(() => {
              let skillsList: string[] = [];
              if (Array.isArray(user.skills)) {
                skillsList = user.skills;
              } else if (typeof user.skills === 'string') {
                try {
                  const parsed = JSON.parse(user.skills);
                  skillsList = Array.isArray(parsed) ? parsed : [user.skills];
                } catch {
                  skillsList = user.skills.split(',').map((s) => s.trim()).filter(Boolean);
                }
              }

              if (skillsList.length === 0) {
                return <div className="text-sm text-slate-500 font-medium">Kiritilmagan</div>;
              }

              return (
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50/50 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <Sparkles size={12} className="text-blue-500" />
                      {String(s)}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
          
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-1">Tugatilgan ishlar</span>
              <div className="text-[13px] font-bold text-slate-900">{user.completedJobsCount || 0} ta</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-1">Reyting</span>
              <div className="text-[13px] font-bold text-slate-900">⭐ {Number(user.rating || 0).toFixed(1)}</div>
            </div>
          </div>
          
          {user.bio && (
            <div className="pt-4 border-t border-slate-100">
              <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-2">O'zi haqida</span>
              <p className="p-4 bg-slate-50 rounded-2xl text-[13px] leading-relaxed text-slate-700 font-medium">
                {user.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
