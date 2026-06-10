import type { StepOption } from "../planning/types";

/**
 * Parses multiple-choice options from AI-generated question text
 *
 * Uses a 3-tier parsing strategy:
 * 1. Markdown format with **Options:** header (most reliable)
 * 2. Inline format after "Please select an option"
 * 3. Fallback: scan entire text for numbered list patterns
 */
export function parseOptions(questionText: string): StepOption[] {
  // Try tier 1: Markdown with **Options:** header
  const markdownOptions = parseMarkdownOptions(questionText);
  if (markdownOptions.length > 0) {
    return markdownOptions;
  }

  // Try tier 2: Inline format
  const inlineOptions = parseInlineOptions(questionText);
  if (inlineOptions.length > 0) {
    return inlineOptions;
  }

  // Try tier 3: Fallback pattern matching
  return parseFallbackOptions(questionText);
}

/**
 * Removes the **Options:** section from question text to prevent duplicate display.
 * Used in UI to show only the question, not the markdown options list.
 *
 * Example:
 * Input: "What is your choice?\n\n**Options:**\n1. Option A\n2. Option B"
 * Output: "What is your choice?"
 */
export function stripOptionsSection(questionText: string): string {
  // Match **Options:** and everything after it (case-insensitive)
  // Also handles variations like "**options:**" or "** Options: **"
  const optionsMatch = questionText.match(/\*\*\s*options\s*:\s*\*\*/i);

  if (!optionsMatch) {
    return questionText.trim();
  }

  // Return everything before the **Options:** marker
  const beforeOptions = questionText.substring(0, optionsMatch.index);
  return beforeOptions.trim();
}

/**
 * Tier 1: Parse markdown format with **Options:** header
 * Example:
 * **Options:**
 * 1. Title (Recommended) - Description
 * 2. Another Title - Another description
 */
function parseMarkdownOptions(text: string): StepOption[] {
  // Match **Options:** and everything after it
  // Use greedy .+ to capture all content, line-by-line parsing will filter
  const optionsMatch = text.match(/\*\*Options:\*\*\s*\n([\s\S]+)/i);
  if (!optionsMatch) {
    return [];
  }

  const optionsText = optionsMatch[1];
  const options: StepOption[] = [];

  // Split by lines and process each option line
  const lines = optionsText.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Split on " - " to separate title from body
    // This handles dashes within titles (like "Pre-commit hooks")
    const dashIndex = trimmedLine.indexOf(" - ");
    if (dashIndex === -1) continue;

    const prefix = trimmedLine.substring(0, dashIndex);
    const body = trimmedLine.substring(dashIndex + 3); // Skip " - "

    // Extract number and title from prefix
    const prefixMatch = prefix.match(/^(\d+)\.\s+(.+)$/);
    if (!prefixMatch) continue;

    const [, number, titlePart] = prefixMatch;

    // Extract title and check for (Recommended)
    const recommendedMatch = titlePart.match(
      /^(.+?)\s*\((?:Recommended|recommended)\)\s*$/,
    );
    const title = recommendedMatch
      ? recommendedMatch[1].trim()
      : titlePart.trim();
    const isRecommended = !!recommendedMatch;

    // Skip "Type your own" options
    if (title.toLowerCase().includes("type your own")) {
      continue;
    }

    options.push({
      letter: number.trim(),
      title,
      body: body.trim(),
      recommended: isRecommended,
    });
  }

  return options;
}

/**
 * Tier 2: Parse inline options after "Please select"
 * Example:
 * Please select an option: 1. **Title** (Recommended) - Description 2. **Another** - Description
 */
function parseInlineOptions(text: string): StepOption[] {
  const inlineMatch = text.match(
    /Please select.*?:\s*([\d.][\s\S]+?)(?:\*\*Type your own answer|$)/i,
  );
  if (!inlineMatch) {
    return [];
  }

  const optionsText = inlineMatch[1];
  const options: StepOption[] = [];

  // Split on pattern "N. " where N is a digit (but not in the middle of text)
  // This handles cases where options are concatenated without newlines
  const optionParts = optionsText.split(/(?=\d+\.\s+)/);

  for (const part of optionParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Split on " - " to separate title from body
    const dashIndex = trimmed.indexOf(" - ");
    if (dashIndex === -1) continue;

    const prefix = trimmed.substring(0, dashIndex);
    const bodyPart = trimmed.substring(dashIndex + 3);

    // Extract number and title from prefix
    const prefixMatch = prefix.match(/^(\d+)\.\s+(.+)$/);
    if (!prefixMatch) continue;

    const [, number, titlePart] = prefixMatch;

    // Remove bold markers and extract (Recommended)
    const cleanTitle = titlePart.replace(/\*\*/g, "").trim();
    const recommendedMatch = cleanTitle.match(
      /^(.+?)\s*\((?:Recommended|recommended)\)\s*$/,
    );
    const title = recommendedMatch ? recommendedMatch[1].trim() : cleanTitle;
    const isRecommended = !!recommendedMatch;

    // Skip "Type your own" options
    if (title.toLowerCase().includes("type your own")) {
      continue;
    }

    // Clean body: remove trailing option numbers and trim
    const cleanBody = bodyPart.replace(/\s+\d+\.\s+\*\*.+$/, "").trim();

    options.push({
      letter: number.trim(),
      title,
      body: cleanBody,
      recommended: isRecommended,
    });
  }

  return options;
}

/**
 * Tier 3: Fallback parser for malformed or unexpected formats
 * Scans entire text for numbered list patterns
 */
function parseFallbackOptions(text: string): StepOption[] {
  const options: StepOption[] = [];

  // Look for any numbered list pattern with dash separator
  const optionRegex = /(\d+)\.\s+([^-\n]+?)\s*-\s*([^\n]+?)(?=\s+\d+\.|$)/g;

  let match: RegExpExecArray | null = optionRegex.exec(text);
  while (match !== null) {
    const [, number, title, body] = match;

    // Skip "Type your own" options
    if (title.trim().toLowerCase().includes("type your own")) {
      continue;
    }

    options.push({
      letter: number.trim(),
      title: title.trim(),
      body: body.trim(),
      recommended: false, // Can't reliably detect (Recommended) in fallback mode
    });

    match = optionRegex.exec(text);
  }

  return options;
}
