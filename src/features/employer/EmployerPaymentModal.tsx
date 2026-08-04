import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { Wallet, ArrowDownRight, ArrowUpRight, History, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EmployerPaymentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { language } = useEmployer();
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState(false);

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setAmount('');
        onClose();
      }, 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-display font-black text-slate-800 text-base flex items-center gap-2">
              <Wallet size={18} className="text-brand-primary" />
              {language === 'uz' ? "To'lovlar" : language === 'ru' ? "Платежи" : "Payments"}
            </h3>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
            {/* Current Balance */}
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary-container rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-xl" />
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-1">
                  {language === 'uz' ? "Joriy balans" : language === 'ru' ? "Текущий баланс" : "Current balance"}
                </p>
                <h2 className="text-3xl font-black">450,000 UZS</h2>
              </div>
            </div>

            {/* Top Up Form */}
            <form onSubmit={handleTopup} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                {language === 'uz' ? "Hisobni to'ldirish" : language === 'ru' ? "Пополнить счет" : "Top up balance"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">UZS</span>
                <input 
                  type="number"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="100000"
                  className="w-full bg-white border border-slate-200 focus:border-brand-primary rounded-xl py-3 pl-14 pr-4 text-sm font-bold outline-none focus:ring-1 focus:ring-brand-primary transition-all"
                />
              </div>
              <button 
                type="submit"
                disabled={success}
                className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                {success ? (
                  <>
                    <Check size={16} className="stroke-[2.5]" />
                    <span>{language === 'uz' ? "Muvaffaqiyatli!" : language === 'ru' ? "Успешно!" : "Success!"}</span>
                  </>
                ) : (
                  <span>{language === 'uz' ? "To'lash" : language === 'ru' ? "Оплатить" : "Pay"}</span>
                )}
              </button>
            </form>

            {/* Recent Transactions */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {language === 'uz' ? "So'nggi amaliyotlar" : language === 'ru' ? "Последние операции" : "Recent transactions"}
              </h4>
              <div className="space-y-3">
                {[
                  { id: 1, type: 'out', amount: '120,000', desc: 'Ish haqi to\'lovi', date: 'Bugun, 14:30' },
                  { id: 2, type: 'in', amount: '500,000', desc: 'Hisobni to\'ldirish', date: 'Kecha, 10:15' },
                ].map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {tx.type === 'in' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{tx.desc}</p>
                        <p className="text-[10px] font-medium text-slate-400">{tx.date}</p>
                      </div>
                    </div>
                    <span className={`font-black text-xs ${tx.type === 'in' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {tx.type === 'in' ? '+' : '-'}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
