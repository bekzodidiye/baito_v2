import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadRegionsData,
  loadDistrictsData,
  _resetGeoJsonCacheForTesting,
  _getInFlightForTesting,
} from './useUzbekistanGeoJson';

describe('mobile useUzbekistanGeoJson in-flight promise deduplication', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    _resetGeoJsonCacheForTesting();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _resetGeoJsonCacheForTesting();
    vi.restoreAllMocks();
  });

  it('concurrent requests for the same GeoJSON resource invoke the underlying loader only once', async () => {
    let fetchCount = 0;
    const mockRegionsData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[60, 40], [61, 40], [61, 41], [60, 40]]] },
          properties: { name: 'Test Region' },
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/uzbekistan_regions_std.json') {
        fetchCount++;
        // Small delay to simulate in-flight asynchronous network request
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          ok: true,
          json: async () => JSON.parse(JSON.stringify(mockRegionsData)),
        } as Response;
      }
      return { ok: false } as Response;
    });

    // 3 concurrent calls
    const [res1, res2, res3] = await Promise.all([
      loadRegionsData(),
      loadRegionsData(),
      loadRegionsData(),
    ]);

    expect(fetchCount).toBe(1);
    expect(res1).toBeDefined();
    expect(res1).toBe(res2);
    expect(res2).toBe(res3);
  });

  it('failed GeoJSON requests remove the promise from in-flight registry and can be retried successfully', async () => {
    let attempt = 0;
    const mockRegionsData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[60, 40], [61, 40], [61, 41], [60, 40]]] },
          properties: { name: 'Retry Region' },
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      attempt++;
      if (attempt === 1) {
        // First attempt fails with network error
        throw new Error('Network timeout');
      }
      // Second attempt succeeds
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(mockRegionsData)),
      } as Response;
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // First call fails
    const failResult = await loadRegionsData();
    expect(failResult).toBeNull();
    expect(attempt).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      'fetch /uzbekistan_regions_std.json failed',
      expect.any(Error)
    );

    // Second call retries because in-flight promise was cleared in finally
    const retryResult = await loadRegionsData();
    expect(retryResult).toBeDefined();
    expect(retryResult.features).toHaveLength(1);
    expect(attempt).toBe(2);

    consoleSpy.mockRestore();
  });

  it('different GeoJSON resources (regions and districts) do not incorrectly share a Promise', async () => {
    const fetchedUrls: string[] = [];

    const mockGeoJson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[60, 40], [61, 40], [61, 41], [60, 40]]] },
          properties: { shapeName: 'Test' },
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchedUrls.push(url);
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(mockGeoJson)),
      } as Response;
    });

    // Request regions and districts concurrently
    const [regionsResult, districtsResult] = await Promise.all([
      loadRegionsData(),
      loadDistrictsData(),
    ]);

    expect(regionsResult).toBeDefined();
    expect(districtsResult).toBeDefined();

    // Verify both endpoints were called distinctly
    expect(fetchedUrls).toContain('/uzbekistan_regions_std.json');
    expect(fetchedUrls).toContain('/uzbekistan_districts.json');
    expect(fetchedUrls).toHaveLength(2);
  });

  it('serves cached data directly without re-fetching once loaded', async () => {
    let fetchCount = 0;
    const mockData = {
      type: 'FeatureCollection',
      features: [],
    };

    global.fetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(mockData)),
      } as Response;
    });

    const first = await loadRegionsData();
    expect(fetchCount).toBe(1);

    const second = await loadRegionsData();
    expect(fetchCount).toBe(1);
    expect(second).toBe(first);
  });

  it('prevents a late-resolving stale request from clearing a newer in-flight promise (identity-checked cleanup)', async () => {
    let resolveFirstFetch!: (val: any) => void;
    let resolveSecondFetch!: (val: any) => void;

    const mockData1 = {
      type: 'FeatureCollection',
      features: [{ properties: { name: 'First' } }],
    };
    const mockData2 = {
      type: 'FeatureCollection',
      features: [{ properties: { name: 'Second' } }],
    };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveFirstFetch = () => resolve({
            ok: true,
            json: async () => mockData1,
          });
        });
      }
      return new Promise((resolve) => {
        resolveSecondFetch = () => resolve({
          ok: true,
          json: async () => mockData2,
        });
      });
    });

    // 1. Start Request 1 (slow / pending)
    const promise1 = loadRegionsData();
    await Promise.resolve(); // allow microtask to execute and invoke fetch
    const inFlight1 = _getInFlightForTesting().regionsInFlight;
    expect(inFlight1).toBeDefined();

    // 2. Simulate external cache/registry reset (e.g. testing teardown or manual cache invalidation)
    _resetGeoJsonCacheForTesting();

    // 3. Start Request 2 (it is now registered as the active in-flight request)
    const promise2 = loadRegionsData();
    await Promise.resolve(); // allow microtask to execute and invoke fetch
    const inFlight2 = _getInFlightForTesting().regionsInFlight;
    expect(inFlight2).toBeDefined();
    expect(inFlight2).not.toBe(inFlight1);

    // 4. Request 1 finally completes now!
    resolveFirstFetch(null);
    await promise1;

    // 5. CRITICAL CHECK: Request 1's finally must NOT have wiped Request 2!
    expect(_getInFlightForTesting().regionsInFlight).toBe(inFlight2);

    // 6. Request 2 completes
    resolveSecondFetch(null);
    const result2 = await promise2;
    expect(result2).toBeDefined();

    // 7. Request 2's finally clears the registry because identity matches
    expect(_getInFlightForTesting().regionsInFlight).toBeNull();
  });
});
