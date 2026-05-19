#!/usr/bin/env tsx
/**
 * Edge Case Snapshot Generation Script
 *
 * Generates edge case snapshots for regression testing:
 * - Incomplete workflows
 * - Minimal data scenarios
 * - User edits and variations
 *
 * Usage:
 *   npm run snapshots:generate-edge-cases
 *   tsx scripts/generate-edge-case-snapshots.ts
 *
 * Output:
 *   tests/fixtures/snapshots/step-{n}-{label}-{timestamp}.json
 */

import { PlanningStateBuilder } from "../tests/fixtures/builders/PlanningStateBuilder";
import { SnapshotCollector } from "../tests/fixtures/snapshots/SnapshotCollector";

interface EdgeCaseDefinition {
  step: number;
  label: string;
  description: string;
  builder: () => PlanningStateBuilder;
}

/**
 * Define all edge cases to generate
 */
const EDGE_CASES: EdgeCaseDefinition[] = [
  // Priority 1: Core Edge Cases
  {
    step: 2,
    label: "incomplete-3q",
    description:
      "Business Requirements - Incomplete interview (only 3 questions answered)",
    builder: () =>
      PlanningStateBuilder.atStep(2)
        .completeStep(1)
        .withBusinessRequirements([
          // Simulate incomplete interview with only 3 responses
          {
            question: "What is the primary problem?",
            value: "Manual data entry",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
          {
            question: "Who are the users?",
            value: "Internal staff",
            timestamp: "2026-05-14T10:01:00.000Z",
          },
          {
            question: "What is the timeline?",
            value: "3 months",
            timestamp: "2026-05-14T10:02:00.000Z",
          },
        ]),
  },
  {
    step: 2,
    label: "complete-10q",
    description:
      "Business Requirements - Complete interview (all 10 questions answered)",
    builder: () =>
      PlanningStateBuilder.atStep(2)
        .completeStep(1)
        .withBusinessRequirements([
          // Full interview with 10 responses
          {
            question: "What is the primary problem?",
            value: "Manual data entry is time-consuming",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
          {
            question: "Who are the users?",
            value: "Internal sales team (50 users)",
            timestamp: "2026-05-14T10:01:00.000Z",
          },
          {
            question: "What is the timeline?",
            value: "3-month MVP, 6-month full rollout",
            timestamp: "2026-05-14T10:02:00.000Z",
          },
          {
            question: "What is the success metric?",
            value: "50% reduction in data entry time",
            timestamp: "2026-05-14T10:03:00.000Z",
          },
          {
            question: "What are the constraints?",
            value: "Must integrate with Salesforce",
            timestamp: "2026-05-14T10:04:00.000Z",
          },
          {
            question: "What is the budget?",
            value: "$150k development, $30k/year maintenance",
            timestamp: "2026-05-14T10:05:00.000Z",
          },
          {
            question: "What are the risks?",
            value: "User adoption, data migration complexity",
            timestamp: "2026-05-14T10:06:00.000Z",
          },
          {
            question: "What is the scope?",
            value: "Core CRUD operations, reporting dashboard",
            timestamp: "2026-05-14T10:07:00.000Z",
          },
          {
            question: "What are dependencies?",
            value: "Salesforce API access, AWS infrastructure",
            timestamp: "2026-05-14T10:08:00.000Z",
          },
          {
            question: "What is out of scope?",
            value: "Mobile app, advanced analytics",
            timestamp: "2026-05-14T10:09:00.000Z",
          },
        ]),
  },
  {
    step: 5,
    label: "minimal-responses",
    description: "Implementation Planning - Minimal required data only",
    builder: () =>
      PlanningStateBuilder.atStep(5)
        .completeStep(1)
        .withBusinessRequirements([
          {
            question: "What is the primary problem?",
            value: "Need automation",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
          {
            question: "Who are the users?",
            value: "Staff",
            timestamp: "2026-05-14T10:01:00.000Z",
          },
        ])
        .withTechnicalRequirements([
          // Minimal technical requirements
          {
            question: "What is the tech stack?",
            value: "Node.js and React",
            timestamp: "2026-05-14T11:00:00.000Z",
          },
          {
            question: "What are the constraints?",
            value: "Must be simple",
            timestamp: "2026-05-14T11:01:00.000Z",
          },
        ])
        .completeStep(4),
  },
  {
    step: 5,
    label: "missing-critical",
    description: "Implementation Planning - Missing critical data",
    builder: () =>
      PlanningStateBuilder.atStep(5)
        .completeStep(1)
        .withBusinessRequirements([
          // Incomplete business requirements
          {
            question: "What is the primary problem?",
            value: "Unclear problem statement",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
        ])
        .withTechnicalRequirements([
          // Very minimal technical requirements
          {
            question: "What is the tech stack?",
            value: "Unknown",
            timestamp: "2026-05-14T11:00:00.000Z",
          },
        ])
        .completeStep(4),
  },
  {
    step: 7,
    label: "with-user-edits",
    description: "Plan Approval - User edits applied to generated plan",
    builder: () =>
      PlanningStateBuilder.atStep(7)
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .completeStep(4)
        .completeStep(5)
        .completeStep(6)
        .withStep7Edits(
          "User edited the implementation plan - added extra validation requirements",
        ),
  },
];

interface GenerationResult {
  step: number;
  label: string;
  description: string;
  filename: string;
  success: boolean;
  error?: string;
}

async function generateEdgeCaseSnapshots(): Promise<GenerationResult[]> {
  const collector = new SnapshotCollector();
  const results: GenerationResult[] = [];

  console.log("🚀 Starting edge case snapshot generation...\n");
  console.log(`📋 Total edge cases to generate: ${EDGE_CASES.length}\n`);

  for (const edgeCase of EDGE_CASES) {
    try {
      console.log(`📸 Generating: ${edgeCase.label}`);
      console.log(`   Step: ${edgeCase.step}`);
      console.log(`   Description: ${edgeCase.description}`);

      // Build the state using the edge case's builder function
      const state = edgeCase.builder().build();

      // Capture snapshot
      const filename = await collector.captureSnapshot(
        state,
        edgeCase.step,
        edgeCase.label,
      );

      results.push({
        step: edgeCase.step,
        label: edgeCase.label,
        description: edgeCase.description,
        filename,
        success: true,
      });

      console.log(`   ✅ Created: ${filename}\n`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed: ${errorMessage}\n`);

      results.push({
        step: edgeCase.step,
        label: edgeCase.label,
        description: edgeCase.description,
        filename: "",
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}

async function verifyEdgeCaseSnapshots(
  results: GenerationResult[],
): Promise<boolean> {
  console.log("\n🔍 Verifying generated edge case snapshots...\n");

  const collector = new SnapshotCollector();
  let allValid = true;

  for (const result of results) {
    if (!result.success) {
      console.log(
        `   ⏭️  Skipping verification for ${result.label} (generation failed)`,
      );
      allValid = false;
      continue;
    }

    try {
      // Load the snapshot
      const context = await collector.loadSnapshot(result.filename);

      // Verify step number matches
      if (context.currentStepNumber !== result.step) {
        throw new Error(
          `Step mismatch: expected ${result.step}, got ${context.currentStepNumber}`,
        );
      }

      // Verify projectId exists
      if (!context.projectId) {
        throw new Error("Missing projectId in context");
      }

      console.log(`   ✅ ${result.label}: Valid`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`   ❌ ${result.label}: Invalid - ${errorMessage}`);
      allValid = false;
    }
  }

  return allValid;
}

function printSummary(results: GenerationResult[], allValid: boolean): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 Edge Case Generation Summary");
  console.log("=".repeat(70));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n✅ Successful: ${successful}/${EDGE_CASES.length}`);
  console.log(`❌ Failed: ${failed}/${EDGE_CASES.length}`);

  if (failed > 0) {
    console.log("\n❌ Failed edge cases:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   ${r.label} (step ${r.step}): ${r.error}`);
      });
  }

  console.log(
    `\n🔍 Verification: ${allValid ? "✅ All snapshots valid" : "❌ Some snapshots invalid"}`,
  );

  if (successful > 0) {
    console.log("\n📋 Generated Edge Cases:");
    results
      .filter((r) => r.success)
      .forEach((r) => {
        console.log(`   ✅ ${r.label} - ${r.description}`);
        console.log(`      File: ${r.filename}`);
      });
  }

  if (successful === EDGE_CASES.length && allValid) {
    console.log(
      "\n🎉 All edge case snapshots generated and verified successfully!",
    );
    console.log("\n📁 Snapshots location: tests/fixtures/snapshots/");
    console.log("🧪 Next steps:");
    console.log("   1. Run: npm test snapshot-edge-cases");
    console.log("   2. Remove .skip from tests that now have snapshots");
    console.log("   3. Verify all tests pass");
  } else {
    console.log("\n⚠️  Some snapshots failed. Review errors above.");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    const results = await generateEdgeCaseSnapshots();
    const allValid = await verifyEdgeCaseSnapshots(results);
    printSummary(results, allValid);
  } catch (error) {
    console.error("\n❌ Fatal error during edge case snapshot generation:");
    console.error(error);
    process.exit(1);
  }
}

// Execute if run directly
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
