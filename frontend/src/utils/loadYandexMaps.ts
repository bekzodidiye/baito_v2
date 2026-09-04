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

export function loadYandexMaps(): Promise<YandexMaps> {
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (pending) return pending;

  pending = new Promise<YandexMaps>((resolve, reject) => {
    const src = document
      .querySelector<HTMLMetaElement>('meta[name="yandex-maps-src"]')
      ?.content;

    if (!src) {
      reject(new Error('Yandex Maps manzili topilmadi'));
      return;
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
