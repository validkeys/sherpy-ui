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

import { useState } from "react";
import { ArtifactDialog } from "./ArtifactDialog";
import { ArtifactsList } from "./ArtifactsList";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import type { Artifact, CreatedArtifact, Message } from "./types";

export interface WorkflowChatProps {
  messages: Message[];
  artifacts: Artifact[];
  onSubmitMessage?: (message: string) => void;
  onSelectOption?: (question: string, option: string, index: number) => void;
  onSubmitForm?: (question: string, values: Record<string, string>) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function WorkflowChat({
  messages,
  artifacts,
  onSubmitMessage,
  onSelectOption,
  onSubmitForm,
  disabled = false,
  isSubmitting = false,
}: WorkflowChatProps) {
  const [composerValue, setComposerValue] = useState("");
  const [selectedArtifact, setSelectedArtifact] =
    useState<CreatedArtifact | null>(null);

  const isViewableArtifact = (
    artifact: Artifact | undefined,
  ): artifact is CreatedArtifact =>
    artifact?.status === "created" && artifact.content.trim().length > 0;

  const canOpenArtifact = (artifactId: string) =>
    isViewableArtifact(
      artifacts.find((artifact) => artifact.id === artifactId),
    );

  const handleArtifactClick = (artifactId: string) => {
    const artifact = artifacts.find((a) => a.id === artifactId);
    if (isViewableArtifact(artifact)) {
      setSelectedArtifact(artifact);
    }
  };

  const handleSubmitMessage = (message: string) => {
    onSubmitMessage?.(message);
    setComposerValue("");
  };

  const isComposerDisabled = disabled || !onSubmitMessage;

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
          <div className="absolute inset-0 overflow-y-auto pb-32">
            <div className="flex flex-col gap-7 py-8">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onArtifactClick={handleArtifactClick}
                  canOpenArtifact={canOpenArtifact}
                  onSelectOption={onSelectOption}
                  onSubmitForm={onSubmitForm}
                  disabled={disabled}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          </div>
          <ChatComposer
            value={composerValue}
            onChange={setComposerValue}
            onSubmit={handleSubmitMessage}
            disabled={isComposerDisabled}
            isSubmitting={isSubmitting}
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
