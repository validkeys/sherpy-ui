import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import type { Connect } from "vite";
import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["better-sqlite3"],
  },
  ssr: {
    external: ["better-sqlite3"],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "app",
    }),
    {
      name: "api-streaming-routes",
      configureServer(server) {
        // Seed API middleware
        server.middlewares.use(
          "/api/dev/seed",
          async (req: Connect.IncomingMessage, res, next) => {
            if (req.method !== "POST") {
              return next();
            }

            // Read request body
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const data = JSON.parse(body);
                const { step, projectName, overrides } = data;

                // Validate step number
                if (
                  !step ||
                  typeof step !== "number" ||
                  step < 1 ||
                  step > 10
                ) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  res.end(
                    JSON.stringify({
                      error: "Invalid step number. Must be between 1 and 10.",
                    }),
                  );
                  return;
                }

                // Import PlanningStateBuilder
                const { PlanningStateBuilder } = await import(
                  "./tests/fixtures/builders/PlanningStateBuilder"
                );

                // Build state using PlanningStateBuilder
                const builder = PlanningStateBuilder.new();

                if (projectName && typeof projectName === "string") {
                  builder.withProjectId(projectName);
                }

                // Complete all steps up to (but not including) the target step
                for (let i = 1; i < step; i++) {
                  builder.completeStep(i);
                }

                // Set current step
                builder.withCurrentStepNumber(step);
                builder.withCompletedSteps(
                  Array.from({ length: step - 1 }, (_, i) => i + 1),
                );

                if (overrides && typeof overrides === "object") {
                  Object.entries(overrides).forEach(([key, value]) => {
                    if (key in builder) {
                      // @ts-expect-error - dynamic property access for testing
                      builder[key] = value;
                    }
                  });
                }

                // Build the state snapshot
                const state = builder.build();
                const projectId = state.projectId!;

                // Generate localStorage key
                const storageKey = `planning-machine-${projectId}`;

                // Create XState snapshot format
                const xstateSnapshot = {
                  status: "active" as const,
                  value: `step${step}`,
                  context: state,
                  children: {},
                  historyValue: {},
                  tags: [],
                };

                console.log(
                  `[Seed API] Created test project at step ${step}:`,
                  projectId,
                );

                // Return snapshot and instructions
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    success: true,
                    projectId,
                    step,
                    url: `/project/${projectId}/build`,
                    storageKey,
                    snapshot: xstateSnapshot,
                    instructions: {
                      manual: `Open browser console and run: localStorage.setItem('${storageKey}', '${JSON.stringify(xstateSnapshot).replace(/'/g, "\\'")}')`,
                      programmatic: `localStorage.setItem('${storageKey}', JSON.stringify(response.snapshot))`,
                    },
                  }),
                );
              } catch (error) {
                console.error("[Seed API] Error:", error);
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Failed to generate test data",
                    details: errorMessage,
                  }),
                );
              }
            });
          },
        );

        // Interview API middleware
        server.middlewares.use(
          "/api/ai/interview",
          async (req: Connect.IncomingMessage, res, next) => {
            if (req.method !== "POST") {
              return next();
            }

            // Read request body
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const data = JSON.parse(body);
                const {
                  stepNumber,
                  previousAnswers = [],
                  projectContext,
                } = data;

                console.log("[vite middleware] Received request:", {
                  stepNumber,
                  previousAnswersLength: previousAnswers.length,
                  projectContext: projectContext || "UNDEFINED",
                });

                const USE_MOCK_STREAMING =
                  process.env.USE_MOCK_STREAMING !== "false";

                let stream: ReadableStream<string>;
                if (USE_MOCK_STREAMING) {
                  const { createMockStream } = await import(
                    "./src/features/ai/mock-streaming"
                  );
                  stream = createMockStream(stepNumber, previousAnswers);
                } else {
                  const { buildInterviewPrompt } = await import(
                    "./src/features/ai/prompts"
                  );
                  const { getStepName } = await import(
                    "./src/features/planning/step-config"
                  );
                  const { streamQuestion } = await import(
                    "./src/features/ai/streaming"
                  );
                  const stepName = getStepName(stepNumber);
                  const messages = buildInterviewPrompt(
                    stepName,
                    stepNumber,
                    previousAnswers,
                    projectContext,
                  );
                  stream = await streamQuestion(messages, stepNumber, {
                    name: "interview-stream",
                  });
                }

                // Set streaming headers
                res.writeHead(200, {
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  Connection: "keep-alive",
                });

                // Pipe stream to response
                const reader = stream.getReader();
                const encoder = new TextEncoder();

                async function pump() {
                  const { done, value } = await reader.read();
                  if (done) {
                    res.end();
                    return;
                  }
                  res.write(encoder.encode(value));
                  await pump();
                }

                await pump();
              } catch (error) {
                console.error("Streaming error:", error);
                res.writeHead(500);
                res.end("Internal server error");
              }
            });
          },
        );
      },
    },
  ],
  server: {
    host: true,
    port: Number(process.env.SHERPY_UI_PORT) || 5180,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
