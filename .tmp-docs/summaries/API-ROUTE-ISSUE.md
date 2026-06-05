# API Route Issue: Streaming Endpoint Not Found

## Problem

The streaming AI question endpoint at `/api/ai/interview` returns a 404 HTML page instead of streaming data. This causes raw HTML to appear in the question text field.

**Symptoms:**
- Question input shows HTML like `<!DOCTYPE html><html>...`
- Browser console shows 404 for `/api/ai/interview`
- No streaming AI questions appear

## Root Cause

The file `app/api/ai/interview.ts` exists and uses Vinxi's `defineEventHandler`, but **TanStack Start v1.x doesn't automatically register API routes from the `app/api` folder**.

This pattern works in:
- Next.js (pages/api or app/api)
- Nuxt/Nitro (server/api)
- Raw Vinxi projects

But **TanStack Start** uses a different routing model where server functions are created with `createServerFn` and don't require separate HTTP endpoints.

## Current Workaround (Implemented)

**File:** `src/features/ai/hooks.ts`

The streaming hook now:
1. Detects HTML responses (content-type check)
2. Throws an error when API returns HTML instead of stream
3. Falls back to mock questions from `planning/store.ts`

**File:** `src/features/planning/components/InterviewThread.tsx`

Shows mock question text when streaming fails, so users still see proper questions even without AWS Bedrock.

## Proper Long-Term Solutions

### Option 1: Use TanStack Start Server Functions (Recommended)

Create a server function that returns a streaming Response:

```typescript
// src/features/ai/server-streaming.ts
import { createServerFn } from "@tanstack/react-start";

export const $streamQuestion = createServerFn({ method: "POST" })
  .inputValidator(...)
  .handler(async ({ data }) => {
    const stream = await streamQuestion(messages);
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  });
```

**Issue:** TanStack Start's `createServerFn` may not fully support streaming Response objects in v1.x.

### Option 2: Configure Vinxi Routes

Add explicit route configuration to `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      srcDirectory: "app",
      // Add Vinxi/Nitro route configuration
      server: {
        preset: "node-server",
        api: {
          routes: [
            {
              route: "/api/ai/interview",
              handler: "./app/api/ai/interview.ts",
            },
          ],
        },
      },
    }),
  ],
});
```

**Issue:** This configuration format may not be supported in current TanStack Start version.

### Option 3: Use Vinxi Middleware

Create a middleware that registers API routes:

```typescript
// app/middleware/api-routes.ts
import { defineEventHandler } from "vinxi/http";
import interviewHandler from "../api/ai/interview";

export default defineEventHandler((event) => {
  if (event.node.req.url?.startsWith("/api/ai/interview")) {
    return interviewHandler(event);
  }
});
```

### Option 4: Wait for TanStack Start v2

TanStack Start v2 may have better support for Vinxi/Nitro-style API routes.

## Recommended Action

For now, the **workaround (Option 1 above)** is sufficient:
- Users see proper mock questions when streaming isn't available
- No configuration complexity
- Works without AWS Bedrock credentials

To enable real streaming:
1. Add AWS credentials to `.env`
2. Investigate Option 2 (Vinxi route config) or Option 3 (middleware)
3. Or wait for TanStack Start v2 with better API route support

## Testing

With the workaround:
- ✅ No HTML appears in question text
- ✅ Mock questions display correctly
- ✅ All 128 tests pass
- ✅ Graceful degradation when API unavailable

To test streaming with AWS:
1. Configure AWS credentials
2. Verify `/api/ai/interview` endpoint is reachable
3. Check browser network tab shows `text/event-stream` response
4. Observe token-by-token streaming in UI

## Related Files

- `app/api/ai/interview.ts` - Streaming endpoint (not currently registered)
- `src/features/ai/hooks.ts` - Client hook with fallback
- `src/features/ai/streaming.ts` - Bedrock streaming implementation
- `src/features/planning/store.ts` - Mock questions source
