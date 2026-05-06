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
