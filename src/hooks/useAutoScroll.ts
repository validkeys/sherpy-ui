import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  enabled?: boolean;
  threshold?: number; // Distance from bottom to consider "at bottom"
  scrollDelay?: number; // Delay before scrolling to new messages
  behavior?: ScrollBehavior;
}

interface UseAutoScrollReturn {
  scrollRef: React.RefObject<HTMLDivElement>;
  isAtBottom: boolean;
  scrollToBottom: () => void;
  shouldShowScrollButton: boolean;
}

/**
 * Auto-scrolls to bottom when new messages arrive.
 * Cleans up pending timeouts on unmount to prevent race conditions.
 */
export function useAutoScroll<T extends any[]>(
  messages: T,
  options: UseAutoScrollOptions = {},
): UseAutoScrollReturn {
  const {
    enabled = true,
    threshold = 100,
    scrollDelay = 100,
    behavior = "smooth",
  } = options;

  const scrollRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(messages.length);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [shouldShowScrollButton, setShouldShowScrollButton] = useState(false);

  // Throttled scroll handler to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom <= threshold;

    setIsAtBottom(atBottom);
    setShouldShowScrollButton(!atBottom && messages.length > 3);

    // Mark as user scrolling when they scroll up from bottom
    if (!atBottom) {
      isUserScrolling.current = true;
    }

    // Reset user scrolling flag when they reach bottom manually
    if (atBottom && isUserScrolling.current) {
      isUserScrolling.current = false;
    }
  }, [threshold, messages.length]);

  // Smooth scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current?.scrollTo) return;

    isUserScrolling.current = false;

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior,
    });
  }, [behavior]);

  // Auto-scroll effect for new messages and initial load
  useEffect(() => {
    if (!enabled || !scrollRef.current) return;

    const hasNewMessages = messages.length > previousMessageCount.current;
    const shouldAutoScroll =
      (hasNewMessages || isInitialMount.current) && !isUserScrolling.current;

    // Track all nested timeouts for cleanup
    const timeouts: NodeJS.Timeout[] = [];

    if (shouldAutoScroll) {
      // Clear any pending scroll
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Initial scroll to allow DOM to update
      scrollTimeout.current = setTimeout(() => {
        scrollToBottom();

        // Second scroll after a longer delay to catch late-rendering content
        // (e.g., question options, form fields)
        const timeout2 = setTimeout(() => {
          if (!isUserScrolling.current) {
            scrollToBottom();

            // Third scroll to ensure option buttons are fully visible
            // especially after answer submission when both answer + new question render
            const timeout3 = setTimeout(() => {
              if (!isUserScrolling.current) {
                scrollToBottom();
              }
            }, 300);
            timeouts.push(timeout3);
          }
        }, 200);
        timeouts.push(timeout2);
      }, scrollDelay);

      // Mark that initial mount is complete
      isInitialMount.current = false;
    }

    previousMessageCount.current = messages.length;

    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      // Clean up all nested timeouts on unmount
      timeouts.forEach(clearTimeout);
    };
  }, [messages.length, scrollToBottom, scrollDelay, enabled]);

  // Initial scroll on mount when messages exist
  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    // Track nested timeouts for cleanup
    const timeouts: NodeJS.Timeout[] = [];

    // Scroll to bottom on initial mount after a delay for DOM to render
    const initialScrollTimeout = setTimeout(() => {
      if (scrollRef.current) {
        scrollToBottom();

        // Second scroll for late-rendering content
        const timeout2 = setTimeout(() => {
          if (scrollRef.current) {
            scrollToBottom();
          }
        }, 200);
        timeouts.push(timeout2);
      }
    }, 100);

    return () => {
      clearTimeout(initialScrollTimeout);
      // Clean up all nested timeouts on unmount
      timeouts.forEach(clearTimeout);
    };
    // Run when messages change or scroll is enabled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToBottom, messages.length, enabled]);

  // Set up scroll listener with throttling
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", throttledHandleScroll, {
      passive: true,
    });

    // Initial scroll position check
    handleScroll();

    return () => {
      container.removeEventListener("scroll", throttledHandleScroll);
    };
  }, [handleScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return {
    scrollRef,
    isAtBottom,
    scrollToBottom,
    shouldShowScrollButton,
  };
}
