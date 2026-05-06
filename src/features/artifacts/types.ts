export type ArtifactStatus = "generating" | "ready" | "error";
export type ArtifactFormat = "yaml" | "markdown";

export interface Artifact {
  id: string;
  projectId: string;
  key: string; // e.g. 'business-requirements'
  label: string; // e.g. 'Business Requirements'
  format: ArtifactFormat;
  content: string; // raw YAML or Markdown
  status: ArtifactStatus;
  generatedAt: string;
}
