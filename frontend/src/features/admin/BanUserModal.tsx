import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AlertTriangle, X, Ban } from 'lucide-react';
import { PortalSelect } from './AdminCustomControls';
import { useFocusTrap } from '../../components/common/useFocusTrap';

interface BanUserModalProps {
  userName: string;
  onClose: () => void;
  onConfirmBan: (reason: string, details: string) => void;
}

export const BanUserModal: React.FC<BanUserModalProps> = ({
  userName,
  onClose,
  onConfirmBan,
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [reason, setReason] = useState<string>('Qoidabuzarlik');
  const [details, setDetails] = useState<string>('');
  const trapRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmBan(reason, details);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Foydalanuvchini Bloklash"
        className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-red-600 font-extrabold text-sm">
            <AlertTriangle size={18} />
            <span>Foydalanuvchini Bloklash</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer border-0 bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <p className="text-slate-600 font-medium">
            Siz haqiqatan ham <strong className="text-slate-900">{userName}</strong> akkauntini bloklamoqchimisiz?
          </p>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Bloklash Sababi:</label>
            <PortalSelect
              value={reason}
              onChange={(val) => setReason(val)}
              containerClassName="w-full"
              className="w-full justify-between py-2"
              options={[
                { value: 'Qoidabuzarlik', label: 'Platforma qoidalarini buzish' },
                { value: 'Spam / Reklama', label: a.banSpam },
                { value: 'Firibgarlik', label: a.banFraud },
                { value: 'Haqorat / Noto\'g\'ri xulq', label: a.banAbuse },
                { value: 'Boshqa', label: 'Boshqa sabab' },
              ]}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">{a.banExtraNote}</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Bloklanish sababini batafsilroq yozing..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/20"
            >
              <Ban size={15} /> Bloklashni Tasdiqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
