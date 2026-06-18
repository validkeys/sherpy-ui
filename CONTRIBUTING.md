# Contributing to Sherpy UI

**Welcome!** Thank you for your interest in contributing to Sherpy UI. This guide will help you get started with development, testing, and submitting changes.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Branch Strategy](#branch-strategy)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Getting Help](#getting-help)

---

## Development Setup

### Prerequisites

- **Node.js:** 24+ (LTS recommended)
- **pnpm:** v10.24.0+
- **Git:** 2.0+
- **AI Provider:** AWS Bedrock, Anthropic, or OpenAI account

### Initial Setup

**1. Clone the repository:**
```bash
git clone https://github.com/your-org/sherpy-ui.git
cd sherpy-ui
```

**2. Install dependencies:**
```bash
pnpm install
```

**3. Configure environment:**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
# See "Environment Variables" section below
```

**4. Configure AI Provider:**

Choose ONE provider and add credentials to `.env`:

```bash
# Option A: AWS Bedrock (Primary)
AI_PROVIDER=bedrock
AWS_REGION=ca-central-1
AWS_PROFILE=your-sso-profile  # For SSO
# OR
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Option B: Anthropic Direct API
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Option C: OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**5. Verify setup:**
```bash
# Check AI provider connectivity
pnpm check:provider
# Should show: ✅ Connection successful

# Run tests
pnpm test
# Should show: 1033 passing tests

# Start dev server
pnpm dev
# Server starts at http://localhost:5180
```

**See:** [docs/testing/E2E-RUNBOOK.md](./docs/testing/E2E-RUNBOOK.md) for detailed setup instructions.

---

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# OR for bug fixes
git checkout -b fix/bug-description
```

**Branch naming convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

### 2. Make Changes

**Development loop:**
```bash
# Start dev server with hot reload
pnpm dev

# In another terminal, run tests in watch mode
pnpm test --watch

# Make your changes...
# Edit files, save, tests auto-run
```

**Before committing:**
```bash
# Run type check
pnpm typecheck
# Should show: 0 errors

# Run lint
pnpm lint
# Should show: 0 warnings

# Run all tests
pnpm test
# Should show: All tests passing
```

### 3. Commit Changes

**Pre-commit hooks automatically run:**
- Biome lint + auto-fix
- Type checking
- Test suite (if configured)

```bash
# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "feat: Add interview question caching

- Cache AI-generated questions in localStorage
- Reduce API calls by 50%
- Add cache invalidation on project update"
```

**See:** [Commit Message Guidelines](#commit-message-guidelines)

### 4. Push and Create PR

```bash
# Push feature branch
git push origin feature/your-feature-name

# Create PR on GitHub
# Fill out PR template
```

---

## Code Standards

### Core Principles

Follow the guidelines in **[CLAUDE.md](./CLAUDE.md)**:

1. **Think Before Code** - State assumptions, surface tradeoffs
2. **Simplicity First** - Minimum code to solve problem
3. **Surgical Changes** - Touch only what's necessary
4. **Goal-Driven** - Define success criteria upfront

### Critical Patterns

**1. Design Token Pairing**
```tsx
// ❌ WRONG - Zero contrast in dark mode
<div className="bg-inverse text-fg-1">

// ✅ CORRECT - Semantic pair ensures contrast
<div className="bg-inverse text-fg-on-inverse">
```

**2. Type-Safe Constants**
```typescript
// ❌ WRONG - Typos undetected
state.matches('collectingInfo');

// ✅ CORRECT - Compile-time checking
import { STEP_STATES } from './constants';
state.matches(STEP_STATES.STEP_1.COLLECTING_INFO);
```

**3. Single Navigation Source**
```tsx
// ❌ WRONG - Race condition
function Parent() {
  useEffect(() => { navigate('/step2'); }, []);
  return <Child />;
}
function Child() {
  useEffect(() => { navigate('/step2'); }, []); // Duplicate!
}

// ✅ CORRECT - Single source of truth
function Parent() {
  const handleComplete = () => navigate('/step2');
  return <Child onComplete={handleComplete} />;
}
```

**4. Key Prop for Route Params**
```tsx
// ❌ WRONG - State leakage across projects
<PlanningMachineProvider projectId={projectId} />

// ✅ CORRECT - Force unmount/remount
<PlanningMachineProvider key={projectId} projectId={projectId} />
```

**See:** [docs/architecture/OVERVIEW.md](./docs/architecture/OVERVIEW.md#critical-code-patterns)

### TypeScript

- **Strict mode enabled** - No implicit `any`
- **No type assertions** - Use type guards instead
- **Prefer interfaces** for public APIs
- **Use `as const`** for constant objects

```typescript
// ✅ Good
export const CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 5000,
} as const;

// ❌ Avoid
export const CONFIG = {
  MAX_RETRIES: 3 as number,
  TIMEOUT_MS: 5000 as number,
};
```

### React

- **Functional components** with hooks
- **No class components**
- **Hooks before conditional returns**
- **Cleanup in useEffect**

```typescript
// ✅ Good
function Component() {
  const data = useData(); // All hooks first
  const actor = useActor();
  
  if (loading) return <Spinner />; // Conditional after hooks
  
  useEffect(() => {
    const sub = subscribe();
    return () => sub.unsubscribe(); // Cleanup
  }, []);
}
```

### File Organization

```
src/
├── features/
│   └── planning/
│       ├── components/       # React components
│       ├── machines/         # XState machines
│       ├── ai/              # AI integration
│       └── infrastructure/   # Server functions
├── components/              # Shared UI components
├── infrastructure/          # Cross-cutting concerns
└── lib/                    # Utilities
```

**Co-locate tests:**
```
src/features/planning/
├── components/
│   ├── FormStep.tsx
│   └── FormStep.test.tsx    # Test next to component
```

---

## Testing Requirements

### Test Coverage

**Required:**
- ✅ **Unit tests** for all business logic
- ✅ **Integration tests** for workflows
- ✅ **Component tests** for React UI
- ⚠️ **E2E tests** for critical paths (optional for small changes)

**Coverage targets:**
- Domain layer: 100%
- Components: 80%+
- Overall: 80%+

### Writing Tests

**1. Unit Tests (Vitest)**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateProgress } from './progress';

describe('calculateProgress', () => {
  it('should return 0% for no completed steps', () => {
    const result = calculateProgress({ completed: 0, total: 10 });
    expect(result).toBe(0);
  });
  
  it('should return 100% for all completed steps', () => {
    const result = calculateProgress({ completed: 10, total: 10 });
    expect(result).toBe(100);
  });
});
```

**2. Component Tests (React Testing Library)**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { FormStep } from './FormStep';

describe('FormStep', () => {
  it('should submit form with valid data', async () => {
    const onSubmit = vi.fn();
    render(<FormStep onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Project Name'), {
      target: { value: 'Test Project' },
    });
    fireEvent.click(screen.getByText('Submit'));
    
    expect(onSubmit).toHaveBeenCalledWith({
      projectName: 'Test Project',
    });
  });
});
```

**3. XState Tests**
```typescript
import { createActor, waitFor } from 'xstate';
import { createPlanningMachine } from './planning-machine';

describe('Planning Machine', () => {
  it('should transition to submitting on SUBMIT_FORM', async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine).start();
    
    actor.send({ type: 'SUBMIT_FORM', responses: { /* ... */ } });
    
    await waitFor(actor, (state) => state.matches('submitting'));
    expect(actor.getSnapshot().value).toBe('submitting');
  });
});
```

**See:** [docs/testing/troubleshooting.md](./docs/testing/troubleshooting.md)

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# With coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e

# Single file
pnpm test FormStep.test.tsx
```

---

## Pull Request Process

### Before Submitting

**1. Self-review checklist:**
- [ ] All tests passing (`pnpm test`)
- [ ] Type check passing (`pnpm typecheck`)
- [ ] Lint passing (`pnpm lint`)
- [ ] No console.log/debugger left in code
- [ ] No TODOs in production code (move to issues)
- [ ] Code follows CLAUDE.md guidelines
- [ ] Tests added for new features
- [ ] Documentation updated (if API changed)

**2. Test your changes:**
```bash
# Run full test suite
pnpm test

# Test in browser
pnpm dev
# Manually verify changes work
```

**3. Update documentation:**
- Update README if public API changed
- Add/update JSDoc comments
- Update architecture docs if needed

### PR Template

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to break)
- [ ] Documentation update

## Related Issues

Closes #123

## Changes Made

- Added interview question caching
- Reduced API calls by 50%
- Added cache invalidation logic

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if critical path)
- [ ] Manually tested in browser

## Screenshots (if UI changes)

[Attach screenshots]

## Checklist

- [ ] All tests passing
- [ ] Type check passing
- [ ] Lint passing
- [ ] No console errors
- [ ] No TODOs in production code
- [ ] Documentation updated
- [ ] Follows CLAUDE.md guidelines
```

### Review Process

**What reviewers check:**
1. **Correctness** - Does it work as intended?
2. **Tests** - Are there tests? Do they cover edge cases?
3. **Code quality** - Follows standards? Readable? Maintainable?
4. **Performance** - Any regressions? Unnecessary re-renders?
5. **Security** - No XSS, SQL injection, or other vulnerabilities?

**Addressing feedback:**
```bash
# Make requested changes
git add <files>
git commit -m "refactor: Address PR feedback"
git push origin feature/your-feature-name
```

**Approval criteria:**
- ✅ At least 1 approval from maintainer
- ✅ All CI checks passing
- ✅ No unresolved conversations

---

## Branch Strategy

### Main Branch

- **Protected** - No direct pushes
- **Always deployable** - All tests must pass
- **Source of truth** - All features merge here

### Feature Branches

**Lifecycle:**
```
main → feature/new-feature → PR → main
```

**Naming:**
```
feature/add-question-caching
fix/bug-037-state-leakage
refactor/extract-domain-layer
docs/update-architecture-guide
test/add-e2e-workflow-tests
```

**Short-lived:**
- Create branch
- Develop feature (1-5 days)
- Open PR
- Merge and delete branch

### Release Process

**Not yet defined** - Currently deploying from `main` branch.

**Future:** Semantic versioning (v2.0.0) with release branches.

---

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- **feat:** New feature
- **fix:** Bug fix
- **refactor:** Code restructuring
- **test:** Add/update tests
- **docs:** Documentation updates
- **chore:** Maintenance tasks
- **perf:** Performance improvements
- **style:** Code style changes (formatting, no logic change)

### Scope (Optional)

Component or area affected: `planning`, `ui`, `ai`, `db`, `tests`

### Subject

- Use imperative mood ("Add" not "Added" or "Adds")
- Lowercase first letter
- No period at end
- 50 characters max

### Body (Optional)

- Explain **what** and **why**, not **how**
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (Optional)

- Reference issues: `Closes #123`
- Breaking changes: `BREAKING CHANGE: Description`

### Examples

**Simple:**
```
feat(planning): Add interview question caching
```

**With body:**
```
feat(planning): Add interview question caching

Cache AI-generated questions in localStorage to reduce API calls.
Cache is invalidated when project is updated.

Reduces Bedrock API calls by ~50% in testing.
```

**Bug fix:**
```
fix(state): Prevent cross-project state leakage (BUG-037)

Add key={projectId} to PlanningMachineProvider to force
unmount/remount when navigating between projects.

Closes #24
```

**Breaking change:**
```
refactor(api): Change server function signature

BREAKING CHANGE: createPlanningMachine() now requires
ServerFunctions object as first parameter instead of projectId.

Migration:
- Before: createPlanningMachine(projectId, { funcs })
- After: createPlanningMachine(serverFunctions)
```

---

## Getting Help

### Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Code standards and patterns
- **[docs/architecture/OVERVIEW.md](./docs/architecture/OVERVIEW.md)** - System architecture
- **[docs/testing/troubleshooting.md](./docs/testing/troubleshooting.md)** - Test debugging
- **[docs/testing/E2E-RUNBOOK.md](./docs/testing/E2E-RUNBOOK.md)** - E2E testing

### Resources

- **[XState v5 Docs](https://stately.ai/docs/xstate)** - State machine guide
- **[TanStack Router](https://tanstack.com/router)** - Routing patterns
- **[React 19 Docs](https://react.dev/)** - React patterns
- **[Tailwind v4](https://tailwindcss.com/)** - Styling guide

### Getting Unstuck

**Test failures?**
1. Read error message carefully
2. Check [docs/testing/troubleshooting.md](./docs/testing/troubleshooting.md)
3. Search codebase for similar patterns
4. Ask in PR comments or issues

**Architecture questions?**
1. Read [docs/architecture/OVERVIEW.md](./docs/architecture/OVERVIEW.md)
2. Check ADRs in [docs/decisions/](./docs/decisions/)
3. Review [CLAUDE.md](./CLAUDE.md) patterns

**Bug reproduction?**
1. Check [Fixed Bugs Archive](./.tmp-docs/bug-reports/FIXED-BUGS.md)
2. Search closed issues
3. Ask maintainer for context

---

## Code of Conduct

### Our Standards

- ✅ **Be respectful** - Constructive feedback, no personal attacks
- ✅ **Be collaborative** - Help others learn, share knowledge
- ✅ **Be open** - Accept feedback gracefully, explain decisions
- ✅ **Be inclusive** - Welcome all skill levels, backgrounds

### Unacceptable Behavior

- ❌ Harassment, discrimination, or offensive language
- ❌ Trolling, insulting comments, or personal attacks
- ❌ Publishing others' private information
- ❌ Spam or off-topic content

### Enforcement

Violations will result in:
1. **Warning** - First offense
2. **Temporary ban** - Repeated offense
3. **Permanent ban** - Severe or continued violations

Report violations to: [maintainer email]

---

## License

By contributing, you agree that your contributions will be licensed under the same license as this project.

---

## Thank You! 🎉

Your contributions make Sherpy UI better for everyone. We appreciate your time and effort!

**Questions?** Open an issue or ask in your PR.

---

**Last Updated:** 2026-06-17  
**Maintainer:** Development Team
