#!/bin/bash
# Organize remaining root-level markdown files

set -e

cd .tmp-docs

echo "Creating additional subfolders..."
mkdir -p summaries/
mkdir -p test-runs/
mkdir -p pr-reports/
mkdir -p misc/

echo "Moving test run documents..."
for f in test-run-*.md; do
  [ -f "$f" ] && mv "$f" test-runs/ && echo "  $f -> test-runs/"
done

echo "Moving PR reports..."
for f in pr-*.md PR-*.md; do
  [ -f "$f" ] && mv "$f" pr-reports/ && echo "  $f -> pr-reports/"
done

echo "Moving phase/milestone summaries..."
for f in phase-*.md m0-*.md milestone-*.md; do
  [ -f "$f" ] && mv "$f" summaries/ && echo "  $f -> summaries/"
done

echo "Moving workflow-chat docs..."
mkdir -p planning/005-workflow-chat/
for f in workflow-chat-*.md; do
  [ -f "$f" ] && mv "$f" planning/005-workflow-chat/ && echo "  $f -> planning/005-workflow-chat/"
done

echo "Moving state-refactor docs..."
mkdir -p planning/006-state-refactor/
for f in state-refactor-*.md state-sync-*.md; do
  [ -f "$f" ] && mv "$f" planning/006-state-refactor/ && echo "  $f -> planning/006-state-refactor/"
done

echo "Moving BUG-022 root files..."
mkdir -p bug-reports/022-consolidated/
for f in BUG-022-*.md; do
  [ -f "$f" ] && mv "$f" bug-reports/022-consolidated/ && echo "  $f -> bug-reports/022-consolidated/"
done

echo "Moving general summaries..."
for f in *-summary.md *-status.md *-complete.md; do
  [ -f "$f" ] && mv "$f" summaries/ && echo "  $f -> summaries/"
done

echo "Moving misc documents..."
for f in *.md; do
  [ -f "$f" ] && [ "$f" != "README.md" ] && mv "$f" misc/ && echo "  $f -> misc/"
done

echo "Cleaning up empty directories..."
find . -type d -empty -delete 2>/dev/null || true

echo ""
echo "Organization complete!"
