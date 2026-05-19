-- SQLite Database Schema
-- Mini-Calculator Planning Wizard
-- Version: 1.0
-- Created: 2026-05-19

-- Table: projects
-- Core project metadata and tracking
CREATE TABLE projects (
  id TEXT PRIMARY KEY,              -- nanoid(8)
  code TEXT NOT NULL UNIQUE,        -- SHR-0042
  name TEXT NOT NULL,               -- "mini-calculator"
  status TEXT NOT NULL,             -- "active" | "archived" | "complete"
  entry_path TEXT NOT NULL,         -- "scratch" | "doc-first"
  current_step INTEGER NOT NULL,    -- 1-10
  created_at TEXT NOT NULL,         -- ISO 8601
  last_touched_at TEXT NOT NULL,    -- ISO 8601

  CHECK(status IN ('active', 'archived', 'complete')),
  CHECK(entry_path IN ('scratch', 'doc-first')),
  CHECK(current_step >= 1 AND current_step <= 10)
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_last_touched ON projects(last_touched_at DESC);

-- Table: planning_state
-- Complete XState machine state snapshot per project
CREATE TABLE planning_state (
  project_id TEXT PRIMARY KEY,
  xstate_snapshot TEXT NOT NULL,    -- JSON serialized XState snapshot
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Table: interview_answers
-- Individual Q&A records for auditability and querying
CREATE TABLE interview_answers (
  id TEXT PRIMARY KEY,              -- nanoid()
  project_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,     -- 2 or 3
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK(step_number IN (2, 3))
);

CREATE INDEX idx_answers_project_step ON interview_answers(project_id, step_number);

-- Table: form_responses
-- Form submissions (step 1, 5, 7)
CREATE TABLE form_responses (
  id TEXT PRIMARY KEY,              -- nanoid()
  project_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,     -- 1, 5, or 7
  field_name TEXT NOT NULL,         -- "existingRequirements", "projectDescription"
  field_value TEXT NOT NULL,
  created_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK(step_number IN (1, 5, 7)),
  UNIQUE(project_id, step_number, field_name)
);

CREATE INDEX idx_form_responses_project_step ON form_responses(project_id, step_number);

-- Table: artifacts
-- Generated documents (Gap Analysis, Business Requirements, etc.)
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,              -- nanoid()
  project_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,     -- 1-10
  artifact_type TEXT NOT NULL,      -- "yaml" | "markdown"
  content TEXT NOT NULL,            -- Generated document content
  generated_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK(step_number >= 1 AND step_number <= 10),
  CHECK(artifact_type IN ('yaml', 'markdown')),
  UNIQUE(project_id, step_number)
);

CREATE INDEX idx_artifacts_project ON artifacts(project_id);
