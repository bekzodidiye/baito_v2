import React from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileDialogsProps {
  activeDialog: 'withdraw' | 'edit' | 'none';
  setActiveDialog: (dialog: 'withdraw' | 'edit' | 'none') => void;
  t: any;
  language: string;
  withdrawAmount: string;
  setWithdrawAmount: (amount: string) => void;
  withdrawSuccess: boolean;
  handleWithdrawSubmit: (e: React.FormEvent) => void;
  editedFirstName: string;
  setEditedFirstName: (name: string) => void;
  editedLastName: string;
  setEditedLastName: (name: string) => void;
  editedPhone: string;
  setEditedPhone: (phone: string) => void;
  handleSaveProfileSubmit: (e: React.FormEvent) => void;
}

export const ProfileDialogs: React.FC<ProfileDialogsProps> = ({
  activeDialog,
  setActiveDialog,
  t,
  language,
  withdrawAmount,
  setWithdrawAmount,
  withdrawSuccess,
  handleWithdrawSubmit,
  editedFirstName,
  setEditedFirstName,
  editedLastName,
  setEditedLastName,
  editedPhone,
  setEditedPhone,
  handleSaveProfileSubmit,
}) => {
  return (
    <AnimatePresence>
      {activeDialog !== 'none' && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveDialog('none')}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Content box */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 p-6 flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-display font-black text-slate-800 text-sm">
                {activeDialog === 'withdraw' ? t.walletTitle : t.editProfile}
              </h3>
              <button 
                onClick={() => setActiveDialog('none')}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {activeDialog === 'withdraw' && (
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                  {t.withdrawPrompt}
                </p>
                
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                    UZS
                  </span>
                  <input 
                    type="number"
                    required
                    placeholder="Masalan: 100000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-3 pl-14 pr-4 text-xs font-bold outline-none focus:ring-1 focus:ring-brand-primary transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button 
                    type="button"
                    onClick={() => setActiveDialog('none')}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    disabled={withdrawSuccess}
                    className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {withdrawSuccess ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : "Send"}</span>
                        <Check size={14} className="stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeDialog === 'edit' && (
              <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Ism</label>
                  <input 
                    type="text"
                    required
                    value={editedFirstName}
                    onChange={(e) => setEditedFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold outline-none text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Familiya</label>
                  <input 
                    type="text"
                    required
                    value={editedLastName}
                    onChange={(e) => setEditedLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold outline-none text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Telefon</label>
                  <input 
                    type="tel"
                    required
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold outline-none text-slate-800"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button 
                    type="button"
                    onClick={() => setActiveDialog('none')}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{t.saveProfile}</span>
                    <Check size={14} className="stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
