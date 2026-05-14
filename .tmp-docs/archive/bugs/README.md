# Bug Reports

This directory contains detailed bug reports discovered during development and testing of the XState v5 migration.

## Active Bugs

| ID | Title | Severity | Status | Reported | Component |
|----|-------|----------|--------|----------|-----------|
| [BUG-001](./BUG-001-idle-state-handler-missing.md) | Missing Idle State Handler in Planning Workflow | 🔴 BLOCKER | OPEN | 2026-05-11 | Planning Machine |

## Bug Report Template

Each bug report includes:
- **Summary** - Brief description of the issue
- **Impact** - User and business impact assessment
- **Steps to Reproduce** - Exact reproduction steps
- **Root Cause Analysis** - Technical deep dive
- **Evidence** - Screenshots, logs, console output
- **Proposed Solutions** - Multiple fix options with pros/cons
- **Recommendation** - Preferred solution with rationale
- **Testing Checklist** - Verification steps after fix
- **Related Files** - Affected source files

## Severity Levels

- 🔴 **BLOCKER** (P0) - Feature completely unusable, blocks testing/deployment
- 🟠 **CRITICAL** (P1) - Major functionality broken, has workaround
- 🟡 **MAJOR** (P2) - Significant issue, doesn't block core functionality
- 🟢 **MINOR** (P3) - Small issue, cosmetic or edge case

## Status Values

- **OPEN** - Bug confirmed, awaiting fix
- **IN PROGRESS** - Fix is being implemented
- **FIXED** - Fix implemented and committed
- **VERIFIED** - Fix tested and confirmed working
- **CLOSED** - Issue resolved and verified in production
- **WONTFIX** - Intentional behavior or accepted limitation
