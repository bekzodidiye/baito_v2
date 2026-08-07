import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const ToastContainer = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalToast = (e: any) => {
      setToastMessage(e.detail);
      setTimeout(() => setToastMessage(null), 3000);
    };
    window.addEventListener('global-toast', handleGlobalToast);
    return () => window.removeEventListener('global-toast', handleGlobalToast);
  }, []);

  const isToastSuccess = toastMessage
    ? toastMessage.toLowerCase().includes('muvaffaqiyatli') ||
      toastMessage.toLowerCase().includes('success') ||
      toastMessage.toLowerCase().includes('tasdiq') ||
      toastMessage.toLowerCase().includes('yuborildi') ||
      toastMessage.toLowerCase().includes('o\'qildi') ||
      toastMessage.toLowerCase().includes('yangilandi') ||
      toastMessage.toLowerCase().includes('kirdingiz')
    : false;

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          className={`fixed top-20 md:top-6 left-1/2 z-[99999] px-4 py-3 rounded-xl flex items-center gap-3 w-[90%] max-w-sm border ${
            isToastSuccess
              ? "bg-emerald-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] border-emerald-500/20"
              : "bg-slate-800 text-white shadow-[0_8px_30px_rgba(30,41,59,0.35)] border-slate-700/20"
          }`}
        >
          {isToastSuccess ? (
            <CheckCircle size={18} className="shrink-0 text-emerald-100" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-slate-300" />
          )}
          <p className="text-[13px] font-semibold leading-tight">{toastMessage}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
