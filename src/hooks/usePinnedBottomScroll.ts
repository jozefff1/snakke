'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

interface UsePinnedBottomScrollOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled?: boolean;
  deps?: readonly unknown[];
  resetKeys?: readonly unknown[];
  bottomThreshold?: number;
}

function isNearBottom(element: HTMLDivElement, threshold: number) {
  const distanceFromBottom = element.scrollHeight - element.clientHeight - element.scrollTop;
  return distanceFromBottom <= threshold;
}

export function usePinnedBottomScroll({
  containerRef,
  enabled = true,
  deps = [],
  resetKeys = [],
  bottomThreshold = 32,
}: UsePinnedBottomScrollOptions) {
  const shouldStickRef = useRef(true);

  useEffect(() => {
    shouldStickRef.current = true;
  }, [...resetKeys]);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;

    const onScroll = () => {
      shouldStickRef.current = isNearBottom(container, bottomThreshold);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      container.removeEventListener('scroll', onScroll);
    };
  }, [containerRef, enabled, bottomThreshold]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;

    const scrollToBottom = () => {
      if (!shouldStickRef.current) return;
      container.scrollTop = container.scrollHeight;
    };

    scrollToBottom();
    const rafId = window.requestAnimationFrame(scrollToBottom);
    const timeoutId = window.setTimeout(scrollToBottom, 140);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [containerRef, enabled, ...deps]);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (!shouldStickRef.current) return;
      container.scrollTop = container.scrollHeight;
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, enabled]);
}
