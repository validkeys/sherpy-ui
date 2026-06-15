/**
 * useDOMSync - Syncs DOM values with React state for autofill detection
 *
 * Polls DOM at regular intervals to detect browser autofill, which doesn't
 * trigger React onChange events. Updates form state when DOM values differ.
 *
 * Context: Browser autofill (password managers, address autofill, etc.) directly
 * modifies DOM values without triggering React's synthetic events. This hook
 * periodically checks DOM values and syncs them to React state.
 */

import { useCallback, useEffect } from "react";
import type { FormQuestion } from "./useFormState";

type UseDOMSyncOptions = {
  questions: FormQuestion[];
  isSubmitting: boolean;
  updateFormData: (
    updater: (prev: Record<string, string>) => Record<string, string>,
  ) => void;
  interval?: number; // ms, default 50ms (was 5ms in original, increased per M7-013)
};

export function useDOMSync({
  questions,
  isSubmitting,
  updateFormData,
  interval = 50,
}: UseDOMSyncOptions) {
  // Memoize the sync function to prevent interval recreation on every render
  const syncDOMValues = useCallback(() => {
    updateFormData((current) => {
      let changed = false;
      const next = { ...current };

      questions.forEach((question) => {
        const element = document.getElementById(question.id) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null;
        const domValue = element?.value;

        // Only update if DOM has a non-empty value different from React state
        if (domValue?.trim() && next[question.id] !== domValue) {
          next[question.id] = domValue;
          changed = true;
        }
      });

      // Only trigger re-render if values actually changed
      return changed ? next : current;
    });
  }, [questions, updateFormData]);

  useEffect(() => {
    // Don't sync while submitting to avoid race conditions
    if (isSubmitting) return;

    // M7-013: Changed from 5ms to 50ms
    // Rationale: 5ms = 200 checks/sec is excessive overhead for autofill detection.
    // 50ms = 20 checks/sec is still fast enough to feel instant while reducing
    // CPU usage by 90%. Autofill typically completes in 100-200ms, so 50ms
    // polling catches it within 1-2 cycles.
    const intervalId = window.setInterval(syncDOMValues, interval);
    return () => window.clearInterval(intervalId);
  }, [syncDOMValues, isSubmitting, interval]);
}
