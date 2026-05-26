/**
 * Type definitions for the WorkflowChat component system
 */

export type MessageRole = "assistant" | "user";

export interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: string;
}

export interface TextMessage extends BaseMessage {
  type: "text";
  content: string;
}

export interface QuestionMessage extends BaseMessage {
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

export interface AnswerMessage extends BaseMessage {
  role: "user";
  type: "answer";
  question: string;
  answer: string;
  selectedOption?: number; // Index of selected option if it was multiple choice
}

export interface ArtifactMessage extends BaseMessage {
  type: "artifact";
  content: string;
  artifactName: string;
  artifactId: string;
}

export interface LoadingMessage extends BaseMessage {
  type: "loading";
  content: string;
}

export interface DividerMessage {
  type: "divider";
  id: string;
  stageNumber: number;
  stageName: string;
  stageColor: string;
}

export type Message =
  | TextMessage
  | QuestionMessage
  | AnswerMessage
  | ArtifactMessage
  | LoadingMessage
  | DividerMessage;

export interface BaseArtifact {
  id: string;
  name: string;
  stage: number;
  stageName: string;
}

export interface PendingArtifact extends BaseArtifact {
  status: "pending";
}

export interface CreatedArtifact extends BaseArtifact {
  status: "created";
  content: string;
  createdAt?: string;
}

export type Artifact = PendingArtifact | CreatedArtifact;
