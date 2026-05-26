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

import { ArtifactsList } from "./ArtifactsList";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import type { Artifact, Message } from "./types";

export interface WorkflowChatProps {
  messages: Message[];
  artifacts: Artifact[];
  mode?: "chat" | "artifacts";
}

export function WorkflowChat({
  messages,
  artifacts,
  mode = "chat",
}: WorkflowChatProps) {
  return (
    <div className="flex h-full bg-page">
      {/* Left Column: Artifacts (1/3) */}
      <div className="w-1/3 border-r border-border-1 flex flex-col">
        <div className="px-8 pt-6 pb-3">
          <div className="font-mono text-[11px] text-fg-3 tracking-[0.04em]">
            artifacts
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ArtifactsList artifacts={artifacts} />
        </div>
      </div>

      {/* Right Column: Chat (2/3) */}
      <div className="w-2/3 flex flex-col pt-6">
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 overflow-y-auto pb-32">
            <div className="flex flex-col gap-7 py-8">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          </div>
          <ChatComposer />
        </div>
      </div>
    </div>
  );
}

// Re-export types for convenience
export type { Artifact, Message } from "./types";
