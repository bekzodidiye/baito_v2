import React, { useState } from 'react';
import { X, Star, MessageSquare, PlusCircle, CalendarCheck, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobDaysApi, completeJobDayApi } from '../../../api/queries';

interface JobDay {
  id: string;
  workDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  amount: number | null;
}

interface FinishJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { rating: number; review: string; bonus: number }) => void;
  jobTitle: string;
  language: string;
  /** Needed to load and finish the posting's individual days. */
  jobId?: string;
}

export const FinishJobModal: React.FC<FinishJobModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  language,
  jobId
}) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [bonus, setBonus] = useState('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: days = [] } = useQuery<JobDay[]>({
    queryKey: ['jobDays', jobId],
    queryFn: () => fetchJobDaysApi(jobId as string),
    enabled: isOpen && !!jobId,
  });

  const finishDay = useMutation({
    mutationFn: (dayId: string) => completeJobDayApi(jobId as string, dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobDays', jobId] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
    },
  });

  if (!isOpen) return null;

  const pending = days.filter(d => d.status === 'pending');

  /** Today in Tashkent, the way the server reckons it.
   *
   *  Uzbekistan is UTC+5 and keeps no daylight saving. Taking the browser's
   *  own date instead would disagree with the server for any employer whose
   *  machine is set to another zone, and the button would be offered for a
   *  day the server then refuses. */
  const todayInTashkent = new Date(Date.now() + 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  // One day is just a job; the choice only means something when there is more
  // than one day to choose between.
  const showDays = days.length > 1;
  const money = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      rating,
      review,
      bonus: bonus ? parseInt(bonus.replace(/\D/g, ''), 10) : 0
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
            <div>
              <h3 className="font-display font-black text-lg text-slate-800">
                {language === 'uz' ? 'Ishni yakunlash' : language === 'ru' ? 'Завершить работу' : 'Complete Job'}
              </h3>
              <p className="text-xs text-brand-primary font-bold mt-1 truncate max-w-[280px]">
                {jobTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {/* Individual days. A three-day shift used to be finished by one
                press that closed and paid all three at once; each day is its
                own work and its own wage, so each is finished on its own. */}
            {showDays && (
              <div className="mb-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={15} className="text-brand-primary stroke-[2.5]" />
                  <span className="text-sm font-bold text-slate-700">
                    {language === 'uz' ? 'Ish kunlari' : language === 'ru' ? 'Рабочие дни' : 'Work days'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold ml-auto">
                    {pending.length}/{days.length} {language === 'uz' ? 'qoldi' : language === 'ru' ? 'осталось' : 'left'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {days.map(day => {
                    const done = day.status === 'completed';
                    const off = day.status === 'cancelled';
                    // A day closes once it has arrived. Offering the button
                    // earlier only earns a refusal from the server.
                    const notYet = !done && !off && day.workDate > todayInTashkent;
                    return (
                      <div
                        key={day.id}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${
                          done ? 'border-emerald-200 bg-emerald-50/60'
                               : off ? 'border-slate-200 bg-slate-50 opacity-60'
                                     : notYet ? 'border-slate-200 bg-slate-50/60'
                                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 tabular-nums">{day.workDate}</p>
                          {day.amount != null && (
                            <p className="text-xs text-slate-500 tabular-nums">{money(day.amount)} so'm</p>
                          )}
                        </div>
                        {done ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Check size={14} className="stroke-[3]" />
                            {language === 'uz' ? 'To\'landi' : language === 'ru' ? 'Оплачен' : 'Paid'}
                          </span>
                        ) : off ? (
                          <span className="text-xs font-bold text-slate-400">
                            {language === 'uz' ? 'Bekor' : language === 'ru' ? 'Отменён' : 'Cancelled'}
                          </span>
                        ) : notYet ? (
                          <span className="text-xs font-bold text-slate-400">
                            {language === 'uz' ? 'Hali kelmadi'
                              : language === 'ru' ? 'Ещё не наступил'
                              : 'Not yet'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => finishDay.mutate(day.id)}
                            disabled={finishDay.isPending}
                            className="text-xs font-bold text-white bg-brand-primary px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {finishDay.isPending && finishDay.variables === day.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              language === 'uz' ? 'Yakunlash' : language === 'ru' ? 'Завершить' : 'Finish'
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {finishDay.isError && (
                  <p className="text-xs text-red-600">{(finishDay.error as Error).message}</p>
                )}

                <p className="text-xs text-slate-500 leading-relaxed">
                  {language === 'uz'
                    ? "Har kun alohida yakunlanadi va o'sha kun uchun to'lov o'tkaziladi. Pastdagi tugma esa qolgan barcha kunlarni yakunlaydi."
                    : language === 'ru'
                    ? 'Каждый день завершается отдельно и оплачивается отдельно. Кнопка ниже завершает все оставшиеся дни.'
                    : 'Each day is finished and paid separately. The button below finishes every remaining day.'}
                </p>
              </div>
            )}

            <form id="finish-job-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Rating */}
              <div className="flex flex-col gap-3 items-center">
                <span className="text-sm font-bold text-slate-700">
                  {language === 'uz' ? 'Ishchini baholang' : language === 'ru' ? 'Оцените работника' : 'Rate the worker'}
                </span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(null)}
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-full p-1 transition-transform active:scale-90 cursor-pointer"
                    >
                      <Star
                        size={36}
                        className={`transition-colors ${
                          star <= (hoveredStar ?? rating)
                            ? 'fill-amber-400 stroke-amber-400'
                            : 'fill-slate-100 stroke-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-brand-primary" />
                  {language === 'uz' ? 'Sharh yozish (Ixtiyoriy)' : language === 'ru' ? 'Оставить отзыв (Необязательно)' : 'Write a review (Optional)'}
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder={language === 'uz' ? 'Ishchi qanday ishladi? Boshqalarga tavsiya qilasizmi?' : language === 'ru' ? 'Как работал работник? Вы бы рекомендовали его?' : 'How did the worker do? Would you recommend them?'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary min-h-[100px] resize-none"
                />
              </div>

              {/* Bonus */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <PlusCircle size={16} className="text-emerald-500" />
                  {language === 'uz' ? "Qo'shimcha bonus (Ixtiyoriy)" : language === 'ru' ? 'Дополнительный бонус (Необязательно)' : 'Extra Bonus (Optional)'}
                </label>
                <div className="relative">
                  <input
              aria-label={language === 'ru' ? "Сумма дополнительного бонуса" : language === 'en' ? "Bonus amount" : "Qo'shimcha bonus summasi"}
                    type="text"
                    value={bonus}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setBonus(val ? parseInt(val, 10).toLocaleString('en-US').replace(/,/g, ' ') : '');
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    UZS
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {language === 'uz' ? "Kiritilgan summa ishchining balansiga qo'shiladi" : language === 'ru' ? "Введенная сумма будет добавлена на баланс работника" : "The entered amount will be added to the worker's balance"}
                </p>
              </div>

            </form>
          </div>

          <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50">
            <button
              type="submit"
              form="finish-job-form"
              className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-xl text-sm shadow-[0_4px_12px_rgba(0,6,102,0.3)] transition-all active:scale-98 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              {language === 'uz' ? 'Yakunlash va Tasdiqlash' : language === 'ru' ? 'Завершить и Подтвердить' : 'Complete and Confirm'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
