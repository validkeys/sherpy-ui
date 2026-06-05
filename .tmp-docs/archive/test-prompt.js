// Test what prompt is actually being generated
import { buildInterviewPrompt } from '../src/features/ai/prompts.js';

const messages = buildInterviewPrompt(
  "Business Requirements Interview",
  2,
  [],
  "simple html page with three buttons centered vertically and horizontally"
);

console.log('=== GENERATED PROMPT ===\n');
console.log('Message 1 (System/User):');
console.log(messages[0].content);
console.log('\n---\n');
console.log('Message 2 (Assistant):');
console.log(messages[1].content);
console.log('\n---\n');
console.log('Message 3 (User):');
console.log(messages[2].content);
