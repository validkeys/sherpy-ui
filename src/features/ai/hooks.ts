import { useEffect, useState } from "react";

interface UseStreamingQuestionParams {
  projectId: string;
  stepNumber: number;
  previousAnswers: string[];
  enabled: boolean;
}

interface UseStreamingQuestionResult {
  text: string;
  loading: boolean;
  error: Error | null;
}

export function useStreamingQuestion(
  params: UseStreamingQuestionParams,
): UseStreamingQuestionResult {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: previousAnswers intentionally omitted - array identity causes re-fetch. In real usage, previousAnswers changes when stepNumber changes.
  useEffect(() => {
    if (!params.enabled) return;

    let cancelled = false;
    setLoading(true);
    setText("");
    setError(null);

    fetch("/api/ai/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: params.projectId,
        stepNumber: params.stepNumber,
        previousAnswers: params.previousAnswers,
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

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          setText((prev) => prev + decoder.decode(value, { stream: true }));
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
  }, [params.projectId, params.stepNumber, params.enabled]);

  return { text, loading, error };
}
