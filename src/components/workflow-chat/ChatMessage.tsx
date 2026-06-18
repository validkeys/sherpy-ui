/**
 * ChatMessage - Renders different message types in chat
 *
 * Usage:
 *   <ChatMessage message={messageObject} />
 *
 * Supported message types:
 * - divider: Stage separator (uses StageDivider)
 * - loading: Typing indicator (uses TypingIndicator)
 * - text: Simple text from assistant or user
 * - question: Question with options or form fields
 * - answer: User's previous answer (read-only)
 * - artifact: Generated document with pill to view
 *
 * Layout:
 * - Avatar (left): Sparkles for assistant, "U" for user
 * - Content (right): Name, timestamp, message body
 * - Max width: 720px, centered
 *
 * Performance:
 * - Wrapped in React.memo to prevent re-renders when props unchanged
 * - Optimizes list rendering (30+ messages)
 */

import { Sparkles } from "lucide-react";
import { memo, useCallback } from "react";
import { AnswerCard } from "./AnswerCard";
import { ArtifactPill } from "./ArtifactPill";
import { StageDivider } from "./StageDivider";
import { TypingIndicator } from "./TypingIndicator";
import type { Message } from "./types";

interface ChatMessageProps {
  message: Message;
  onArtifactClick?: (artifactId: string) => void;
  canOpenArtifact?: (artifactId: string) => boolean;
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

function ChatMessageComponent({
  message,
  onArtifactClick,
  canOpenArtifact,
  onSelectOption,
  onSubmitForm,
  onFormValueChange,
  formValues,
  disabled = false,
  isSubmitting = false,
  autoSubmit = false,
}: ChatMessageProps) {
  const handleSelectOption = useCallback(
    (option: string, index: number) => {
      if (message.type === "question") {
        onSelectOption?.(message.question, option, index);
      }
    },
    [message, onSelectOption],
  );

  const handleSubmitForm = useCallback(
    (values: Record<string, string>) => {
      if (message.type === "question") {
        onSubmitForm?.(message.question, values);
      }
    },
    [message, onSubmitForm],
  );

  const handleFormValueChange = useCallback(
    (fieldId: string, value: string) => {
      if (message.type === "question") {
        onFormValueChange?.(message.question, fieldId, value);
      }
    },
    [message, onFormValueChange],
  );

  const handleArtifactClick = useCallback(() => {
    if (
      message.type === "artifact" &&
      onArtifactClick &&
      message.artifactId &&
      canOpenArtifact?.(message.artifactId)
    ) {
      onArtifactClick(message.artifactId);
    }
  }, [message, onArtifactClick, canOpenArtifact]);

  if (message.type === "divider") {
    return (
      <StageDivider
        stageNumber={message.stageNumber}
        stageName={message.stageName}
        stageColor={message.stageColor}
      />
    );
  }

  if (message.type === "loading") {
    return <TypingIndicator message={message.content} />;
  }

  const isAssistant = message.role === "assistant";

  return (
    <div className="mx-auto flex w-full max-w-[720px] gap-3.5 px-4 sm:px-8">
      {/* Avatar */}
      <div
        role="img"
        aria-label={isAssistant ? "Assistant message" : "User message"}
        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isAssistant
            ? "bg-inverse text-fg-on-inverse"
            : "bg-surface border border-border-2 text-fg-1"
        }`}
      >
        {isAssistant ? (
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <span className="font-mono text-[11px]" aria-hidden="true">
            U
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Meta */}
        <div className="font-mono text-[11px] text-fg-4 tracking-wide flex items-center gap-2.5">
          <span className="font-medium text-fg-2">
            {isAssistant ? "Sherpy" : "You"}
          </span>
          <span>·</span>
          <span>{message.timestamp}</span>
        </div>

        {/* Body */}
        {message.type === "text" && (
          <div className="text-[15px] leading-relaxed text-fg-1">
            <p>{message.content}</p>
          </div>
        )}

        {message.type === "question" && (
          <>
            <div className="text-[15px] leading-relaxed text-fg-1">
              <p>{message.question}</p>
            </div>
            {(() => {
              const answerCardDisabled =
                disabled ||
                Boolean(message.options && !onSelectOption) ||
                Boolean(message.formFields && !onSubmitForm);
              return (
                <AnswerCard
                  options={message.options}
                  formFields={message.formFields}
                  formValues={formValues ?? undefined}
                  disabled={answerCardDisabled}
                  isSubmitting={isSubmitting}
                  autoSubmit={autoSubmit}
                  onSelectOption={handleSelectOption}
                  onSubmitForm={handleSubmitForm}
                  onFormValueChange={handleFormValueChange}
                />
              );
            })()}
          </>
        )}

        {message.type === "answer" && (
          <>
            <div className="text-[15px] leading-relaxed text-fg-1">
              <p className="font-medium">{message.question}</p>
            </div>
            <div className="border border-border-1 rounded-sm bg-surface/50 p-2.5 mt-1">
              <div className="text-[13px] text-fg-1">
                {message.selectedOption !== undefined ? (
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-[11px] text-fg-4 mt-0.5">
                      {String.fromCharCode(65 + message.selectedOption)}
                    </span>
                    <span className="font-medium">{message.answer}</span>
                  </div>
                ) : (
                  <p className="italic">&ldquo;{message.answer}&rdquo;</p>
                )}
              </div>
            </div>
          </>
        )}

        {message.type === "artifact" && (
          <>
            <div className="text-[15px] leading-relaxed text-fg-1">
              <p>{message.content}</p>
            </div>
            <ArtifactPill
              name={message.artifactName}
              disabled={!canOpenArtifact?.(message.artifactId)}
              onClick={handleArtifactClick}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when props unchanged
// Critical for list performance with 30+ messages
export const ChatMessage = memo(ChatMessageComponent);
ChatMessage.displayName = "ChatMessage";
