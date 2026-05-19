#!/bin/bash
# Answer 10 interview questions for TC-007

for i in {2..10}; do
  echo "=== Answering question $i of 10 ==="

  # Get current state
  agent-browser snapshot -i > /tmp/snapshot-q${i}.txt

  # Find first option button (usually @e26 or similar)
  OPTION_REF=$(grep -m1 "button.*ref=e2[6-9]" /tmp/snapshot-q${i}.txt | sed 's/.*ref=\(e[0-9]*\).*/\1/' | head -1)

  if [ -z "$OPTION_REF" ]; then
    echo "ERROR: Could not find option button"
    exit 1
  fi

  echo "Clicking option @$OPTION_REF"
  agent-browser click @$OPTION_REF

  sleep 1

  # Find submit button
  SUBMIT_REF=$(grep "Submit Answer" /tmp/snapshot-q${i}.txt | sed 's/.*ref=\(e[0-9]*\).*/\1/')

  if [ -z "$SUBMIT_REF" ]; then
    echo "ERROR: Could not find Submit Answer button"
    exit 1
  fi

  echo "Clicking submit @$SUBMIT_REF"
  agent-browser click @$SUBMIT_REF

  # Wait for next question
  echo "Waiting for next question..."
  sleep 5

  # Check if we're still on Step 2
  agent-browser get text body | head -40 | grep -q "Business Requirements"
  if [ $? -ne 0 ]; then
    echo "SUCCESS: Transitioned away from Step 2 after question $i"
    exit 0
  fi
done

echo "Completed 10 questions, checking if still on Step 2..."
agent-browser get text body | head -40 | grep "Business Requirements"
