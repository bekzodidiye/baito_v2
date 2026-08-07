import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayCircle, CheckCircle2, X } from 'lucide-react';
import { Job } from '../../../types';

interface StartJobConfirmModalProps {
  isOpen: boolean;
  job: Job | null;
  candidateName?: string;
  onConfirm: (jobId: string) => void;
  onClose: () => void;
  language: 'uz' | 'ru' | 'en';
}

export const StartJobConfirmModal: React.FC<StartJobConfirmModalProps> = ({
  isOpen,
  job,
  candidateName = "Ishchi",
  onConfirm,
  onClose,
  language,
}) => {
  if (!isOpen || !job) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
            <PlayCircle size={28} className="stroke-[2]" />
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-display font-black text-lg text-slate-800">
              {language === 'uz' ? "Ishni tasdiqlaysizmi?" : language === 'ru' ? "Подтвердить начало работы?" : "Confirm Job Start?"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-800 font-bold">{candidateName}</strong> {language === 'uz' ? `'${job.title}' ishini boshlash so'rovini yubordi. Ishni boshlashni tasdiqlaysizmi?` : `подал запрос на начало работы '${job.title}'.`}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              {language === 'uz' ? "Bekor qilish" : language === 'ru' ? "Отмена" : "Cancel"}
            </button>
            <button
              onClick={() => {
                onConfirm(job.id);
                onClose();
              }}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{language === 'uz' ? "Ha, tasdiqlayman" : language === 'ru' ? "Да, подтверждаю" : "Yes, Confirm"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
