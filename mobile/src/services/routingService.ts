import { Language } from '../translations';
import { calculateDistance } from '../components/map/mapUtils';

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  streetName: string;
  type: string;
  modifier?: string;
  location?: [number, number]; // [lat, lng]
}

export interface RouteInfo {
  origin: {
    lat: number;
    lng: number;
    name: string;
  };
  destination: {
    lat: number;
    lng: number;
    name: string;
    company?: string;
  };
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet
  distanceMeters: number;
  distanceKm: number;
  distanceText: string; // e.g. "12.4 km" or "850 metr"
  durationSeconds: number;
  durationMinutes: number;
  durationText: string; // e.g. "18 daqiqa"
  transitDurationMinutes: number;
  transitDurationText: string; // e.g. "32 daqiqa"
  walkingDurationMinutes: number;
  walkingDurationText: string; // e.g. "2 soat 15 daqiqa"
  steps: RouteStep[];
  googleMapsUrl: string;
  yandexMapsUrl: string;
  yandexTaxiUrl: string;
}

export function formatDistance(meters: number, lang: Language): string {
  if (meters < 1000) {
    const m = Math.round(meters);
    return lang === 'ru' ? `${m} м` : lang === 'en' ? `${m} m` : `${m} metr`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

export function formatDuration(seconds: number, lang: Language): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return lang === 'ru' ? `${totalMinutes} мин` : lang === 'en' ? `${totalMinutes} min` : `${totalMinutes} daqiqa`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return lang === 'ru' ? `${hours} ч` : lang === 'en' ? `${hours} hr` : `${hours} soat`;
  }
  return lang === 'ru' ? `${hours} ч ${mins} мин` : lang === 'en' ? `${hours} hr ${mins} min` : `${hours} soat ${mins} daqiqa`;
}

function getStepInstruction(step: any, lang: Language): string {
  const type = step?.maneuver?.type || '';
  const mod = step?.maneuver?.modifier || '';
  const street = step?.name ? ` (${step.name})` : '';

  if (type === 'depart') {
    return lang === 'ru'
      ? `Начните движение${street}`
      : lang === 'en'
      ? `Start driving${street}`
      : `Harakatni boshlang${street}`;
  }
  if (type === 'arrive') {
    return lang === 'ru'
      ? 'Вы прибыли в пункт назначения'
      : lang === 'en'
      ? 'You have arrived at your destination'
      : 'Belgilangan manzilga yetib keldingiz';
  }
  if (type === 'roundabout' || type === 'rotary') {
    return lang === 'ru'
      ? `Въезд на круговое движение${street}`
      : lang === 'en'
      ? `Enter roundabout${street}`
      : `Aylanma harakatga kiring${street}`;
  }
  if (mod === 'left' || mod === 'sharp left') {
    return lang === 'ru'
      ? `Поверните налево${street}`
      : lang === 'en'
      ? `Turn left${street}`
      : `Chapga buriling${street}`;
  }
  if (mod === 'right' || mod === 'sharp right') {
    return lang === 'ru'
      ? `Поверните направо${street}`
      : lang === 'en'
      ? `Turn right${street}`
      : `O'ngga buriling${street}`;
  }
  if (mod === 'slight left') {
    return lang === 'ru'
      ? `Держитесь левее${street}`
      : lang === 'en'
      ? `Keep left${street}`
      : `Biroz chaproqdan yuring${street}`;
  }
  if (mod === 'slight right') {
    return lang === 'ru'
      ? `Держитесь правее${street}`
      : lang === 'en'
      ? `Keep right${street}`
      : `Biroz o'ngroqdan yuring${street}`;
  }
  if (mod === 'uturn') {
    return lang === 'ru'
      ? `Развернитесь${street}`
      : lang === 'en'
      ? `Make a U-turn${street}`
      : `Ortga buriling (qaytish)${street}`;
  }
  return lang === 'ru'
    ? `Продолжайте движение прямо${street}`
    : lang === 'en'
    ? `Continue straight${street}`
    : `To'g'ri davom eting${street}`;
}

export async function fetchRoute(
  origin: { lat: number; lng: number; name?: string },
  destination: { lat: number; lng: number; name?: string; company?: string },
  lang: Language = 'uz'
): Promise<RouteInfo> {
  const originName = origin.name || (lang === 'ru' ? 'Ваше местоположение' : lang === 'en' ? 'Your location' : 'Sizning joylashuvingiz');
  const destinationName = destination.name || (destination.company ? `${destination.company} (${lang === 'ru' ? 'Рабочее место' : lang === 'en' ? 'Workplace' : 'Ish joyi'})` : (lang === 'ru' ? 'Пункт назначения' : lang === 'en' ? 'Destination' : 'Belgilangan manzil'));

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  const yandexMapsUrl = `https://yandex.com/maps/?rtext=${origin.lat},${origin.lng}~${destination.lat},${destination.lng}&rtt=auto`;
  const yandexTaxiUrl = `https://3.redirect.appmetrica.yandex.com/route?start-lat=${origin.lat}&start-lon=${origin.lng}&end-lat=${destination.lat}&end-lon=${destination.lng}&app=taxi&ref=baito`;

  // 1. Try real road routing via OSRM public API with 4s timeout
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const distanceMeters = Math.round(route.distance);
        const distanceKm = Number((distanceMeters / 1000).toFixed(1));
        const distanceText = formatDistance(distanceMeters, lang);

        const durationSeconds = Math.round(route.duration);
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
        const durationText = formatDuration(durationSeconds, lang);

        // Transit estimated at ~24 km/h average city transit speed + 6 min stop/wait
        const transitSec = Math.round((distanceMeters / (24000 / 3600)) + 360);
        const transitDurationMinutes = Math.max(1, Math.round(transitSec / 60));
        const transitDurationText = formatDuration(transitSec, lang);

        // Walking estimated at ~4.5 km/h
        const walkingSec = Math.round(distanceMeters / (4500 / 3600));
        const walkingDurationMinutes = Math.max(1, Math.round(walkingSec / 60));
        const walkingDurationText = formatDuration(walkingSec, lang);

        const rawSteps = route.legs?.[0]?.steps || [];
        const steps: RouteStep[] = rawSteps.map((s: any) => {
          const stepLocation: [number, number] | undefined =
            Array.isArray(s.maneuver?.location) && s.maneuver.location.length >= 2
              ? [s.maneuver.location[1], s.maneuver.location[0]]
              : undefined;

          return {
            instruction: getStepInstruction(s, lang),
            distanceMeters: Math.round(s.distance || 0),
            distanceText: formatDistance(s.distance || 0, lang),
            durationSeconds: Math.round(s.duration || 0),
            durationText: formatDuration(s.duration || 0, lang),
            streetName: s.name || '',
            type: s.maneuver?.type || '',
            modifier: s.maneuver?.modifier || '',
            location: stepLocation,
          };
        });

        return {
          origin: { ...origin, name: originName },
          destination: { ...destination, name: destinationName },
          coordinates,
          distanceMeters,
          distanceKm,
          distanceText,
          durationSeconds,
          durationMinutes,
          durationText,
          transitDurationMinutes,
          transitDurationText,
          walkingDurationMinutes,
          walkingDurationText,
          steps,
          googleMapsUrl,
          yandexMapsUrl,
          yandexTaxiUrl,
        };
      }
    }
  } catch (err) {
    console.warn('[RoutingService] OSRM fetch failed or timed out, using fallback:', err);
  }

  // 2. Fallback: Accurate Haversine calculation with 1.35x road winding factor
  const straightDistKm = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const roadDistKm = straightDistKm * 1.35;
  const distanceMeters = Math.round(roadDistKm * 1000);
  const distanceKm = Number(roadDistKm.toFixed(1));
  const distanceText = formatDistance(distanceMeters, lang);

  // Car average 38 km/h in urban/suburban traffic
  const carDurationSec = Math.round((roadDistKm / 38) * 3600);
  const durationMinutes = Math.max(1, Math.round(carDurationSec / 60));
  const durationText = formatDuration(carDurationSec, lang);

  // Transit average 22 km/h + 8 min wait
  const transitSec = Math.round(((roadDistKm / 22) * 3600) + 480);
  const transitDurationMinutes = Math.max(1, Math.round(transitSec / 60));
  const transitDurationText = formatDuration(transitSec, lang);

  // Walking at 4.5 km/h
  const walkingSec = Math.round((roadDistKm / 4.5) * 3600);
  const walkingDurationMinutes = Math.max(1, Math.round(walkingSec / 60));
  const walkingDurationText = formatDuration(walkingSec, lang);

  const fallbackSteps: RouteStep[] = [
    {
      instruction: lang === 'ru' ? 'Начните движение от вашего местоположения' : lang === 'en' ? 'Start journey from your location' : "Joylashuvingizdan harakatni boshlang",
      distanceMeters: Math.round(distanceMeters * 0.2),
      distanceText: formatDistance(distanceMeters * 0.2, lang),
      durationSeconds: Math.round(carDurationSec * 0.2),
      durationText: formatDuration(carDurationSec * 0.2, lang),
      streetName: '',
      type: 'depart',
      location: [origin.lat, origin.lng],
    },
    {
      instruction: lang === 'ru' ? `Направляйтесь в сторону: ${destinationName}` : lang === 'en' ? `Head towards: ${destinationName}` : `${destinationName} tomon harakatlaning`,
      distanceMeters: Math.round(distanceMeters * 0.8),
      distanceText: formatDistance(distanceMeters * 0.8, lang),
      durationSeconds: Math.round(carDurationSec * 0.8),
      durationText: formatDuration(carDurationSec * 0.8, lang),
      streetName: destinationName,
      type: 'continue',
      location: [
        Number(((origin.lat + destination.lat) / 2).toFixed(6)),
        Number(((origin.lng + destination.lng) / 2).toFixed(6)),
      ],
    },
    {
      instruction: lang === 'ru' ? 'Вы прибыли в пункт назначения' : lang === 'en' ? 'You have arrived at your destination' : 'Belgilangan manzilga yetib keldingiz',
      distanceMeters: 0,
      distanceText: formatDistance(0, lang),
      durationSeconds: 0,
      durationText: formatDuration(0, lang),
      streetName: destinationName,
      type: 'arrive',
      location: [destination.lat, destination.lng],
    },
  ];

  return {
    origin: { ...origin, name: originName },
    destination: { ...destination, name: destinationName },
    coordinates: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
    distanceMeters,
    distanceKm,
    distanceText,
    durationSeconds: carDurationSec,
    durationMinutes,
    durationText,
    transitDurationMinutes,
    transitDurationText,
    walkingDurationMinutes,
    walkingDurationText,
    steps: fallbackSteps,
    googleMapsUrl,
    yandexMapsUrl,
    yandexTaxiUrl,
  };
}
