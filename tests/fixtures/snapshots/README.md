# Snapshot Collection System

Captures real workflow states during manual testing for regression tests.

## Overview

The Snapshot Collector system allows developers to capture the current XState machine state during manual testing and save it as a versioned JSON snapshot. These snapshots can then be used for:

- Regression testing
- Reproducing specific workflow states
- Creating test fixtures
- Debugging state transitions

## Usage

### 1. Capture via Debug Panel (Recommended)

When running the dev server (`npm run dev`):

1. Navigate to any step in the planning workflow
2. Open the Debug Panel (visible in bottom-right corner in development mode)
3. Click **"📸 Capture Snapshot"** button
4. Enter a descriptive label (e.g., "step3-with-validation-error")
5. Snapshot is saved to `tests/fixtures/snapshots/`

### 2. Capture via API

```bash
curl -X POST http://localhost:5180/api/dev/snapshot/capture \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project-123",
    "step": 5,
    "label": "my-test-scenario",
    "context": { ... }
  }'
```

### 3. Capture Programmatically

```typescript
import { SnapshotCollector } from './SnapshotCollector';
import { PlanningStateBuilder } from '../builders/PlanningStateBuilder';

const collector = new SnapshotCollector();
const context = PlanningStateBuilder.atStep(5)
  .completeStep(1)
  .completeStep(2)
  .completeStep(3)
  .completeStep(4)
  .build();

const filename = await collector.captureSnapshot(context, 5, 'my-test');
console.log(`Saved: ${filename}`);
```

## Snapshot Format

Snapshots are stored as JSON files with the following format:

```json
{
  "version": "1.0",
  "capturedAt": "2026-05-14T06:30:00.000Z",
  "stepNumber": 5,
  "label": "happy-path",
  "xstateSnapshot": {
    "status": "active",
    "value": "step5",
    "context": { ... },
    "children": {},
    "historyValue": {},
    "tags": []
  }
}
```

## Filename Convention

Snapshots are automatically named:

```
step-{stepNumber}-{sanitized-label}-{timestamp}.json
```

Example: `step-5-happy-path-1778765728117.json`

## Loading Snapshots

```typescript
const collector = new SnapshotCollector();

// Load just the context
const context = await collector.loadSnapshot('step-5-happy-path-1778765728117.json');

// Load full snapshot with metadata
const snapshot = await collector.loadFullSnapshot('step-5-happy-path-1778765728117.json');
```

## API Reference

### SnapshotCollector

#### `captureSnapshot(context, stepNumber, label): Promise<string>`
Captures a snapshot and returns the filename.

#### `loadSnapshot(filename): Promise<PlanningContext>`
Loads a snapshot's context.

#### `loadFullSnapshot(filename): Promise<Snapshot>`
Loads complete snapshot with metadata.

#### `listSnapshots(): Promise<string[]>`
Lists all snapshot files in the directory.

#### `deleteSnapshot(filename): Promise<void>`
Deletes a snapshot file.

## Environment Requirements

- **Development only**: Snapshot capture is disabled in production
- API endpoint requires `ALLOW_TEST_DATA=true` environment variable

## See Also

- `SnapshotCollector.ts` - Core implementation
- `SnapshotCollector.test.ts` - Unit tests
- `snapshot-capture-api.test.ts` - Integration tests
- `/workspace/src/features/planning/components/DebugPanel.tsx` - UI integration
