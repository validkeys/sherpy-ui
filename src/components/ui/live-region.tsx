/**
 * LiveRegion Component
 *
 * WCAG 4.1.3 compliant ARIA live region for screen reader announcements.
 * Provides accessible status updates for dynamic content changes.
 *
 * Usage:
 * - priority="polite": Announces when user is idle (progress updates, completions)
 * - priority="assertive": Interrupts immediately (errors, critical alerts)
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html
 */

import type { ReactNode } from "react";

export interface LiveRegionProps {
  /**
   * Content to announce to screen readers.
   * Updates to this content will trigger new announcements.
   */
  children: ReactNode;

  /**
   * Announcement priority:
   * - "polite": Wait for user to finish current activity (default)
   * - "assertive": Interrupt immediately (use sparingly)
   */
  priority?: "polite" | "assertive";

  /**
   * Whether the live region is currently active.
   * Set to false to temporarily disable announcements.
   * @default true
   */
  active?: boolean;
}

/**
 * Renders an ARIA live region for screen reader announcements.
 *
 * The component is visually hidden but accessible to screen readers.
 * Updates to children will trigger announcements based on priority.
 *
 * Example:
 * ```tsx
 * <LiveRegion priority="polite">
 *   Loading next question...
 * </LiveRegion>
 *
 * <LiveRegion priority="assertive">
 *   Error: Failed to submit answer
 * </LiveRegion>
 * ```
 */
export function LiveRegion({
  children,
  priority = "polite",
  active = true,
}: LiveRegionProps) {
  if (!active || !children) {
    return null;
  }

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {children}
    </div>
  );
}
