import { useCallback, useEffect, useRef, useState } from "react";
import { parseOptions } from "./parse-options";

interface UseStreamingQuestionParams {
  projectId: string;
  stepNumber: number;
  previousAnswers: string[];
  enabled: boolean;
  refetchTrigger?: number; // Increment to force refetch
  onOptionsReady?: (options: Array<{ letter: string; title: string; body: string; recommended?: boolean }>) => void;
}

interface UseStreamingQuestionResult {
  text: string;
  loading: boolean;
  error: Error | null;
  isComplete: boolean; // true if AI signaled step completion
  refetch: () => void; // Imperative refetch method
}

export function useStreamingQuestion(
  params: UseStreamingQuestionParams,
): UseStreamingQuestionResult {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Track the latest params in a ref to avoid stale closures
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Imperative fetch function
  const fetchQuestion = useCallback(() => {
    const currentParams = paramsRef.current;

    if (!currentParams.enabled) return;

    console.log("[useStreamingQuestion] Fetching question:", {
      stepNumber: currentParams.stepNumber,
      previousAnswersCount: currentParams.previousAnswers.length,
    });

    let cancelled = false;
    setLoading(true);
    setText("");
    setError(null);
    setIsComplete(false);

    fetch("/api/ai/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: currentParams.projectId,
        stepNumber: currentParams.stepNumber,
        previousAnswers: currentParams.previousAnswers,
      }),
    })
      .then(async (res) => {
        // Check if response is HTML (404/error page) instead of streaming data
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("text/html")) {
          throw new Error("API endpoint not available - got HTML response");
        }

        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          // Check for completion signal
          if (accumulatedText.includes("[STEP_COMPLETE]")) {
            setIsComplete(true);
            // Don't show the completion marker to the user
            setText(accumulatedText.replace("[STEP_COMPLETE]", "").trim());
          } else {
            setText(accumulatedText);
          }
        }

        // Parse options from completed question and notify parent
        if (!cancelled && currentParams.onOptionsReady) {
          const options = parseOptions(accumulatedText);
          if (options.length > 0) {
            currentParams.onOptionsReady(options);
          }
        }

        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Initial fetch on mount, when step changes, or when refetchTrigger increments
  useEffect(() => {
    if (!params.enabled) return;
    fetchQuestion();
  }, [params.projectId, params.stepNumber, params.enabled, params.refetchTrigger, fetchQuestion]);

  return { text, loading, error, isComplete, refetch: fetchQuestion };
}
