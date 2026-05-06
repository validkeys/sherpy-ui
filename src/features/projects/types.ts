export type ProjectStatus = "active" | "archived" | "complete";
export type EntryPath = "scratch" | "doc-first";

export interface Project {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  entryPath: EntryPath;
  currentStep: number;
  lastTouchedAt: string;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  entryPath: EntryPath;
}
