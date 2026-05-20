# E2E Testing Documentation

This directory contains the official end-to-end testing documentation for the Sherpy Planning Workflow.

## 📋 Core Documents

- **[ai-browser-test.yaml](./ai-browser-test.yaml)** - **PRIMARY ENTRYPOINT**: Complete test execution guide with step-by-step instructions
- **[guide.md](./guide.md)** - Detailed step-by-step test procedures (SOURCE OF TRUTH for test execution)
- **[learnings.md](./learnings.md)** - Accumulated wisdom from all test runs, organized by step
- **[INDEX.md](./INDEX.md)** - System overview and quick reference
- **[TESTING-SYSTEM.md](./TESTING-SYSTEM.md)** - System philosophy and architecture

## 🔧 Templates

- **[tracking-template.yaml](./tracking-template.yaml)** - Template for per-run tracking files
- **[bug-report-template.yaml](./bug-report-template.yaml)** - Template for bug reports

## 🧪 Test Automation

### Playwright MCP (Recommended)
Use Playwright MCP tools for React form testing:
- **[migration-to-playwright-mcp.md](./migration-to-playwright-mcp.md)** - Migration guide and best practices

### Agent Browser (Legacy - Not Recommended for Forms)
- **[agent-browser-form-filling-guide.md](./agent-browser-form-filling-guide.md)** - Comprehensive research (5 approaches tested, all failed for React forms)
- **[agent-browser-quick-reference.md](./agent-browser-quick-reference.md)** - Quick reference for non-form interactions

### Known Issues
- **[bug-014-root-cause-analysis.md](./bug-014-root-cause-analysis.md)** - BUG-014 root cause (agent-browser + React forms incompatibility)
- **[bug-014-test-validation-summary.md](./bug-014-test-validation-summary.md)** - Test validation results

## 📁 Test Data

- **[runs/](./runs/)** - Historical test run data with tracking files
- **[bug-reports/](./bug-reports/)** - Filed bug reports from test runs

## 🚀 Quick Start

To execute the full E2E test:

```bash
# Read the primary entrypoint
cat docs/e2e-testing/ai-browser-test.yaml

# Follow the instructions in ai-browser-test.yaml
# which will guide you through:
# 1. Prerequisites check
# 2. Test initialization
# 3. Step-by-step execution
# 4. Bug reporting
# 5. Completion and reporting
```

## 📊 Test History

See `guide.md` for complete test history including:
- Test run numbers and dates
- Overall pass/fail status
- Issues discovered
- Key observations

## 🔗 Related Documentation

- **Phase 2 Testing Framework**: See `/workspace/tests/fixtures/GUIDE.md` for automated testing tools
- **E2E Test Specs**: See `/workspace/tests/e2e/` for Playwright test implementations
- **Project Root**: See `/workspace/CLAUDE.md` for testing guidelines

---

**Last Updated**: 2026-05-19
**Current Version**: 2.1
