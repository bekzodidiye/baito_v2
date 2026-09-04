import React, { useEffect, useRef, useState } from 'react';
import { loadYandexMaps, YandexMaps } from '../../../utils/loadYandexMaps';

interface JobLocationYandexMapProps {
  lat: number;
  lon: number;
  city: string;
  onLocationSelect: (lat: number, lon: number) => void;
}

export const JobLocationYandexMap: React.FC<JobLocationYandexMapProps> = ({
  lat, lon, onLocationSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const onSelectRef = useRef(onLocationSelect);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const initMap = (ymaps: YandexMaps) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = new ymaps.Map(containerRef.current, {
        center: [lat, lon],
        zoom: 16,
        controls: ['zoomControl'],
      });

      const placemark = new ymaps.Placemark(
        [lat, lon],
        {},
        {
          draggable: true,
          preset: 'islands#violetDotIconWithCaption',
        }
      );

      map.geoObjects.add(placemark);

      placemark.events.add('dragend', () => {
        const coords = placemark.geometry.getCoordinates();
        if (coords) onSelectRef.current(coords[0], coords[1]);
      });

      map.events.add('click', (e: any) => {
        const coords = e.get('coords');
        if (coords) {
          placemark.geometry.setCoordinates(coords);
          onSelectRef.current(coords[0], coords[1]);
        }
      });

      mapRef.current = map;
      placemarkRef.current = placemark;
    };

    // This used to poll for window.ymaps every 300ms with no end and no error
    // state, so a script that never arrived left an employer staring at an
    // empty grey box for as long as they cared to wait.
    loadYandexMaps()
      .then(initMap)
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- built once; the
    // effect below recentres it when the coordinates change.
  }, []);

  useEffect(() => {
    if (mapRef.current && placemarkRef.current) {
      mapRef.current.setCenter([lat, lon], 16, { duration: 300 });
      placemarkRef.current.geometry.setCoordinates([lat, lon]);
    }
  }, [lat, lon]);

  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border-2 border-brand-primary/30 relative shadow-lg bg-slate-100">
      <div ref={containerRef} className="w-full h-full" />
      {failed && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center bg-slate-100"
        >
          <p className="font-semibold text-sm text-slate-700">Xarita yuklanmadi</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Internet aloqasini tekshirib, sahifani yangilang. Joylashuvni
            qo&apos;lda ham kiritishingiz mumkin.
          </p>
        </div>
      )}
    </div>
  );
};
