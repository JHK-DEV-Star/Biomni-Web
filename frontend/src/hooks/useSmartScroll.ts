import { useRef, useEffect, useCallback } from 'react';

/**
 * Smart scroll hook: auto-scrolls during streaming,
 * pauses when user manually scrolls up.
 * Returns a ref for the scrollable container, a scrollToBottom function,
 * and whether the user is near the bottom.
 */
export function useSmartScroll(isStreaming: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const isNearBottom = useRef(true);
  const autoScrolling = useRef(false);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      autoScrolling.current = true;
      el.scrollTop = el.scrollHeight;
      userScrolledUp.current = false;
      isNearBottom.current = true;
    }
  }, []);

  // Track scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 50;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      isNearBottom.current = nearBottom;
      // auto-scroll이 발생시킨 scroll이면 flag 리셋하지 않음
      if (autoScrolling.current) {
        autoScrolling.current = false;
        return;
      }
      if (!nearBottom && isStreaming) {
        userScrolledUp.current = true;
      }
    };

    // wheel 이벤트는 항상 사용자 의도
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && isStreaming) {
        // 위로 스크롤 → 사용자가 의도적으로 올림
        userScrolledUp.current = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    el.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isStreaming]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      if (!userScrolledUp.current && containerRef.current) {
        autoScrolling.current = true;
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Scroll to bottom on new message (non-streaming)
  useEffect(() => {
    if (!isStreaming && isNearBottom.current) {
      scrollToBottom();
    }
  }, [isStreaming, scrollToBottom]);

  return {
    containerRef,
    scrollToBottom,
    showScrollButton: !isNearBottom.current,
  };
}
