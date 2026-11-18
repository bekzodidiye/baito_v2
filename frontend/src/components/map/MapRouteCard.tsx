import React, { useState } from 'react';
import { 
  Navigation, 
  MapPin, 
  Car, 
  Bus, 
  Footprints, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Compass, 
  CornerDownRight, 
  CornerDownLeft, 
  ArrowUp, 
  RotateCcw,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import { RouteInfo, RouteStep } from '../../services/routingService';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

interface MapRouteCardProps {
  route: RouteInfo;
  onClose: () => void;
  className?: string;
  onStepClick?: (step: RouteStep) => void;
  onFitRoute?: () => void;
  onReverseRoute?: () => void;
}

export const MapRouteCard: React.FC<MapRouteCardProps> = ({
  route,
  onClose,
  className = '',
  onStepClick,
  onFitRoute,
  onReverseRoute,
}) => {
  const language = useAuthStore(s => s.language);
  const activeRouteMode = useUIStore(s => s.activeRouteMode) || 'car';
  const setActiveRouteMode = useUIStore(s => s.setActiveRouteMode);
  const activeRouteStep = useUIStore(s => s.activeRouteStep);
  const setActiveRouteStep = useUIStore(s => s.setActiveRouteStep);
  const [showSteps, setShowSteps] = useState(false);

  const t = {
    uz: {
      title: "Marshrut va Yo'nalish",
      from: "Qayerdan",
      to: "Qayergacha",
      distance: "Masofa",
      howToGet: "Qanday borsa bo'ladi",
      byCar: "Avtomobilda",
      byTransit: "Jamoat transporti",
      byFoot: "Piyoda",
      steps: "Yo'l ko'rsatmalari",
      openGoogle: "Google Xaritalar",
      openYandex: "Yandex Navigator",
      close: "Marshrutni yopish",
      stepList: "qadam",
      fitRoute: "Butun marshrutni ko'rish",
      reverseRoute: "Yo'nalishni almashtirish (A ⇄ B)",
      yandexTaxi: "Yandex Go (Taksi chaqirish)",
    },
    ru: {
      title: "Маршрут и направление",
      from: "Откуда",
      to: "Куда",
      distance: "Расстояние",
      howToGet: "Как добраться",
      byCar: "На автомобиле",
      byTransit: "Общ. транспорт",
      byFoot: "Пешком",
      steps: "Инструкции маршрута",
      openGoogle: "Google Карты",
      openYandex: "Яндекс Навигатор",
      close: "Закрыть маршрут",
      stepList: "шагов",
      fitRoute: "Показать весь маршрут",
      reverseRoute: "Поменять местами (A ⇄ B)",
      yandexTaxi: "Yandex Go (Вызвать такси)",
    },
    en: {
      title: "Route & Directions",
      from: "From",
      to: "To",
      distance: "Distance",
      howToGet: "How to get there",
      byCar: "By Car",
      byTransit: "Public Transit",
      byFoot: "Walking",
      steps: "Turn-by-turn steps",
      openGoogle: "Google Maps",
      openYandex: "Yandex Navigator",
      close: "Close route",
      stepList: "steps",
      fitRoute: "Fit whole route",
      reverseRoute: "Reverse route (A ⇄ B)",
      yandexTaxi: "Yandex Go (Order Taxi)",
    },
  }[language] || {
    title: "Marshrut va Yo'nalish",
    from: "Qayerdan",
    to: "Qayergacha",
    distance: "Masofa",
    howToGet: "Qanday borsa bo'ladi",
    byCar: "Avtomobilda",
    byTransit: "Jamoat transporti",
    byFoot: "Piyoda",
    steps: "Yo'l ko'rsatmalari",
    openGoogle: "Google Xaritalar",
    openYandex: "Yandex Navigator",
    close: "Marshrutni yopish",
    stepList: "qadam",
    fitRoute: "Butun marshrutni ko'rish",
    reverseRoute: "Yo'nalishni almashtirish (A ⇄ B)",
    yandexTaxi: "Yandex Go (Taksi chaqirish)",
  };

  const getStepIcon = (step: RouteStep) => {
    if (step.type === 'arrive') {
      return <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />;
    }
    if (step.modifier?.includes('left')) {
      return <CornerDownLeft size={14} className="text-blue-600 shrink-0 mt-0.5" />;
    }
    if (step.modifier?.includes('right')) {
      return <CornerDownRight size={14} className="text-blue-600 shrink-0 mt-0.5" />;
    }
    if (step.modifier === 'uturn') {
      return <RotateCcw size={14} className="text-amber-600 shrink-0 mt-0.5" />;
    }
    return <ArrowUp size={14} className="text-blue-600 shrink-0 mt-0.5" />;
  };

  const currentDuration = activeRouteMode === 'transit'
    ? route.transitDurationText
    : activeRouteMode === 'walking'
    ? route.walkingDurationText
    : route.durationText;

  const dynamicGoogleMapsUrl = activeRouteMode === 'walking'
    ? `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}&travelmode=walking`
    : activeRouteMode === 'transit'
    ? `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}&travelmode=transit`
    : `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}&travelmode=driving`;

  const dynamicYandexMapsUrl = activeRouteMode === 'walking'
    ? `https://yandex.com/maps/?rtext=${route.origin.lat},${route.origin.lng}~${route.destination.lat},${route.destination.lng}&rtt=pd`
    : activeRouteMode === 'transit'
    ? `https://yandex.com/maps/?rtext=${route.origin.lat},${route.origin.lng}~${route.destination.lat},${route.destination.lng}&rtt=mt`
    : `https://yandex.com/maps/?rtext=${route.origin.lat},${route.origin.lng}~${route.destination.lat},${route.destination.lng}&rtt=auto`;

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-200/90 overflow-hidden text-slate-800 transition-all ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50/80 to-slate-50/60 border-b border-slate-100">
        <button
          type="button"
          onClick={onFitRoute}
          className="flex items-center gap-2 text-left bg-transparent border-none cursor-pointer p-0 group"
          title={t.fitRoute}
        >
          <div className="w-7 h-7 rounded-lg bg-brand-primary text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Compass size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary block leading-none">
              {t.title}
            </span>
            <span className="text-xs font-black text-slate-900 leading-tight">
              {route.distanceText} • {currentDuration}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer border-none"
          title={t.close}
          aria-label={t.close}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto no-scrollbar">
        {/* Origin & Destination Section */}
        <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 relative">
          <div className="space-y-2.5 pr-9">
            {/* Origin (A) */}
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-black text-[11px] leading-none">
                A
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                  {t.from}
                </p>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {route.origin.name}
                </p>
              </div>
            </div>

            {/* Dotted connector */}
            <div className="ml-2.5 border-l-2 border-dashed border-slate-300 h-3" />

            {/* Destination (B) */}
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-black text-[11px] leading-none">
                B
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                  {t.to}
                </p>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {route.destination.name}
                </p>
              </div>
            </div>
          </div>

          {/* Swap Button (A ⇄ B) */}
          {onReverseRoute && (
            <button
              type="button"
              onClick={onReverseRoute}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer active:scale-90"
              title={t.reverseRoute}
              aria-label={t.reverseRoute}
            >
              <ArrowUpDown size={15} />
            </button>
          )}
        </div>

        {/* Travel Modes (Qanday borsa bo'ladi) */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
            <span>{t.howToGet}</span>
            <span className="text-brand-primary font-black">{route.distanceText}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {/* By Car */}
            <button
              type="button"
              onClick={() => setActiveRouteMode('car')}
              className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                activeRouteMode === 'car'
                  ? 'bg-blue-50/90 border-brand-primary text-brand-primary ring-2 ring-brand-primary/10 shadow-xs'
                  : 'bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              <Car size={16} className="mx-auto mb-1 text-inherit" />
              <div className="text-[10px] font-bold truncate">{t.byCar}</div>
              <div className="text-[11px] font-black text-slate-900 mt-0.5 truncate">
                {route.durationText}
              </div>
            </button>

            {/* By Transit */}
            <button
              type="button"
              onClick={() => setActiveRouteMode('transit')}
              className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                activeRouteMode === 'transit'
                  ? 'bg-emerald-50/90 border-emerald-600 text-emerald-700 ring-2 ring-emerald-600/10 shadow-xs'
                  : 'bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              <Bus size={16} className="mx-auto mb-1 text-inherit" />
              <div className="text-[10px] font-bold truncate">{t.byTransit}</div>
              <div className="text-[11px] font-black text-slate-900 mt-0.5 truncate">
                {route.transitDurationText}
              </div>
            </button>

            {/* By Foot */}
            <button
              type="button"
              onClick={() => setActiveRouteMode('walking')}
              className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                activeRouteMode === 'walking'
                  ? 'bg-blue-50/90 border-brand-primary text-brand-primary ring-2 ring-brand-primary/10 shadow-xs'
                  : 'bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              <Footprints size={16} className="mx-auto mb-1 text-inherit" />
              <div className="text-[10px] font-bold truncate">{t.byFoot}</div>
              <div className="text-[11px] font-black text-slate-900 mt-0.5 truncate">
                {route.walkingDurationText}
              </div>
            </button>
          </div>
        </div>

        {/* Turn-by-Turn Steps Accordion */}
        {route.steps && route.steps.length > 0 && (
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSteps(!showSteps)}
              className="w-full px-3 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer border-none"
            >
              <div className="flex items-center gap-1.5">
                <Navigation size={13} className="text-brand-primary rotate-45" />
                <span>{t.steps}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">
                  {route.steps.length} {t.stepList}
                </span>
              </div>
              {showSteps ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showSteps && (
              <div className="p-2.5 bg-white space-y-1 border-t border-slate-100 max-h-48 overflow-y-auto">
                {route.steps.map((step, idx) => {
                  const isActive = activeRouteStep && (
                    (activeRouteStep.location && step.location && 
                      activeRouteStep.location[0] === step.location[0] && 
                      activeRouteStep.location[1] === step.location[1]) ||
                    activeRouteStep.instruction === step.instruction
                  );
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setActiveRouteStep(isActive ? null : step);
                        onStepClick?.(step);
                      }}
                      className={`flex items-start gap-2 text-xs py-1.5 px-2 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/50'
                          : 'border-transparent hover:bg-blue-50/80 border-b-slate-50'
                      } ${step.location ? 'cursor-pointer active:bg-blue-100/70' : ''}`}
                      title={step.location ? "Xaritada bu burilishni ko'rish" : undefined}
                    >
                      {getStepIcon(step)}
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-semibold leading-snug ${isActive ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                          {step.instruction}
                        </p>
                        {step.distanceMeters > 0 && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {step.distanceText} • {step.durationText}
                          </p>
                        )}
                      </div>
                      {step.location && (
                        <MapPin size={12} className={isActive ? 'text-amber-500 shrink-0 mt-0.5' : 'text-slate-300 shrink-0 mt-0.5'} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="pt-1 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Google Maps Button */}
            <a
              href={dynamicGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-9 px-3 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer no-underline active:scale-[0.98]"
            >
              <Compass size={14} />
              <span>{t.openGoogle}</span>
              <ExternalLink size={12} className="opacity-80" />
            </a>

            {/* Yandex Maps Button */}
            <a
              href={dynamicYandexMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-9 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer no-underline active:scale-[0.98]"
            >
              <Navigation size={14} />
              <span>{t.openYandex}</span>
              <ExternalLink size={12} className="opacity-80" />
            </a>
          </div>

          {/* Yandex Go Taxi Direct Deep Link */}
          {route.yandexTaxiUrl && (
            <a
              href={route.yandexTaxiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-9 px-3 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer no-underline active:scale-[0.98] border border-amber-500/30"
            >
              <span className="text-sm">🚖</span>
              <span>{t.yandexTaxi}</span>
              <ExternalLink size={12} className="text-slate-700" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
