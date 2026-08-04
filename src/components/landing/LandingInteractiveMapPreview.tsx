import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useJobsData } from "../../context/useJobsData";
import { LANDING_TEXTS, MOCK_LIVE_SHIFTS } from './LandingData';
import { Compass, MapPin, Building2, Clock, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { MapViewScreen } from '../map/MapViewScreen';
import { motion } from 'motion/react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface LandingInteractiveMapPreviewProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingInteractiveMapPreview: React.FC<LandingInteractiveMapPreviewProps> = ({ onSelectRole }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const { jobs } = useJobsData();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  useEffect(() => {
    const handleOpenJobDetail = (e: Event) => {
      const jobId = (e as CustomEvent).detail;
      if (!jobId) return;
      
      let targetShift = null;
      const foundJob = jobs.find(j => j.id === jobId);
      if (foundJob) {
        targetShift = {
          id: foundJob.id, titleUz: foundJob.title, titleRu: foundJob.title, company: foundJob.company, district: foundJob.location,
          pay: foundJob.salary || "280,000 so'm/smena", payNum: 280000, time: foundJob.time || "09:00 - 18:00 (8 soat)", category: 'general',
          lat: 0, lng: 0, badge: foundJob.urgent ? 'Tezkor' : 'Aktiv', urgent: foundJob.urgent || false,
          descriptionUz: foundJob.description || "Ushbu smenada berilgan vazifalarni belgilangan vaqt va tartibga ko'ra mas'uliyat bilan bajarish talab etiladi.",
          descriptionRu: foundJob.description || "Требуется ответственное выполнение поставленных задач в соответствии с регламентом и графиком смены.",
          perksUz: ["⚡ Kunlik to'lov", "🛡️ Baito Kafolati", "🍲 Tushlik ta'minlanadi"]
        };
      }

      if (targetShift) {
        setActiveShift(targetShift);
        setIsMobileModalOpen(true);
      }
    };
    window.addEventListener('open-job-detail', handleOpenJobDetail);
    return () => window.removeEventListener('open-job-detail', handleOpenJobDetail);
  }, [jobs]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!jobs || jobs.length === 0) return;
      const realShifts = jobs.map(j => ({
        id: j.id, titleUz: j.title, titleRu: j.title, company: j.company, district: j.location,
        pay: j.salary || "280,000 so'm/smena", payNum: 280000, time: j.time || "09:00 - 18:00 (8 soat)", category: 'general',
        lat: 0, lng: 0, badge: j.urgent ? 'Tezkor' : 'Aktiv', urgent: j.urgent || false,
        descriptionUz: j.description || "Ushbu smenada berilgan vazifalarni belgilangan vaqt va tartibga ko'ra mas'uliyat bilan bajarish talab etiladi.",
        descriptionRu: j.description || "Требуется ответственное выполнение поставленных задач в соответствии с регламентом и графиком смены.",
        perksUz: ["⚡ Kunlik to'lov", "🛡️ Baito Kafolati", "🍲 Tushlik ta'minlanadi"]
      }));
      const allShifts = realShifts.slice(0, 6);
      if (allShifts.length > 0) {
        setActiveShift((prev: any) => {
          if (!prev) return allShifts[0];
          const idx = allShifts.findIndex(s => s.id === prev.id);
          return allShifts[(idx + 1) % allShifts.length];
        });
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [jobs]);

  return (
    <section id="map-preview" data-allow-guest="true" className="py-16 lg:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 font-sans relative overflow-hidden border-b border-slate-200/80">
      {/* Background ambient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-1/2 left-0 w-[450px] h-[450px] bg-sky-100/50 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-10 px-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-brand-primary text-xs font-black shadow-2xs">
            <Compass size={14} className="text-brand-primary" />
            <span>Xaritalar va Masofa</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{t.mapTitle}</h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600">{t.mapSubtitle}</p>
        </div>

        {/* 2-Column Grid Stage: Map on left, Job details on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch w-full">
          {/* Left Column: Interactive Map & Live Pins */}
          <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-2.5 sm:p-4 flex flex-col justify-between shadow-xl w-full">
            <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative h-[480px] sm:h-[530px] w-full">
              <MapViewScreen className="h-full w-full rounded-xl sm:rounded-2xl" />
            </div>
          </div>

          {/* Right Column: Selected Job Details Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 flex flex-col justify-between shadow-xl h-[480px] sm:h-[530px] overflow-hidden w-full">
            {/* Header & Scrollable Job Card Details */}
            {!activeShift ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
                Smenalar yuklanmoqda...
              </div>
            ) : (
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-y-auto pr-1 no-scrollbar">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-brand-primary text-xs font-black">
                  <Info size={15} />
                  <span>Tanlangan Smena Tafsiloti</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  {activeShift.badge || 'BUGUN'}
                </span>
              </div>

              {/* Job Card Details */}
              <motion.div
                key={activeShift.id}
                initial={isFirstRender.current ? false : { opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-job-detail', { detail: activeShift.id }))}
                className="space-y-3 bg-slate-50/80 border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl cursor-pointer hover:border-brand-primary/50 transition-all group relative text-slate-900 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold text-brand-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {activeShift.urgent ? 'BUGUN • AKTIV SMENA' : 'REJALASHTIRILGAN'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      ⭐ 4.9 <span className="text-slate-400 font-normal">(120+)</span>
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5 leading-snug group-hover:text-brand-primary transition-colors">{language === 'ru' ? activeShift.titleRu : activeShift.titleUz}</h3>
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mt-1">
                    <Building2 size={13} className="text-brand-primary shrink-0" />
                    <span>{activeShift.company}</span>
                  </p>
                </div>

                <div className="text-base sm:text-lg font-black text-blue-700 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span>{activeShift.pay}</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">Kunlik to'lov</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 font-semibold pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80">
                    <MapPin size={14} className="text-brand-primary shrink-0" />
                    <span className="leading-tight text-slate-800 text-xs font-bold">{activeShift.district}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80">
                    <Clock size={14} className="text-sky-600 shrink-0" />
                    <span className="leading-tight text-slate-800 text-xs font-bold">{activeShift.time}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Qulayliklar va imtiyozlar</span>
                  <div className="flex flex-wrap gap-1">
                    {((activeShift as any).perksUz || ["⚡ Kunlik to'lov", "🚌 Transport ta'minlanadi", "🍲 Tushlik binosida"]).map((perk: string, i: number) => (
                      <span key={i} className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">{perk}</span>
                    ))}
                  </div>
                </div>

                <div className="pt-1.5 text-[10px] sm:text-[11px] text-slate-600 font-medium bg-blue-50/90 p-2 rounded-xl border border-blue-100 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-brand-primary shrink-0" />
                  <span>Smena tugashi bilan maosh kartaga o'tkaziladi</span>
                </div>
              </motion.div>
            </div>

            )}
            {/* Fixed CTA Button at the very bottom */}
            <div className="pt-3 border-t border-slate-200/80 bg-white shrink-0 mt-auto">
              <button
                onClick={() => {
                  try { localStorage.setItem('baito_preselected_role', 'worker'); } catch(e){}
                  setCurrentScreen('login');
                }}
                className="w-full py-3 rounded-xl bg-brand-primary hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                <span>Ushbu smenaga ariza topshirish</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
