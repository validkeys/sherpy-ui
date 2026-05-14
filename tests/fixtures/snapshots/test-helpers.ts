/**
 * Test helper functions for snapshot testing
 * Extracted from test files to avoid linting errors (noExportsInTest)
 */

/**
 * Helper function to find latest snapshot matching a pattern
 *
 * @param snapshots - List of snapshot filenames
 * @param pattern - Pattern to match (e.g., "step-2-incomplete")
 * @returns Latest matching snapshot filename or undefined
 */
export function findLatestSnapshot(
  snapshots: string[],
  pattern: string,
): string | undefined {
  return snapshots
    .filter((f) => f.includes(pattern))
    .sort() // Sorts by timestamp (embedded in filename)
    .pop(); // Get most recent
}

/**
 * Helper function to group snapshots by step and label
 *
 * @param snapshots - List of snapshot filenames
 * @returns Map of step -> label -> filenames[]
 */
export function groupSnapshotsByStepAndLabel(
  snapshots: string[],
): Map<number, Map<string, string[]>> {
  const grouped = new Map<number, Map<string, string[]>>();

  for (const filename of snapshots) {
    const match = filename.match(/step-(\d+)-(.+)-\d+\.json/);
    if (!match) continue;

    const step = Number.parseInt(match[1], 10);
    const label = match[2];

    if (!grouped.has(step)) {
      grouped.set(step, new Map());
    }

    const stepMap = grouped.get(step);
    if (!stepMap) continue;

    if (!stepMap.has(label)) {
      stepMap.set(label, []);
    }

    const labelArray = stepMap.get(label);
    if (labelArray) {
      labelArray.push(filename);
    }
  }

  return grouped;
}
