import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, isDestructive = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onCancel(); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-[#1A1A40] mb-2">{title}</h3>
            <p className="text-slate-600 mb-6 font-medium text-[15px]">{message}</p>
            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onCancel(); }} 
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onConfirm(); onCancel(); }} 
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors cursor-pointer ${
                  isDestructive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brand-primary hover:bg-brand-primary/90'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
