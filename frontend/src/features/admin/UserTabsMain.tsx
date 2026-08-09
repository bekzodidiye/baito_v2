import React, { useState } from 'react';
import { AdminUser } from './types';
import { Phone, Mail, MapPin, EyeOff, Eye, Briefcase } from 'lucide-react';
import { UserDocumentsSection } from './UserDocumentsSection';

interface UserTabsMainProps {
  user: AdminUser;
  activeTab: number;
}

export const UserTabsMain: React.FC<UserTabsMainProps> = ({ user, activeTab }) => {
  const [showPassport, setShowPassport] = useState(false);

  if (activeTab === 1) {
    return (
      <div className="space-y-3 text-xs">
        <div className="grid sm:grid-cols-2 gap-3 text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><span>Tel: <strong className="text-slate-900">{user.phone || '+998 90 123 45 67'}</strong> (Tasdiqlangan)</span></div>
          <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /><span>Email: <strong className="text-slate-900">{user.email || 'user@baito.uz'}</strong></span></div>
          <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /><span>Viloyat: <strong className="text-slate-900">{user.region || 'Toshkent shahri'}</strong></span></div>
          <div className="flex items-center gap-2"><span>Qurilma: <strong className="text-slate-900">Android 14 (App v2.1)</strong></span></div>
          <div className="flex items-center gap-2"><span>Manba: <strong className="text-slate-900">Organik (Play Store)</strong></span></div>
          <div className="flex items-center gap-2"><span>Bank karta: <strong className="text-slate-900">8600 **** **** 4321</strong></span></div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Pasport / ID karta:</span>
            <strong className="text-sm font-mono text-slate-900">
              {showPassport ? 'AD 8291048' : 'AD ********'}
            </strong>
          </div>
          <button
            onClick={() => setShowPassport(!showPassport)}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
          >
            {showPassport ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showPassport ? 'Yashirish' : 'Ko\'rish'}</span>
          </button>
        </div>

        <UserDocumentsSection user={user} />
      </div>
    );
  }

  if (activeTab === 2) {
    return (
      <div className="space-y-3 text-xs">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="font-bold text-slate-900">Kasb & Mutaxassislik: <span className="text-blue-600 font-extrabold">{user.category || 'Qurilish Ustasi'}</span></div>
          <div>
            <span className="text-slate-500 font-bold block mb-1">Ko'nikmalar:</span>
            <div className="flex flex-wrap gap-1.5">
              {(user.skills || ['Santexnika', 'Elektrik', 'Gipsokarton', 'Plitka']).map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700">{s}</span>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 text-slate-700">
            <span className="font-bold">Tajriba:</span> 5+ yil | <span className="font-bold">Narx oralig'i:</span> 150,000 - 300,000 UZS / kun
          </div>
          {user.bio && <p className="p-3 bg-white rounded-xl border border-slate-200 font-medium text-slate-700">{user.bio}</p>}
        </div>
      </div>
    );
  }

  return null;
};
