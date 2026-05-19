# Development Seeding API

**Endpoint:** `POST /api/dev/seed`

**Purpose:** Create project state at any workflow step instantly for testing.

## Security

- ✅ Automatically disabled in production (`NODE_ENV=production`)
- ✅ Requires `ALLOW_TEST_DATA=true` environment variable
- ✅ Only available in development and test environments

## Usage

### Basic Example

```bash
curl -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"step": 5}'
```

### With Custom Project Name

```bash
curl -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"step": 3, "projectName": "my-test-project"}'
```

### Response Format

```json
{
  "success": true,
  "projectId": "test-project",
  "step": 5,
  "url": "/project/test-project/build",
  "storageKey": "planning-machine-test-project",
  "snapshot": {
    "status": "active",
    "value": "step5",
    "context": { ... },
    "children": {},
    "historyValue": {},
    "tags": []
  },
  "instructions": {
    "manual": "localStorage.setItem('planning-machine-test-project', '{...}')",
    "programmatic": "localStorage.setItem('planning-machine-test-project', JSON.stringify(response.snapshot))"
  }
}
```

## Browser Usage

To use the seeded state in your browser:

```javascript
// Fetch and automatically apply
fetch('http://localhost:5180/api/dev/seed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ step: 5 })
})
  .then(r => r.json())
  .then(data => {
    localStorage.setItem(data.storageKey, JSON.stringify(data.snapshot));
    window.location.href = data.url;
  });
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `step` | number | ✅ | Workflow step number (1-10) |
| `projectName` | string | ❌ | Custom project ID (default: "test-project") |
| `overrides` | object | ❌ | Custom state overrides (advanced) |

## Error Responses

### Production Environment
```json
{
  "error": "Seeding API is disabled in production"
}
```
**Status:** 403

### Missing ALLOW_TEST_DATA
```json
{
  "error": "ALLOW_TEST_DATA environment variable must be set to \"true\""
}
```
**Status:** 403

### Invalid Step Number
```json
{
  "error": "Invalid step number. Must be between 1 and 10."
}
```
**Status:** 400

## Integration with PlanningStateBuilder

The API uses `PlanningStateBuilder.atStep(n)` to generate realistic test data for each step. See `/tests/fixtures/builders/README.md` for details on the builder API.

## Testing Script

Run the included test script:

```bash
./scripts/test-seed-api.sh
```

## See Also

- [PlanningStateBuilder Documentation](/tests/fixtures/builders/README.md)
- [Database Schema Documentation](/docs/database-schema.md)
- [Testing Framework Guide](/tests/fixtures/GUIDE.md) (coming in Task 2.9)
