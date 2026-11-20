import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapViewportBounds } from './useMapViewportBounds';

const createMockMap = (initialZoom = 5, initialBounds = { south: 37, north: 45, west: 56, east: 73 }) => {
  let currentZoom = initialZoom;
  let currentBounds = {
    getSouth: () => initialBounds.south,
    getNorth: () => initialBounds.north,
    getWest: () => initialBounds.west,
    getEast: () => initialBounds.east,
    isValid: () => true,
  };
  const listeners: Record<string, Function[]> = {};

  return {
    getZoom: () => currentZoom,
    setZoom: (z: number) => { currentZoom = z; },
    getBounds: () => currentBounds,
    setBounds: (b: { south: number; north: number; west: number; east: number }) => {
      currentBounds = {
        getSouth: () => b.south,
        getNorth: () => b.north,
        getWest: () => b.west,
        getEast: () => b.east,
        isValid: () => true,
      };
    },
    on: (event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    off: (event: string, fn: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(f => f !== fn);
      }
    },
    fire: (event: string) => {
      (listeners[event] || []).forEach(fn => fn());
    },
    getListenerCount: (event: string) => (listeners[event] || []).length,
  };
};

describe('useMapViewportBounds — Debounce and Viewport Tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in nationwide mode (bounds = null) when initial zoom is <= 9', () => {
    const mockMap = createMockMap(5.0);
    const mapRef = { current: mockMap as any };

    const { result } = renderHook(() =>
      useMapViewportBounds({
        mapInstanceRef: mapRef,
        isMapReady: true,
      })
    );

    expect(result.current.viewportBounds).toBeNull();
    expect(result.current.isViewportReady).toBe(true);
  });

  it('debounces bounds updates by 400ms after moveend when zoom > 9', () => {
    const mockMap = createMockMap(12.0, { south: 41.28, north: 41.34, west: 69.21, east: 69.25 });
    const mapRef = { current: mockMap as any };

    const { result } = renderHook(() =>
      useMapViewportBounds({
        mapInstanceRef: mapRef,
        isMapReady: true,
      })
    );

    // Initial check triggers debounce on mount when zoom > 9; not ready yet
    expect(result.current.viewportBounds).toBeNull();
    expect(result.current.isViewportReady).toBe(false);

    // Fast-forward 399ms: must not update yet
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current.viewportBounds).toBeNull();
    expect(result.current.isViewportReady).toBe(false);

    // Fast-forward 1ms (reaching 400ms): now updates
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.viewportBounds).toEqual({
      minLat: 41.28,
      maxLat: 41.34,
      minLng: 69.21,
      maxLng: 69.25,
    });
    expect(result.current.isViewportReady).toBe(true);
  });

  it('batches rapid moveend and zoomend events into a single query', () => {
    const mockMap = createMockMap(12.0, { south: 41.28, north: 41.34, west: 69.21, east: 69.25 });
    const mapRef = { current: mockMap as any };

    const { result } = renderHook(() =>
      useMapViewportBounds({
        mapInstanceRef: mapRef,
        isMapReady: true,
      })
    );

    // Settle initial mount
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.viewportBounds).not.toBeNull();
    expect(result.current.isViewportReady).toBe(true);

    // Change bounds
    mockMap.setBounds({ south: 41.29, north: 41.35, west: 69.22, east: 69.26 });

    // Fire moveend, wait 200ms, fire zoomend, wait 200ms, fire moveend
    act(() => {
      mockMap.fire('moveend');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      mockMap.fire('zoomend');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      mockMap.fire('moveend');
    });

    // At 400ms total elapsed time, the timer was reset by the last event, so no update yet
    expect(result.current.viewportBounds).toEqual({
      minLat: 41.28,
      maxLat: 41.34,
      minLng: 69.21,
      maxLng: 69.25,
    });

    // Wait remaining 400ms after final event
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.viewportBounds).toEqual({
      minLat: 41.29,
      maxLat: 41.35,
      minLng: 69.22,
      maxLng: 69.26,
    });
    expect(result.current.isViewportReady).toBe(true);
  });

  it('reverts to nationwide mode (bounds = null) when zooming out to zoom <= 9', () => {
    const mockMap = createMockMap(11.0, { south: 41.28, north: 41.34, west: 69.21, east: 69.25 });
    const mapRef = { current: mockMap as any };

    const { result } = renderHook(() =>
      useMapViewportBounds({
        mapInstanceRef: mapRef,
        isMapReady: true,
      })
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.viewportBounds).not.toBeNull();
    expect(result.current.isViewportReady).toBe(true);

    // Zoom out to 8
    mockMap.setZoom(8.0);
    act(() => {
      mockMap.fire('zoomend');
      vi.advanceTimersByTime(400);
    });

    // Must be null (nationwide) and ready
    expect(result.current.viewportBounds).toBeNull();
    expect(result.current.isViewportReady).toBe(true);
  });

  it('cleans up timers and event listeners on unmount', () => {
    const mockMap = createMockMap(11.0);
    const mapRef = { current: mockMap as any };

    const { result, unmount } = renderHook(() =>
      useMapViewportBounds({
        mapInstanceRef: mapRef,
        isMapReady: true,
      })
    );

    expect(mockMap.getListenerCount('moveend')).toBe(1);
    expect(mockMap.getListenerCount('zoomend')).toBe(1);

    unmount();

    expect(mockMap.getListenerCount('moveend')).toBe(0);
    expect(mockMap.getListenerCount('zoomend')).toBe(0);
    expect(result.current.isViewportReady).toBe(false);
  });
});
