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

  useEffect(() => {
    if (!params.enabled) return;

    let cancelled = false
    setLoading(true)
    setText('')
    setError(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.projectId,
    params.stepNumber,
    params.enabled,
    // previousAnswers intentionally omitted - array identity causes re-fetch
    // In real usage, previousAnswers changes when stepNumber changes
  ]);

  return { text, loading, error };
}
