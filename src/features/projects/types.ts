export type ProjectStatus = "active" | "archived" | "complete";
export type EntryPath = "scratch" | "doc-first";
export type ProjectStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Project {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  entryPath: EntryPath;
  currentStep: ProjectStep;
  lastTouchedAt: string;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  entryPath: EntryPath;
}
