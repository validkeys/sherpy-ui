#!/usr/bin/env node
/**
 * Diagnostic Test - Form Submission Issue
 *
 * This script tests form filling with agent-browser to understand
 * why form data is not being captured on submit.
 */

import { execSync } from 'child_process';

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] });
    console.log(result);
    return result;
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('=== DIAGNOSTIC TEST: Form Data Capture ===\n');

  // Step 1: Open browser and navigate
  run('agent-browser open http://localhost:5180');
  run('agent-browser wait --load networkidle');

  // Step 2: Create project
  run('agent-browser snapshot -i | grep "New project"');
  run('agent-browser find text "New project" click');
  run('agent-browser wait 2000');
  run('agent-browser find text "Start from scratch" click');
  run('agent-browser wait 2000');
  run('agent-browser find label "Project name" fill "Diagnostic Test"');
  run('agent-browser find text "Create project" click');
  run('agent-browser wait --load networkidle');

  console.log('\n=== Step 1: Form is loaded ===');
  const url = run('agent-browser get url');
  console.log('URL:', url.trim());

  // Step 3: Check initial state
  console.log('\n=== Step 2: Check initial localStorage ===');
  const initialState = run(`agent-browser eval --stdin <<'EOF'
const keys = Object.keys(localStorage).filter(k => k.includes('planning'));
if (keys.length > 0) {
  const state = JSON.parse(localStorage.getItem(keys[0]));
  JSON.stringify({
    step1Responses: state.context.step1Responses,
    currentStepNumber: state.context.currentStepNumber,
    value: state.value
  }, null, 2);
} else {
  "No planning state found";
}
EOF`);
  console.log('Initial state:', initialState);

  // Step 4: Fill form using different methods
  console.log('\n=== Step 3: Fill form fields ===');

  // Method 1: Using fill command
  run('agent-browser snapshot -i');
  run('agent-browser find label "Do you have existing requirements?" fill "No"');
  run('agent-browser wait 500');

  // Method 2: Using click + keyboard type
  run('agent-browser find label "What are you building?" click');
  run('agent-browser keyboard type "Healthcare portal test"');
  run('agent-browser wait 1000');

  // Step 5: Check form state in React
  console.log('\n=== Step 4: Check React form state ===');
  const formState = run(`agent-browser eval --stdin <<'EOF'
const textarea1 = document.querySelector('input#existingRequirements');
const textarea2 = document.querySelector('textarea#projectDescription');
JSON.stringify({
  field1_domValue: textarea1?.value || 'NOT FOUND',
  field2_domValue: textarea2?.value || 'NOT FOUND',
  submitButton: document.querySelector('button[type="submit"]')?.textContent,
  submitDisabled: document.querySelector('button[type="submit"]')?.disabled
}, null, 2);
EOF`);
  console.log('Form state:', formState);

  // Step 6: Submit and monitor
  console.log('\n=== Step 5: Submit form ===');
  run('agent-browser find text "Submit" click');
  run('agent-browser wait 5000');

  // Step 7: Check state after submit
  console.log('\n=== Step 6: Check state after submit ===');
  const afterState = run(`agent-browser eval --stdin <<'EOF'
const keys = Object.keys(localStorage).filter(k => k.includes('planning'));
if (keys.length > 0) {
  const state = JSON.parse(localStorage.getItem(keys[0]));
  JSON.stringify({
    step1Responses: state.context.step1Responses,
    currentStepNumber: state.context.currentStepNumber,
    value: state.value,
    artifacts: Object.keys(state.context.artifacts)
  }, null, 2);
} else {
  "No planning state found";
}
EOF`);
  console.log('After submit:', afterState);

  // Step 8: Check console logs
  console.log('\n=== Step 7: Browser console logs ===');
  console.log('(Note: agent-browser does not capture console.log by default)');
  console.log('This is a limitation - we need to use CDP directly to get console output');

  run('agent-browser close');
}

main().catch(err => {
  console.error('\n=== TEST FAILED ===');
  console.error(err);
  try {
    execSync('agent-browser close');
  } catch {}
  process.exit(1);
});
