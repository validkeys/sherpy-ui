#!/usr/bin/env tsx
/**
 * Snapshot Validation & Management Script
 *
 * Validates snapshot integrity, lists captures, and helps manage the snapshot library.
 *
 * Usage:
 *   npm run snapshots:validate           # Validate all snapshots
 *   npm run snapshots:validate -- --list # List all snapshots
 *   npm run snapshots:validate -- --stats # Show statistics
 *   npm run snapshots:validate -- --clean # Remove duplicate standard snapshots (interactive)
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";

const SNAPSHOTS_DIR = join(process.cwd(), "tests/fixtures/snapshots");

interface Snapshot {
  version: string;
  capturedAt: string;
  stepNumber: number;
  label: string;
  xstateSnapshot: {
    status: string;
    value: string | object;
    context: {
      currentStepNumber: number;
      projectId?: string;
      [key: string]: unknown;
    };
  };
}

interface ValidationResult {
  filename: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    step: number;
    label: string;
    capturedAt: string;
    size: number;
  };
}

async function getAllSnapshots(): Promise<string[]> {
  try {
    const files = await fs.readdir(SNAPSHOTS_DIR);
    return files
      .filter((f) => f.endsWith(".json") && f.startsWith("step-"))
      .sort();
  } catch (error) {
    console.error("❌ Failed to read snapshots directory:", error);
    return [];
  }
}

async function validateSnapshot(filename: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    filename,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const filePath = join(SNAPSHOTS_DIR, filename);
    const content = await fs.readFile(filePath, "utf-8");
    const stats = await fs.stat(filePath);

    // Parse JSON
    let snapshot: Snapshot;
    try {
      snapshot = JSON.parse(content);
    } catch (_error) {
      result.valid = false;
      result.errors.push("Invalid JSON format");
      return result;
    }

    // Validate required fields
    if (!snapshot.version) {
      result.valid = false;
      result.errors.push("Missing 'version' field");
    }

    if (!snapshot.capturedAt) {
      result.valid = false;
      result.errors.push("Missing 'capturedAt' field");
    }

    if (typeof snapshot.stepNumber !== "number") {
      result.valid = false;
      result.errors.push("Missing or invalid 'stepNumber' field");
    }

    if (!snapshot.label) {
      result.valid = false;
      result.errors.push("Missing 'label' field");
    }

    if (!snapshot.xstateSnapshot) {
      result.valid = false;
      result.errors.push("Missing 'xstateSnapshot' field");
      return result;
    }

    // Validate context
    const context = snapshot.xstateSnapshot.context;
    if (!context) {
      result.valid = false;
      result.errors.push("Missing context in xstateSnapshot");
      return result;
    }

    if (typeof context.currentStepNumber !== "number") {
      result.valid = false;
      result.errors.push("Missing or invalid context.currentStepNumber");
    }

    // Check step number consistency
    if (
      snapshot.stepNumber !== context.currentStepNumber &&
      context.currentStepNumber !== undefined
    ) {
      result.warnings.push(
        `Step number mismatch: metadata=${snapshot.stepNumber}, context=${context.currentStepNumber}`,
      );
    }

    // Check filename consistency
    const filenameMatch = filename.match(/^step-(\d+)-(.+)-\d+\.json$/);
    if (filenameMatch) {
      const filenameStep = Number.parseInt(filenameMatch[1], 10);
      const filenameLabel = filenameMatch[2];

      if (filenameStep !== snapshot.stepNumber) {
        result.warnings.push(
          `Filename step (${filenameStep}) doesn't match metadata step (${snapshot.stepNumber})`,
        );
      }

      if (filenameLabel !== snapshot.label) {
        result.warnings.push(
          `Filename label (${filenameLabel}) doesn't match metadata label (${snapshot.label})`,
        );
      }
    } else {
      result.warnings.push("Filename doesn't match expected pattern");
    }

    // Store metadata
    result.metadata = {
      step: snapshot.stepNumber,
      label: snapshot.label,
      capturedAt: snapshot.capturedAt,
      size: stats.size,
    };
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to validate: ${error}`);
  }

  return result;
}

async function validateAllSnapshots(): Promise<ValidationResult[]> {
  const snapshots = await getAllSnapshots();
  const results: ValidationResult[] = [];

  console.log(`\n🔍 Validating ${snapshots.length} snapshots...\n`);

  for (const filename of snapshots) {
    const result = await validateSnapshot(filename);
    results.push(result);

    if (!result.valid) {
      console.log(`❌ ${filename}`);
      for (const error of result.errors) {
        console.log(`   - ${error}`);
      }
    } else if (result.warnings.length > 0) {
      console.log(`⚠️  ${filename}`);
      for (const warning of result.warnings) {
        console.log(`   - ${warning}`);
      }
    } else {
      console.log(`✅ ${filename}`);
    }
  }

  return results;
}

async function listSnapshots(): Promise<void> {
  const snapshots = await getAllSnapshots();

  console.log("\n📸 Snapshot Library\n");

  // Group by step
  const byStep = new Map<number, string[]>();
  for (const filename of snapshots) {
    const match = filename.match(/^step-(\d+)-/);
    if (match) {
      const step = Number.parseInt(match[1], 10);
      if (!byStep.has(step)) {
        byStep.set(step, []);
      }
      byStep.get(step)!.push(filename);
    }
  }

  // Display grouped by step
  for (const [step, files] of Array.from(byStep.entries()).sort(
    ([a], [b]) => a - b,
  )) {
    console.log(`\nStep ${step}:`);

    // Group by label
    const byLabel = new Map<string, string[]>();
    for (const file of files) {
      const match = file.match(/^step-\d+-(.+)-\d+\.json$/);
      if (match) {
        const label = match[1];
        if (!byLabel.has(label)) {
          byLabel.set(label, []);
        }
        byLabel.get(label)!.push(file);
      }
    }

    for (const [label, labelFiles] of Array.from(byLabel.entries()).sort()) {
      console.log(`  ${label} (${labelFiles.length})`);
      for (const file of labelFiles) {
        const stats = await fs.stat(join(SNAPSHOTS_DIR, file));
        const sizeMB = (stats.size / 1024).toFixed(1);
        console.log(`    - ${file} (${sizeMB} KB)`);
      }
    }
  }
}

async function showStatistics(): Promise<void> {
  const snapshots = await getAllSnapshots();
  const results = await Promise.all(snapshots.map((f) => validateSnapshot(f)));

  console.log("\n📊 Snapshot Statistics\n");

  // Total counts
  const totalSnapshots = snapshots.length;
  const validSnapshots = results.filter((r) => r.valid).length;
  const invalidSnapshots = results.filter((r) => !r.valid).length;
  const withWarnings = results.filter((r) => r.warnings.length > 0).length;

  console.log(`Total Snapshots:    ${totalSnapshots}`);
  console.log(`✅ Valid:           ${validSnapshots}`);
  console.log(`❌ Invalid:         ${invalidSnapshots}`);
  console.log(`⚠️  With Warnings:  ${withWarnings}`);

  // Group by label
  const byLabel = new Map<string, number>();
  for (const result of results) {
    if (result.metadata) {
      const count = byLabel.get(result.metadata.label) || 0;
      byLabel.set(result.metadata.label, count + 1);
    }
  }

  console.log("\nBy Label:");
  for (const [label, count] of Array.from(byLabel.entries()).sort()) {
    console.log(`  ${label}: ${count}`);
  }

  // Coverage by step
  const byStep = new Map<number, number>();
  for (const result of results) {
    if (result.metadata) {
      const count = byStep.get(result.metadata.step) || 0;
      byStep.set(result.metadata.step, count + 1);
    }
  }

  console.log("\nCoverage by Step:");
  for (let step = 1; step <= 10; step++) {
    const count = byStep.get(step) || 0;
    const bar = "█".repeat(count);
    console.log(`  Step ${step.toString().padStart(2)}: ${bar} (${count})`);
  }

  // Total size
  let totalSize = 0;
  for (const result of results) {
    if (result.metadata) {
      totalSize += result.metadata.size;
    }
  }
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log(`\nTotal Size: ${totalSizeMB} MB`);

  // Edge cases vs standard
  const standardCount = snapshots.filter((f) =>
    f.includes("-standard-"),
  ).length;
  const edgeCaseCount = totalSnapshots - standardCount;

  console.log("\nSnapshot Types:");
  console.log(`  Standard (automated): ${standardCount}`);
  console.log(`  Edge Cases (manual):  ${edgeCaseCount}`);
}

async function cleanDuplicates(): Promise<void> {
  console.log("\n🧹 Duplicate Snapshot Cleanup\n");

  const snapshots = await getAllSnapshots();

  // Group by step and label
  const groups = new Map<string, string[]>();
  for (const filename of snapshots) {
    const match = filename.match(/^step-(\d+)-(.+)-\d+\.json$/);
    if (match) {
      const key = `${match[1]}-${match[2]}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(filename);
    }
  }

  // Find groups with multiple snapshots
  const duplicates = Array.from(groups.entries()).filter(
    ([_, files]) => files.length > 1,
  );

  if (duplicates.length === 0) {
    console.log("✅ No duplicate snapshots found.");
    return;
  }

  console.log(`Found ${duplicates.length} groups with duplicates:\n`);

  for (const [key, files] of duplicates) {
    console.log(`${key}:`);
    for (const file of files) {
      const stats = await fs.stat(join(SNAPSHOTS_DIR, file));
      const sizeMB = (stats.size / 1024).toFixed(1);
      const date = new Date(stats.mtime).toISOString();
      console.log(`  - ${file} (${sizeMB} KB, ${date})`);
    }
    console.log(`  → Keep latest, remove ${files.length - 1} older snapshots`);
    console.log();
  }

  console.log(
    "\n⚠️  This is a dry run. To actually remove duplicates, implement interactive confirmation.",
  );
  console.log(
    "   Consider keeping at least one duplicate for consistency testing.",
  );
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    await listSnapshots();
  } else if (args.includes("--stats")) {
    await showStatistics();
  } else if (args.includes("--clean")) {
    await cleanDuplicates();
  } else {
    // Default: validate all
    const results = await validateAllSnapshots();

    const validCount = results.filter((r) => r.valid).length;
    const invalidCount = results.filter((r) => !r.valid).length;
    const warningCount = results.filter((r) => r.warnings.length > 0).length;

    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Valid:    ${validCount}`);
    console.log(`  ❌ Invalid:  ${invalidCount}`);
    console.log(`  ⚠️  Warnings: ${warningCount}`);

    if (invalidCount > 0) {
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
