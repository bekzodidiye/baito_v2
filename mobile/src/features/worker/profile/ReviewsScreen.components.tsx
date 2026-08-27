import React from 'react';
import { Star, MessageSquare, TrendingUp, Award, Gift } from 'lucide-react';
import { Application } from '../../../types';
import { motion } from 'motion/react';

/* ── Rating Distribution Bar ── */
interface DistItem {
  star: number;
  count: number;
  percent: number;
}

interface SummaryCardProps {
  avgRating: number;
  reviewsCount: number;
  totalEarned: number;
  distribution: DistItem[];
  t: Record<string, string>;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  avgRating, reviewsCount, totalEarned, distribution, t
}) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
  >
    {/* Top: big rating + stars */}
    <div className="bg-gradient-to-br from-brand-primary/5 to-indigo-50/60 p-5 flex items-center gap-5">
      <div className="flex flex-col items-center">
        <span className="font-display font-black text-4xl text-slate-900 leading-none">
          {avgRating.toFixed(1)}
        </span>
        <div className="flex mt-1.5">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s} size={14}
              className={s <= Math.round(avgRating)
                ? "fill-amber-400 stroke-amber-400"
                : "fill-slate-200 stroke-slate-200"}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold text-slate-400 mt-1">
          {reviewsCount} {t.totalReviews}
        </span>
      </div>

      {/* Distribution bars */}
      <div className="flex-1 flex flex-col gap-1.5">
        {distribution.map(d => (
          <div key={d.star} className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 w-3 text-right">{d.star}</span>
            <Star size={10} className="fill-amber-400 stroke-amber-400 shrink-0" />
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${d.percent}%` }}
                transition={{ delay: 0.2 + d.star * 0.05, duration: 0.5 }}
                className="h-full bg-amber-400 rounded-full"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400 w-4">{d.count}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Bottom: stats chips */}
    <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
      <div className="flex items-center gap-2 p-3.5 justify-center">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <TrendingUp size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">{t.completedJobs}</p>
          <p className="font-display font-black text-sm text-slate-800">{reviewsCount}</p>
        </div>
      </div>
      {totalEarned > 0 && (
        <div className="flex items-center gap-2 p-3.5 justify-center">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Gift size={14} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{t.totalEarned}</p>
            <p className="font-display font-black text-sm text-emerald-600">
              {totalEarned.toLocaleString()} so'm
            </p>
          </div>
        </div>
      )}
    </div>
  </motion.section>
);

/* ── Single Review Card ── */
interface ReviewCardProps {
  review: Application;
  index: number;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06 }}
    className="bg-white rounded-xl p-4 border border-slate-100 shadow-3xs"
  >
    <div className="flex justify-between items-start">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-black text-slate-800">{review.jobTitle}</span>
        <span className="text-[10px] font-bold text-slate-400">{review.jobCompany || "Baito"}</span>
      </div>
      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/60">
        <Star size={11} className="fill-amber-400 stroke-amber-400" />
        <span className="text-xs font-black text-amber-700">{review.rating}</span>
      </div>
    </div>

    {review.review && (
      <div className="mt-3 flex items-start gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100/80">
        <MessageSquare size={13} className="text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 font-medium leading-relaxed">"{review.review}"</p>
      </div>
    )}

    <div className="flex items-center gap-3 mt-3">
      {review.bonus ? (
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          + {review.bonus.toLocaleString()} so'm bonus
        </span>
      ) : null}
      <span className="text-[10px] font-medium text-slate-300 ml-auto">
        {review.appliedDate}
      </span>
    </div>
  </motion.div>
);

/* ── Empty State ── */
export const EmptyReviews: React.FC<{ t: Record<string, string> }> = ({ t }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center text-center py-16 px-6"
  >
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-50 to-amber-100/60 flex items-center justify-center mb-5 shadow-sm">
      <Award size={32} className="text-amber-400" />
    </div>
    <h3 className="font-display font-black text-base text-slate-700">{t.noReviews}</h3>
    <p className="text-xs text-slate-400 font-medium max-w-[280px] mt-2 leading-relaxed">
      {t.noReviewsDesc}
    </p>
  </motion.div>
);

/* ── Skeleton Loading ── */
export const ReviewsSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    <div className="bg-white rounded-2xl border p-5 flex items-center gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-12 bg-slate-200 rounded-lg" />
        <div className="w-20 h-3 bg-slate-100 rounded" />
      </div>
      <div className="flex-1 flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-2 bg-slate-100 rounded-full" />
        ))}
      </div>
    </div>
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white rounded-xl p-4 border">
        <div className="flex justify-between">
          <div className="w-32 h-4 bg-slate-200 rounded" />
          <div className="w-12 h-5 bg-amber-50 rounded-lg" />
        </div>
        <div className="mt-3 h-10 bg-slate-50 rounded-lg" />
      </div>
    ))}
  </div>
);
