import React from 'react';
import { motion } from 'motion/react';
import { X, FileText, CheckCircle2 } from 'lucide-react';

interface TxReceiptModalProps {
  tx: any;
  onClose: () => void;
  language: string;
  formatMoney: (amount: number | string) => string;
  txLabel: (tx: any) => string;
}

export const TxReceiptModal: React.FC<TxReceiptModalProps> = ({ tx, onClose, language, formatMoney, txLabel }) => {
  const isIncoming = tx.type === 'deposit' || tx.type === 'payout' || (tx.type !== 'withdraw' && tx.workerId);

  const t = (uz: string, ru: string, en: string) => language === 'uz' ? uz : language === 'ru' ? ru : en;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
      />
      
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-[32px] p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-primary" />
            {t('To\\'lov cheki', 'Чек об оплате', 'Payment receipt')}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col gap-4">
            <div className="text-center mb-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h4 className="font-bold text-2xl text-slate-800">
                    {formatMoney(tx.amount)} {t("so'm", "сум", "UZS")}
                </h4>
                <p className="text-emerald-600 font-medium text-sm mt-1">
                    {tx.status === 'pending' ? t('Kutilmoqda', 'Ожидается', 'Pending') : t('Muvaffaqiyatli', 'Успешно', 'Successful')}
                </p>
            </div>
            
            <div className="h-px bg-slate-200 w-full" />
            
            <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t('To\\'lov turi', 'Тип оплаты', 'Payment type')}</span>
                <span className="font-medium text-slate-800">{txLabel(tx)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t('Sana va vaqt', 'Дата и время', 'Date and time')}</span>
                <span className="font-medium text-slate-800">
                    {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t('Tranzaksiya ID', 'ID транзакции', 'Transaction ID')}</span>
                <span className="font-medium text-slate-800 font-mono text-xs">{tx.id}</span>
            </div>
            
            {tx.jobTitle && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{t('Vazifa', 'Задание', 'Task')}</span>
                    <span className="font-medium text-slate-800">{tx.jobTitle}</span>
                </div>
            )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 py-4 rounded-xl font-bold bg-brand-primary text-white"
        >
          {t('Yopish', 'Закрыть', 'Close')}
        </button>
      </motion.div>
    </>
  );
};
