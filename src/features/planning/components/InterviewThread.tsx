import { useEffect, useMemo, useState } from "react";
import { ArtifactCard } from "@/components/thread/ArtifactCard";
import { Composer } from "@/components/thread/Composer";
import { OptionCard } from "@/components/thread/OptionCard";
import { OptionStack } from "@/components/thread/OptionStack";
import { QuestionCard } from "@/components/thread/QuestionCard";
import { ThreadDivider } from "@/components/thread/ThreadDivider";
import { ThreadView } from "@/components/thread/ThreadView";
import { useStreamingQuestion } from "@/features/ai/hooks";
import {
  useCompleteStep,
  useStepState,
  useSubmitAnswer,
  useUpdateStepOptions,
} from "@/features/planning/hooks";
import type { ProjectStepState } from "@/features/planning/types";
import { AnsweredMessage } from "./AnsweredMessage";

interface InterviewThreadProps {
  stepState: ProjectStepState;
  projectId: string;
}

export function InterviewThread({
  stepState: _stepState,
  projectId,
}: InterviewThreadProps) {
  // Use the query directly to get fresh data after mutations
  // This ensures we always have the latest state after answer submission
  const { data: freshStepState } = useStepState(projectId);
  const stepState = freshStepState ?? _stepState;
  const [inputText, setInputText] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [optimisticAnswer, setOptimisticAnswer] = useState<{
    stepNumber: number;
    question: string;
    answer: string;
    stepName: string;
  } | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Get previous answers for current step (supports multi-turn Q&A)
  const currentStepData = stepState.steps.find(
    (s) => s.stepNumber === stepState.currentStep,
  );

  // Stabilize array reference to prevent unnecessary re-renders
  const completedAnswers = useMemo(
    () => currentStepData?.answers?.map((a) => a.value) ?? [],
    [currentStepData?.answers],
  );

  // Streaming AI question - enabled for M4-007 end-to-end wiring
  // Using refetchTrigger to force refetch after answer submission
  const {
    text: streamedQuestion,
    loading: isStreaming,
    error: streamError,
    isComplete,
    refetch: refetchQuestion,
  } = useStreamingQuestion({
    projectId,
    stepNumber: stepState.currentStep,
    previousAnswers: completedAnswers,
    enabled: true,
    refetchTrigger,
    onOptionsReady: (options) => {
      // Update step with parsed options when streaming completes
      console.log("[InterviewThread] Options parsed from question:", options);
      console.log("[InterviewThread] Updating step", stepState.currentStep, "with options");
      updateOptions({
        stepNumber: stepState.currentStep,
        options,
      });
    },
  });

  const { mutate: submitAnswer, isPending } = useSubmitAnswer(projectId);
  const { mutate: completeStep } = useCompleteStep(projectId);
  const { mutate: updateOptions } = useUpdateStepOptions(projectId);

  // Debug logging
  console.log("[InterviewThread] Render:", {
    currentStep: stepState.currentStep,
    answersCount: completedAnswers.length,
  });

  // Auto-advance when AI signals step completion
  useEffect(() => {
    if (isComplete && !isStreaming) {
      console.log("[InterviewThread] Step completion detected, calling completeStep", {
        stepNumber: stepState.currentStep,
        stepName: currentStepData?.name,
      });
      completeStep({ stepNumber: stepState.currentStep });
    }
  }, [isComplete, isStreaming, stepState.currentStep, completeStep, currentStepData?.name]);

  // Refetch question when step changes (BUG-005 fix)
  useEffect(() => {
    console.log("[InterviewThread] Step changed, triggering refetch");
    setRefetchTrigger(prev => prev + 1);
  }, [stepState.currentStep]);

  const completedSteps = stepState.steps.filter((s) => s.status === "complete");
  const currentStep = currentStepData;
  const selectedOptionTitle =
    currentStep?.options?.find((o) => o.letter === selectedOption)?.title ?? "";

  // Calculate question counter: sum of all answers from all steps + 1 for current question
  const totalAnswersFromCompletedSteps = completedSteps.reduce(
    (sum, step) => sum + (step.answers?.length ?? (step.answer ? 1 : 0)),
    0
  );
  const answersInCurrentStep = completedAnswers.length;
  const currentQuestionNumber = totalAnswersFromCompletedSteps + answersInCurrentStep + 1;
  const totalQuestions = 33; // 1 (Step 1) + 16 (Step 2) + 16 (Step 3)

  function handleSubmit() {
    const answer = selectedOption ?? inputText.trim();
    if (!answer || !currentStep) return;

    // Capture the current question text before submission
    const currentQuestionText =
      streamedQuestion ||
      (streamError ? currentStep.question : undefined) ||
      currentStep.question ||
      "";

    // Store optimistic answer to show immediately
    setOptimisticAnswer({
      stepNumber: currentStep.stepNumber,
      question: currentQuestionText,
      answer,
      stepName: currentStep.name,
    });

    // Clear input immediately
    setInputText("");
    setSelectedOption(null);

    submitAnswer(
      {
        stepNumber: currentStep.stepNumber,
        question: currentQuestionText,
        answer,
      },
      {
        onSuccess: () => {
          // Clear optimistic answer once server confirms
          setOptimisticAnswer(null);
          // Increment trigger to force refetch of next question
          console.log("[InterviewThread] Incrementing refetch trigger");
          setRefetchTrigger(prev => prev + 1);
        },
        onError: () => {
          // If submission fails, clear optimistic answer
          setOptimisticAnswer(null);
        },
      },
    );
  }

  // Build messages including optimistic answer
  const allMessages = [];

  // Add completed steps (show all Q&As from each step)
  for (const step of completedSteps) {
    allMessages.push(
      <div key={step.stepNumber} className="flex flex-col gap-2">
        <ThreadDivider label={step.name} tone="success" />
        {/* Show all Q&As from this step */}
        {step.answers && step.answers.length > 0 ? (
          step.answers.map((ans, idx) => (
            <AnsweredMessage
              key={`${step.stepNumber}-${idx}`}
              stepName={step.name}
              question={ans.question}
              answer={ans.value}
            />
          ))
        ) : step.answer ? (
          <AnsweredMessage
            stepName={step.name}
            question={step.answer.question}
            answer={step.answer.value}
          />
        ) : null}
        {/* Show artifact if available */}
        {step.artifact && (
          <ArtifactCard stepName={step.name} content={step.artifact} />
        )}
      </div>
    );
  }

  // Add previous Q&As from current step (before the active question)
  if (currentStepData?.answers && currentStepData.answers.length > 0) {
    currentStepData.answers.forEach((ans, idx) => {
      allMessages.push(
        <AnsweredMessage
          key={`current-${currentStepData.stepNumber}-${idx}`}
          stepName={currentStepData.name}
          question={ans.question}
          answer={ans.value}
        />
      );
    });
  }

  // Add optimistic answer if pending
  if (optimisticAnswer && isPending) {
    allMessages.push(
      <AnsweredMessage
        key={`optimistic-${optimisticAnswer.stepNumber}`}
        stepName={optimisticAnswer.stepName}
        question={optimisticAnswer.question}
        answer={optimisticAnswer.answer}
      />
    );
  }

  const messages = allMessages.length > 0 ? allMessages : undefined;

  // Determine question text priority:
  // 1. If step is complete, show completion message
  // 2. If pending submission OR streaming, show loading
  // 3. If we have streamed text (even partial), show it
  // 4. If streaming failed, fall back to mock question
  // 5. Fall back to mock question
  const questionText = isComplete
    ? "Step complete! Moving to next step..."
    : isPending || isStreaming
      ? "Computing next question..."
      : streamedQuestion
        ? streamedQuestion
        : streamError
          ? currentStep?.question || "Loading question..."
          : currentStep?.question || "Loading question...";

  // Disable form while submitting OR while streaming the next question OR when step is complete
  const isLoadingQuestion = isPending || isStreaming || isComplete;

  const question = currentStep ? (
    <QuestionCard
      n={currentQuestionNumber}
      total={totalQuestions}
      text={questionText}
      dimmed={isPending && !streamedQuestion}
    />
  ) : undefined;

  // Debug logging for options
  console.log("[InterviewThread] Render options:", {
    hasOptions: !!currentStep?.options,
    optionsLength: currentStep?.options?.length ?? 0,
    options: currentStep?.options,
  });

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
        isLoadingQuestion
          ? "Wait for question to finish loading..."
          : selectedOption
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
      disabled={isLoadingQuestion}
    />
  );

  const composerCta = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={
        isLoadingQuestion || (!selectedOption && !inputText.trim())
      }
      className="font-mono text-[11px] px-3 py-1.5 rounded-md bg-inverse text-fg-on-inverse disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending ? "…" : isStreaming ? "…" : "Submit →"}
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
          disabled={isLoadingQuestion}
        />
      }
    />
  );
}
