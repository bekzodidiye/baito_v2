import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * This hook sits between the search box and the API. If it stopped holding the
 * value, every keystroke would become a request; if it stopped releasing it,
 * search would appear broken. Neither shows up in a type check.
 */
describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the first value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('kuryer'));
    expect(result.current).toBe('kuryer');
  });

  it('holds a change until the delay has passed', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'k' },
    });

    rerender({ v: 'kuryer' });
    expect(result.current).toBe('k');

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('k');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('kuryer');
  });

  it('restarts the wait on every keystroke, so typing fires once', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    });

    for (const v of ['k', 'ku', 'kur', 'kury']) {
      rerender({ v });
      act(() => { vi.advanceTimersByTime(200); });
      expect(result.current).toBe('');
    }

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('kury');
  });

  it('honours a custom delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 1000), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('b');
  });
});
