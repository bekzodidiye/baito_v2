import React, { useState, useEffect } from 'react';
import { ArrowLeft, Inbox } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';
import { translations } from '../../../translations';
import { fetchWorkerApplicationsApi } from '../../../api/queries';
import { ApplicationCard } from './ApplicationCard';

export const ApplicationsScreen: React.FC = () => {
  const { setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const t = translations[language];

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchWorkerApplicationsApi();
        setApplications(data);
      } catch (err) {
        console.error('Failed to fetch applications:', err);
        setError(language === 'uz' ? 'Arizalarni yuklashda xatolik yuz berdi' : language === 'ru' ? 'Ошибка загрузки заявок' : 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [language]);

  const handleCardClick = (jobId: string) => {
    // Navigate to job details screen if you have one, or handle click
    // setCurrentScreen(`job-${jobId}` as any); // Assuming job details routing exists
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 md:px-6 pb-28 md:pb-6 flex flex-col min-h-screen relative bg-slate-50">
      <header className="w-full flex items-center gap-3 mb-6 shrink-0 sticky top-0 bg-slate-50 z-10 py-2">
        <button 
          onClick={() => setCurrentScreen('profile')}
          className="p-2 -ml-2 hover:bg-slate-200/50 transition-colors rounded-full text-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <ArrowLeft size={20} className="stroke-[2.5]" />
        </button>
        <h1 className="font-display text-lg font-black text-slate-800">
          {language === 'uz' ? 'Arizalar tarixi' : language === 'ru' ? 'История заявок' : 'Application History'}
        </h1>
      </header>

      <div className="flex-1 flex flex-col w-full">
        {loading ? (
          <div className="flex-1 flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-pulse h-32"></div>
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6 bg-rose-50 rounded-2xl border border-rose-100 max-w-xs mx-auto">
              <p className="text-rose-600 font-medium text-sm">{error}</p>
              <button 
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchWorkerApplicationsApi().then(setApplications).catch(() => setError('Error')).finally(() => setLoading(false));
                }}
                className="mt-4 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-rose-200 transition-colors"
              >
                {language === 'uz' ? 'Qayta urinish' : language === 'ru' ? 'Повторить' : 'Retry'}
              </button>
            </div>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-70 mt-10">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Inbox size={32} className="text-slate-300 stroke-[1.5]" />
            </div>
            <p className="text-slate-500 font-medium text-center">
              {language === 'uz' ? "Hali hech qanday ishga ariza topshirmagansiz." : language === 'ru' ? "Вы еще не подали ни одной заявки." : "You haven't applied to any jobs yet."}
            </p>
            <button 
              onClick={() => setCurrentScreen('jobs')}
              className="mt-6 px-6 py-3 bg-brand-primary text-white rounded-xl font-display font-bold text-sm shadow-sm hover:bg-brand-primary/95 transition-all active:scale-[0.98]"
            >
              {language === 'uz' ? 'Ish qidirish' : language === 'ru' ? 'Поиск работы' : 'Find Jobs'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {applications.map((app) => (
              <ApplicationCard 
                key={app.id} 
                application={app} 
                language={language}
                onClick={() => handleCardClick(app.jobId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
