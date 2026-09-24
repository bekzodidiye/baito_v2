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
  currentAbout: string;
  currentRegion: string;
  currentAvatarUrl?: string | null;
  onSave: (fields: { name: string; phone: string; about: string; region: string; avatarUrl?: string | null }) => Promise<void>;
}

export const EmployerEditProfileModal: React.FC<EmployerEditProfileModalProps> = ({
  isOpen,
  onClose,
  language,
  currentName,
  currentPhone,
  currentAbout,
  currentRegion,
  currentAvatarUrl,
  onSave
}) => {
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone);
  const [about, setAbout] = useState(currentAbout);
  const [region, setRegion] = useState(currentRegion);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useState only reads its argument on the first render. The profile arrives
  // from /users/me after this component has already mounted, so without this
  // the form opened showing whatever was known at mount - usually nothing.
  React.useEffect(() => {
    if (!isOpen) return;
    setName(currentName);
    setPhone(currentPhone);
    setAbout(currentAbout);
    setRegion(currentRegion);
  }, [isOpen, currentName, currentPhone, currentAbout, currentRegion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(language === 'uz' ? "Kompaniya nomini kiriting" : "Введите название компании");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        about: about.trim(),
        region: region.trim(),
        avatarUrl: currentAvatarUrl,
      });
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
            className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 p-6 flex flex-col"
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
              aria-label={language === 'uz' ? "Kompaniya nomi" : "Название компании"} 
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
              aria-label={language === 'uz' ? "Telefon raqam" : "Номер телефона"} 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">
                  {language === 'uz' ? "Manzil" : language === 'ru' ? "Адрес" : 'Address'}
                </label>
                <input
                  aria-label={language === 'uz' ? "Manzil" : language === 'ru' ? "Адрес" : 'Address'}
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={language === 'uz' ? "Toshkent sh., Chilonzor t." : language === 'ru' ? "г. Ташкент, Чиланзар" : 'Tashkent, Chilonzor'}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800 disabled:opacity-50 placeholder:font-medium placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">
                  {language === 'uz' ? "Kompaniya haqida" : language === 'ru' ? "О компании" : 'About the company'}
                </label>
                <textarea
                  aria-label={language === 'uz' ? "Kompaniya haqida" : language === 'ru' ? "О компании" : 'About the company'}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  maxLength={2000}
                  placeholder={language === 'uz' ? "Kompaniyangiz nima bilan shug'ullanadi?" : language === 'ru' ? "Чем занимается ваша компания?" : 'What does your company do?'}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800 disabled:opacity-50 resize-none placeholder:font-medium placeholder:text-slate-400"
                />
                <p className="text-[10px] font-bold text-slate-400 px-1 text-right">{about.length}/2000</p>
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
