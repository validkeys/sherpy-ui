/**
 * WorkflowChat - Chat-based UI for the entire 10-stage planning workflow
 *
 * Design mockup showing persistent conversation across all stages.
 * Not connected to real data - pure design iteration component.
 */

import { FileText, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// TYPES
// ============================================================================

type MessageRole = "assistant" | "user";

interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: string;
}

interface TextMessage extends BaseMessage {
  type: "text";
  content: string;
}

interface QuestionMessage extends BaseMessage {
  type: "question";
  question: string;
  options?: string[];
  formFields?: Array<{
    id: string;
    label: string;
    type: "text" | "textarea";
    placeholder?: string;
  }>;
}

interface AnswerMessage extends BaseMessage {
  role: "user";
  type: "answer";
  question: string;
  answer: string;
  selectedOption?: number; // Index of selected option if it was multiple choice
}

interface ArtifactMessage extends BaseMessage {
  type: "artifact";
  content: string;
  artifactName: string;
  artifactId: string;
  artifactContent: string;
}

interface LoadingMessage extends BaseMessage {
  type: "loading";
  content: string;
}

interface DividerMessage {
  type: "divider";
  id: string;
  stageNumber: number;
  stageName: string;
  stageColor: string;
}

type Message =
  | TextMessage
  | QuestionMessage
  | AnswerMessage
  | ArtifactMessage
  | LoadingMessage
  | DividerMessage;

interface Artifact {
  id: string;
  name: string;
  stage: number;
  stageName: string;
  content?: string;
  createdAt?: string;
  status: "pending" | "created";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StageDivider({
  stageNumber,
  stageName,
  stageColor,
}: {
  stageNumber: number;
  stageName: string;
  stageColor: string;
}) {
  return (
    <div
      className="sticky top-0 flex items-center gap-3 my-8 px-8 bg-page/95 backdrop-blur-sm"
      style={{ zIndex: stageNumber }}
    >
      <div className="flex-1 h-px bg-border-1" />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-1 shadow-sm">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: stageColor }}
        />
        <span className="font-mono text-[10px] text-fg-3 uppercase tracking-wider">
          Stage {stageNumber.toString().padStart(2, "0")}
        </span>
        <span className="text-xs text-fg-1 font-medium">{stageName}</span>
      </div>
      <div className="flex-1 h-px bg-border-1" />
    </div>
  );
}

function TypingIndicator({ message }: { message: string }) {
  return (
    <div className="flex gap-3.5 max-w-[720px] mx-auto w-full px-8">
      <div className="w-[26px] h-[26px] rounded-full bg-inverse text-fg-1 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="font-mono text-[11px] text-fg-4 tracking-wide flex items-center gap-2.5">
          <span className="font-medium text-fg-2">Sherpy</span>
          <span>·</span>
          <span>just now</span>
        </div>
        <div className="flex items-center gap-2 text-fg-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-sm">{message}</span>
        </div>
      </div>
    </div>
  );
}

function AnswerCard({
  question,
  options,
  formFields,
}: {
  question: string;
  options?: string[];
  formFields?: Array<{
    id: string;
    label: string;
    type: "text" | "textarea";
    placeholder?: string;
  }>;
}) {
  return (
    <div className="border border-border-1 rounded-md bg-surface p-3.5 mt-1 flex flex-col gap-2.5">
      <div className="font-mono text-[10px] tracking-widest uppercase text-fg-4">
        {options ? "PICK ONE" : "YOUR ANSWER"}
      </div>

      {options ? (
        <div className="flex flex-col gap-1.5">
          {options.map((option, i) => (
            <button
              key={i}
              type="button"
              className="flex items-start gap-2.5 p-2.5 border border-border-1 rounded-sm bg-page hover:border-fg-1 transition-colors text-left"
            >
              <span className="font-mono text-[11px] text-fg-4 mt-0.5">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-[13px] text-fg-1 flex-1">{option}</span>
            </button>
          ))}
        </div>
      ) : formFields ? (
        <div className="flex flex-col gap-3">
          {formFields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label
                htmlFor={field.id}
                className="text-[13px] text-fg-2 font-medium"
              >
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.id}
                  rows={3}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                />
              ) : (
                <input
                  type="text"
                  id={field.id}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                />
              )}
            </div>
          ))}
          <Button size="sm" className="self-end">
            Submit
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactPill({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 border border-border-2 rounded-sm bg-surface font-mono text-xs text-fg-1 hover:border-fg-1 transition-colors shadow-xs mt-1.5"
    >
      <FileText className="w-3.5 h-3.5" />
      <span className="text-fg-1">{name}</span>
      <span className="text-fg-4 ml-1">·</span>
      <span className="text-fg-4">YAML</span>
    </button>
  );
}

function ChatMessage({ message }: { message: Message }) {
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
    <div className="flex gap-3.5 max-w-[720px] mx-auto w-full px-8">
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
              question={message.question}
              options={message.options}
              formFields={message.formFields}
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
              onClick={() => {
                // Will be handled by parent
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ChatComposer() {
  return (
    <div className="absolute left-0 right-0 bottom-0 px-8 pb-6 pt-6 pointer-events-none bg-gradient-to-t from-page via-page/95 to-transparent">
      <div className="max-w-[720px] mx-auto pointer-events-auto">
        <div className="bg-surface border border-border-2 rounded-xl shadow-md p-3 flex flex-col gap-2 focus-within:border-fg-1 transition-colors">
          <textarea
            rows={1}
            placeholder="Type your message..."
            className="w-full px-1 py-1 text-[15px] bg-transparent border-none text-fg-1 placeholder:text-fg-4 resize-none focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <div className="flex-1" />
            <div className="font-mono text-[11px] text-fg-4 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-sunken border border-border-1 rounded text-[10px]">
                ↵
              </kbd>
              <span>send</span>
            </div>
            <Button size="sm" className="h-7 px-3 rounded-full">
              <span className="text-xs">Send</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtifactDialog({
  artifact,
  open,
  onOpenChange,
}: {
  artifact: Artifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!artifact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {artifact.name}
          </DialogTitle>
          <div className="font-mono text-xs text-fg-4">
            Stage {artifact.stage} · {artifact.stageName} · {artifact.createdAt}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <pre className="text-xs font-mono text-fg-1 bg-sunken p-4 rounded-md border border-border-1">
            {artifact.content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArtifactsList({ artifacts }: { artifacts: Artifact[] }) {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    null,
  );

  return (
    <>
      <div className="flex flex-col gap-1.5 p-4">
        {artifacts.map((artifact) => {
          const isCreated = artifact.status === "created";
          const canOpen = isCreated && artifact.content;

          return (
            <button
              key={artifact.id}
              type="button"
              onClick={() => canOpen && setSelectedArtifact(artifact)}
              disabled={!canOpen}
              className={`flex flex-col gap-1 p-2.5 border rounded-sm text-left transition-colors ${
                isCreated
                  ? "border-border-1 bg-surface hover:border-fg-1 cursor-pointer"
                  : "border-border-1 bg-sunken cursor-default opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText
                  className={`w-3 h-3 ${isCreated ? "text-fg-3" : "text-fg-4"}`}
                />
                <span
                  className={`font-mono text-[11px] tracking-[0.04em] ${
                    isCreated ? "text-fg-1" : "text-fg-4"
                  }`}
                >
                  {artifact.name}
                </span>
              </div>
              <div className="font-mono text-[10px] text-fg-4 flex items-center gap-1.5 pl-5">
                <span>
                  Stage {artifact.stage} · {artifact.stageName}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <ArtifactDialog
        artifact={selectedArtifact}
        open={!!selectedArtifact}
        onOpenChange={(open) => !open && setSelectedArtifact(null)}
      />
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
      <div className="w-2/3 flex flex-col">
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
