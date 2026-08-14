import React from 'react';
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
  return (
    <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded-xl text-amber-400">
          <ShieldAlert size={20} />
        </div>
        <div>
          <div className="text-xs font-bold flex items-center gap-2">
            <span>E'lonlarni Avto-O'chirish va Moderatsiya Rejimi</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                autoDeleteEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {autoDeleteEnabled ? 'FAOL' : 'O\'CHIRILGAN'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Eskirgan yoki rad etilgan e'lonlar belgilangan muddatdan so'ng avtomatik tozalanadi
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleAutoDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          {autoDeleteEnabled ? (
            <ToggleRight size={20} className="text-emerald-400" />
          ) : (
            <ToggleLeft size={20} className="text-slate-400" />
          )}
          <span>Avto-O'chirish Tugmasi</span>
        </button>
        <button
          onClick={onRunCleanup}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl transition cursor-pointer shadow-xs"
        >
          <RefreshCw size={13} />
          <span>Tozalashni Ishga Tushirish</span>
        </button>
      </div>
    </div>
  );
};
