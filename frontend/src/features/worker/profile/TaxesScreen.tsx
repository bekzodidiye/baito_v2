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
    emptyTitle: language === 'uz' ? "Soliq hujjatlari hozircha mavjud emas"
      : language === 'ru' ? "Налоговых документов пока нет" : "Tax documents are not available yet",
    // The old copy said documents would appear "after your first completed jobs".
    // Nothing produces them — there is no endpoint and `currentDocs` below is a
    // fixed empty list — so a worker who completed jobs came back to the same
    // screen and reasonably concluded their work had not been recorded. Until
    // fiscalisation is built this says what is true and points somewhere useful.
    emptyBody: language === 'uz'
      ? "Bu bo'lim hali ishga tushirilmagan. Daromadingiz tarixini \"To'lovlar\" bo'limidan ko'rishingiz mumkin."
      : language === 'ru'
        ? "Этот раздел ещё не запущен. Историю доходов можно посмотреть в разделе «Платежи»."
        : "This section is not live yet. You can see your income history under \"Payments\".",
  };

  // Fiscalisation is not built: there is no endpoint serving tax documents, and
  // `SoliqFiscalService` in the backend is not referenced anywhere. This stays
  // empty deliberately rather than pretending to load. See qa/findings/BUG-021.
  const currentDocs: { id: number; title: string; status: string; date: string; size: string }[] = [];

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
          {currentDocs.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-[20px] p-8 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <FileJson size={24} className="stroke-[2]" />
              </div>
              <h3 className="font-display font-bold text-slate-800 text-sm">{t.emptyTitle}</h3>
              <p className="text-xs text-slate-500 max-w-xs">{t.emptyBody}</p>
            </div>
          )}

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
