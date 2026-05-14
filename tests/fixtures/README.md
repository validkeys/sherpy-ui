# Testing Framework Fixtures

This directory contains test fixtures, builders, and utilities for testing the Planning Wizard application.

## Directory Structure

```
tests/fixtures/
├── builders/              # Test state builders
│   ├── PlanningStateBuilder.ts
│   └── index.ts
├── snapshots/            # Snapshot capture utilities
│   ├── SnapshotCollector.ts
│   └── README.md
├── validation/           # State validation schemas
│   ├── schemas.ts
│   └── validators.ts
├── config.ts            # Environment configuration & safety
├── middleware.ts        # Next.js middleware for API protection
└── README.md           # This file
```

## Environment Configuration & Safety

The testing framework includes environment safety checks to prevent test data from being created in production.

### Configuration Rules

- **Production**: Seeding is **always blocked**
- **Development**: Requires `ALLOW_TEST_DATA=true` environment variable
- **Test**: Always allowed (for Jest/Vitest tests)

### Environment Variables

Add to your `.env.local` file:

```bash
# Enable test data seeding and snapshot capture APIs
ALLOW_TEST_DATA=true
```

### API Protection

All development APIs are protected by the `requireDevelopmentEnv` middleware:

```typescript
import { requireDevelopmentEnv } from "../../../../tests/fixtures/middleware";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  // Your handler logic here
});
```

This middleware:
- Blocks all requests in production (403 error)
- Requires `ALLOW_TEST_DATA=true` in development
- Allows all requests in test environment
- Returns appropriate error messages

### Audit Logging

All seeding and snapshot operations are automatically logged:

```typescript
import { auditLog } from "../../../../tests/fixtures/config";

auditLog("Created test project", {
  projectId: "test-123",
  step: 3,
});
```

Logs include:
- ISO timestamp
- Operation description
- Additional context (step number, project ID, etc.)

### Protected API Endpoints

The following development APIs are protected:

1. **Seed API**: `/api/dev/seed`
   - Creates test state at specific workflow steps
   - Usage: `npm run seed 5`
   
2. **Snapshot Capture API**: `/api/dev/snapshot/capture`
   - Captures XState snapshots during manual testing
   - Accessible via Debug Panel in development

## Usage Examples

### Using the Configuration Module

```typescript
import { getFixtureConfig, checkSeedingAllowed } from "./config";

// Check if seeding is allowed
const config = getFixtureConfig();
if (!config.allowSeeding) {
  throw new Error("Seeding is not allowed in this environment");
}

// Check for API middleware
const blockResult = checkSeedingAllowed();
if (blockResult) {
  return Response.json({ error: blockResult.error }, { status: blockResult.status });
}
```

### Creating Test State

```typescript
import { PlanningStateBuilder } from "./builders";

// Create state at step 3
const state = PlanningStateBuilder.atStep(3)
  .withProjectId("my-test")
  .build();
```

### Capturing Snapshots

Use the Debug Panel in development mode or call the API directly:

```bash
curl -X POST http://localhost:5180/api/dev/snapshot/capture \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-123",
    "step": 5,
    "label": "my-test",
    "context": {...}
  }'
```

## Testing

Run all fixture tests:

```bash
npm test -- tests/fixtures/ --no-coverage
```

Run specific test suites:

```bash
npm test -- tests/fixtures/config.test.ts          # Configuration tests
npm test -- tests/fixtures/builders/               # Builder tests
npm test -- tests/fixtures/snapshots/              # Snapshot tests
```

## Security Considerations

### Production Safety

The testing framework is designed to be production-safe:

1. All seeding APIs check `NODE_ENV === "production"` and block requests
2. Development APIs require explicit opt-in via `ALLOW_TEST_DATA=true`
3. All operations are logged for audit purposes
4. Middleware provides consistent error messages

### Best Practices

1. **Never commit `.env.local`** with `ALLOW_TEST_DATA=true` to version control
2. **Always check environment** before performing data mutations
3. **Use audit logging** for all test data operations
4. **Apply middleware** to all development-only API endpoints
5. **Test the safety checks** in your test suite

### Example: Adding a New Dev API

```typescript
// app/api/dev/my-endpoint/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { auditLog } from "../../../../tests/fixtures/config";
import { requireDevelopmentEnv } from "../../../../tests/fixtures/middleware";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Your logic here
    
    // Audit log the operation
    auditLog("My operation completed", {
      // relevant details
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
});
```

## Related Documentation

- **Builders**: `./builders/README.md` - Test state builder patterns
- **Snapshots**: `./snapshots/README.md` - Snapshot capture and management
- **Validation**: `./validation/schemas.ts` - State validation schemas
- **Implementation Plan**: `.tmp-docs/implementation-plan-testing-framework.md`
