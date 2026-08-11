import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '../../../api/client';
import { Application } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';
import { SummaryCard, ReviewCard, EmptyReviews, ReviewsSkeleton } from './ReviewsScreen.components';

export const ReviewsScreen: React.FC = () => {
  const { language } = useApp();
  const { setCurrentScreen } = useCurrentScreen();
  const [reviews, setReviews] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await apiClient('/applications/worker');
        if (Array.isArray(data)) {
          const completed = data.filter(app => app.status === 'completed' && app.rating);
          setReviews(completed);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;
  const totalEarned = reviews.reduce((sum, r) => sum + (r.earnedAmount || 0), 0);

  // Rating distribution (5→1)
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating || 0) === star).length,
    percent: reviews.length > 0
      ? (reviews.filter(r => Math.round(r.rating || 0) === star).length / reviews.length) * 100
      : 0,
  }));

  const t = {
    title: language === 'uz' ? "Reyting va Sharhlar" : language === 'ru' ? "Рейтинг и Отзывы" : "Ratings & Reviews",
    subtitle: language === 'uz' ? "Ish beruvchilar tomonidan qo'yilgan baholar" : language === 'ru' ? "Оценки от работодателей" : "Ratings from employers",
    avgLabel: language === 'uz' ? "O'rtacha baho" : language === 'ru' ? "Средний балл" : "Average rating",
    totalReviews: language === 'uz' ? "ta sharh" : language === 'ru' ? "отзывов" : "reviews",
    totalEarned: language === 'uz' ? "Umumiy daromad" : language === 'ru' ? "Общий доход" : "Total earned",
    completedJobs: language === 'uz' ? "Yakunlangan ishlar" : language === 'ru' ? "Завершённые работы" : "Completed jobs",
    noReviews: language === 'uz' ? "Hozircha reytinglar yo'q" : language === 'ru' ? "Пока отзывов нет" : "No reviews yet",
    noReviewsDesc: language === 'uz' ? "Ishni muvaffaqiyatli yakunlaganingizda, ish beruvchi sizga baho va sharh qoldiradi." : language === 'ru' ? "Когда вы успешно завершите работу, работодатель оставит вам оценку и отзыв." : "When you successfully complete a job, the employer will leave you a rating and review.",
    allReviews: language === 'uz' ? "BARCHA SHARHLAR" : language === 'ru' ? "ВСЕ ОТЗЫВЫ" : "ALL REVIEWS",
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-6 pb-28 md:pb-6 flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setCurrentScreen('profile')}
          className="p-2 hover:bg-slate-50 transition-colors rounded-full text-slate-700 cursor-pointer"
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>
        <div>
          <h1 className="font-display text-base font-black text-brand-primary">{t.title}</h1>
          <p className="text-[11px] text-slate-400 font-medium">{t.subtitle}</p>
        </div>
      </header>

      {isLoading ? <ReviewsSkeleton /> : reviews.length === 0 ? (
        <EmptyReviews t={t} />
      ) : (
        <>
          {/* Summary Card */}
          <SummaryCard
            avgRating={avgRating}
            reviewsCount={reviews.length}
            totalEarned={totalEarned}
            distribution={distribution}
            t={t}
          />

          {/* Reviews List */}
          <section className="flex flex-col gap-3">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{t.allReviews}</p>
            {reviews.map((review, idx) => (
              <ReviewCard key={review.id} review={review} index={idx} />
            ))}
          </section>
        </>
      )}
    </div>
  );
};

export default ReviewsScreen;
