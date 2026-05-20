// Database types matching schema.sql
// snake_case field names match SQLite columns

export interface DBProject {
  id: string;
  code: string;
  name: string;
  status: "active" | "archived" | "complete";
  entry_path: "scratch" | "doc-first";
  current_step: number;
  created_at: string;
  last_touched_at: string;
}

export interface DBPlanningState {
  project_id: string;
  xstate_snapshot: string; // JSON serialized
  created_at: string;
  updated_at: string;
}

export interface DBInterviewAnswer {
  id: string;
  project_id: string;
  step_number: 2 | 3;
  question: string;
  answer: string;
  created_at: string;
}

export interface DBFormResponse {
  id: string;
  project_id: string;
  step_number: 1 | 5 | 7;
  field_name: string;
  field_value: string;
  created_at: string;
}

export interface DBArtifact {
  id: string;
  project_id: string;
  step_number: number; // 1-10
  artifact_type: "yaml" | "markdown";
  content: string;
  generated_at: string;
}
