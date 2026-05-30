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
 */

import { Sparkles } from "lucide-react";
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
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function ChatMessage({
  message,
  onArtifactClick,
  canOpenArtifact,
  onSelectOption,
  onSubmitForm,
  disabled = false,
  isSubmitting = false,
}: ChatMessageProps) {
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
        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isAssistant
            ? "bg-inverse text-fg-1"
            : "bg-surface border border-border-2 text-fg-1"
        }`}
      >
        {isAssistant ? (
          <Sparkles className="w-3.5 h-3.5" />
        ) : (
          <span className="font-mono text-[11px]">U</span>
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
            <AnswerCard
              options={message.options}
              formFields={message.formFields}
              disabled={
                disabled ||
                Boolean(message.options && !onSelectOption) ||
                Boolean(message.formFields && !onSubmitForm)
              }
              isSubmitting={isSubmitting}
              onSelectOption={(option, index) =>
                onSelectOption?.(message.question, option, index)
              }
              onSubmitForm={(values) =>
                onSubmitForm?.(message.question, values)
              }
            />
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
              onClick={() => {
                if (
                  onArtifactClick &&
                  message.artifactId &&
                  canOpenArtifact?.(message.artifactId)
                ) {
                  onArtifactClick(message.artifactId);
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
