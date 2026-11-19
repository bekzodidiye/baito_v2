import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  rootMargin?: string;
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '200px',
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const elementsRef = useRef<Set<HTMLElement>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const hasIntersecting = entries.some(
        (entry) => entry.isIntersecting && (entry.intersectionRatio > 0 || entry.boundingClientRect.height > 0)
      );
      if (hasIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      elementsRef.current.add(node);
      observerRef.current?.observe(node);
      return () => {
        elementsRef.current.delete(node);
        observerRef.current?.unobserve(node);
      };
    }
  }, []);

  useEffect(() => {
    if (!hasMore) {
      observerRef.current?.disconnect();
      return;
    }

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold,
    });
    observerRef.current = observer;

    elementsRef.current.forEach((el) => {
      if (el.isConnected) {
        observer.observe(el);
      } else {
        elementsRef.current.delete(el);
      }
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [handleObserver, hasMore, rootMargin, threshold]);

  return { sentinelRef, mobileSentinelRef: sentinelRef, desktopSentinelRef: sentinelRef };
}
