#!/usr/bin/env tsx
/**
 * Automated Snapshot Generation Script
 *
 * Generates standard snapshots for all 10 workflow steps using:
 * - PlanningStateBuilder to create realistic workflow states
 * - SnapshotCollector to persist snapshots to disk
 *
 * Usage:
 *   npm run snapshots:generate
 *   tsx scripts/generate-snapshots.ts
 *
 * Output:
 *   tests/fixtures/snapshots/step-{n}-standard-{timestamp}.json
 */

import { PlanningStateBuilder } from "../tests/fixtures/builders/PlanningStateBuilder";
import { SnapshotCollector } from "../tests/fixtures/snapshots/SnapshotCollector";

interface GenerationResult {
  step: number;
  filename: string;
  success: boolean;
  error?: string;
}

async function generateSnapshots(): Promise<GenerationResult[]> {
  const collector = new SnapshotCollector();
  const results: GenerationResult[] = [];

  console.log("🚀 Starting snapshot generation for steps 1-10...\n");

  for (let stepNumber = 1; stepNumber <= 10; stepNumber++) {
    try {
      console.log(`📸 Generating snapshot for step ${stepNumber}...`);

      // Build state at this step with all previous steps completed
      let builder = PlanningStateBuilder.atStep(stepNumber);

      // Complete all previous steps with default data
      for (let i = 1; i < stepNumber; i++) {
        builder = builder.completeStep(i);
      }

      const state = builder.build();

      // Capture snapshot with standard label
      const filename = await collector.captureSnapshot(
        state,
        stepNumber,
        "standard",
      );

      results.push({
        step: stepNumber,
        filename,
        success: true,
      });

      console.log(`   ✅ Created: ${filename}\n`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed: ${errorMessage}\n`);

      results.push({
        step: stepNumber,
        filename: "",
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}

async function verifySnapshots(results: GenerationResult[]): Promise<boolean> {
  console.log("\n🔍 Verifying generated snapshots...\n");

  const collector = new SnapshotCollector();
  let allValid = true;

  for (const result of results) {
    if (!result.success) {
      console.log(
        `   ⏭️  Skipping verification for step ${result.step} (generation failed)`,
      );
      allValid = false;
      continue;
    }

    try {
      // Attempt to load the snapshot
      const context = await collector.loadSnapshot(result.filename);

      // Verify step number matches
      if (context.currentStepNumber !== result.step) {
        throw new Error(
          `Step mismatch: expected ${result.step}, got ${context.currentStepNumber}`,
        );
      }

      // Verify completedSteps array
      const expectedCompleted = Array.from(
        { length: result.step - 1 },
        (_, i) => i + 1,
      );
      const actualCompleted = context.completedSteps || [];

      if (
        JSON.stringify(actualCompleted) !== JSON.stringify(expectedCompleted)
      ) {
        throw new Error(
          `CompletedSteps mismatch: expected [${expectedCompleted}], got [${actualCompleted}]`,
        );
      }

      console.log(`   ✅ Step ${result.step}: Valid`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Step ${result.step}: Invalid - ${errorMessage}`);
      allValid = false;
    }
  }

  return allValid;
}

function printSummary(results: GenerationResult[], allValid: boolean): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 Generation Summary");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n✅ Successful: ${successful}/10`);
  console.log(`❌ Failed: ${failed}/10`);

  if (failed > 0) {
    console.log("\n❌ Failed steps:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   Step ${r.step}: ${r.error}`);
      });
  }

  console.log(
    `\n🔍 Verification: ${allValid ? "✅ All snapshots valid" : "❌ Some snapshots invalid"}`,
  );

  if (successful === 10 && allValid) {
    console.log("\n🎉 All snapshots generated and verified successfully!");
    console.log("\n📁 Snapshots location: tests/fixtures/snapshots/");
    console.log(
      "🔧 Use SnapshotCollector.loadSnapshot(filename) to load in tests",
    );
  } else {
    console.log("\n⚠️  Some snapshots failed. Review errors above.");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    const results = await generateSnapshots();
    const allValid = await verifySnapshots(results);
    printSummary(results, allValid);
  } catch (error) {
    console.error("\n❌ Fatal error during snapshot generation:");
    console.error(error);
    process.exit(1);
  }
}

// Execute if run directly (ESM)
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
