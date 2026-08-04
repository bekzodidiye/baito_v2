import React from 'react';
import { useApp } from '../../context/AppContext';
import { LANDING_TEXTS, JOB_CATEGORIES } from './LandingData';
import { Truck, Utensils, Package, HardHat, ShoppingBag, Briefcase, ArrowRight, Layers } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface LandingCategoriesProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingCategories: React.FC<LandingCategoriesProps> = ({ onSelectRole }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, isLoggedIn, requireAuth, setFilterType } = useApp();
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

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

  const handleCategoryClick = (catId: string) => {
    const cat = JOB_CATEGORIES.find(c => c.id === catId);
    if (cat) {
      const name = language === 'ru' ? cat.nameRu : language === 'en' ? cat.nameEn : cat.nameUz;
      setFilterType(name);
    }
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
              <span>Sohalar bo'yicha</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{t.catTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">{t.catSubtitle}</p>
          </div>

          <button
            onClick={() => setCurrentScreen('login')}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-brand-primary font-black text-xs hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <span>Barcha smenalarni ko'rish</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Categories Matrix Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {JOB_CATEGORIES.map((cat) => {
            const name = language === 'ru' ? cat.nameRu : language === 'en' ? cat.nameEn : cat.nameUz;
            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-brand-primary/40 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {getCategoryIcon(cat.iconName)}
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200/80">
                    {cat.count} e'lon
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-brand-primary transition-colors">
                    {name}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {cat.rate}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-brand-primary">
                  <span>Smenalarni tanlash</span>
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
