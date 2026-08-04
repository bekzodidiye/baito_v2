import React, { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../utils/toast';

interface EmployerEditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  currentName: string;
  currentPhone: string;
  onSave: (name: string, phone: string) => Promise<void>;
}

export const EmployerEditProfileModal: React.FC<EmployerEditProfileModalProps> = ({
  isOpen,
  onClose,
  language,
  currentName,
  currentPhone,
  onSave
}) => {
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(language === 'uz' ? "Kompaniya nomini kiriting" : "Введите название компании");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave(name.trim(), phone.trim());
      showToast(language === 'uz' ? "Profil yangilandi!" : "Профиль обновлен!");
      onClose();
    } catch (err) {
      showToast(language === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 p-6 flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-display font-black text-slate-800 text-sm">
                {language === 'uz' ? "Profilni tahrirlash" : "Редактировать профиль"}
              </h3>
              <button 
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">
                  {language === 'uz' ? "Kompaniya nomi" : "Название компании"}
                </label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">
                  {language === 'uz' ? "Telefon raqam" : "Номер телефона"}
                </label>
                <input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button 
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {language === 'uz' ? "Bekor qilish" : "Отмена"}
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin stroke-[2.5]" />
                  ) : (
                    <Check size={14} className="stroke-[2.5]" />
                  )}
                  <span>{language === 'uz' ? "Saqlash" : "Сохранить"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
