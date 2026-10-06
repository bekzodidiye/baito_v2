/**
 * Yandex Maps, fetched only when a screen actually shows a map.
 *
 * The script used to sit in index.html and load on every page for every
 * visitor, blocking the render — even though one employer screen uses it.
 * The URL (with its public client key) still lives in index.html, on a meta
 * tag, so deployment keeps a single place to change it.
 */

// window.ymaps is declared as `any` alongside the address helpers that also
// use it; this module keeps that shape rather than competing with it.
export type YandexMaps = any;

let pending: Promise<YandexMaps> | null = null;

/** Yandex's own locale codes, from ours. */
const YANDEX_LOCALES: Record<string, string> = {
  uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US',
};

/** The map draws its own controls — the route button, the terms link — and it
 *  labels them from the `lang` on the script URL. That was pinned to `uz_UZ`
 *  in index.html, so a Russian employer placing a pin read "Borish usuli" and
 *  "Foydalanish shartlari" on an otherwise Russian form.
 *
 *  The API loads once per page and cannot be re-localised afterwards, so a
 *  language changed while a map is already on screen takes effect on the next
 *  load. Every entry point to a map is a fresh navigation, so in practice the
 *  first map a visitor opens is already in their language.
 */
export function loadYandexMaps(language: string = 'uz'): Promise<YandexMaps> {
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (pending) return pending;

  pending = new Promise<YandexMaps>((resolve, reject) => {
    const configured = document
      .querySelector<HTMLMetaElement>('meta[name="yandex-maps-src"]')
      ?.content;

    if (!configured) {
      reject(new Error('Yandex Maps manzili topilmadi'));
      return;
    }

    let src = configured;
    try {
      const url = new URL(configured);
      url.searchParams.set('lang', YANDEX_LOCALES[language] ?? YANDEX_LOCALES.uz);
      src = url.toString();
    } catch {
      // A malformed meta tag is not worth failing the map over: fall back to
      // the URL exactly as configured.
    }

    const tag = document.createElement('script');
    tag.src = src;
    tag.async = true;
    tag.onload = () => {
      if (window.ymaps) {
        // ymaps.ready fires once the API's own modules are in place.
        window.ymaps.ready(() => resolve(window.ymaps));
      } else {
        reject(new Error('Yandex Maps yuklandi, lekin ishga tushmadi'));
      }
    };
    // A failed load must not be cached as pending: the next mount should try
    // again rather than wait on a promise that will never settle.
    tag.onerror = () => {
      pending = null;
      tag.remove();
      reject(new Error('Yandex Maps yuklanmadi'));
    };

    document.head.appendChild(tag);
  });

  return pending;
}
