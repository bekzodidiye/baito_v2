// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJobsData } from './useJobsData';
import { useMapViewportBounds } from '../components/map/useMapViewportBounds';
import * as api from '../api/queries';

vi.mock('../api/queries', async () => {
  const actual = await vi.importActual<typeof import('../api/queries')>('../api/queries');
  return {
    ...actual,
    fetchJobs: vi.fn(),
    fetchMapJobs: vi.fn(),
  };
});

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

describe('mobile useJobsData — Viewport & Query Key Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('calls fetchJobs (general /jobs endpoint) when isMap is false', async () => {
    vi.mocked(api.fetchJobs).mockResolvedValueOnce([
      { id: 'job-1', title: 'Regular List Job' } as any,
    ]);

    const { result } = renderHook(() => useJobsData({ isMap: false }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(api.fetchJobs).toHaveBeenCalledTimes(1);
    expect(api.fetchMapJobs).not.toHaveBeenCalled();
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].title).toBe('Regular List Job');
  });

  it('calls fetchMapJobs with clustered=true in nationwide map mode', async () => {
    vi.mocked(api.fetchMapJobs).mockResolvedValueOnce([
      { id: 'job-nationwide', title: 'Nationwide Pin' } as any,
    ]);

    const { result } = renderHook(() => useJobsData({ isMap: true, bounds: null }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);
    expect(api.fetchMapJobs).toHaveBeenCalledWith({ clustered: true });
    expect(api.fetchJobs).not.toHaveBeenCalled();
    expect(result.current.jobs).toHaveLength(1);
    const nationwideCache = queryClient.getQueryData(['jobs', 'map', { clustered: true }]);
    expect(nationwideCache).toBeDefined();
  });

  it('calls fetchMapJobs with exact bounds parameters and clustered=false and creates specific query key', async () => {
    vi.mocked(api.fetchMapJobs).mockResolvedValueOnce([
      { id: 'job-tashkent', title: 'Tashkent Pin' } as any,
    ]);

    const bounds = { minLat: 41.28, maxLat: 41.34, minLng: 69.21, maxLng: 69.25 };
    const { result } = renderHook(() => useJobsData({ isMap: true, bounds }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);
    expect(api.fetchMapJobs).toHaveBeenCalledWith({ ...bounds, clustered: false });
    expect(result.current.jobs[0].title).toBe('Tashkent Pin');

    // Query key in cache must contain the bounds object
    const cached = queryClient.getQueryData(['jobs', 'map', bounds]);
    expect(cached).toBeDefined();
  });

  it('changes query key and re-fetches when bounds change', async () => {
    vi.mocked(api.fetchMapJobs)
      .mockResolvedValueOnce([{ id: 'job-1', title: 'Viewport 1 Pin' } as any])
      .mockResolvedValueOnce([{ id: 'job-2', title: 'Viewport 2 Pin' } as any]);

    const bounds1 = { minLat: 41.28, maxLat: 41.34, minLng: 69.21, maxLng: 69.25 };
    const bounds2 = { minLat: 40.10, maxLat: 40.20, minLng: 65.30, maxLng: 65.40 };

    const { result, rerender } = renderHook(
      ({ b }: { b: api.MapBounds }) => useJobsData({ isMap: true, bounds: b }),
      {
        wrapper,
        initialProps: { b: bounds1 },
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.jobs[0].title).toBe('Viewport 1 Pin');

    // Rerender with bounds2
    rerender({ b: bounds2 });

    await waitFor(() => expect(result.current.jobs[0]?.title).toBe('Viewport 2 Pin'));
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(2);
    expect(api.fetchMapJobs).toHaveBeenLastCalledWith({ ...bounds2, clustered: false });
  });

  it('does not re-fetch when identical bounds are passed (cache hit)', async () => {
    vi.mocked(api.fetchMapJobs).mockResolvedValueOnce([
      { id: 'job-1', title: 'Cached Pin' } as any,
    ]);

    const bounds = { minLat: 41.28, maxLat: 41.34, minLng: 69.21, maxLng: 69.25 };

    const { result, rerender } = renderHook(
      ({ b }: { b: api.MapBounds }) => useJobsData({ isMap: true, bounds: b }),
      {
        wrapper,
        initialProps: { b: bounds },
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);

    // Re-render with a new object having identical coordinate values
    rerender({ b: { minLat: 41.28, maxLat: 41.34, minLng: 69.21, maxLng: 69.25 } });

    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);
  });
});

describe('mobile Stage 3B Deduplication & Lifecycle: useMapViewScreen composition', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // Helper hook mimicking mobile useMapViewScreen
  function useTestMapScreen(mapRef: any, isMapReady: boolean) {
    const { viewportBounds, isViewportReady } = useMapViewportBounds({
      mapInstanceRef: mapRef,
      isMapReady,
    });
    return useJobsData({
      isMap: true,
      bounds: viewportBounds,
      enabled: isViewportReady,
    });
  }

  it('Test A: does NOT trigger duplicate nationwide query when opening map at zoom = 12', async () => {
    vi.mocked(api.fetchMapJobs).mockResolvedValue([
      { id: 'job-tashkent', title: 'Tashkent Viewport Pin' } as any,
    ]);

    const mockMap = createMockMap(12.0, { south: 41.28, north: 41.34, west: 69.21, east: 69.25 });
    const mapRef = { current: mockMap as any };

    renderHook(() => useTestMapScreen(mapRef, true), { wrapper });

    // Step 1: Initial mount up to 399ms
    act(() => {
      vi.advanceTimersByTime(399);
    });

    // CRITICAL: Nationwide request must NOT be sent!
    expect(api.fetchMapJobs).not.toHaveBeenCalled();

    // Step 2: At 400ms, debounce completes and viewport query triggers
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Exactly 1 request is sent!
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);
    expect(api.fetchMapJobs).toHaveBeenCalledWith({
      minLat: 41.28,
      maxLat: 41.34,
      minLng: 69.21,
      maxLng: 69.25,
      clustered: false,
    });

    // Ensure nationwide call was never made
    expect(api.fetchMapJobs).not.toHaveBeenCalledWith({ clustered: true });
  });

  it('Test B: nationwide mode at zoom = 5 fires exactly 1 request without 400ms delay', async () => {
    vi.mocked(api.fetchMapJobs).mockResolvedValue([
      { id: 'job-uzb', title: 'Nationwide Pin' } as any,
    ]);

    const mockMap = createMockMap(5.0);
    const mapRef = { current: mockMap as any };

    renderHook(() => useTestMapScreen(mapRef, true), { wrapper });

    // Nationwide query fires immediately when map is ready with clustered=true
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);
    expect(api.fetchMapJobs).toHaveBeenCalledWith({ clustered: true });

    // Advancing timers does not fire redundant queries
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);
  });

  it('Test C: transitions between nationwide and high zoom correctly', async () => {
    vi.mocked(api.fetchMapJobs).mockResolvedValue([
      { id: 'job-pin', title: 'Pin' } as any,
    ]);

    const mockMap = createMockMap(5.0, { south: 41.28, north: 41.34, west: 69.21, east: 69.25 });
    const mapRef = { current: mockMap as any };

    const { result } = renderHook(() => useTestMapScreen(mapRef, true), { wrapper });

    // 1. Initial nationwide call settles
    await act(async () => {
      await Promise.resolve();
    });
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);
    expect(api.fetchMapJobs).toHaveBeenLastCalledWith({ clustered: true });

    // 2. User zooms into zoom 12
    mockMap.setZoom(12.0);
    act(() => {
      mockMap.fire('zoomend');
    });

    // During debounce (200ms): no new query yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(1);

    // After debounce finishes (400ms): fires viewport query
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(api.fetchMapJobs).toHaveBeenCalledTimes(2);
    expect(api.fetchMapJobs).toHaveBeenLastCalledWith({
      minLat: 41.28,
      maxLat: 41.34,
      minLng: 69.21,
      maxLng: 69.25,
      clustered: false,
    });

    // 3. User zooms back out to zoom 6 (<= 9)
    mockMap.setZoom(6.0);
    act(() => {
      mockMap.fire('zoomend');
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Nationwide query is re-activated (served from cache, no duplicate new query)
    expect(result.current.jobs).toBeDefined();
    const nationwideCache = queryClient.getQueryState(['jobs', 'map', { clustered: true }]);
    expect(nationwideCache?.status).toBe('success');
  });

  it('Test D: regular job list is not blocked when isMap is false', async () => {
    vi.useRealTimers();
    vi.mocked(api.fetchJobs).mockResolvedValue([
      { id: 'regular-job', title: 'Regular Job' } as any,
    ]);

    const { result } = renderHook(() => useJobsData({ isMap: false }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(api.fetchJobs).toHaveBeenCalledTimes(1);
    expect(api.fetchMapJobs).not.toHaveBeenCalled();
    expect(result.current.jobs[0]?.title).toBe('Regular Job');
  });

  it('Test E: unmount cleans up timers and listeners without duplicate initial fetch on remount', () => {
    vi.mocked(api.fetchMapJobs).mockResolvedValue([]);

    const mockMap = createMockMap(12.0);
    const mapRef = { current: mockMap as any };

    // Mount 1
    const { unmount } = renderHook(() => useTestMapScreen(mapRef, true), { wrapper });
    expect(mockMap.getListenerCount('moveend')).toBe(1);
    expect(mockMap.getListenerCount('zoomend')).toBe(1);

    // Unmount
    unmount();
    expect(mockMap.getListenerCount('moveend')).toBe(0);
    expect(mockMap.getListenerCount('zoomend')).toBe(0);

    // Fast-forward pending timers after unmount: should not trigger calls
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(api.fetchMapJobs).not.toHaveBeenCalled();
  });
});
