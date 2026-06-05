#!/bin/bash
# Reorganize .tmp-docs folder structure

set -e

echo "Creating new folder structure..."
mkdir -p .tmp-docs/bug-reports
mkdir -p .tmp-docs/planning
mkdir -p .tmp-docs/screenshots
mkdir -p .tmp-docs/scripts
mkdir -p .tmp-docs/code-reviews

echo "Moving bug reports..."
# Find all bug-NNN files and organize them into bug-reports/NNN-slug/
for file in .tmp-docs/bug-*.md; do
  if [ -f "$file" ]; then
    basename=$(basename "$file")
    # Extract bug number (e.g., bug-018 -> 018)
    if [[ $basename =~ bug-([0-9]+) ]]; then
      bug_num="${BASH_REMATCH[1]}"
      # Extract slug after bug number
      slug=$(echo "$basename" | sed "s/bug-${bug_num}-//" | sed 's/.md$//')

      # Create bug report folder
      bug_dir=".tmp-docs/bug-reports/${bug_num}-${slug%%-*}"
      mkdir -p "$bug_dir"

      # Move file
      echo "  $basename -> $bug_dir/"
      mv "$file" "$bug_dir/"
    fi
  fi
done

echo "Moving planning documents..."
# Move plan files to planning/ with numbered folders
plan_counter=1
for file in .tmp-docs/*plan*.md .tmp-docs/*plan*.yaml; do
  if [ -f "$file" ]; then
    basename=$(basename "$file")
    # Skip if already in subdirectory
    if [[ "$file" != *"/planning/"* ]] && [[ "$file" != *"/code-reviews/"* ]]; then
      # Create slug from filename
      slug=$(echo "$basename" | sed 's/[^a-zA-Z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | sed 's/.md$//' | sed 's/.yaml$//')
      plan_dir=$(printf ".tmp-docs/planning/%03d-%s" $plan_counter "$slug")
      mkdir -p "$plan_dir"
      echo "  $basename -> $plan_dir/"
      mv "$file" "$plan_dir/"
      ((plan_counter++))
    fi
  fi
done

echo "Moving scripts..."
# Move shell scripts to scripts/
for file in .tmp-docs/*.sh; do
  if [ -f "$file" ] && [ "$(basename "$file")" != "reorganize.sh" ]; then
    echo "  $(basename "$file") -> scripts/"
    mv "$file" .tmp-docs/scripts/
  fi
done

echo "Organizing code-reviews..."
# Ensure code-reviews are in numbered folders
if [ -d ".tmp-docs/code-reviews" ]; then
  review_counter=1
  for file in .tmp-docs/code-reviews/*.md .tmp-docs/code-reviews/*.yaml; do
    if [ -f "$file" ]; then
      basename=$(basename "$file")
      # Skip if already in a numbered subdirectory
      if [[ "$(dirname "$file")" == ".tmp-docs/code-reviews" ]]; then
        slug=$(echo "$basename" | sed 's/[^a-zA-Z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | sed 's/.md$//' | sed 's/.yaml$//')
        review_dir=$(printf ".tmp-docs/code-reviews/%03d-%s" $review_counter "$slug")
        mkdir -p "$review_dir"
        echo "  $basename -> $review_dir/"
        mv "$file" "$review_dir/"
        ((review_counter++))
      fi
    fi
  done
fi

echo "Cleaning up empty directories..."
find .tmp-docs -type d -empty -delete 2>/dev/null || true

echo ""
echo "Reorganization complete!"
echo ""
echo "Structure:"
echo "  .tmp-docs/"
echo "    ├── bug-reports/NNN-slug/"
echo "    ├── planning/NNN-slug/"
echo "    ├── screenshots/"
echo "    ├── scripts/"
echo "    └── code-reviews/NNN-slug/"
