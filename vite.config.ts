import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import Database from "better-sqlite3";
import type { Connect } from "vite";
import { defineConfig } from "vite";

function openSeedDatabase() {
  const dbPath =
    process.env.SHERPY_DB_PATH ||
    path.join(os.homedir(), ".local/share/sherpy/sherpy.db");
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  const schema = fs.readFileSync(
    fileURLToPath(new URL("./src/lib/db/schema.sql", import.meta.url)),
    "utf-8",
  );
  db.exec(schema);

  return db;
}

export default defineConfig({
  optimizeDeps: {
    exclude: ["better-sqlite3"],
  },
  ssr: {
    external: [
      "better-sqlite3",
      "@aws-sdk/client-bedrock-runtime",
      "@aws-sdk/client-sts",
    ],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "app",
      routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
    }),
    {
      name: "api-streaming-routes",
      configureServer(server) {
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
                  pathToFileURL(
                    `${process.cwd()}/tests/fixtures/builders/PlanningStateBuilder.ts`,
                  ).href
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
                const stateValueByStep = {
                  1: { step1_gapAnalysis: "collecting" },
                  2: { step2_businessReqs: "answering" },
                  3: { step3_techReqs: "answering" },
                  4: { step4_styleAnchors: "generating" },
                  5: { step5_implPlanner: "collecting" },
                  6: { step6_definitionOfDone: "generating" },
                  7: { step7_archDecisions: "reviewing" },
                  8: { step8_deliveryTimeline: "generating" },
                  9: { step9_qaTestPlan: "generating" },
                  10: { step10_summaries: "generating" },
                } as const;

                const xstateSnapshot = {
                  status: "active" as const,
                  value:
                    stateValueByStep[step as keyof typeof stateValueByStep],
                  context: state,
                  children: {},
                  historyValue: {},
                  tags: [],
                };

                const now = new Date().toISOString();
                const projectNameForDb =
                  typeof projectName === "string" && projectName.trim()
                    ? projectName.trim()
                    : `Seed Step ${step}`;

                const db = openSeedDatabase();
                try {
                  db.prepare(
                    `
                      INSERT INTO projects (
                        id,
                        code,
                        name,
                        status,
                        entry_path,
                        current_step,
                        created_at,
                        last_touched_at
                      )
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        status = excluded.status,
                        entry_path = excluded.entry_path,
                        current_step = excluded.current_step,
                        last_touched_at = excluded.last_touched_at
                    `,
                  ).run(
                    projectId,
                    `SEED-${projectId}`,
                    projectNameForDb,
                    "active",
                    "scratch",
                    step,
                    state.startedAt ?? now,
                    state.updatedAt ?? now,
                  );

                  db.prepare(
                    `
                      INSERT INTO planning_state (
                        project_id,
                        xstate_snapshot,
                        created_at,
                        updated_at
                      )
                      VALUES (?, ?, ?, ?)
                      ON CONFLICT(project_id) DO UPDATE SET
                        xstate_snapshot = excluded.xstate_snapshot,
                        updated_at = excluded.updated_at
                    `,
                  ).run(projectId, JSON.stringify(xstateSnapshot), now, now);
                } finally {
                  db.close();
                }

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
