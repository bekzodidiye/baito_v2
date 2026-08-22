import React from 'react';
import { ArrowLeft, FileText, Download, CheckCircle2, FileJson, Clock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';

export const TaxesScreen: React.FC = () => {
  const { language } = useApp();
  const { setCurrentScreen } = useCurrentScreen();

  const t = {
    title: language === 'uz' ? "Soliq hujjatlari" : language === 'ru' ? "Налоговые документы" : "Tax Documents",
    subtitle: language === 'uz' ? "Daromad va hisobotlar" : language === 'ru' ? "Доходы и отчеты" : "Income and reports",
    thisYear: language === 'uz' ? "Joriy yil hujjatlari" : language === 'ru' ? "Документы текущего года" : "This Year's Documents",
    pastYears: language === 'uz' ? "O'tgan yillar" : language === 'ru' ? "Прошлые года" : "Past Years",
    download: language === 'uz' ? "Yuklash" : language === 'ru' ? "Скачать" : "Download",
  };

  const currentDocs = [
    {
      id: 1,
      title: "Avgust 2026 - Daromad xulosasi",
      status: 'ready',
      date: '31 Avg, 2026',
      size: '124 KB',
    },
    {
      id: 2,
      title: "Iyul 2026 - Soliq aylanmasi",
      status: 'ready',
      date: '31 Iyul, 2026',
      size: '210 KB',
    },
    {
      id: 3,
      title: "Sentyabr 2026 (Tayyorlanmoqda)",
      status: 'pending',
      date: 'Tez kunda',
      size: '--',
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 md:pb-6 flex flex-col h-full bg-slate-50 min-h-screen">
      <header className="flex items-center gap-3 px-4 md:px-6 pt-5 pb-3 sticky top-0 bg-slate-50/80 backdrop-blur-md z-40">
        <button
          onClick={() => setCurrentScreen('profile')}
          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 transition-colors rounded-full text-slate-700 cursor-pointer shadow-sm"
        >
          <ArrowLeft size={20} className="stroke-[2.5]" />
        </button>
        <div>
          <h1 className="font-display text-lg font-black text-slate-800 tracking-tight">{t.title}</h1>
          <p className="text-[11px] text-slate-500 font-medium">{t.subtitle}</p>
        </div>
      </header>

      <div className="px-4 md:px-6 flex flex-col gap-6 mt-4 animate-in slide-in-from-right-4 duration-500">
        
        {/* Document List */}
        <section>
          <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-4 pl-1">{t.thisYear}</h2>
          <div className="flex flex-col gap-3">
            {currentDocs.map(doc => (
              <div 
                key={doc.id} 
                className={`bg-white border p-4.5 rounded-[20px] flex items-center gap-4 transition-all duration-300 ${
                  doc.status === 'ready' 
                  ? 'border-slate-200 hover:border-brand-primary/30 hover:shadow-md cursor-pointer group' 
                  : 'border-slate-100 opacity-60 bg-slate-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  doc.status === 'ready' ? 'bg-indigo-50 text-brand-primary' : 'bg-slate-100 text-slate-400'
                }`}>
                  {doc.status === 'ready' ? <FileText size={24} className="stroke-[2]" /> : <FileJson size={24} className="stroke-[2]" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-slate-800 text-sm truncate mb-1">{doc.title}</h3>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      {doc.status === 'ready' ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
                      {doc.date}
                    </span>
                    <span>• {doc.size}</span>
                  </div>
                </div>

                {doc.status === 'ready' && (
                  <button className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors shrink-0">
                    <Download size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default TaxesScreen;
