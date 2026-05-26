import { buildArtifactPrompt } from "./prompts";
import { streamQuestion } from "./streaming";

export async function generateArtifact(
  stepName: string,
  stepNumber: number,
  answers: string[],
): Promise<string> {
  const messages = buildArtifactPrompt(stepName, stepNumber, answers);

  // Stream the artifact generation
  const stream = await streamQuestion(messages, stepNumber, {
    name: `artifact-generation-step-${stepNumber}`,
  });

  // Collect all chunks
  const reader = stream.getReader();
  let artifact = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    artifact += value;
  }

  return artifact.trim();
}
