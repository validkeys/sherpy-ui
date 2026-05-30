import { useCallback, useEffect, useRef, useState } from "react";
import type { InterviewQuestionResponse } from "../planning/response-schemas";
import type { StepOption } from "../planning/types";
import { isStructuredOutputEnabled } from "./feature-flags";
import { parseOptions } from "./parse-options";

interface UseStreamingQuestionParams {
  projectId: string;
  stepNumber: number;
  previousAnswers: string[];
  enabled: boolean;
  refetchTrigger?: number; // Increment to force refetch
  onOptionsReady?: (
    options: Array<{
      letter: string;
      title: string;
      body: string;
      recommended?: boolean;
    }>,
  ) => void;
}

interface UseStreamingQuestionResult {
  text: string;
  loading: boolean;
  error: Error | null;
  isComplete: boolean; // true if AI signaled step completion
  options: StepOption[]; // Parsed options from response (JSON or text)
  refetch: () => void; // Imperative refetch method
}

export function useStreamingQuestion(
  params: UseStreamingQuestionParams,
): UseStreamingQuestionResult {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [options, setOptions] = useState<StepOption[]>([]);

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
    setOptions([]);

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

          // Show accumulated text during streaming (will be replaced with final parsed text)
          setText(accumulatedText);
        }

        // After streaming completes, parse based on mode
        if (!cancelled) {
          if (isStructuredOutputEnabled(currentParams.stepNumber)) {
            // JSON mode: parse structured response
            try {
              const parsed: InterviewQuestionResponse =
                JSON.parse(accumulatedText);
              setText(parsed.question); // Clean question text only
              setOptions(parsed.options);
              setIsComplete(parsed.isComplete ?? false);

              // Notify parent with parsed options (backward compat)
              if (currentParams.onOptionsReady) {
                currentParams.onOptionsReady(parsed.options);
              }
            } catch (err) {
              console.error(
                "[useStreamingQuestion] Failed to parse JSON response:",
                err,
              );
              setError(new Error("Invalid JSON response from AI"));
            }
          } else {
            // Text mode: legacy parsing
            if (accumulatedText.includes("[STEP_COMPLETE]")) {
              setIsComplete(true);
              setText(accumulatedText.replace("[STEP_COMPLETE]", "").trim());
            } else {
              setText(accumulatedText);
            }

            // Parse options from text
            const parsedOptions = parseOptions(accumulatedText);
            setOptions(parsedOptions);
            if (currentParams.onOptionsReady) {
              currentParams.onOptionsReady(parsedOptions);
            }
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
  }, [params.enabled, fetchQuestion]);

  return { text, loading, error, isComplete, options, refetch: fetchQuestion };
}
