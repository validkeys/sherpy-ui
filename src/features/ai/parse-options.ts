import type { StepOption } from "../planning/types";

/**
 * Parses multiple-choice options from AI-generated question text
 *
 * Handles two formats:
 * 1. Markdown with **Options:** header
 * 2. Inline format: "Please select an option or type your own answer: 1. Option - description 2. Option..."
 */
export function parseOptions(questionText: string): StepOption[] {
  const options: StepOption[] = [];

  // Try format 1: **Options:** with newlines
  const optionsMatch = questionText.match(/\*\*Options:\*\*\s*\n([\s\S]*?)(?:\n\n|$)/);
  if (optionsMatch) {
    const optionsText = optionsMatch[1];
    const optionRegex = /^(\d+)\.\s+([^(\n-]+?)(?:\s+\(Recommended\))?\s*-\s*(.+?)$/gm;

    let match;
    while ((match = optionRegex.exec(optionsText)) !== null) {
      const [, number, title, body] = match;

      if (title.trim().toLowerCase().includes("type your own")) {
        continue;
      }

      const isRecommended = optionsText.includes(`${number}. ${title.trim()} (Recommended)`);

      options.push({
        letter: number,
        title: title.trim(),
        body: body.trim(),
        recommended: isRecommended,
      });
    }
    return options;
  }

  // Try format 2: Inline options after "Please select an option"
  // Format: "1. **Title** (Recommended) - description 2. **Title** - description"
  const inlineMatch = questionText.match(/Please select an option.*?:\s*([\d\.][\s\S]+?)(?:\*\*Type your own answer|$)/i);
  if (inlineMatch) {
    const optionsText = inlineMatch[1];
    // Match: "1. **Title** (Recommended) - Body" or "1. **Title** - Body" or "1. Title (Recommended) - Body"
    const optionRegex = /(\d+)\.\s+(?:\*\*)?([\w\s]+?)(?:\*\*)?\s*(?:\(Recommended\))?\s*-\s*([^0-9]+?)(?=\s+\d+\.|$)/g;

    let match;
    while ((match = optionRegex.exec(optionsText)) !== null) {
      const [fullMatch, number, title, body] = match;

      if (title.trim().toLowerCase().includes("type your own")) {
        continue;
      }

      const isRecommended = fullMatch.includes("(Recommended)");

      options.push({
        letter: number,
        title: title.trim(),
        body: body.trim(),
        recommended: isRecommended,
      });
    }
  }

  return options;
}
