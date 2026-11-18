import React from 'react';
import { 
  Navigation, 
  X, 
  ExternalLink, 
  Compass, 
  ArrowUpDown
} from 'lucide-react';
import { RouteInfo } from '../../services/routingService';
import { useAuthStore } from '../../store/useAuthStore';

interface MapRouteCardProps {
  route: RouteInfo;
  onClose: () => void;
  className?: string;
  onFitRoute?: () => void;
  onReverseRoute?: () => void;
}

export const MapRouteCard: React.FC<MapRouteCardProps> = ({
  route,
  onClose,
  className = '',
  onFitRoute,
  onReverseRoute,
}) => {
  const language = useAuthStore(s => s.language);

  const t = {
    uz: {
      title: "Marshrut va Yo'nalish",
      from: "Qayerdan",
      to: "Qayergacha",
      distance: "Masofa",
      openGoogle: "Google Xaritalar",
      openYandex: "Yandex Navigator",
      close: "Marshrutni yopish",
      fitRoute: "Butun marshrutni ko'rish",
      reverseRoute: "Yo'nalishni almashtirish (A ⇄ B)",
      yandexTaxi: "Yandex Go (Taksi chaqirish)",
    },
    ru: {
      title: "Маршрут и направление",
      from: "Откуда",
      to: "Куда",
      distance: "Расстояние",
      openGoogle: "Google Карты",
      openYandex: "Яндекс Навигатор",
      close: "Закрыть маршрут",
      fitRoute: "Показать весь маршрут",
      reverseRoute: "Поменять местами (A ⇄ B)",
      yandexTaxi: "Yandex Go (Вызвать такси)",
    },
    en: {
      title: "Route & Directions",
      from: "From",
      to: "To",
      distance: "Distance",
      openGoogle: "Google Maps",
      openYandex: "Yandex Navigator",
      close: "Close route",
      fitRoute: "Fit whole route",
      reverseRoute: "Reverse route (A ⇄ B)",
      yandexTaxi: "Yandex Go (Order Taxi)",
    },
  }[language] || {
    title: "Marshrut va Yo'nalish",
    from: "Qayerdan",
    to: "Qayergacha",
    distance: "Masofa",
    openGoogle: "Google Xaritalar",
    openYandex: "Yandex Navigator",
    close: "Marshrutni yopish",
    fitRoute: "Butun marshrutni ko'rish",
    reverseRoute: "Yo'nalishni almashtirish (A ⇄ B)",
    yandexTaxi: "Yandex Go (Taksi chaqirish)",
  };

  const dynamicGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}`;

  const dynamicYandexMapsUrl = `https://yandex.com/maps/?rtext=${route.origin.lat},${route.origin.lng}~${route.destination.lat},${route.destination.lng}&rtt=auto`;

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
              {route.distanceText} • {route.durationText}
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

      <div className="p-4 space-y-3.5">
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

        {/* Navigation Action Buttons (Google, Yandex, Yandex Go) */}
        <div className="pt-0.5 space-y-2">
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
