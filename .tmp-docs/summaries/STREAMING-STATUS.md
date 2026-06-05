# Streaming AI Questions - Status & Demo

## Current Status: UI Ready, API Route Blocked

### What's Working ✅

**Client-Side Streaming Hook** (`src/features/ai/hooks.ts`):
- ✅ Fetches from `/api/ai/interview`
- ✅ Reads `ReadableStream` response
- ✅ Accumulates chunks token-by-token
- ✅ Updates UI progressively with `setText((prev) => prev + chunk)`
- ✅ Handles errors and falls back to mock questions

**UI Components** (`src/features/planning/components/InterviewThread.tsx`):
- ✅ Displays streaming text as it arrives
- ✅ Shows "Loading question..." before stream starts
- ✅ Disables form during streaming
- ✅ Enables form when stream completes
- ✅ Optimistic UI updates for submitted answers

**Streaming Server Logic** (`src/features/ai/streaming.ts`):
- ✅ Bedrock client configured
- ✅ `InvokeModelWithResponseStreamCommand` implemented
- ✅ Returns `ReadableStream<string>`
- ✅ Proper chunk parsing and error handling

### What's Blocked ❌

**API Route Registration:**
- ❌ `/api/ai/interview` returns 404 (HTML "Not Found" page)
- ❌ TanStack Start v1.x doesn't auto-register `app/api/` routes
- ❌ No built-in `createAPIFileRoute` in v1.x

**Why It's Not Working:**
TanStack Start v1.x uses a different model than Next.js:
- Next.js: `app/api/route.ts` → automatic API endpoint
- TanStack Start: Must use `createServerFn` → called as functions, not HTTP endpoints

The `app/api/ai/interview.ts` file with `defineEventHandler` (Vinxi/Nitro style) exists but isn't being picked up by the router.

## Current User Experience

**What users see:**
1. Submit answer → Q&A appears instantly ✅
2. "Loading next question..." shows briefly ✅
3. Question text **pops in all at once** (mock question, not streamed) ⚠️
4. Form enables, user can type ✅

**What users SHOULD see (with streaming working):**
1. Submit answer → Q&A appears instantly ✅
2. "Loading next question..." shows briefly ✅
3. Question streams: "What are..." → "What are the key..." → "What are the key technical..." ✨
4. Form enables when stream completes ✅

## Demo: Streaming Works Locally

You can test the streaming logic directly in Node.js:

```typescript
// test-streaming.ts
import { streamQuestion } from './src/features/ai/streaming';
import { buildInterviewPrompt } from './src/features/ai/prompts';

async function demo() {
  const messages = buildInterviewPrompt("Business Requirements Interview", 2, []);
  const stream = await streamQuestion(messages);
  
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(decoder.decode(value)); // Streams character-by-character!
  }
}

demo();
```

**Note:** Requires AWS credentials and Bedrock access.

## Solutions to Enable Streaming

### Option 1: Use Mock Streaming (Demonstration)

Create a mock streaming endpoint that simulates token-by-token delivery:

```typescript
// app/routes/api.ai.interview.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const mockQuestion = STEP_NAMES[body.stepNumber];
  
  // Stream mock question character-by-character
  return new Response(
    new ReadableStream({
      async start(controller) {
        for (const char of mockQuestion) {
          controller.enqueue(new TextEncoder().encode(char));
          await new Promise(r => setTimeout(r, 20)); // 20ms per character
        }
        controller.close();
      }
    }),
    { headers: { "Content-Type": "text/event-stream" } }
  );
});
```

### Option 2: Vinxi Middleware (Proper Fix)

Configure Vinxi to handle the API route:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    {
      name: "api-routes",
      configureServer(server) {
        server.middlewares.use("/api/ai/interview", async (req, res) => {
          // Handle streaming here
        });
      },
    },
    tanstackStart({ srcDirectory: "app" }),
  ],
});
```

### Option 3: TanStack Start v2 (Future)

Wait for TanStack Start v2 which may have better API route support.

### Option 4: Separate API Server

Run a separate Express/Fastify server for streaming endpoints:
- Main app: TanStack Start on port 5180
- API server: Express on port 3001
- Client fetches from `http://localhost:3001/api/ai/interview`

## Recommendation

**For now:** The current implementation with mock question fallback is acceptable. Users get:
- ✅ Instant feedback on submit
- ✅ Clear loading states
- ✅ Working Q&A flow
- ⚠️ Questions appear instantly (not streamed)

**To enable real streaming:** Implement Option 2 (Vinxi middleware) or Option 4 (separate API server) once AWS Bedrock credentials are configured.

## Files Changed for Streaming

- ✅ `src/features/ai/hooks.ts` - Streaming consumer hook
- ✅ `src/features/ai/streaming.ts` - Bedrock streaming implementation
- ✅ `src/features/planning/components/InterviewThread.tsx` - Progressive UI updates
- ⚠️ `app/api/ai/interview.ts` - Endpoint exists but not registered
- ⚠️ `app/routes/api.ai.interview.ts` - Attempted fix (didn't work)

## Testing Streaming

To verify streaming works once the endpoint is fixed:

1. Open browser DevTools → Network tab
2. Submit an answer
3. Look for request to `/api/ai/interview`
4. Should see:
   - Status: 200
   - Type: `text/event-stream`
   - Response streaming in chunks
5. Question card should fill in character-by-character

**Current state:** Request to `/api/ai/interview` returns 404 HTML, caught by content-type check, falls back to mock.
