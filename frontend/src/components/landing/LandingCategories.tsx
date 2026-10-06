import React from 'react';
import { useApp } from '../../context/AppContext';
import { LANDING_TEXTS } from './LandingData';
import { useLandingCategories, rateText, countText, categoryName } from './useLandingCategories';
import { Truck, Utensils, Package, HardHat, ShoppingBag, Briefcase, ArrowRight, Layers } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useUIStore } from "../../store/useUIStore";
import { useAuthStore } from "../../store/useAuthStore";

interface LandingCategoriesProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingCategories: React.FC<LandingCategoriesProps> = ({ onSelectRole }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const requireAuth = useApp().requireAuth;
    const setFilterCategory = useUIStore(s => s.setFilterCategory);
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;
  const { categories } = useLandingCategories(language);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Truck': return <Truck className="text-amber-500" size={24} />;
      case 'Utensils': return <Utensils className="text-rose-500" size={24} />;
      case 'Package': return <Package className="text-sky-500" size={24} />;
      case 'HardHat': return <HardHat className="text-amber-600" size={24} />;
      case 'ShoppingBag': return <ShoppingBag className="text-emerald-500" size={24} />;
      case 'Briefcase': default: return <Briefcase className="text-purple-500" size={24} />;
    }
  };

  const handleCategoryClick = (slug: string) => {
    // The slug is what a job stores, so this actually narrows the list. It used
    // to set the tag filter to a category's display name, which matched nothing
    // — and the search screen never read that filter from the store anyway.
    setFilterCategory(slug);
    setCurrentScreen('login');
  };

  return (
    <section id="categories" className="py-12 lg:py-16 bg-slate-50 font-sans border-b border-slate-200/80 min-h-[calc(100vh-4.5rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black">
              <Layers size={14} />
              <span>{t.catBadge}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{t.catTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">{t.catSubtitle}</p>
          </div>

          <button
            onClick={() => setCurrentScreen('login')}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-brand-primary font-black text-xs hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <span>{t.catViewAll}</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Categories Matrix Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {categories.map((cat) => {
            const name = categoryName(cat, language as 'uz' | 'ru' | 'en');
            return (
              <div
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                className="bg-white rounded-3xl p-7 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-brand-primary/40 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform text-3xl sm:text-2xl">
                    {cat.icon || getCategoryIcon('Briefcase')}
                  </div>
                  {/* A category with nothing posted says so rather than
                      advertising a number nobody counted. */}
                  <span className={`px-3 py-1 rounded-full font-extrabold text-sm sm:text-xs border ${
                    cat.activeJobsCount > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {countText(cat, language as 'uz' | 'ru' | 'en')}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-lg font-black text-slate-900 group-hover:text-brand-primary transition-colors">
                    {name}
                  </h3>
                  <p className="text-sm sm:text-xs font-bold text-slate-500 mt-1">
                    {rateText(cat, language as 'uz' | 'ru' | 'en')}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm sm:text-xs font-black text-brand-primary">
                  <span>{t.catPickShifts}</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
