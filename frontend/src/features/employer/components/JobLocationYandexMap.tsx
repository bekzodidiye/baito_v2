import React, { useEffect, useRef } from 'react';

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

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = () => {
      if (!window.ymaps || mapRef.current) return;

      window.ymaps.ready(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new window.ymaps.Map(containerRef.current, {
          center: [lat, lon],
          zoom: 16,
          controls: ['zoomControl'],
        });

        const placemark = new window.ymaps.Placemark(
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
      });
    };

    if (window.ymaps) {
      initMap();
    } else {
      const timer = setInterval(() => {
        if (window.ymaps) {
          clearInterval(timer);
          initMap();
        }
      }, 300);
      return () => clearInterval(timer);
    }
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
    </div>
  );
};
