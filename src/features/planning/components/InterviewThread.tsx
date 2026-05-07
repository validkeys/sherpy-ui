import { useState } from "react";
import { Composer } from "@/components/thread/Composer";
import { OptionCard } from "@/components/thread/OptionCard";
import { OptionStack } from "@/components/thread/OptionStack";
import { QuestionCard } from "@/components/thread/QuestionCard";
import { ThreadDivider } from "@/components/thread/ThreadDivider";
import { ThreadView } from "@/components/thread/ThreadView";
import { useStreamingQuestion } from "@/features/ai/hooks";
import { useSubmitAnswer } from "@/features/planning/hooks";
import type { ProjectStepState } from "@/features/planning/types";
import { AnsweredMessage } from "./AnsweredMessage";

interface InterviewThreadProps {
  stepState: ProjectStepState;
  projectId: string;
}

export function InterviewThread({
  stepState,
  projectId,
}: InterviewThreadProps) {
  const [inputText, setInputText] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const { mutate: submitAnswer, isPending } = useSubmitAnswer(projectId);

  // Get previous answers for current step (currently only single answer per step)
  const currentStepData = stepState.steps.find(
    (s) => s.stepNumber === stepState.currentStep,
  );
  const completedAnswers = currentStepData?.answer
    ? [currentStepData.answer.value]
    : [];

  // Streaming AI question - enabled for M4-007 end-to-end wiring
  const { text: streamedQuestion, loading: isStreaming } = useStreamingQuestion(
    {
      projectId,
      stepNumber: stepState.currentStep,
      previousAnswers: completedAnswers,
      enabled: true,
    },
  );

  const completedSteps = stepState.steps.filter((s) => s.status === "complete");
  const currentStep = stepState.steps.find(
    (s) => s.stepNumber === stepState.currentStep,
  );
  const selectedOptionTitle =
    currentStep?.options?.find((o) => o.letter === selectedOption)?.title ?? "";

  function handleSubmit() {
    const answer = selectedOption ?? inputText.trim();
    if (!answer || !currentStep) return;
    submitAnswer(
      { stepNumber: currentStep.stepNumber, answer },
      {
        onSuccess: () => {
          setInputText("");
          setSelectedOption(null);
        },
      },
    );
  }

  const messages =
    completedSteps.length > 0
      ? completedSteps.map((step) => (
          <div key={step.stepNumber} className="flex flex-col gap-2">
            <ThreadDivider label={step.name} tone="success" />
            {step.answer && (
              <AnsweredMessage
                stepName={step.name}
                answer={step.answer.value}
              />
            )}
          </div>
        ))
      : undefined;

  // Use streamed question when available, otherwise fall back to mock
  const questionText = isStreaming
    ? streamedQuestion || "Loading question..."
    : streamedQuestion || currentStep?.question || "Loading question...";

  const question = currentStep ? (
    <QuestionCard n={currentStep.stepNumber} total={10} text={questionText} />
  ) : undefined;

  const options = currentStep?.options?.length ? (
    <OptionStack>
      {currentStep.options.map((opt) => (
        <OptionCard
          key={opt.letter}
          letter={opt.letter}
          title={opt.title}
          body={opt.body}
          recommended={opt.recommended}
          selected={selectedOption === opt.letter}
          onClick={() =>
            setSelectedOption((prev) =>
              prev === opt.letter ? null : opt.letter,
            )
          }
        />
      ))}
    </OptionStack>
  ) : undefined;

  const composerInput = (
    <input
      className="flex-1 bg-transparent text-[12.5px] text-fg-1 placeholder:text-fg-4 placeholder:italic outline-none"
      placeholder={
        selectedOption
          ? `Option ${selectedOption} selected — or type your own`
          : "…or type your own answer"
      }
      value={selectedOption ? selectedOptionTitle : inputText}
      onChange={(e) => {
        setInputText(e.target.value);
        if (e.target.value) setSelectedOption(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }}
      disabled={isPending || isStreaming}
    />
  );

  const composerCta = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={
        isPending || isStreaming || (!selectedOption && !inputText.trim())
      }
      className="font-mono text-[11px] px-3 py-1.5 rounded-md bg-inverse text-fg-on-inverse disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending ? "…" : "Submit →"}
    </button>
  );

  return (
    <ThreadView
      messages={messages}
      question={question}
      options={options}
      composer={
        <Composer
          input={composerInput}
          cta={composerCta}
          disabled={isPending || isStreaming}
        />
      }
    />
  );
}
