#!/bin/bash
# Test script for BUG-011 fix verification
# Tests that form submission captures data and advances to Step 2

set -e

echo "=== BUG-011 Fix Verification Test ==="
echo "Testing: Gap Analysis form submission with actor status fix"
echo ""

# Clean up any existing test project data
agent-browser open http://localhost:5180/
agent-browser eval 'localStorage.clear(); "Cleared"'
agent-browser close

echo "✓ Cleared localStorage"
echo ""

# Start fresh
agent-browser open http://localhost:5180/
agent-browser wait --load networkidle
echo "✓ Loaded homepage"

# Create new project
agent-browser snapshot -i > /dev/null
agent-browser click @e3  # New project button
agent-browser wait 1000

agent-browser snapshot -i > /dev/null
agent-browser click @e2  # Start from scratch
agent-browser wait 2000

agent-browser snapshot -i > /dev/null
agent-browser fill @e2 "BUG-011 Verification Test"
agent-browser click @e4  # Create project
agent-browser wait 3000

echo "✓ Created project"

# Get project ID from URL
PROJECT_URL=$(agent-browser get url)
PROJECT_ID=$(echo "$PROJECT_URL" | sed 's/.*project\/\([^/]*\).*/\1/')
echo "✓ Project ID: $PROJECT_ID"

# Check initial actor status
INITIAL_STATUS=$(agent-browser eval "
const snap = JSON.parse(localStorage.getItem('planning-machine-$PROJECT_ID'));
snap ? snap.status : 'none'
")
echo "✓ Initial actor status: $INITIAL_STATUS"

if [ "$INITIAL_STATUS" != "\"active\"" ]; then
  echo "❌ FAIL: Initial status should be 'active', got: $INITIAL_STATUS"
  agent-browser close
  exit 1
fi

# Fill form
agent-browser snapshot -i > /dev/null
agent-browser fill @e26 "No, starting from scratch"
agent-browser fill @e27 "A healthcare portal for patient records with HIPAA compliance"
agent-browser wait 500

echo "✓ Filled form fields"

# Submit form
agent-browser click @e25  # Submit button
echo "✓ Clicked Submit"

# Wait for API call and state transition
echo "⏳ Waiting for API call and state transition (20 seconds)..."
agent-browser wait 20000

# Check final state
FINAL_STATE=$(agent-browser eval "
const snap = JSON.parse(localStorage.getItem('planning-machine-$PROJECT_ID'));
JSON.stringify({
  status: snap.status,
  value: snap.value,
  step1Responses: snap.context.step1Responses,
  currentStep: snap.context.currentStepNumber,
  hasError: !!snap.context.error
}, null, 2)
")

echo "Final state:"
echo "$FINAL_STATE"

# Verify success criteria
CURRENT_STEP=$(echo "$FINAL_STATE" | grep -o '"currentStep": [0-9]*' | grep -o '[0-9]*')
HAS_RESPONSES=$(echo "$FINAL_STATE" | grep '"step1Responses": {}' && echo "false" || echo "true")

echo ""
echo "=== Test Results ==="
if [ "$CURRENT_STEP" = "2" ] && [ "$HAS_RESPONSES" = "true" ]; then
  echo "✅ PASS: Form data captured and advanced to Step 2"
  echo "   - Current step: $CURRENT_STEP"
  echo "   - step1Responses populated: Yes"
  agent-browser close
  exit 0
else
  echo "❌ FAIL: Form submission did not work correctly"
  echo "   - Current step: $CURRENT_STEP (expected: 2)"
  echo "   - step1Responses populated: $HAS_RESPONSES (expected: true)"
  agent-browser close
  exit 1
fi
