# AI Provider Integration Architecture

**Created:** 2026-06-17  
**Status:** Production  
**Related:** [OVERVIEW.md](./OVERVIEW.md)

---

## Overview

Sherpy UI supports **three AI providers** for conversational planning interviews and artifact generation:
1. **AWS Bedrock** (primary) - Claude via AWS
2. **Anthropic Direct API** - Claude via Anthropic
3. **OpenAI API** - GPT models

**Files:**
- `src/features/planning/ai/prompts.ts` - LLM prompt templates
- `src/features/planning/ai/skills-content.ts` - Interview question categories
- `src/features/planning/ai/server.ts` - Provider abstraction layer

---

## Provider Selection

### Environment Configuration

```bash
# .env
AI_PROVIDER=bedrock  # bedrock | anthropic | openai
AI_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0  # Optional override

# Bedrock (default)
AWS_REGION=ca-central-1
AWS_PROFILE=your-sso-profile  # Optional: for SSO auth

# Anthropic Direct
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI
OPENAI_API_KEY=sk-...
```

### Provider Detection

```typescript
// src/features/planning/ai/server.ts
import { anthropic } from '@ai-sdk/anthropic';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { openai } from '@ai-sdk/openai';

function getProviderModel() {
  const provider = process.env.AI_PROVIDER || 'bedrock';

  switch (provider) {
    case 'bedrock':
      const bedrock = createAmazonBedrock({
        region: process.env.AWS_REGION,
        profile: process.env.AWS_PROFILE, // SSO support
      });
      return bedrock(process.env.AI_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0');

    case 'anthropic':
      return anthropic(process.env.AI_MODEL_ID || 'claude-3-5-sonnet-20241022');

    case 'openai':
      return openai(process.env.AI_MODEL_ID || 'gpt-4-turbo-preview');

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
```

---

## AI SDK Integration

### Vercel AI SDK

**Library:** `@ai-sdk/core`

**Features:**
- Unified API across providers
- Streaming support
- Token usage tracking
- Error handling
- Observability (Langfuse)

**Install:**
```bash
pnpm add ai @ai-sdk/anthropic @ai-sdk/amazon-bedrock @ai-sdk/openai
```

### `streamText` API

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: getProviderModel(),
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ],
  temperature: 0.7,
  maxTokens: 2000,
});

// Stream to client
for await (const chunk of result.textStream) {
  yield chunk;
}

// Get final result
const { text, usage } = await result;
```

---

## Question Generation

### Interview Flow

**Steps 2 & 3:** AI generates contextual questions based on prior answers.

```typescript
// src/features/planning/ai/server.ts
export const $generateQuestion = createServerFn({ method: 'POST' })
  .inputValidator(/* ... */)
  .handler(async ({ data }) => {
    const { projectId, stepNumber, projectContext } = data;

    // Build prompt with context
    const prompt = buildQuestionPrompt(stepNumber, projectContext);

    // Call AI provider
    const result = await streamText({
      model: getProviderModel(),
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.INTERVIEW },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const { text } = await result;

    // Parse response (text or JSON mode)
    return parseQuestionResponse(text);
  });
```

### Prompt Structure

**System Prompt:**
```typescript
const SYSTEM_PROMPTS = {
  INTERVIEW: `You are Sherpy, an AI planning assistant helping users gather requirements.

Your role:
- Ask ONE contextual question at a time
- Build on previous answers
- Use specific details, not generic questions
- Offer 3-4 relevant options when helpful

Guidelines:
- Keep questions clear and focused
- Avoid yes/no questions when possible
- Relate to user's specific project context
`,
};
```

**User Prompt:**
```typescript
function buildQuestionPrompt(stepNumber: number, projectContext: ProjectContext) {
  const priorAnswers = projectContext.step1Responses;

  return `Project: ${priorAnswers.projectName}
Has existing requirements: ${priorAnswers.hasRequirements}

Previous answers:
${formatPreviousAnswers(projectContext.step2Answers)}

Generate the next question for Step ${stepNumber} (Business Requirements).

Focus areas: ${getStepFocusAreas(stepNumber)}

Return JSON:
{
  "question": "Your contextual question here?",
  "options": ["Option 1", "Option 2", "Option 3"]  // Optional
}
`;
}
```

### Context Propagation (OBSERVATION #4 Fix)

**Problem:** Step 2+ questions didn't receive Step 1 context. LLM asked for info already provided.

**Root Cause:** `$generateQuestion` received `projectContext` parameter but ignored it.

**Solution:**
```typescript
// ✅ Use projectContext first, database as fallback
handler: async ({ data }) => {
  const { projectId, stepNumber, projectContext } = data;

  // Prioritize passed context
  const context = projectContext || await loadProjectContext(projectId);

  const prompt = buildQuestionPrompt(stepNumber, context);
  // ...
}
```

**See:** `.tmp-docs/planning/004-observations-fixes/`

---

## Artifact Generation

### YAML Artifact Pattern

**Steps 1-10:** Each step generates a YAML artifact with structured requirements.

```typescript
// src/features/planning/ai/server.ts
export const $generateArtifact = createServerFn({ method: 'POST' })
  .inputValidator(/* ... */)
  .handler(async ({ data }) => {
    const { stepNumber, answers, projectContext } = data;

    // Build artifact prompt
    const prompt = buildArtifactPrompt(stepNumber, answers, projectContext);

    // Call AI provider
    const result = await streamText({
      model: getProviderModel(),
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.ARTIFACT_GENERATION },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temp for structured output
      maxTokens: 4000,
    });

    const { text } = await result;

    // Validate YAML syntax
    try {
      YAML.parse(text);
    } catch (error) {
      throw new Error(`Invalid YAML artifact: ${error.message}`);
    }

    return text; // YAML string
  });
```

### Artifact Prompt Templates

**Business Requirements (Step 2):**
```typescript
const ARTIFACT_TEMPLATES = {
  BUSINESS_REQUIREMENTS: `Generate a business requirements document in YAML format.

User's answers:
${formatAnswers(answers)}

Output format:
\`\`\`yaml
business_requirements:
  overview:
    project_name: "..."
    problem_statement: "..."
    target_audience: "..."
  
  features:
    - id: "F001"
      name: "..."
      description: "..."
      priority: high|medium|low
  
  success_metrics:
    - metric: "..."
      target: "..."
\`\`\`

Rules:
- Use actual details from user answers (not placeholders)
- Prioritize features by business impact
- Make success metrics measurable
`,
};
```

**Technical Requirements (Step 3):**
```typescript
const ARTIFACT_TEMPLATES = {
  TECHNICAL_REQUIREMENTS: `Generate technical requirements in YAML format.

Business context:
${formatArtifact(businessRequirements)}

User's technical answers:
${formatAnswers(answers)}

Output format:
\`\`\`yaml
technical_requirements:
  architecture:
    style: "..."
    rationale: "..."
  
  technology_stack:
    frontend:
      framework: "..."
      libraries: []
    backend:
      runtime: "..."
      database: "..."
  
  data_model:
    entities:
      - name: "..."
        fields: []
        relationships: []
\`\`\`
`,
};
```

---

## Streaming Responses

### Server-Sent Events (SSE)

**Pattern:** Stream AI responses to client for real-time UX.

```typescript
// Server
export const $generateQuestionStream = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const result = streamText({
      model: getProviderModel(),
      messages: [/* ... */],
    });

    // Return SSE stream
    return new Response(result.textStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  });
```

**Client:**
```typescript
// src/features/planning/hooks/useStreamingQuestion.ts
import { useCompletion } from 'ai/react';

export function useStreamingQuestion() {
  const { complete, completion, isLoading } = useCompletion({
    api: '/api/ai/question',
  });

  const generateQuestion = async (projectId: string, stepNumber: number) => {
    await complete({ projectId, stepNumber });
  };

  return { generateQuestion, streamedText: completion, isLoading };
}
```

---

## Response Parsing

### Text Mode vs JSON Mode

**Text Mode:** Parse markdown-formatted responses.

```typescript
function parseQuestionResponse(text: string): QuestionResponse {
  // Extract question (before "**Options:**")
  const question = stripOptionsSection(text);

  // Extract options (after "**Options:**")
  const optionsMatch = text.match(/\*\*Options:\*\*\s*\n([\s\S]*)/i);
  const options = optionsMatch
    ? optionsMatch[1]
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean)
    : [];

  return { question, options };
}
```

**JSON Mode:** Use structured output (feature flag).

```typescript
// Enable with env var
USE_STRUCTURED_OUTPUT=true

// AI SDK automatically parses JSON
const result = await streamText({
  model: getProviderModel(),
  messages: [/* ... */],
  response_format: { type: 'json_object' }, // Force JSON
});

const { text } = await result;
return JSON.parse(text); // Already valid JSON
```

---

## Generic Options Fix (BUG-026)

**Problem:** Questions contextualized to project, options remained generic.

**Root Cause:** `skills-content.ts` had "use EXACT format" instruction, overriding contextualization.

**Solution:** Convert hardcoded options → category-based templates with rewrite instructions.

**Before (hardcoded):**
```typescript
{
  category: 'problem_solution',
  options: [
    'Automate a manual workflow',
    'Improve data analysis',
    'Build customer portal',
  ],
}
```

**After (template with rewrite):**
```typescript
{
  category: 'problem_solution',
  optionTemplates: [
    'Automate [specific workflow from user input]',
    'Improve [specific analysis task from context]',
    'Build [specific feature user mentioned]',
  ],
  rewriteInstructions: `
    Rewrite options using SPECIFIC details from user's project context.
    Example: "Build customer portal" → "Build HTML page with red background and login form"
  `,
}
```

**Enhanced prompt:**
```typescript
const prompt = `${basePrompt}

CRITICAL: Contextualize ALL options using these examples:
- Generic: "Automate manual workflow"
- Contextualized: "Automate invoice PDF generation from Salesforce data"

User mentioned: ${extractKeyDetails(projectContext)}

Rewrite ALL options to match their project specifics.
`;
```

**See:** `.tmp-docs/bug-reports/026-generic-interview-options/`

---

## Observability

### Langfuse Integration

**Setup:**
```bash
# .env
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASEURL=http://localhost:3120
```

**Usage:**
```typescript
import { observeCompletion } from 'langfuse';

const result = await streamText({
  model: getProviderModel(),
  messages: [/* ... */],
  onFinish: async (completion) => {
    // Log to Langfuse
    await observeCompletion({
      name: 'generate-question',
      input: { projectId, stepNumber },
      output: completion.text,
      model: process.env.AI_MODEL_ID,
      usage: {
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
        totalTokens: completion.usage.totalTokens,
      },
      metadata: {
        projectId,
        stepNumber,
        provider: process.env.AI_PROVIDER,
      },
    });
  },
});
```

**Dashboard:** `http://localhost:3120`

**Metrics:**
- Token usage per request
- Cost tracking
- Latency analysis
- Error rate

---

## Testing AI Integration

### Mock Streaming Responses

**Environment variable:**
```bash
USE_MOCK_STREAMING=true
```

**Mock implementation:**
```typescript
// src/features/planning/ai/__mocks__/mock-streaming.ts
export function mockStreamText(prompt: string) {
  return {
    textStream: (async function* () {
      const mockResponse = getMockResponse(prompt);
      for (const char of mockResponse) {
        yield char;
        await sleep(10); // Simulate streaming delay
      }
    })(),
    async then(resolve) {
      const text = getMockResponse(prompt);
      resolve({ text, usage: { promptTokens: 100, completionTokens: 50 } });
    },
  };
}

function getMockResponse(prompt: string) {
  if (prompt.includes('generate question')) {
    return JSON.stringify({
      question: 'What is the primary user pain point?',
      options: ['Data entry', 'Report generation', 'Collaboration'],
    });
  }
  // ... other mock responses
}
```

**See:** `tests/e2e/workflow-chat.mock.test.ts`

---

## Provider-Specific Setup

### AWS Bedrock

**Authentication:**
```bash
# Option 1: Access keys
AWS_REGION=ca-central-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Option 2: SSO profile
AWS_REGION=ca-central-1
AWS_PROFILE=my-sso-profile
```

**Model Access:**
1. AWS Console → Bedrock → Model Access
2. Request access for Claude models (approval required)
3. Wait for "Access granted" status

**Troubleshooting:**
```bash
# Test connectivity
pnpm check:provider

# Common errors:
# - "AccessDeniedException" → Model access not granted
# - "ExpiredTokenException" → Run `aws sso login`
# - "RegionNotSupportedException" → Use ca-central-1 or us-east-1
```

**See:** `.tmp-docs/AWS-BEDROCK-TROUBLESHOOTING.md`

### Anthropic Direct API

**Setup:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
AI_PROVIDER=anthropic
AI_MODEL_ID=claude-3-5-sonnet-20241022
```

**Benefits:**
- Faster (no AWS middleware)
- Simpler auth (just API key)
- Latest models immediately

**Tradeoffs:**
- No AWS cost tracking
- Direct billing to Anthropic account

### OpenAI

**Setup:**
```bash
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
AI_MODEL_ID=gpt-4-turbo-preview
```

**Limitations:**
- Different prompt engineering (less verbose)
- Different JSON mode syntax
- Different token limits

---

## Performance Considerations

### Token Usage

**Typical request:**
- System prompt: ~200 tokens
- User prompt (with context): ~500-1000 tokens
- Response: ~300-800 tokens
- **Total:** ~1000-2000 tokens per question

**10-step workflow:** ~20,000-40,000 tokens total

**Cost (Claude 3.5 Sonnet):**
- Input: $3/1M tokens
- Output: $15/1M tokens
- **Per project:** ~$0.08-$0.12

### Caching (AWS Bedrock)

**Not available yet** for Claude models on Bedrock. Use Anthropic Direct API for prompt caching.

---

## Common Issues

### 1. Context Not Propagating (OBSERVATION #4)

**Symptom:** Step 2+ questions ignore Step 1 context.

**Fix:** Pass `projectContext` to `$generateQuestion` and use it first.

```typescript
// ✅ Pass context explicitly
const question = await $generateQuestion({
  projectId,
  stepNumber: 2,
  projectContext: context, // From XState machine
});
```

### 2. Generic Options (BUG-026)

**Symptom:** Options like "Automate manual workflow" instead of specific details.

**Fix:** Add rewrite instructions and examples to prompt.

### 3. Invalid YAML (BUG-022)

**Symptom:** Artifact contains markdown-formatted YAML (triple backticks).

**Fix:** Strip markdown fences before saving.

```typescript
function stripMarkdownFences(text: string) {
  return text.replace(/^```yaml\n/, '').replace(/\n```$/, '');
}
```

---

## Related Documentation

- [OVERVIEW.md](./OVERVIEW.md) - System architecture
- [state-machine.md](./state-machine.md) - XState workflow
- [ADR-002: Server Functions Over REST](../decisions/ADR-002-server-functions-over-rest.md)

---

**Last Updated:** 2026-06-17  
**Maintainer:** Development Team
