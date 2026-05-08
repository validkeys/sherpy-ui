import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import type { Connect } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "app",
    }),
    {
      name: "api-streaming-routes",
      configureServer(server) {
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
                const { stepNumber, previousAnswers = [] } = data;

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
                  );
                  stream = await streamQuestion(messages, {
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
