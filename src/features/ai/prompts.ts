import { getSkillContent } from "./skills-content";
import { getStepName } from "../planning/step-config";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function buildInterviewPrompt(
  stepName: string,
  stepNumber: number,
  previousAnswers: string[],
): Message[] {
  // Get skill content for this step
  const skillContent = getSkillContent(stepNumber);

  // If we have skill content, use it
  if (skillContent) {
    let systemContext = skillContent;

    if (previousAnswers.length > 0) {
      systemContext += "\n\n## Progress So Far\n\nPrevious answers in this interview:\n";
      for (const [index, answer] of previousAnswers.entries()) {
        systemContext += `${index + 1}. ${answer}\n`;
      }
      systemContext += "\n";
    }

    systemContext += "\n\nNow ask the next appropriate question based on the progress above.";

    return [
      { role: "user", content: systemContext },
      {
        role: "assistant",
        content: "Understood. I will conduct this structured interview following the categories and questions defined.",
      },
      {
        role: "user",
        content: previousAnswers.length === 0
          ? "Begin the interview by asking the first question."
          : "Ask the next question in the sequence.",
      },
    ];
  }

  // Fallback for steps without skill content yet
  const systemContext =
    "You are Sherpy, an expert PM planning assistant. Ask one focused question at a time to help product managers define project requirements. Be concise and direct.\n\nWhen you have enough information to complete this planning step, respond with exactly: [STEP_COMPLETE]\n\nOtherwise, ask the next clarifying question.";

  let userContext = `Current planning step: ${stepNumber}. ${stepName}\n\n`;

  if (previousAnswers.length > 0) {
    userContext += "Previous answers in this step:\n";
    for (const [index, answer] of previousAnswers.entries()) {
      userContext += `${index + 1}. ${answer}\n`;
    }
    userContext += "\n";
  }

  userContext +=
    "Evaluate if you have sufficient information for this step. If yes, respond with [STEP_COMPLETE]. If you need more information, ask the next question.";

  return [
    { role: "user", content: systemContext },
    {
      role: "assistant",
      content: "Understood. I will help guide the planning process and signal when a step is complete.",
    },
    { role: "user", content: userContext },
  ];
}

export function buildArtifactPrompt(
  stepName: string,
  stepNumber: number,
  answers: string[],
): Message[] {
  let systemContext = `You are generating a ${stepName} artifact based on interview answers.\n\n`;

  // Add specific output format instructions based on step
  if (stepNumber === 2) {
    systemContext += `Generate a business-requirements.yaml file with this structure:

project:
  name: [project name]
  description: [brief description]
  version: "1.0"

overview:
  problem: [the problem being solved]
  value_proposition: [core value prop]
  scope:
    in_scope:
      - [feature/capability]
    out_of_scope:
      - [what's not included]

personas:
  - name: [persona name]
    role: [their role]
    goals:
      - [what they want to achieve]
    pain_points:
      - [current problems they face]

functional_requirements:
  - id: FR-001
    description: [what the system must do]
    priority: high/medium/low
    rationale: [why this is needed]

non_functional_requirements:
  - category: performance/security/usability/reliability
    requirement: [specific requirement]
    target: [measurable target if applicable]

success_criteria:
  - metric: [what to measure]
    target: [goal value]
    rationale: [why this matters]

constraints:
  technical:
    - [technical limitation]
  business:
    - [business constraint]
  timeline:
    - [time constraint]

dependencies:
  internal:
    - [internal dependency]
  external:
    - [external dependency]

timeline:
  mvp_scope: [what's in MVP]
  estimated_duration: [time estimate]
  priority_order:
    - [priority 1]
    - [priority 2]

assumptions:
  - [assumption made]

risks:
  - risk: [potential risk]
    likelihood: high/medium/low
    impact: high/medium/low
    mitigation: [how to address]

Return ONLY valid YAML. No markdown code blocks, no explanations.`;
  } else if (stepNumber === 3) {
    systemContext += `Generate a technical-requirements.yaml file with this structure:

project:
  name: [project name]
  version: "1.0"

architecture:
  pattern: [architecture pattern chosen]
  structure: [application structure]
  rationale: [why this approach]

technology_stack:
  language: [primary language]
  frameworks:
    - [framework/library]
  rationale: [why these choices]

data_model:
  persistence_strategy: [how data is stored]
  structure: [how data is organized]
  rationale: [why this approach]

api_design:
  style: [REST/GraphQL/etc]
  versioning: [versioning strategy]
  rationale: [why this approach]

security:
  authentication: [auth method]
  authorization: [authz approach]
  rationale: [why these choices]

testing:
  approach: [TDD/BDD/etc]
  types:
    - [test type]
  frameworks:
    - [testing tool]
  rationale: [why this strategy]

development:
  workflow: [git flow/trunk-based/etc]
  tools:
    - [code quality tool]
  rationale: [why these tools]

deployment:
  target: [where it's deployed]
  ci_cd: [CI/CD tool]
  rationale: [why this approach]

technical_constraints:
  - constraint: [specific constraint]
    impact: [how it affects design]

integration_points:
  - system: [external system]
    method: [how they integrate]

Return ONLY valid YAML. No markdown code blocks, no explanations.`;
  } else {
    systemContext += `Generate a structured YAML artifact. Return only valid YAML without any markdown code blocks or explanations.`;
  }

  let userContext = "Answers collected:\n";
  for (const [index, answer] of answers.entries()) {
    userContext += `${index + 1}. ${answer}\n`;
  }
  userContext += "\n";
  userContext += "Generate the YAML artifact now based on these answers.";

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
