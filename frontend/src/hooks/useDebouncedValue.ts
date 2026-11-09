import { useEffect, useState } from 'react';

/**
 * Holds a value still until updates settle after delay, preventing high-frequency API calls.
 * @param value The reactive value to debounce (e.g. search keyword).
 * @param delayMs Debounce threshold in milliseconds (default: 300ms).
 * @example const debouncedSearch = useDebouncedValue(searchTerm, 400);
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
