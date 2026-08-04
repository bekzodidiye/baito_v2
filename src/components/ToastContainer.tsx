import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const ToastContainer = () => {
  const [toastState, setToastState] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  useEffect(() => {
    const handleGlobalToast = (e: any) => {
      // Handle both old string format and new object format
      if (typeof e.detail === 'string') {
        setToastState({ message: e.detail, type: 'info' });
      } else {
        setToastState(e.detail);
      }
      setTimeout(() => setToastState(null), 3000);
    };
    window.addEventListener('global-toast', handleGlobalToast);
    return () => window.removeEventListener('global-toast', handleGlobalToast);
  }, []);

  return (
    <AnimatePresence>
      {toastState && (
        <motion.div
          role="alert"
          aria-live={toastState.type === 'error' ? 'assertive' : 'polite'}
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          className={`fixed top-20 md:top-6 left-1/2 z-[99999] px-4 py-3 rounded-xl flex items-center gap-3 w-[90%] max-w-sm border ${
            toastState.type === 'success'
              ? "bg-emerald-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] border-emerald-500/20"
              : toastState.type === 'error'
              ? "bg-rose-600 text-white shadow-[0_8px_30px_rgba(225,29,72,0.3)] border-rose-500/20"
              : "bg-slate-800 text-white shadow-[0_8px_30px_rgba(30,41,59,0.35)] border-slate-700/20"
          }`}
        >
          {toastState.type === 'success' ? (
            <CheckCircle size={18} className="shrink-0 text-emerald-100" />
          ) : toastState.type === 'error' ? (
            <AlertCircle size={18} className="shrink-0 text-rose-100" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-slate-300" />
          )}
          <p className="text-[13px] font-semibold leading-tight">{toastState.message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
