# Sherpy — wireframe

React port of the Sherpy product wireframes. Covers the full planning-session shell: left rail, header, spectrum stepper, gap-analysis thread, and interview flow.

## Stack

| Tool | Version |
|------|---------|
| React | 19 (with `<Activity>`) |
| TypeScript | 5.x (`noUncheckedIndexedAccess`) |
| Vite | 6 |
| Tailwind CSS | v4 |
| Storybook | 10 (CSF3, Vitest + a11y addons) |
| pnpm | 10 |

## Getting started

```sh
pnpm install

# Dev server
pnpm dev          # http://localhost:5173

# Storybook
pnpm storybook    # http://localhost:6006

# Type check
pnpm tsc -b --noEmit

# Run tests
pnpm test

# Linting
pnpm lint         # Check code quality
pnpm lint:fix     # Auto-fix issues
```

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to automatically lint and format code before commits.

**What runs on commit:**
- **TypeScript/JavaScript files** (`.ts`, `.tsx`, `.js`, `.jsx`): Biome linting and formatting
- **JSON/Markdown files** (`.json`, `.md`): Biome formatting

The hooks are automatically installed when you run `pnpm install`. If a file fails linting, the commit will be blocked until you fix the issues.

## Component map

```
src/components/
  app-shell/        AppShell — top-level layout: left rail + main panel
  header/           Header — breadcrumb, stage indicator, mode toggle, theme toggle
  spectrum-stepper/ SpectrumStepper — 10-stage coloured progress bar
  left-rail/        LeftRail — brand, nav sections, user footer
  mode-toggle/      ModeToggle — Build / Review pill toggle (⌘R shortcut)
  thread/           11 primitives: ThreadView, QuestionCard, OptionStack,
                    OptionCard, SuggestionChip, Composer, Message,
                    AskbackAside, ChattedPill, ThreadDivider, RecommendedBadge
  intake/           PathCard — project-type selection card
  worksheet/        Worksheet, DropZone, MergeProgress — artifact worksheet surface
  doc-browser/      DocBrowser, DocItem, CodePreview — review-mode document browser
  theme-provider/   ThemeProvider, ThemeToggle — dark/light mode
  ui/               Button, Card — base shadcn/ui primitives
```

## Design tokens

All tokens live in `src/styles/tokens.css` and are consumed via CSS custom properties + Tailwind v4 utilities.

| Category | Key tokens |
|----------|-----------|
| Colour — surface | `--bg-page`, `--surface`, `--sunken` |
| Colour — foreground | `--fg-1` … `--fg-4`, `--fg-on-inverse` |
| Colour — border | `--border-1`, `--border-2`, `--border-emph` |
| Colour — spectrum | `--bot-1` … `--bot-9` + glow variants |
| Typography | `--font-sans` (Geist), `--font-serif` (Bodoni Moda), `--font-mono` (Geist Mono) |
| Type scale | `--fs-xs` … `--fs-3xl`, `--fw-*`, `--lh-*` |

## Milestones

| # | Scope | Status |
|---|-------|--------|
| M1 | Foundation — drop @assistant-ui, rename review-view → doc-browser | ✓ |
| M2–M4 | Header skipAction, stepper props, intake + worksheet surfaces | ✓ |
| M5 | Thread surface — 11 primitives, ThreadView shell, fixtures | ✓ |
| M6 | Frame stories — GapAnalysis A–F, Interview G/H/I1–I5 | ✓ |
| M7 | Polish — font swap, a11y sweep, tsc clean, README | ✓ |

## Environment Variables

### AI Provider Configuration

The app supports three LLM providers, selected via a single env var:

```bash
AI_PROVIDER=bedrock    # bedrock | openai | anthropic
```

Set `AI_MODEL_ID` to override the default model for the selected provider:

```bash
AI_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
```

**Provider-specific settings:**

```bash
# --- AWS Bedrock (default) ---
AWS_REGION=ca-central-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
# Auth via AWS credential chain (env vars, SSO, or AWS_PROFILE)
# AWS_PROFILE=your-profile

# --- OpenAI ---
# OPENAI_API_KEY=sk-...
# Default model: gpt-4o

# --- Anthropic (direct API) ---
# ANTHROPIC_API_KEY=sk-ant-...
# Default model: claude-sonnet-4-5-20250929
```

> **Backward compatible:** Existing Bedrock-only configs work unchanged — `AI_PROVIDER` defaults to `bedrock` and `AI_MODEL_ID` falls back to `BEDROCK_MODEL_ID`.

**Verify your provider connection:**

```sh
pnpm check:provider    # Tests connectivity + a minimal model invocation
```

### Structured Output Feature (Gradual Rollout)

**Status:** Ready for Phase 1 (see [docs/structured-output-rollout.md](./docs/structured-output-rollout.md))

The application supports JSON Schema-based structured responses from the LLM, which provides:
- Type-safe responses with compile-time guarantees
- Clean question text without `**Options:**` duplication
- Zero text parsing (direct JSON deserialization)
- Easier maintenance and testing

**Configuration:**

```bash
# Enable structured output feature
USE_STRUCTURED_OUTPUT=false  # Default: disabled (safe rollout)

# Comma-separated list of step numbers to enable (default: 1)
STRUCTURED_OUTPUT_STEPS=1
```

**Rollout Phases:**
- **Phase 1** (1 week): Step 1 only → `STRUCTURED_OUTPUT_STEPS=1`
- **Phase 2** (2 weeks): Steps 1-3 → `STRUCTURED_OUTPUT_STEPS=1,2,3`
- **Phase 3** (ongoing): All steps → `STRUCTURED_OUTPUT_STEPS=1,2,3,4,5,6,7,8,9,10`

**Rollback:** Set `USE_STRUCTURED_OUTPUT=false` for instant zero-downtime rollback to text parsing.

See [Structured Output Rollout Plan](./docs/structured-output-rollout.md) for full documentation.

### Langfuse Observability (Optional)

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASEURL=http://localhost:3120
LANGFUSE_ENABLED=true
```

### Development

```bash
PORT=3000
SEED_DATA=true
USE_MOCK_STREAMING=false  # Use mock LLM responses for testing
```

## Testing

This project uses a comprehensive testing framework with:
- **Test Suite:** 654+ passing tests (Vitest)
- **Coverage:** Unit, integration, and E2E tests
- **Test Helpers:** `PlanningStateBuilder` for fluent test data creation
- **Snapshot System:** 26 validated snapshots (0.16 MB) for regression testing

### Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Validate snapshots
pnpm run snapshots:validate

# Generate snapshots
pnpm run snapshots:generate
```

### Testing Guide

For comprehensive testing documentation, see:
- **[Testing Guide](tests/fixtures/GUIDE.md)** - Complete testing framework documentation (998 lines)
  - PlanningStateBuilder API reference (16 methods)
  - Snapshot system (capture/load/validate)
  - Test helpers and best practices
  - Troubleshooting guide
  - Advanced patterns

### Test Data Management

```typescript
// Example: Create test data with PlanningStateBuilder
import { PlanningStateBuilder } from '@/tests/fixtures/builders/PlanningStateBuilder';

const projectId = await new PlanningStateBuilder()
  .withBusinessRequirements({ 
    existingRequirements: 'No', 
    projectDescription: 'Healthcare portal' 
  })
  .withTechnicalRequirements({ 
    targetPlatform: 'Web', 
    userBase: 'Internal staff' 
  })
  .atStep(5)
  .save();
```

See [tests/fixtures/GUIDE.md](tests/fixtures/GUIDE.md) for full API documentation and examples.
