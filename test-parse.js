// Quick test to verify parseOptions works with actual API response
import { parseOptions } from './src/features/ai/parse-options.ts';

const apiResponse = `Do you have an existing requirements document to analyze, or are you starting from scratch?

**Options:**
1. Starting from scratch (Recommended) - I need help defining requirements from the beginning
2. I have a requirements document - I have existing documentation to analyze
3. Type your own answer`;

const parsed = parseOptions(apiResponse);
console.log('Parsed options:', JSON.stringify(parsed, null, 2));
console.log('Count:', parsed.length);
