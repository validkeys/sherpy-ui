#!/bin/bash
#
# Test the seed API endpoint
#

set -e

echo "🧪 Testing Seed API..."
echo ""

# Test 1: Create project at step 5
echo "Test 1: Create project at step 5"
RESPONSE=$(curl -s -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"step": 5}')

echo "$RESPONSE" | jq '.'
echo ""

# Test 2: Custom project name
echo "Test 2: Custom project name"
RESPONSE=$(curl -s -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"step": 3, "projectName": "test-custom-project"}')

echo "$RESPONSE" | jq '.projectId, .step, .url'
echo ""

# Test 3: Invalid step number
echo "Test 3: Invalid step number (should fail)"
RESPONSE=$(curl -s -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"step": 99}')

echo "$RESPONSE" | jq '.'
echo ""

echo "✅ Manual testing complete"
echo ""
echo "To use the response, open browser console and run:"
echo "fetch('http://localhost:5180/api/dev/seed', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({step: 5})}).then(r => r.json()).then(data => {localStorage.setItem(data.storageKey, JSON.stringify(data.snapshot)); window.location.href = data.url;})"
