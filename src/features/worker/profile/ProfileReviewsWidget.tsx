import React, { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { apiClient } from '../../../api/client';
import { Application } from '../../../types';
import { Language } from '../../../translations';
import { motion } from 'motion/react';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';

interface ProfileReviewsWidgetProps {
  language: Language;
}

export const ProfileReviewsWidget: React.FC<ProfileReviewsWidgetProps> = ({ language }) => {
  const [reviews, setReviews] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setCurrentScreen } = useCurrentScreen();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await apiClient('/applications/worker');
        if (Array.isArray(data)) {
          const completedWithReview = data.filter(app => app.status === 'completed' && app.rating);
          setReviews(completedWithReview);
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-slate-100 rounded-xl mb-3"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null; // Hide widget if no reviews
  }

  // Calculate average rating
  const avgRating = reviews.reduce((sum, rev) => sum + (rev.rating || 0), 0) / reviews.length;

  return (
    <section className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-sm flex flex-col gap-4 shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            {language === 'uz' ? "REYTIGN VA SHARHLAR" : language === 'ru' ? "РЕЙТИНГ И ОТЗЫВЫ" : "RATING AND REVIEWS"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <h3 className="font-display font-black text-2xl text-slate-800 leading-none">
              {avgRating.toFixed(1)}
            </h3>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  className={star <= Math.round(avgRating) ? "fill-amber-400 stroke-amber-400" : "fill-slate-100 stroke-slate-200"}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-400">
              ({reviews.length})
            </span>
          </div>
        </div>
        <button
          onClick={() => setCurrentScreen('reviews')}
          className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
        >
          {language === 'uz' ? "Barchasini ko'rish →" : language === 'ru' ? "Показать все →" : "See all →"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {reviews.slice(0, 3).map((review, idx) => (
          <motion.div 
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-50 rounded-xl p-3 border border-slate-100"
          >
            <div className="flex justify-between items-start mb-1.5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{review.jobTitle}</span>
                <span className="text-xs font-black text-slate-800">{review.jobCompany || "Baito"}</span>
              </div>
              <div className="flex items-center text-amber-400 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/50">
                <Star size={10} className="fill-amber-400 mr-1" />
                <span className="text-[10px] font-black">{review.rating}</span>
              </div>
            </div>
            
            {review.review && (
              <div className="text-xs text-slate-600 mt-2 font-medium flex items-start gap-1.5">
                <MessageSquare size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="leading-relaxed">"{review.review}"</p>
              </div>
            )}
            
            {review.bonus ? (
              <div className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-full border border-emerald-100">
                + {review.bonus.toLocaleString()} so'm bonus
              </div>
            ) : null}
          </motion.div>
        ))}
      </div>
    </section>
  );
};
