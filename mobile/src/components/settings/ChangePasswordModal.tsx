import React from 'react';
import { X, Check } from 'lucide-react';

interface ChangePasswordModalProps {
  showPasswordModal: boolean;
  setShowPasswordModal: (val: boolean) => void;
  passData: { current: string; newPass: string; confirm: string };
  setPassData: (data: { current: string; newPass: string; confirm: string }) => void;
  passSuccess: boolean;
  handleChangePassword: (e: React.FormEvent) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  showPasswordModal,
  setShowPasswordModal,
  passData,
  setPassData,
  passSuccess,
  handleChangePassword
}) => {
  if (!showPasswordModal) return null;

  return (
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Yangi Parol</label>
            <input
              type="password"
              required
              value={passData.newPass}
              onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Yangi Parolni Tasdiqlang</label>
            <input
              type="password"
              required
              value={passData.confirm}
              onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
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
  );
};
