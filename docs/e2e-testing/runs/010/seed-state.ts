/**
 * Test Run #010: Jump to Step 3 (Technical Requirements)
 *
 * This script creates a test state with Steps 1-2 completed:
 * - Step 1: Gap Analysis (completed)
 * - Step 2: Business Requirements (completed)
 * - Step 3: Technical Requirements (starting here)
 */

import { PlanningStateBuilder } from '../../../../tests/fixtures/builders/PlanningStateBuilder';

async function seedTestState() {
  console.log('🌱 Seeding test state for Run #010...');
  console.log('📍 Starting at Step 3 (Technical Requirements Interview)');

  // Build state with Steps 1 and 2 completed
  const builder = PlanningStateBuilder.new()
    .withProjectId('test-run-010')
    .completeStep(1)  // Gap Analysis
    .completeStep(2)  // Business Requirements
    .withCurrentStepNumber(3)  // Start at Step 3
    .withCompletedSteps([1, 2]);

  // Persist to API
  const projectId = await builder.persist();

  console.log('✅ Test state created successfully!');
  console.log(`📦 Project ID: ${projectId}`);
  console.log(`🔗 Navigate to: http://localhost:5180/project/${projectId}/build`);
  console.log('');
  console.log('Current state:');
  console.log('  ✅ Step 1: Gap Analysis (completed)');
  console.log('  ✅ Step 2: Business Requirements (completed)');
  console.log('  ➡️  Step 3: Technical Requirements (ready to start)');

  return projectId;
}

// Run if executed directly
seedTestState()
  .then((projectId) => {
    console.log(`\n🚀 Ready for testing! Project ID: ${projectId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to seed state:', error);
    process.exit(1);
  });

export { seedTestState };
