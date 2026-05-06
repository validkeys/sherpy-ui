import type { Artifact } from "./types";

const artifactStore = new Map<string, Map<string, Artifact>>();

function getProjectMap(projectId: string): Map<string, Artifact> {
  if (!artifactStore.has(projectId)) {
    artifactStore.set(projectId, new Map());
  }
  return artifactStore.get(projectId)!;
}

export function listArtifacts(projectId: string): Artifact[] {
  const projectMap = getProjectMap(projectId);
  return Array.from(projectMap.values());
}

export function getArtifact(
  projectId: string,
  key: string,
): Artifact | undefined {
  const projectMap = getProjectMap(projectId);
  return projectMap.get(key);
}

export function upsertArtifact(artifact: Artifact): void {
  const projectMap = getProjectMap(artifact.projectId);
  projectMap.set(artifact.key, artifact);
}

export function seedArtifacts(projectId: string): void {
  const projectMap = getProjectMap(projectId);
  if (projectMap.size > 0) {
    return;
  }

  const now = new Date().toISOString();

  const artifacts: Artifact[] = [
    {
      id: `${projectId}-business-requirements`,
      projectId,
      key: "business-requirements",
      label: "Business Requirements",
      format: "yaml",
      status: "ready",
      generatedAt: now,
      content: `version: "1.0.0"
project: Sample Project
generated: "${now.split("T")[0]}"

problem_statement: |
  Engineering teams waste significant time context-switching between planning
  documents, technical specs, and project tracking tools.

target_users:
  - role: Product Manager
    goals:
      - Create clear technical requirements from business goals
      - Maintain single source of truth for project scope
    pain_points:
      - Requirements scattered across multiple tools
      - Difficult to track what's been decided

success_metrics:
  - metric: Time to generate complete project plan
    baseline: 2-3 days
    target: 30 minutes
  - metric: Planning document completeness
    baseline: 60%
    target: 95%
`,
    },
    {
      id: `${projectId}-technical-requirements`,
      projectId,
      key: "technical-requirements",
      label: "Technical Requirements",
      format: "yaml",
      status: "ready",
      generatedAt: now,
      content: `version: "1.0.0"
project: Sample Project
generated: "${now.split("T")[0]}"

architecture:
  stack:
    frontend: React + TanStack Router
    backend: TanStack Start server functions
    database: In-memory (demo)
    deployment: Docker container

functional_requirements:
  - id: FR-001
    feature: Project Dashboard
    description: List all active and past projects with filtering
    acceptance_criteria:
      - Display project cards with name, code, status
      - Filter by active/past status
      - Show last-touched date

  - id: FR-002
    feature: Planning Interview
    description: AI-guided conversation to capture requirements
    acceptance_criteria:
      - Display questions one at a time
      - Accept freeform or option-based answers
      - Progress through 10 planning steps

non_functional_requirements:
  - category: Performance
    requirement: Page load under 2 seconds
  - category: Security
    requirement: OIDC authentication required
`,
    },
    {
      id: `${projectId}-milestones`,
      projectId,
      key: "milestones",
      label: "Implementation Milestones",
      format: "yaml",
      status: "ready",
      generatedAt: now,
      content: `version: "1.0.0"
project: Sample Project
generated: "${now.split("T")[0]}"

milestones:
  - id: m1
    name: Foundation & Core Data Model
    duration: 3 days
    description: Set up project structure and core data models
    deliverables:
      - Project scaffolding complete
      - Database schema defined
      - Basic CRUD operations

  - id: m2
    name: Dashboard & Project Management
    duration: 5 days
    description: Build project dashboard and management UI
    deliverables:
      - Project list with filtering
      - Create/edit/archive flows
      - Status transitions

  - id: m3
    name: Planning Interview Flow
    duration: 5 days
    description: AI-guided planning conversation
    deliverables:
      - Question/answer thread UI
      - Step progression logic
      - Answer persistence
`,
    },
    {
      id: `${projectId}-architecture`,
      projectId,
      key: "architecture",
      label: "Architecture Decision Record",
      format: "markdown",
      status: "ready",
      generatedAt: now,
      content: `# Architecture Decision Record

## Project: Sample Project

**Generated:** ${now.split("T")[0]}

---

## ADR-001: Use TanStack Start for Full-Stack Framework

**Status:** Accepted

**Context:**
We need a modern full-stack React framework that supports server functions
and provides excellent TypeScript support.

**Decision:**
Use TanStack Start with server functions for API layer.

**Consequences:**
- Unified TypeScript across client and server
- Type-safe server function calls
- Simplified deployment (single build)

**Alternatives Considered:**
- Next.js: More mature but heavier framework
- Remix: Good SSR but less flexible routing

---

## ADR-002: In-Memory Storage for Demo

**Status:** Accepted

**Context:**
This is a demo application showcasing planning workflows, not production-ready.

**Decision:**
Use in-memory Map-based storage for all data.

**Consequences:**
- Zero infrastructure dependencies
- Data resets on server restart
- Simple deployment

**Alternatives Considered:**
- SQLite: Adds persistence but increases complexity
- PostgreSQL: Overkill for demo purposes
`,
    },
  ];

  for (const artifact of artifacts) {
    projectMap.set(artifact.key, artifact);
  }
}
