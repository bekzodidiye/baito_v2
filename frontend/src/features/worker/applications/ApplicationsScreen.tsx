import React, { useState, useEffect } from 'react';
import { ArrowLeft, Inbox, BriefcaseBusiness, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';
import { translations } from '../../../translations';
import { fetchWorkerApplicationsApi } from '../../../api/queries';
import { ApplicationCard } from './ApplicationCard';

import { useQuery } from '@tanstack/react-query';

export const ApplicationsScreen: React.FC = () => {
  const { setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const t = translations[language];
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'applied' | 'hired' | 'rejected'>('all');

  const { data: applications = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['workerApplications'],
    queryFn: fetchWorkerApplicationsApi,
  });

  const error = queryError ? (language === 'uz' ? 'Arizalarni yuklashda xatolik yuz berdi' : language === 'ru' ? 'Ошибка загрузки заявок' : 'Failed to load applications') : null;

  const handleCardClick = (jobId: string) => {
    // Navigate to job details screen if you have one, or handle click
  };

  const filteredApplications = applications.filter(app => {
    if (activeTab === 'all') return true;
    return app.status === activeTab;
  });

  const getTabLabel = (tab: string) => {
    if (language === 'uz') {
      switch(tab) {
        case 'all': return 'Barchasi';
        case 'applied': return 'Kutilmoqda';
        case 'hired': return 'Qabul qilingan';
        case 'rejected': return 'Rad etilgan';
      }
    } else if (language === 'ru') {
      switch(tab) {
        case 'all': return 'Все';
        case 'applied': return 'В ожидании';
        case 'hired': return 'Принятые';
        case 'rejected': return 'Отклоненные';
      }
    }
    switch(tab) {
      case 'all': return 'All';
      case 'applied': return 'Pending';
      case 'hired': return 'Hired';
      case 'rejected': return 'Rejected';
    }
  };

  const tabs = [
    { id: 'all', icon: <BriefcaseBusiness size={14} /> },
    { id: 'applied', icon: <Clock3 size={14} /> },
    { id: 'hired', icon: <CheckCircle2 size={14} /> },
    { id: 'rejected', icon: <XCircle size={14} /> }
  ] as const;

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 md:pb-6 flex flex-col min-h-screen relative bg-slate-50/50">
      
      {/* Premium Header */}
      <header className="w-full sticky top-0 bg-slate-50/80 backdrop-blur-xl z-20 pt-5 pb-3 px-4 md:px-6 shadow-sm border-b border-slate-200/50">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setCurrentScreen('profile')}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 transition-colors rounded-full text-slate-700 cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} className="stroke-[2.5]" />
          </button>
          <div>
            <h1 className="font-display text-lg font-black text-slate-800 tracking-tight">
              {language === 'uz' ? 'Arizalar tarixi' : language === 'ru' ? 'История заявок' : 'Application History'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {language === 'uz' ? 'Siz topshirgan barcha ishlar' : language === 'ru' ? 'Все ваши отклики' : 'All your job applications'}
            </p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {getTabLabel(tab.id)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex flex-col w-full px-4 md:px-6 pt-5">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse h-36 flex flex-col justify-between">
                <div className="flex gap-3">
                  <div className="w-11 h-11 bg-slate-200 rounded-xl" />
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-rose-100 max-w-sm mx-auto">
              <XCircle size={48} className="text-rose-400 mx-auto mb-4" />
              <p className="text-slate-700 font-bold mb-1">Oops!</p>
              <p className="text-slate-500 font-medium text-sm mb-6">{error}</p>
              <button 
                onClick={() => refetch()}
                className="w-full py-3 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 hover:bg-rose-600 transition-colors active:scale-[0.98]"
              >
                {language === 'uz' ? 'Qayta urinish' : language === 'ru' ? 'Повторить' : 'Retry'}
              </button>
            </div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center mt-10">
            <div className="w-24 h-24 rounded-3xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-5 rotate-3 hover:rotate-0 transition-transform duration-300">
              <Inbox size={40} className="text-slate-300 stroke-[1.5]" />
            </div>
            <h3 className="font-display font-black text-slate-800 text-lg mb-1">
              {language === 'uz' ? "Hali hech narsa yo'q" : language === 'ru' ? "Пока ничего нет" : "Nothing here yet"}
            </h3>
            <p className="text-slate-500 font-medium text-center text-[13px] max-w-[250px] leading-relaxed">
              {activeTab === 'all' 
                ? (language === 'uz' ? "Siz hali hech qanday ishga ariza topshirmagansiz." : "Вы еще не подали ни одной заявки.") 
                : (language === 'uz' ? "Bu bo'limda mos arizalar topilmadi." : "Подходящие заявки не найдены.")}
            </p>
            {activeTab === 'all' && (
              <button 
                onClick={() => setCurrentScreen('jobs')}
                className="mt-8 px-8 py-3.5 bg-brand-primary text-white rounded-2xl font-display font-bold text-sm shadow-lg shadow-brand-primary/30 hover:bg-brand-primary/90 transition-all active:scale-[0.96]"
              >
                {language === 'uz' ? 'Ish qidirish' : language === 'ru' ? 'Поиск работы' : 'Find Jobs'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            {filteredApplications.map((app) => (
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
