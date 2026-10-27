import { translateApiError } from '../utils/apiErrorTranslator';
import { STORAGE_KEYS, getStorageItem } from '../constants/storage';

type Lang = 'uz' | 'ru' | 'en';
const LANGS: readonly Lang[] = ['uz', 'ru', 'en'];

/** The reader's language, read the way the store reads it.
 *
 *  Taken from storage rather than the store so this module stays free of it:
 *  the store is what screens subscribe to, and the client is below them. */
const readLanguage = (): Lang => {
  try {
    const stored = getStorageItem(STORAGE_KEYS.LANGUAGE);
    return LANGS.includes(stored as Lang) ? (stored as Lang) : 'uz';
  } catch {
    return 'uz';
  }
};

/** The last resort, when the server failed without saying anything at all. */
const REQUEST_FAILED: Record<Lang, string> = {
  uz: "So'rov bajarilmadi ({})",
  ru: 'Запрос не выполнен ({})',
  en: 'The request failed ({})',
};

const API_BASE_URL = '/api/v1';

// The session lives in httpOnly cookies the browser attaches automatically —
// JavaScript never reads or stores a token.
let refreshInFlight: Promise<boolean> | null = null;

const refreshSession = async (): Promise<boolean> => {
  // Several requests failing at once used to fire several refreshes, each
  // rotating the cookie out from under the others.
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Allow the next genuine 401 to try again.
        setTimeout(() => { refreshInFlight = null; }, 0);
      }
    })();
  }
  return refreshInFlight;
};

export const apiClient = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      // Setting Content-Type on a FormData body strips the multipart boundary
      // and the request becomes unparseable.
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorDetail = typeof error.detail === 'string'
      ? error.detail
      : Array.isArray(error.detail)
        ? error.detail.map((e: any) => e.msg).join(', ')
        : '';

    if (!isRetry && response.status === 401) {
      if (await refreshSession()) {
        return apiClient(endpoint, options, true);
      }
      // Only treat this as an expired session if there was a session to begin
      // with. A 401 during signup — e.g. uploading a document before the
      // account exists — used to fire this event and bounce the user back to
      // the login screen in the middle of registering.
      let wasLoggedIn = false;
      try {
        wasLoggedIn = getStorageItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
      } catch {
        wasLoggedIn = true; // storage blocked: fall back to the old behaviour
      }
      if (wasLoggedIn) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    // Translated here rather than at each screen: every caller shows this
    // message, and the server writes it in Uzbek whatever the reader chose.
    const lang = readLanguage();
    throw new Error(
      errorDetail
        ? translateApiError(errorDetail, lang)
        : REQUEST_FAILED[lang].replace('{}', String(response.status)),
    );
  }

  if (response.status === 204) return null;
  return response.json().catch(() => ({}));
};

/** Some admin list endpoints return `{ total, items }`; older ones a bare array. */
export const unwrapList = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload.items)) return payload.items as T[];
  return [];
};
