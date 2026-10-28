// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import L from 'leaflet';
import { CachedTileLayer, healMapTiles } from './mapTileLayers';

describe('mobile CachedTileLayer tile recovery', () => {
  let layer: CachedTileLayer;

  const createMockTile = (complete: boolean, naturalWidth: number, src: string) => {
    const img = document.createElement('img');
    img.src = src;
    Object.defineProperty(img, 'complete', { value: complete, configurable: true });
    Object.defineProperty(img, 'naturalWidth', { value: naturalWidth, configurable: true });
    return img;
  };

  beforeEach(() => {
    layer = new CachedTileLayer('https://test/{z}/{x}/{y}.png', {});
    (layer as any)._map = {} as unknown as L.Map;
    (layer as any)._container = document.createElement('div');
  });

  it('does not trigger redraw while tiles are still loading (complete === false)', () => {
    const redrawSpy = vi.spyOn(layer, 'redraw');

    (layer as any)._tiles = {
      '1:1:1': {
        el: createMockTile(false, 0, 'https://test/1/1/1.png'),
      },
    };

    layer.healTiles();
    expect(redrawSpy).not.toHaveBeenCalled();
    expect(layer.isRecoveryInProgress()).toBe(false);
  });

  it('does not repeatedly redraw while a recovery attempt is already in progress', () => {
    const redrawSpy = vi.spyOn(layer, 'redraw').mockImplementation(() => layer);

    (layer as any)._tiles = {
      '1:1:1': {
        el: createMockTile(true, 0, 'https://test/1/1/1.png'),
      },
    };

    // First recovery attempt: should trigger redraw
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(1);
    expect(layer.isRecoveryInProgress()).toBe(true);

    // Second recovery attempt while first is still in progress: must NOT trigger redraw
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(1);
  });

  it('allows recovery to run again after the relevant state resets', () => {
    const redrawSpy = vi.spyOn(layer, 'redraw').mockImplementation(() => layer);

    (layer as any)._tiles = {
      '1:1:1': {
        el: createMockTile(true, 0, 'https://test/1/1/1.png'),
      },
    };

    // First recovery
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(1);
    expect(layer.isRecoveryInProgress()).toBe(true);

    // Reset recovery state (e.g. after 'load' event or manual reset)
    layer.resetRecovery();
    expect(layer.isRecoveryInProgress()).toBe(false);

    // Can run again
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(2);
  });

  it('halts retry loop when recovery attempts reach maxRecoveries limit', () => {
    const redrawSpy = vi.spyOn(layer, 'redraw').mockImplementation(() => layer);

    (layer as any)._tiles = {
      '1:1:1': {
        el: createMockTile(true, 0, 'https://test/1/1/1.png'),
      },
    };

    // 1st recovery
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(1);
    layer.resetRecovery();
    (layer as any)._recoveryCount = 1;

    // 2nd recovery
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(2);
    layer.resetRecovery();
    (layer as any)._recoveryCount = 2;

    // 3rd recovery
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(3);
    layer.resetRecovery();
    (layer as any)._recoveryCount = 3;

    // 4th recovery attempt: limit of 3 reached, must not redraw
    layer.healTiles();
    expect(redrawSpy).toHaveBeenCalledTimes(3);
  });

  it('cleans up active timeouts and resets recovery state on onRemove', () => {
    const fakeTimeout = 9999 as unknown as ReturnType<typeof setTimeout>;
    (layer as any)._activeTimeouts.add(fakeTimeout);
    (layer as any)._recoveryInProgress = true;
    (layer as any)._recoveryCount = 2;

    const parentDiv = document.createElement('div');
    const containerDiv = document.createElement('div');
    parentDiv.appendChild(containerDiv);
    (layer as any)._container = containerDiv;

    const mockMap = {
      getPanes: () => ({}),
      removeLayer: vi.fn(),
      _removeZoomLimit: vi.fn(),
    } as unknown as L.Map;

    layer.onRemove(mockMap);

    expect((layer as any)._activeTimeouts.size).toBe(0);
    expect(layer.isRecoveryInProgress()).toBe(false);
    expect(layer.getRecoveryCount()).toBe(0);
  });

  it('preserves external load event listeners and prevents duplicate registration on re-add', () => {
    const superOnAdd = vi.spyOn(L.TileLayer.prototype, 'onAdd').mockImplementation(function (this: any, map: any) {
      this._map = map;
      return this;
    });
    const superOnRemove = vi.spyOn(L.TileLayer.prototype, 'onRemove').mockImplementation(function (this: any) {
      this._map = null;
      return this;
    });

    const externalLoadListener = vi.fn();
    layer.on('load', externalLoadListener);

    const mockMap = {} as unknown as L.Map;

    // 1. Add layer to map
    layer.onAdd(mockMap);
    layer.fire('load');
    expect(externalLoadListener).toHaveBeenCalledTimes(1);

    // 2. Re-adding layer must not register duplicate internal handlers
    layer.onAdd(mockMap);
    (layer as any)._recoveryInProgress = true;
    layer.fire('load');
    expect(externalLoadListener).toHaveBeenCalledTimes(2);
    expect(layer.isRecoveryInProgress()).toBe(false);

    // 3. Removing layer must detach ONLY internal _onLayerLoad, NOT external listeners
    layer.onRemove(mockMap);
    layer.fire('load');
    expect(externalLoadListener).toHaveBeenCalledTimes(3);

    superOnAdd.mockRestore();
    superOnRemove.mockRestore();
  });

  it('healMapTiles ignores in-flight loading tiles and recovers only confirmed broken tiles', () => {
    const inFlightTile = createMockTile(false, 0, 'https://test/inflight.png');
    const brokenTile = createMockTile(true, 0, 'https://test/broken.png');
    brokenTile.dataset.fallbackTried = 'true';

    const mockContainer = {
      querySelectorAll: (sel: string) => {
        if (sel === 'img.leaflet-tile') return [inFlightTile, brokenTile];
        return [];
      },
    };

    const mockMap = {
      getContainer: () => mockContainer,
      eachLayer: vi.fn(),
    } as unknown as L.Map;

    const healed = healMapTiles(mockMap);
    // Only the broken tile is healed, in-flight is untouched
    expect(healed).toBe(1);
    expect(brokenTile.dataset.fallbackTried).toBeUndefined();
    expect(brokenTile.dataset.healRetries).toBe('1');
    expect(inFlightTile.dataset.healRetries).toBeUndefined();
  });
});
