import React from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { ShieldAlert, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

interface AdminJobsAutoDeleteBannerProps {
  autoDeleteEnabled: boolean;
  onToggleAutoDelete: () => void;
  onRunCleanup: () => void;
}

export const AdminJobsAutoDeleteBanner: React.FC<AdminJobsAutoDeleteBannerProps> = ({
  autoDeleteEnabled,
  onToggleAutoDelete,
  onRunCleanup,
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  return (
    <div className="bg-white text-slate-900 p-4 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-600">
          <ShieldAlert size={20} />
        </div>
        <div>
          <div className="text-xs font-bold flex items-center gap-2">
            <span className="text-slate-900 font-black">{a.autoDeleteBannerTitle}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                autoDeleteEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {autoDeleteEnabled ? 'FAOL' : 'O\'CHIRILGAN'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {a.autoDeleteBannerDesc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleAutoDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          {autoDeleteEnabled ? (
            <ToggleRight size={20} className="text-emerald-600" />
          ) : (
            <ToggleLeft size={20} className="text-slate-400" />
          )}
          <span>{a.autoDeleteButton}</span>
        </button>
        <button
          onClick={onRunCleanup}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-xs active:scale-95"
        >
          <RefreshCw size={13} />
          <span>Tozalashni Ishga Tushirish</span>
        </button>
      </div>
    </div>
  );
};
