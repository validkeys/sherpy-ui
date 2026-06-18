# Sherpy UI Architecture Overview

**Created:** 2026-06-17  
**Status:** Production-ready POC (998 tests passing)  
**For:** Development team onboarding and hardening phase

---

## Quick Start

**New to this codebase?** Read this document to understand the system architecture, technology choices, and critical patterns in ~30 minutes. Then see:
- [`state-machine.md`](./state-machine.md) - XState workflow patterns ✅
- [`ai-providers.md`](./ai-providers.md) - AI integration architecture ✅
- [`../decisions/`](../decisions/) - Architecture Decision Records (ADRs) ✅
  - [ADR-001: XState for Workflow](../decisions/ADR-001-xstate-for-workflow.md)
  - [ADR-002: Server Functions Over REST](../decisions/ADR-002-server-functions-over-rest.md)
  - [ADR-003: Type-Safe Constants](../decisions/ADR-003-type-safe-constants.md)
- [`../testing/troubleshooting.md`](../testing/troubleshooting.md) - Test patterns and fixes ✅

---

## System Architecture

Sherpy UI is a **local-first AI planning assistant** that guides users through a 10-step requirements gathering and planning workflow using conversational AI.

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Interface                         │
│  React 19 + TanStack Router + Tailwind v4 + shadcn/ui         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                     State Management                            │
│  XState v5 State Machines (planning-machine-factory.ts)        │
│  - Type-safe workflow (10 steps)                               │
│  - Persistence snapshots (resume/restore)                      │
│  - Event-driven architecture                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   Application Services                          │
│  Server Functions (RPC pattern)                                │
│  - $generateQuestion - AI interview questions                  │
│  - $generateArtifact - YAML artifact generation                │
│  - $submitAnswer - Answer persistence                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼─────┐ ┌────▼────┐ ┌──────▼──────┐
│ AI Providers│ │Persistence│ │ Monitoring  │
│             │ │           │ │             │
│ • Bedrock  │ │• SQLite   │ │• Langfuse   │
│ • Anthropic│ │• local-   │ │• Health     │
│ • OpenAI   │ │  Storage  │ │  Monitor    │
└─────────────┘ └───────────┘ └─────────────┘
```

### Layer Responsibilities

1. **UI Layer** (`src/components/`, `src/features/planning/components/`)
   - React components (functional, hooks)
   - TanStack Router navigation
   - Design system (Tailwind v4, shadcn/ui)
   - User input collection (forms, chat interface)

2. **State Layer** (`src/features/planning/machines/`)
   - XState v5 state machines
   - Workflow orchestration (10 planning steps)
   - Context management (interview history, artifacts)
   - Snapshot persistence for resume capability

3. **Application Layer** (`src/features/planning/infrastructure/`)
   - Server functions (Nitro RPC endpoints)
   - AI provider integration
   - Domain logic (interview, artifact generation)

4. **Infrastructure Layer** (`src/infrastructure/`)
   - better-sqlite3 database (project metadata, snapshots, answers)
   - localStorage (fast reads, resilience)
   - Persistence health monitoring
   - Observability (Langfuse tracing)

---

## Technology Stack

### Core Framework
- **Runtime:** Node.js 24 (Vinxi/Nitro SSR)
- **UI:** React 19 (Server Components + Client-only modes)
- **Routing:** TanStack Router v1.131+ (type-safe routes)
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **State:** XState v5 (type-safe state machines)

### Data & AI
- **Database:** better-sqlite3 (local-first, synchronous API)
- **AI SDKs:**
  - `@ai-sdk/amazon-bedrock` - AWS Bedrock (primary)
  - `@ai-sdk/anthropic` - Direct Anthropic API
  - `@ai-sdk/openai` - OpenAI API
- **Observability:** Langfuse (LLM tracing, cost tracking)

### Testing
- **Unit/Integration:** Vitest (1033 tests passing)
- **E2E:** Playwright
- **Coverage:** Unit, integration, E2E, snapshot tests
- **Test Helpers:** `PlanningStateBuilder` (fluent API for fixtures)

### Development
- **Build:** Vite + Vinxi
- **Linting:** Biome
- **Git Hooks:** Husky + lint-staged
- **Package Manager:** pnpm (v10.24.0)

---

## Key Design Decisions

### Why XState?
**Problem:** Complex 10-step workflow with branching logic, error states, and resume capability.  
**Decision:** XState v5 for type-safe state machines with visual debugging.  
**Benefits:**
- Compile-time type checking for states/events
- Visual inspector for debugging
- Built-in snapshot serialization
- Testable state transitions

**See:** [ADR-001: XState for Workflow Management](../decisions/ADR-001-xstate-for-workflow.md)

### Why Server Functions (RPC)?
**Problem:** Dynamic imports (`import("./repository")`) fail client-side (BUG-024).  
**Decision:** Server functions (`$fnName`) with dependency injection at machine creation.  
**Benefits:**
- No client/server boundary issues
- Zero runtime import latency
- Easier testing (inject mocks)
- Better tree-shaking

**See:** [ADR-002: Server Functions Over REST](../decisions/ADR-002-server-functions-over-rest.md)

### Why Type-Safe Constants?
**Problem:** 160+ magic strings caused state name mismatches (BUG-029).  
**Decision:** Single `constants.ts` file with 8 constant categories.  
**Benefits:**
- TypeScript catches typos compile-time
- IntelliSense autocomplete
- Refactoring safety (rename propagates)

**See:** [ADR-003: Type-Safe Constants](../decisions/ADR-003-type-safe-constants.md)

### Why better-sqlite3?
**Decision:** Synchronous SQLite for local-first POC.  
**Tradeoff:** Not production-ready for multi-user (requires migration to async Turso/PostgreSQL).  
**Benefits:** Simple setup, no network latency, perfect for POC validation.

---

## Critical Code Patterns

These patterns prevent entire classes of bugs. Follow them religiously.

### 1. Design Token Pairing (BUG-028)
**Rule:** Always pair semantic background + foreground tokens.

```tsx
// ❌ WRONG - Zero contrast in dark mode
<div className="bg-inverse text-fg-1">

// ✅ CORRECT - Semantic pair ensures contrast
<div className="bg-inverse text-fg-on-inverse">
```

**Why:** `bg-inverse` + `text-fg-1` both resolve to `#F2EEE5` in dark mode (invisible text).

**See:** `.tmp-docs/bug-reports/028-sherpy-avatar-unreadable-dark-mode.md`

### 2. Type-Safe Constants (BUG-029)
**Rule:** Import from `constants.ts`, never use string literals.

```ts
// ❌ WRONG - Typos undetected
const state = "collectingInfo"; // vs "collecting"?

// ✅ CORRECT - Compile-time checking
import { STEP_STATES } from './constants';
const state = STEP_STATES.STEP_1.COLLECTING_INFO;
```

**See:** [ADR-003: Type-Safe Constants](../decisions/ADR-003-type-safe-constants.md)

### 3. Single Navigation Source (BUG-023)
**Rule:** Only ONE component calls `navigate()` for a given flow.

```tsx
// ❌ WRONG - Parent AND child both navigate (race condition)
function Parent() {
  useEffect(() => { navigate('/step2'); }, []);
  return <Child />;
}
function Child() {
  useEffect(() => { navigate('/step2'); }, []);
}

// ✅ CORRECT - Single source of truth
function Parent() {
  // Navigation logic here
  return <Child />;
}
```

**See:** `.tmp-docs/bug-reports/023-navigation-race-condition/`

### 4. Key Prop for Route Params (BUG-037)
**Rule:** Add `key={routeParam}` to stateful components when route params change.

```tsx
// ❌ WRONG - Component reused across projects (state leakage)
<PlanningMachineProvider projectId={projectId} />

// ✅ CORRECT - Force unmount/remount on projectId change
<PlanningMachineProvider key={projectId} projectId={projectId} />
```

**Why:** XState `createActor({ input, snapshot })` prioritizes snapshot over input. Without `key`, React reuses component and stale snapshot.

**See:** `.tmp-docs/bug-reports/037-cross-project-leakage/`

### 5. Defense-in-Depth Persistence (BUG-025)
**Rule:** Validate project existence before navigation + monitor persistence health + provide data rescue.

```tsx
// Layer 1: Route Guard
if (!projectExists(projectId)) {
  return <NotFound />;
}

// Layer 2: Health Monitor
<PersistenceHealthMonitor />

// Layer 3: Data Rescue
exportLocalStorageData(projectId);
```

**See:** `.tmp-docs/bug-reports/025-empty-business-requirements-no-project/`

---

## File Organization

### Source Structure
```
src/
├── app/                        # Nitro server app
│   ├── routes/                 # TanStack Router routes
│   └── server/                 # Server functions ($fnName)
├── components/                 # Shared React components
│   ├── ui/                     # shadcn/ui primitives
│   └── workflow-chat/          # Chat interface components
├── features/
│   └── planning/
│       ├── components/         # Planning-specific UI
│       ├── machines/           # XState state machines
│       │   ├── constants.ts    # Single source of truth
│       │   ├── planning-machine-factory.ts
│       │   └── types.ts
│       ├── ai/                 # AI provider integration
│       │   ├── prompts.ts      # LLM prompt templates
│       │   └── skills-content.ts
│       └── infrastructure/     # Server functions, persistence
├── infrastructure/             # Cross-cutting concerns
│   ├── persistence/            # SQLite + localStorage
│   └── monitoring/             # Langfuse, health checks
└── lib/                        # Utility functions
```

### Documentation Structure
```
docs/
├── architecture/               # System design docs
│   ├── OVERVIEW.md            # You are here
│   ├── state-machine.md       # XState patterns
│   └── ai-providers.md        # AI integration
├── decisions/                  # Architecture Decision Records
│   ├── ADR-001-xstate-for-workflow.md
│   ├── ADR-002-server-functions-over-rest.md
│   └── ADR-003-type-safe-constants.md
├── testing/                    # Test guides
│   └── troubleshooting.md     # Common test failures
└── planning/                   # Project planning artifacts
```

### Test Structure
```
src/
├── __tests__/                  # Unit tests (colocated)
└── features/planning/__tests__/
tests/
├── e2e/                        # Playwright E2E tests
├── fixtures/                   # Test data builders
│   └── PlanningStateBuilder.ts # Fluent API for fixtures
└── integration/                # Integration tests
```

---

## The Planning Workflow

Sherpy UI implements a 10-step planning workflow. Each step is a state in the XState machine.

### Workflow States

| Step | Name | Type | Purpose |
|------|------|------|---------|
| 1 | Gap Analysis | Form | Assess existing requirements |
| 2 | Business Requirements | Interview | Gather business context (AI) |
| 3 | Technical Requirements | Interview | Define tech stack (AI) |
| 4 | Style Anchors | Automated | Code style guidelines |
| 5 | Implementation Planner | Form | Deployment strategy |
| 6 | Definition of Done | Automated | Quality criteria |
| 7 | Architecture Decisions | Automated | ADRs |
| 8 | Delivery Timeline | Automated | Project schedule |
| 9 | QA Test Plan | Automated | Test strategy |
| 10 | Summaries | Automated | Exec/dev summaries |

**Form Steps:** User fills form → submit → generate artifact  
**Interview Steps:** AI asks questions → user answers → generate artifact (10+ Q&A pairs)  
**Automated Steps:** Generate artifact immediately (no user input)

### State Machine Flow

```
step1_gapAnalysis
  → collectingInfo (form)
  → assessingNeed (AI check)
  → submitting (generate artifact)
  → complete

step2_businessReqs / step3_techReqs
  → fetchingQuestion (AI generates Q)
  → awaitingAnswer (user inputs A)
  → checkingComplete (10/10?)
  → generatingArtifact
  → complete

step4-10 (automated)
  → generating
  → complete
```

**See:** [`state-machine.md`](./state-machine.md) for detailed state transitions.

---

## Developer Workflow

### Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with AI provider keys (AWS_REGION, ANTHROPIC_API_KEY, etc.)

# 3. Initialize database
pnpm dev  # Auto-creates SQLite DB on first run

# 4. Verify AI provider
pnpm check:provider
```

### Development Loop
```bash
# Run dev server (hot reload)
pnpm dev

# Run tests (watch mode)
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Making Changes

1. **Read the bug archive:** `.tmp-docs/bug-reports/FIXED-BUGS.md` for common pitfalls
2. **Follow critical patterns:** Design tokens, constants, navigation, key props
3. **Write tests:** Unit test for logic, integration test for flows
4. **Check types:** `pnpm typecheck` before commit
5. **Commit:** Husky runs lint-staged (Biome auto-fix)

### Testing

```bash
# Unit + integration tests
pnpm test

# With coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e

# E2E with mock AI (fast)
pnpm test:e2e:workflow-chat-mock

# Debug mode
pnpm test:e2e:debug
```

**Test Helpers:**
- `PlanningStateBuilder` - Fluent API for state machine fixtures
- `createTestSnapshot()` - Valid XState snapshots
- `mockServerFunctions()` - Mock AI responses

**See:** [`../testing/troubleshooting.md`](../testing/troubleshooting.md) for common test failures.

---

## Deployment

### Build
```bash
pnpm build
# Output: .output/server/index.mjs (Nitro bundle)
```

### Run Production
```bash
NODE_ENV=production pnpm start
```

### Environment Variables
- `NODE_ENV` - production/development
- `AWS_REGION` - AWS region for Bedrock
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `ANTHROPIC_API_KEY` - Direct Anthropic API key
- `OPENAI_API_KEY` - OpenAI API key
- `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` - Observability
- `USE_MOCK_STREAMING` - Enable mock AI responses (testing)

**See:** `.env.example` for full list.

---

## Known Limitations (POC)

This is a **proof-of-concept** ready for team hardening. Known limitations:

1. **Single-user only:** better-sqlite3 is synchronous (no concurrency)
   - **Hardening:** Migrate to async DB (Turso, PostgreSQL)

2. **Local-first only:** SQLite file on disk
   - **Hardening:** Add cloud sync or full cloud DB

3. **No authentication:** Anyone with URL can access projects
   - **Hardening:** Add auth (Clerk, Auth.js, etc.)

4. **Limited error recovery:** Some AI failures require restart
   - **Hardening:** Add retry logic with exponential backoff

5. **No real-time collaboration:** Single browser window
   - **Hardening:** Add WebSocket sync for multiplayer

6. **Artifacts not validated:** AI generates YAML, not schema-validated
   - **Hardening:** Add Zod schemas for artifact validation

---

## Learning Resources

### Essential Reading
1. **This document** - System overview (30 min)
2. [`state-machine.md`](./state-machine.md) - XState patterns (20 min)
3. [`FIXED-BUGS.md`](../../.tmp-docs/bug-reports/FIXED-BUGS.md) - Pitfall archive (15 min)
4. [XState v5 Docs](https://stately.ai/docs/xstate) - Official guide
5. [TanStack Router Docs](https://tanstack.com/router) - Routing patterns

### Debugging Tools
- **XState Inspector:** Visual state machine debugging at `/xstate-inspector`
- **React DevTools:** Component tree, props, hooks
- **Langfuse Dashboard:** LLM trace analysis at `http://localhost:3000`
- **Playwright Inspector:** E2E test debugging (`pnpm test:e2e:debug`)

### Code Exploration
- **Start here:** `src/features/planning/machines/planning-machine-factory.ts` (state machine)
- **UI entry point:** `src/app/routes/projects/$projectId.tsx` (main route)
- **AI integration:** `src/features/planning/ai/prompts.ts` (prompt templates)
- **Persistence:** `src/infrastructure/persistence/state-persistence.ts`

---

## Getting Help

- **Architecture questions:** Read ADRs in `docs/decisions/`
- **Test failures:** See `docs/testing/troubleshooting.md`
- **Bug patterns:** Check `.tmp-docs/bug-reports/FIXED-BUGS.md`
- **State machine issues:** See `docs/architecture/state-machine.md`

---

**Last Updated:** 2026-06-17  
**Maintainer:** Development Team  
**Status:** Production-ready POC (1033 tests passing)
