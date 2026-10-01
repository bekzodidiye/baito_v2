import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, MessageSquare, PlusCircle, Award, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Application } from '../../../types';

interface MandatoryReviewModalProps {
  isOpen: boolean;
  application: Application | null;
  onConfirm: (data: { rating: number; review: string; bonus: number }) => Promise<void> | void;
  language: string;
}

export const MandatoryReviewModal: React.FC<MandatoryReviewModalProps> = ({
  isOpen,
  application,
  onConfirm,
  language,
}) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [bonus, setBonus] = useState('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !application || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (review.trim().length < 3 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        rating,
        review: review.trim(),
        bonus: bonus ? parseInt(bonus.replace(/\D/g, ''), 10) : 0,
      });
      // reset form
      setReview('');
      setBonus('');
      setRating(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReviewValid = review.trim().length >= 3;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Unclosable backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-brand-primary to-blue-900 text-white relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Award size={26} className="text-amber-300" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl leading-tight">
                  {language === 'uz'
                    ? 'Ish yakunlandi — Sharh qoldiring'
                    : language === 'ru'
                    ? 'Работа завершена — Оставьте отзыв'
                    : 'Job Completed — Leave a Review'}
                </h3>
                <p className="text-xs text-blue-200 mt-1">
                  {language === 'uz'
                    ? 'Ishchi ishni yakunladi. Davom etish uchun sharh yozish majburiy.'
                    : language === 'ru'
                    ? 'Работник завершил работу. Для продолжения обязательно оставьте отзыв.'
                    : 'The worker finished the job. A review is required to proceed.'}
                </p>
              </div>
            </div>

            {/* Candidate & Job Badge */}
            <div className="mt-4 p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-200 uppercase tracking-wider font-bold block">
                  {language === 'uz' ? 'Ishchi' : language === 'ru' ? 'Работник' : 'Worker'}
                </span>
                <span className="text-sm font-black text-white">
                  {application.candidateName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-200 uppercase tracking-wider font-bold block">
                  {language === 'uz' ? 'Ish' : language === 'ru' ? 'Работа' : 'Job'}
                </span>
                <span className="text-sm font-bold text-white max-w-[180px] truncate block">
                  {application.jobTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <form id="mandatory-review-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6">
            {/* Rating */}
            <div className="flex flex-col gap-2.5 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                {language === 'uz' ? 'Ishchining ishlash sifatini baholang' : language === 'ru' ? 'Оцените качество работы' : 'Rate work quality'}
              </span>
              <div className="flex gap-2.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    className="focus:outline-none rounded-full p-1 transition-transform active:scale-90 cursor-pointer"
                  >
                    <Star
                      size={36}
                      className={`transition-colors ${
                        star <= (hoveredStar ?? rating)
                          ? 'fill-amber-400 stroke-amber-400'
                          : 'fill-slate-200 stroke-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700">
                {rating === 5
                  ? (language === 'uz' ? "A'lo darajada (5/5)" : language === 'ru' ? "Отлично (5/5)" : "Отлично (5/5)")
                  : rating === 4
                  ? (language === 'uz' ? "Yaxshi (4/5)" : language === 'ru' ? "Хорошо (4/5)" : "Хорошо (4/5)")
                  : rating === 3
                  ? (language === 'uz' ? "Qoniqarli (3/5)" : language === 'ru' ? "Удовлетворительно (3/5)" : "Удовлетворительно (3/5)")
                  : rating === 2
                  ? (language === 'uz' ? "Yomon (2/5)" : language === 'ru' ? "Плохо (2/5)" : "Плохо (2/5)")
                  : (language === 'uz' ? "Juda yomon (1/5)" : language === 'ru' ? "Очень плохо (1/5)" : "Очень плохо (1/5)")}
              </span>
            </div>

            {/* Review Text */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-brand-primary" />
                  {language === 'uz' ? 'Sharh matni' : language === 'ru' ? 'Текст отзыва' : 'Review text'}
                  <span className="text-rose-500 font-black">*</span>
                </span>
                <span className={`text-[11px] font-semibold ${isReviewValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {review.trim().length} / {language === 'uz' ? 'min 3 ta belgi' : language === 'ru' ? 'мин 3 символа' : 'мин 3 символа'}
                </span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                required
                placeholder={
                  language === 'uz'
                    ? 'Ishchi o\'z vaqtida keldimi? Vazifalarni qanday bajardi? Batafsil sharhingizni yozing...'
                    : language === 'ru'
                    ? 'Пришел ли работник вовремя? Как справился с задачами? Напишите подробный отзыв...'
                    : 'Did the worker arrive on time? How did they perform? Write your review...'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 min-h-[110px] resize-none text-slate-800"
              />
              {!isReviewValid && review.length > 0 && (
                <p className="text-xs text-rose-500 font-medium">
                  {language === 'uz' ? "Sharh kamida 3 ta belgidan iborat bo'lishi shart" : language === 'ru' ? "Отзыв должен содержать минимум 3 символа" : "Отзыв должен содержать минимум 3 символа"}
                </p>
              )}
            </div>

            {/* Optional Bonus */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <PlusCircle size={16} className="text-emerald-500" />
                {language === 'uz' ? "Qo'shimcha mukofot / bonus (Ixtiyoriy)" : language === 'ru' ? "Дополнительный бонус (Необязательно)" : "Extra Bonus (Optional)"}
              </label>
              <div className="relative">
                <input
                  aria-label={language === 'ru' ? "Сумма бонуса" : language === 'en' ? "Bonus amount" : "Bonus miqdori"}
                  type="text"
                  value={bonus}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setBonus(val ? parseInt(val, 10).toLocaleString('en-US').replace(/,/g, ' ') : '');
                  }}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-14 text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  UZS
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {language === 'uz'
                  ? "Bonus summasi sizning balansingizdan ishchining balansiga darhol o'tkaziladi."
                  : language === 'ru'
                  ? "Сумма бонуса спишется с вашего баланса и сразу поступит работнику."
                  : "Bonus amount will be debited from your balance and sent to the worker."}
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80">
            <button
              type="submit"
              form="mandatory-review-form"
              disabled={!isReviewValid || isSubmitting}
              className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
                isReviewValid && !isSubmitting
                  ? 'bg-brand-primary hover:bg-brand-primary/95 text-white shadow-[0_4px_16px_rgba(0,6,102,0.3)] active:scale-[0.98] cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {language === 'uz' ? 'Yuborilmoqda...' : language === 'ru' ? 'Отправка...' : 'Отправка...'}
                </>
              ) : (
                language === 'uz' ? 'Sharhni yuborish va tasdiqlash' : language === 'ru' ? 'Отправить отзыв и подтвердить' : 'Submit Review'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
