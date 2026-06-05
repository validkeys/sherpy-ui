#!/bin/bash
# Test form submission and capture console logs

cd /workspace

echo "Opening browser..."
agent-browser --headed --session form-test open http://localhost:5185

echo "Waiting for page load..."
agent-browser --session form-test wait --load networkidle

echo "Taking initial screenshot..."
agent-browser --session form-test snapshot -i > /tmp/initial-snapshot.txt

echo "Clicking on first project..."
agent-browser --session form-test click @e10
agent-browser --session form-test wait --load networkidle
agent-browser --session form-test wait 2000

echo "Current URL:"
agent-browser --session form-test get url

echo "Scrolling to form..."
agent-browser --session form-test scroll down 300

echo "Finding form fields..."
agent-browser --session form-test snapshot -i | grep -E "(textbox|Submit)" > /tmp/form-fields.txt
cat /tmp/form-fields.txt

echo "Filling form fields..."
agent-browser --session form-test fill @e26 "Yes, we have a basic PRD document"
agent-browser --session form-test fill @e27 "A task management app with real-time collaboration"

echo "Clicking Submit..."
agent-browser --session form-test click @e25

echo "Waiting 20 seconds for artifact generation..."
agent-browser --session form-test wait 20000

echo "Checking final state..."
agent-browser --session form-test get url
agent-browser --session form-test snapshot -i | head -30

echo "Taking final screenshot..."
agent-browser --session form-test screenshot .tmp-docs/screenshots/test-form-final.png

echo "Closing browser..."
agent-browser --session form-test close

echo "Done!"
