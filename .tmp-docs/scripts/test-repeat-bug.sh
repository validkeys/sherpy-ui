#!/bin/bash
# Script to rapidly answer questions and detect repeated questions

for i in {1..20}; do
  echo "=== Iteration $i ==="

  # Get current question number and text
  QUESTION_NUM=$(agent-browser get text body | grep -o "Question [0-9][0-9] / 33" | head -1)
  QUESTION_TEXT=$(agent-browser get text body | grep "\*\*Question" | head -1 | cut -c1-80)

  echo "Current: $QUESTION_NUM"
  echo "Text: $QUESTION_TEXT"

  # Click first recommended option if exists
  REF=$(agent-browser snapshot -i 2>/dev/null | grep "★ RECOMMENDED" | head -1 | grep -o 'ref=e[0-9]*' | cut -d= -f2)

  if [ -n "$REF" ]; then
    echo "Clicking option: @$REF"
    agent-browser click @$REF >/dev/null 2>&1

    # Find and click submit
    SUBMIT=$(agent-browser snapshot -i 2>/dev/null | grep "button.*Submit" | grep -o 'ref=e[0-9]*' | cut -d= -f2)
    if [ -n "$SUBMIT" ]; then
      echo "Submitting: @$SUBMIT"
      agent-browser click @$SUBMIT >/dev/null 2>&1
      echo "Waiting for next question..."
      sleep 6
    fi
  else
    echo "No options found, might be loading or completed"
    sleep 2
  fi

  echo ""
done
