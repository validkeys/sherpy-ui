/**
 * WorkflowChat - Modular chat interface for planning workflow
 *
 * Main export:
 *   import { WorkflowChat } from "@/components/workflow-chat"
 *
 * Individual components (for customization):
 *   import { ChatMessage, ChatComposer, ArtifactsList } from "@/components/workflow-chat"
 *
 * Types:
 *   import type { Message, Artifact, WorkflowChatProps } from "@/components/workflow-chat"
 */

export { AnswerCard } from "./AnswerCard";
export { ArtifactDialog } from "./ArtifactDialog";
export { ArtifactPill } from "./ArtifactPill";
export { ArtifactsList } from "./ArtifactsList";
export { ChatComposer } from "./ChatComposer";
// Individual components
export { ChatMessage } from "./ChatMessage";
export { StageDivider } from "./StageDivider";
export { TypingIndicator } from "./TypingIndicator";
// Types
export type {
  AnswerMessage,
  Artifact,
  ArtifactMessage,
  DividerMessage,
  LoadingMessage,
  Message,
  MessageRole,
  QuestionMessage,
  TextMessage,
} from "./types";
export type { WorkflowChatProps } from "./WorkflowChat";
export { WorkflowChat } from "./WorkflowChat";
