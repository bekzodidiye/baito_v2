import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInfiniteScroll } from './useInfiniteScroll';

describe('useInfiniteScroll', () => {
  let observerCallback: (entries: IntersectionObserverEntry[]) => void;
  const observeMock = vi.fn();
  const unobserveMock = vi.fn();
  const disconnectMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.IntersectionObserver = vi.fn().mockImplementation((cb) => {
      observerCallback = cb;
      return {
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: disconnectMock,
      };
    });
  });

  it('observes multiple sentinels without overriding previous ones', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    const mobileDiv = document.createElement('div');
    const desktopDiv = document.createElement('div');
    document.body.appendChild(mobileDiv);
    document.body.appendChild(desktopDiv);

    act(() => {
      result.current.mobileSentinelRef(mobileDiv);
      result.current.desktopSentinelRef(desktopDiv);
    });

    expect(observeMock).toHaveBeenCalledWith(mobileDiv);
    expect(observeMock).toHaveBeenCalledWith(desktopDiv);

    // Simulate mobile sentinel entering viewport
    act(() => {
      observerCallback([
        {
          target: mobileDiv,
          isIntersecting: true,
          intersectionRatio: 0.5,
          boundingClientRect: { height: 20 } as DOMRectReadOnly,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);

    document.body.removeChild(mobileDiv);
    document.body.removeChild(desktopDiv);
  });

  it('does not trigger onLoadMore if hasMore is false or isLoading is true', () => {
    const onLoadMore = vi.fn();
    const { result, rerender } = renderHook(
      ({ hasMore, isLoading }) =>
        useInfiniteScroll({
          onLoadMore,
          hasMore,
          isLoading,
        }),
      {
        initialProps: { hasMore: true, isLoading: true },
      }
    );

    const mobileDiv = document.createElement('div');
    document.body.appendChild(mobileDiv);
    act(() => {
      result.current.sentinelRef(mobileDiv);
    });

    act(() => {
      observerCallback([
        {
          target: mobileDiv,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: { height: 20 } as DOMRectReadOnly,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(onLoadMore).not.toHaveBeenCalled();

    // Rerender with hasMore: false
    rerender({ hasMore: false, isLoading: false });
    expect(disconnectMock).toHaveBeenCalled();

    document.body.removeChild(mobileDiv);
  });
});
