// Planning step names from business requirements
export const STEP_NAMES: Record<number, string> = {
  1: "Define Project Vision",
  2: "Identify Target Audience",
  3: "List Core Features",
  4: "Define Success Metrics",
  5: "Estimate Timeline",
  6: "Identify Technical Requirements",
  7: "Define User Flows",
  8: "List Dependencies",
  9: "Identify Risks",
  10: "Create Action Items",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Mapping from step number to artifact key
export const STEP_ARTIFACT_KEYS: Record<number, string> = {
  1: "project-vision",
  2: "target-audience",
  3: "core-features",
  4: "success-metrics",
  5: "timeline-estimate",
  6: "technical-requirements",
  7: "user-flows",
  8: "dependencies",
  9: "risks",
  10: "action-items",
};

export function buildInterviewPrompt(
  stepName: string,
  stepNumber: number,
  previousAnswers: string[],
): Message[] {
  const systemContext =
    "You are Sherpy, an expert PM planning assistant. Ask one focused question at a time to help product managers define project requirements. Be concise and direct.";

  let userContext = `Current planning step: ${stepNumber}. ${stepName}\n\n`;

  if (previousAnswers.length > 0) {
    userContext += "Previous answers in this step:\n";
    for (const [index, answer] of previousAnswers.entries()) {
      userContext += `${index + 1}. ${answer}\n`;
    }
    userContext += "\n";
  }

  userContext +=
    "Ask the next question to help the PM complete this planning step.";

  return [
    { role: "user", content: systemContext },
    {
      role: "assistant",
      content: "Understood. I will help guide the planning process.",
    },
    { role: "user", content: userContext },
  ];
}

export function buildArtifactPrompt(
  stepName: string,
  stepNumber: number,
  answers: string[],
): Message[] {
  const systemContext =
    "You are Sherpy, an expert PM planning assistant. Generate a structured planning artifact in YAML format based on the PM's answers. Return only valid YAML without any markdown code blocks or explanations.";

  let userContext = `Planning step completed: ${stepNumber}. ${stepName}\n\n`;
  userContext += "Answers collected:\n";
  for (const [index, answer] of answers.entries()) {
    userContext += `${index + 1}. ${answer}\n`;
  }
  userContext += "\n";
  userContext += `Generate a ${stepName} artifact in YAML format. Include appropriate fields for this type of planning document. Be structured and complete.`;

  return [
    { role: "user", content: systemContext },
    {
      role: "assistant",
      content: "Understood. I will generate a structured YAML artifact.",
    },
    { role: "user", content: userContext },
  ];
}

export function buildRefinementPrompt(
  artifactLabel: string,
  currentContent: string,
  instruction: string,
): Message[] {
  const systemContext =
    "You are Sherpy. Refine the following planning artifact per the PM's instruction. Return only the updated artifact content — no explanation.";

  const userContext = `Artifact: ${artifactLabel}\n\nCurrent content:\n${currentContent}\n\nRefinement instruction: ${instruction}`;

  return [
    { role: "user", content: systemContext },
    {
      role: "assistant",
      content: "Understood. I will refine the artifact as requested.",
    },
    { role: "user", content: userContext },
  ];
}
