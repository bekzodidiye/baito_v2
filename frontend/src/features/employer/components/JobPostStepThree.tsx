import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, CheckCircle2, Crosshair, Search, Loader2, Compass, Sparkles, Info } from 'lucide-react';
import { searchAddressSuggestions, reverseGeocodeAddressFull, CITY_COORDINATES, POPULAR_DISTRICTS, AddressSuggestion } from './JobPostStepThree.utils';
import { JobLocationYandexMap } from './JobLocationYandexMap';

interface JobPostStepThreeProps {
  language: string;
  city: string;
  setCity: (val: string) => void;
  addressLine: string;
  setAddressLine: (val: string) => void;
  coordinateX: number;
  setCoordinateX: (val: number) => void;
  coordinateY: number;
  setCoordinateY: (val: number) => void;
}

export const JobPostStepThree: React.FC<JobPostStepThreeProps> = ({
  language, city, setCity, addressLine, setAddressLine, setCoordinateX, setCoordinateY
}) => {
  const [currentCoords, setCurrentCoords] = useState(CITY_COORDINATES[city] || CITY_COORDINATES['Toshkent']);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    setAddressLine('');
    setCurrentCoords(CITY_COORDINATES[newCity] || CITY_COORDINATES['Toshkent']);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (addressLine.trim().length >= 2 && showDropdown) {
        setIsSearching(true);
        setSuggestions(await searchAddressSuggestions(addressLine, city));
        setIsSearching(false);
      } else {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [addressLine, city, showDropdown]);

  useEffect(() => {
    setCoordinateX(currentCoords.lat);
    setCoordinateY(currentCoords.lon);
  }, [currentCoords.lat, currentCoords.lon, setCoordinateX, setCoordinateY]);

  const handleSelectSuggestion = (sug: AddressSuggestion) => {
    setAddressLine(sug.displayName);
    if (sug.lat && sug.lon) setCurrentCoords({ lat: sug.lat, lon: sug.lon });
    setShowDropdown(false);
  };

  const handleLocationSelectFromMap = async (lat: number, lon: number) => {
    setCurrentCoords({ lat, lon });
    const { address, city: detectedCity } = await reverseGeocodeAddressFull(lat, lon);
    if (address) setAddressLine(address);
    if (detectedCity && detectedCity !== city) setCity(detectedCity);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        setGpsSuccess(true);
        const { latitude: lat, longitude: lon } = pos.coords;
        setCurrentCoords({ lat, lon });
        const { address, city: detectedCity } = await reverseGeocodeAddressFull(lat, lon);
        if (address) setAddressLine(address);
        if (detectedCity && detectedCity !== city) setCity(detectedCity);
      },
      () => setIsLocating(false),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const districts = POPULAR_DISTRICTS[city] || [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <MapPin size={14} className="text-brand-primary" />
          {language === 'uz' ? "Shahar / Viloyat *" : "City / Region *"}
        </label>
        <select className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-extrabold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20" value={city} onChange={(e) => handleCityChange(e.target.value)}>
          {Object.keys(CITY_COORDINATES).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {districts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" />
            {city} bo'yicha mashhur joylar:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {districts.map(d => (
              <button key={d.label} type="button" onClick={() => { setCurrentCoords({ lat: d.lat, lon: d.lon }); setAddressLine(`${d.label} tumani`); }} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-primary/10 hover:text-brand-primary border border-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer">
                📍 {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 relative">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <MapPin size={14} className="text-brand-primary" />
          {language === 'uz' ? `Aniq manzil (Ko'cha nomi va bino/uy №) *` : "Exact Address & Building # *"}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder={language === 'uz' ? "Masalan: Ibn Sino ko'chasi, 17A" : "e.g. Ibn Sino street, 17A"}
            className="w-full bg-slate-50 border rounded-xl px-4 py-3 pl-10 text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20"
            value={addressLine}
            onChange={(e) => { setAddressLine(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          {isSearching && <Loader2 size={16} className="absolute right-3.5 top-3.5 text-brand-primary animate-spin" />}
        </div>

        <AnimatePresence>
          {showDropdown && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              {suggestions.map((sug, idx) => (
                <button key={idx} type="button" onClick={() => handleSelectSuggestion(sug)} className="p-3 text-left hover:bg-purple-50/70 border-b border-slate-100 last:border-none flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <MapPin size={14} className="text-brand-primary shrink-0" />
                  <span className="truncate">{sug.displayName}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button type="button" onClick={handleGetCurrentLocation} disabled={isLocating} className="w-full py-3 px-4 bg-brand-primary/10 hover:bg-brand-primary/15 text-brand-primary font-bold text-xs rounded-xl border border-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer">
        {isLocating ? <Navigation size={16} className="animate-spin" /> : gpsSuccess ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Crosshair size={16} />}
        <span>{isLocating ? "GPS joylashuv..." : gpsSuccess ? "GPS belgilandi!" : "📍 Hozirgi joylashuvimni belgilash (GPS)"}</span>
      </button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Compass size={14} className="text-brand-primary" />
            <span>{language === 'uz' ? "Yandex Xarita *" : "Yandex Map *"}</span>
          </label>
          <span className="text-[10px] text-brand-primary font-extrabold px-2 py-0.5 bg-brand-primary/10 rounded-full">Yandex Maps Official</span>
        </div>

        <div className="flex items-center gap-1.5 p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl text-purple-900 text-xs font-semibold">
          <Info size={15} className="text-brand-primary shrink-0" />
          <span>{language === 'uz' ? "Maslahat: Xaritadagi pin'ni sudrab yoki bosib aniq bino va eshikni belgilang" : "Tip: Drag pin to mark entrance"}</span>
        </div>

        <JobLocationYandexMap lat={currentCoords.lat} lon={currentCoords.lon} city={city} onLocationSelect={handleLocationSelectFromMap} />

        {addressLine && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="truncate">Tanlangan manzil: {city}, {addressLine}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
