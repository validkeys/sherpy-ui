# WorkflowChat Validation

Use Playwright MCP for React form and composer validation when MCP tools are available in the agent session.

If Playwright MCP tools are not exposed by the current environment, use the repo Playwright runtime as the approved fallback. The fallback must use real Playwright `fill()` and `click()` interactions, not DOM value assignment or agent-browser form commands.

Deterministic Phase 4 artifact validation:

```bash
pnpm test:e2e:workflow-chat-mock
```

This command runs with `USE_MOCK_ARTIFACTS=true` and validates:

- Step 2 artifact starts pending.
- Ten WorkflowChat answers are submitted through real browser input.
- Step 2 artifact becomes created.
- Artifact dialog opens.
- Mock provenance is visible in the artifact content.

Live provider validation remains separate:

```bash
pnpm check:bedrock
```

Run live provider checks only with valid AWS credentials and Bedrock model access.
