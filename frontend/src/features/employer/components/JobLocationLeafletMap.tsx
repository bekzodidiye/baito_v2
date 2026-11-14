import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface JobLocationLeafletMapProps {
  lat: number;
  lon: number;
  city: string;
  onLocationSelect: (lat: number, lon: number) => void;
}

export const JobLocationLeafletMap: React.FC<JobLocationLeafletMapProps> = ({
  lat, lon, onLocationSelect
}) => {
  const language = useAuthStore(st => st.language);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lon],
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div style="background-color: #8b5cf6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([lat, lon], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onSelectRef.current(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const pos = e.latlng;
      marker.setLatLng(pos);
      onSelectRef.current(pos.lat, pos.lng);
    });

    leafletMapRef.current = map;
    markerRef.current = marker;

    // Progressive invalidations to ensure full canvas rendering inside multistep wizard
    map.invalidateSize({ pan: false });
    const t1 = setTimeout(() => map.invalidateSize({ pan: false }), 60);
    const t2 = setTimeout(() => map.invalidateSize({ pan: false }), 150);
    const t3 = setTimeout(() => {
      map.invalidateSize({ pan: false });
      map.setView([lat, lon], 16, { animate: false });
    }, 400);

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize({ pan: false });
        }
      }, 50);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(mapRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      leafletMapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (leafletMapRef.current && markerRef.current) {
      leafletMapRef.current.setView([lat, lon], 16);
      markerRef.current.setLatLng([lat, lon]);
    }
  }, [lat, lon]);

  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border-2 border-brand-primary/30 relative shadow-lg bg-slate-100 z-10">
      <div ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />
    </div>
  );
};
