import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface JobLocationLeafletMapProps {
  lat: number;
  lon: number;
  city: string;
  onLocationSelect: (lat: number, lon: number) => void;
}

export const JobLocationLeafletMap: React.FC<JobLocationLeafletMapProps> = ({
  lat, lon, city, onLocationSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    // Google Maps HD Uzbek Latin tile layer - 100% Uzbek Latin street labels, zero Cyrillic
    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&hl=uz&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps',
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-job-pin',
      html: `<div class="w-11 h-11 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
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
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      onSelectRef.current(clickLat, clickLng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    const timer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.flyTo([lat, lon], 15, { duration: 1.2 });
    marker.setLatLng([lat, lon]);
    setTimeout(() => map.invalidateSize(), 150);
  }, [lat, lon, city]);

  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border-2 border-brand-primary/30 relative shadow-lg">
      <div ref={containerRef} className="w-full h-full z-10" />
    </div>
  );
};
