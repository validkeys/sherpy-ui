import { STEP_NAMES } from "./prompts";

/**
 * Creates a mock streaming response that simulates token-by-token AI generation
 * Used for demonstration when real Bedrock streaming isn't available
 */
export function createMockStream(stepNumber: number): ReadableStream<string> {
  const stepName = STEP_NAMES[stepNumber];
  if (!stepName) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  // Get the mock question text
  const mockQuestions: Record<number, string> = {
    1: "Let's start by identifying any gaps in your existing requirements. Do you have a requirements document to analyze, or are you starting from scratch?",
    2: "What is the primary business problem this project is solving? Describe the current pain point and the desired outcome.",
    3: "What are the key technical constraints or non-negotiables for this project? Consider platform, integrations, performance, and security needs.",
    4: "How should we break this project into milestones? What is the most critical slice of functionality to deliver first?",
    5: "Reviewing the generated implementation plan — do the milestones and task estimates feel realistic given your team's capacity?",
    6: "What does success look like for each milestone? Define the acceptance criteria that must be met before a milestone is considered complete.",
    7: "Are there any significant architectural decisions that need to be documented? Think about technology choices, patterns, or tradeoffs that future engineers should understand.",
    8: "Given the milestones and team capacity, what is a realistic delivery timeline? Are there external deadlines or dependencies we need to account for?",
    9: "What are the highest-risk areas of the system that need the most test coverage? Define the testing strategy for functional, performance, and security requirements.",
    10: "We're ready to generate the final summaries. Should we produce a developer-focused technical summary, an executive overview, or both?",
  };

  const questionText = mockQuestions[stepNumber] || stepName;

  return new ReadableStream<string>({
    async start(controller) {
      // Stream character by character with realistic timing
      const words = questionText.split(" ");

      for (let i = 0; i < words.length; i++) {
        const word = i === words.length - 1 ? words[i] : `${words[i]} `;

        // Enqueue word
        controller.enqueue(word);

        // Variable delay for realistic typing feel
        // Shorter delays for small words, longer for complex words
        const delay = 30 + Math.random() * 40 + word.length * 2;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      controller.close();
    },
  });
}

/**
 * Server handler for mock streaming endpoint
 * Can be used in development when Bedrock isn't available
 */
export async function handleMockStreamingRequest(body: {
  projectId: string;
  stepNumber: number;
  previousAnswers: string[];
}): Promise<Response> {
  const { stepNumber } = body;

  // Validate step number
  if (typeof stepNumber !== "number" || stepNumber < 1 || stepNumber > 10) {
    return new Response("Invalid step number", { status: 400 });
  }

  const stream = createMockStream(stepNumber);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
