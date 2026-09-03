import { useEffect, useState } from 'react';

/** Hold a value still until it stops changing, so a search box does not fire a
 *  request per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
