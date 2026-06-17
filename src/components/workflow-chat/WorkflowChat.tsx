/**
 * WorkflowChat - Two-column chat interface for planning workflow
 *
 * Usage:
 *   <WorkflowChat messages={messages} artifacts={artifacts} />
 *
 * Layout:
 * - Left column (1/3): Artifacts sidebar with status indicators
 * - Right column (2/3): Chat messages with composer at bottom
 *
 * Features:
 * - Stage dividers with sticky positioning and push-off effect
 * - Multiple message types: text, questions, answers, artifacts, loading
 * - Artifact status: pending (dimmed) vs created (clickable)
 * - Modal dialog for viewing artifact content
 * - Persistent composer at bottom with gradient fade
 *
 * Props:
 * - messages: Array of chat messages (all types)
 * - artifacts: Array of artifacts (pending + created)
 * - mode: Legacy prop, ignored (kept for backwards compat)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import { ArtifactDialog } from "./ArtifactDialog";
import { ArtifactsList } from "./ArtifactsList";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import type { Artifact, CreatedArtifact, Message } from "./types";

export interface WorkflowChatProps {
  messages: Message[];
  artifacts: Artifact[];
  onSubmitMessage?: (message: string) => void;
  onSelectOption?: (question: string, option: string, index: number) => void;
  onSubmitForm?: (question: string, values: Record<string, string>) => void;
  onFormValueChange?: (
    question: string,
    fieldId: string,
    value: string,
  ) => void;
  formValues?: Record<string, string> | null;
  disabled?: boolean;
  isSubmitting?: boolean;
  autoSubmit?: boolean;
}

export function WorkflowChat({
  messages,
  artifacts,
  onSubmitMessage,
  onSelectOption,
  onSubmitForm,
  onFormValueChange,
  formValues,
  disabled = false,
  isSubmitting = false,
  autoSubmit = false,
}: WorkflowChatProps) {
  const [composerValue, setComposerValue] = useState("");
  const [selectedArtifact, setSelectedArtifact] =
    useState<CreatedArtifact | null>(null);

  // Auto-scroll hook for chat messages
  const { scrollRef, scrollToBottom, shouldShowScrollButton } = useAutoScroll(
    messages,
    {
      enabled: !disabled,
      threshold: 100,
      scrollDelay: 100,
      behavior: "smooth",
    },
  );

  // Track new messages for scroll button badge
  const [newMessageCount, setNewMessageCount] = useState(0);
  const lastSeenMessageCount = useRef(messages.length);

  // Update new message count when not at bottom
  useEffect(() => {
    const currentCount = messages.length;
    const newMessages = currentCount - lastSeenMessageCount.current;

    if (newMessages > 0 && shouldShowScrollButton) {
      setNewMessageCount((prev) => prev + newMessages);
    }

    if (!shouldShowScrollButton) {
      setNewMessageCount(0);
      lastSeenMessageCount.current = currentCount;
    }
  }, [messages.length, shouldShowScrollButton]);

  const isViewableArtifact = useCallback(
    (artifact: Artifact | undefined): artifact is CreatedArtifact =>
      artifact?.status === "created" && artifact.content.trim().length > 0,
    [],
  );

  const canOpenArtifact = useCallback(
    (artifactId: string) =>
      isViewableArtifact(
        artifacts.find((artifact) => artifact.id === artifactId),
      ),
    [artifacts, isViewableArtifact],
  );

  const handleArtifactClick = useCallback(
    (artifactId: string) => {
      const artifact = artifacts.find((a) => a.id === artifactId);
      if (isViewableArtifact(artifact)) {
        setSelectedArtifact(artifact);
      }
    },
    [artifacts, isViewableArtifact],
  );

  const handleSubmitMessage = useCallback(
    (message: string) => {
      onSubmitMessage?.(message);
      setComposerValue("");
    },
    [onSubmitMessage],
  );

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
    setNewMessageCount(0);
    lastSeenMessageCount.current = messages.length;
  }, [scrollToBottom, messages.length]);

  const isComposerDisabled = disabled || !onSubmitMessage;
  const composerPlaceholder = onSubmitMessage
    ? "Type your message..."
    : "View only";

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-page lg:flex-row"
      data-testid="workflow-chat-root"
    >
      {/* Left Column: Artifacts (1/3) */}
      <div
        className="flex max-h-56 w-full flex-col border-b border-border-1 lg:max-h-none lg:w-1/3 lg:border-r lg:border-b-0"
        data-testid="workflow-chat-artifacts"
      >
        <div className="px-4 pt-4 pb-3 sm:px-8 lg:pt-6">
          <div className="font-mono text-[11px] text-fg-3 tracking-[0.04em]">
            artifacts
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ArtifactsList
            artifacts={artifacts}
            onArtifactClick={handleArtifactClick}
          />
        </div>
      </div>

      {/* Right Column: Chat (2/3) */}
      <div
        className="flex min-h-0 w-full flex-1 flex-col pt-4 lg:w-2/3 lg:pt-6"
        data-testid="workflow-chat-messages"
      >
        <div className="flex-1 min-h-0 relative">
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto pb-32"
          >
            <div className="flex flex-col gap-7 py-8">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onArtifactClick={handleArtifactClick}
                  canOpenArtifact={canOpenArtifact}
                  onSelectOption={onSelectOption}
                  onSubmitForm={onSubmitForm}
                  onFormValueChange={onFormValueChange}
                  formValues={formValues}
                  disabled={disabled}
                  isSubmitting={isSubmitting}
                  autoSubmit={autoSubmit}
                />
              ))}
            </div>
          </div>

          {/* Scroll to bottom button */}
          <ScrollToBottomButton
            onClick={handleScrollToBottom}
            visible={shouldShowScrollButton}
            newMessageCount={newMessageCount}
          />
          <ChatComposer
            value={composerValue}
            onChange={setComposerValue}
            onSubmit={handleSubmitMessage}
            disabled={isComposerDisabled}
            isSubmitting={isSubmitting}
            placeholder={composerPlaceholder}
          />
        </div>
      </div>

      {/* Artifact Dialog */}
      <ArtifactDialog
        artifact={selectedArtifact}
        open={!!selectedArtifact}
        onOpenChange={(open) => !open && setSelectedArtifact(null)}
      />
    </div>
  );
}

// Re-export types for convenience
export type { Artifact, Message } from "./types";
