import { getSkillContent } from "./skills-content";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function buildInterviewPrompt(
  stepName: string,
  stepNumber: number,
  previousAnswers: string[],
  projectOverview?: string,
): Message[] {
  console.log("[buildInterviewPrompt] Called with:", {
    stepName,
    stepNumber,
    hasProjectOverview: !!projectOverview,
    projectOverviewLength: projectOverview?.length || 0,
    projectOverviewPreview: projectOverview?.substring(0, 50),
  });

  // Get skill content for this step
  const skillContent = getSkillContent(stepNumber);

  // If we have skill content, use it
  if (skillContent) {
    let systemContext = "";

    // Add project context FIRST if available (for Step 2+)
    if (projectOverview) {
      console.log("[buildInterviewPrompt] Adding project context to prompt");
      systemContext += `## 🎯 PROJECT CONTEXT - CRITICAL INSTRUCTIONS

The user is building: "${projectOverview}"

**MANDATORY REQUIREMENTS:**

1. **REWRITE EVERY QUESTION** to explicitly reference this specific project
   - ❌ BAD: "What is the primary problem your project aims to solve?"
   - ✅ GOOD: "What problem does your HTML page with red background solve for users?"

2. **REWRITE ALL OPTIONS** to match the specific project type and context
   - The skill content provides option CATEGORIES (e.g., "Automate", "Improve", "New capability")
   - You MUST rewrite each option's title AND description to reference the user's specific project
   - Keep the category intent, but make it project-specific

   **Option Rewriting Examples:**

   For "HTML page with red background" project:
   ❌ Generic: "1. Automate manual workflow - Replace time-consuming manual processes"
   ✅ Contextual: "1. Automate color changes - Dynamically change background colors based on user actions or time"

   ❌ Generic: "2. Improve existing solution - Enhance current tooling"
   ✅ Contextual: "2. Improve existing page - Replace a plain HTML page with styled, interactive content"

   ❌ Generic: "3. New capability - Build something entirely new"
   ✅ Contextual: "3. Learning project - Practice HTML/CSS fundamentals with a simple example"

   For "REST API for authentication" project:
   ❌ Generic: "1. Automate manual workflow"
   ✅ Contextual: "1. Automate login verification - Replace manual credential checking with API-based auth"

   ❌ Generic: "2. Improve existing solution"
   ✅ Contextual: "2. Replace legacy auth system - Modernize outdated authentication infrastructure"

3. **USE PROJECT-SPECIFIC LANGUAGE** throughout
   - If they said "HTML page with red background" → ask about "your page's styling and interactivity"
   - If they said "REST API" → ask about "your API endpoints and authentication"
   - If they said "iOS app" → ask about "your app screens and features"

4. **SKIP IRRELEVANT QUESTIONS** entirely
   - Don't ask about API design for a static HTML page
   - Don't ask about mobile screens for a backend API
   - Don't ask about database schemas for a pure frontend project

**VERIFICATION CHECK:**
Before presenting each question AND its options, verify:
- "Does this question reference '${projectOverview}'?"
- "Do ALL options reference the specific project context?"
If NO to either, rewrite until both are project-specific.

**FULL CONTEXTUALIZATION EXAMPLE:**

Project: "HTML page with red background"

❌ WRONG (generic question, generic options):
"What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow - Replace time-consuming manual processes
2. Improve existing solution - Enhance current tooling
3. New capability - Build something entirely new"

✅ CORRECT (contextualized question AND options):
"What problem does your HTML page with red background aim to solve?

**Options:**
1. Learning project (Recommended) - Practice HTML/CSS fundamentals with color styling
2. Template for future pages - Create a reusable styled page template
3. Visual testing ground - Experiment with different background effects and colors
4. Type your own answer"

---

`;
    }

    systemContext += skillContent;

    if (previousAnswers.length > 0) {
      systemContext +=
        "\n\n## Progress So Far\n\nPrevious answers in this interview:\n";
      for (const [index, answer] of previousAnswers.entries()) {
        systemContext += `${index + 1}. ${answer}\n`;
      }
      systemContext += "\n";
    }

    systemContext += `

## CRITICAL OUTPUT FORMATTING RULES

When presenting multiple-choice questions:

1. **DO NOT** echo or list the options in plain text before the **Options:** section
2. **DO NOT** write introductory text like "Here are your options:" or "You can choose from:"
3. **ALWAYS** use the exact format from the skill content with **Options:** header
4. **ALWAYS** include the option number, title, and description exactly as specified
5. **NEVER** paraphrase or summarize the options before presenting them

Correct format example:
\`\`\`
What is your choice?

**Options:**
1. Option A (Recommended) - Full description here
2. Option B - Full description here
\`\`\`

Incorrect format (DO NOT DO THIS):
\`\`\`
Let me present your options:
1. Option A - Short version
2. Option B - Short version

**Options:**
1. Option A (Recommended) - Full description here
2. Option B - Full description here
\`\`\`

## INTERVIEW TERMINATION RULES

**When to set \`isComplete: true\`:**

You must signal interview completion by setting \`isComplete: true\` in your response when you have gathered enough information to generate a comprehensive artifact. Evaluate after each question:

1. **Core dimensions covered** - Have you collected answers about:
   - The problem/goal (what and why)
   - The users/stakeholders (who)
   - The scope and priorities (what's in/out)
   - Key constraints (technical, business, timeline)
   - Success criteria or outcomes

2. **Sufficient depth** - Do the answers provide enough detail to:
   - Write a complete requirements document?
   - Understand trade-offs and priorities?
   - Identify risks and dependencies?

3. **Diminishing returns** - Are follow-up questions:
   - Asking for redundant information already covered?
   - Getting too specific/detailed for this planning phase?
   - Better addressed during implementation?

**Guidelines:**
- Typical interviews: 8-15 questions (varies by project complexity)
- Simple projects (e.g., "HTML page"): 6-8 questions may suffice
- Complex projects (e.g., "enterprise payment system"): 12-15 questions may be needed
- **Stop when you have enough, not when you've exhausted all possible questions**

**How to signal completion:**
- Set \`isComplete: true\` in your JSON response
- This will trigger artifact generation
- The interview will end and the user will move to the next step

**Example progression:**
- Questions 1-5: Core dimensions (problem, users, scope)
- Questions 6-10: Depth and details (constraints, priorities, risks)
- Questions 11+: Only if gaps remain or project is highly complex
- When sufficient: Set \`isComplete: true\` instead of asking another question

If uncertain whether you have enough information, err on the side of **asking 1-2 more targeted questions** rather than generating an incomplete artifact.
`;

    // Add final instruction with project context if available
    if (projectOverview) {
      systemContext += `\n\n## FINAL INSTRUCTION - READ THIS LAST

You have been provided with the project description: "${projectOverview}"

When you ask the next question, you MUST rewrite it to specifically mention what the user is building. Do not ask generic questions. Make every question about THEIR specific project.

For example:
- NOT: "What is the primary problem your project aims to solve?"
- YES: "What problem will your HTML button page solve for users?"

Now ask the first question, customized for "${projectOverview}".`;
    } else {
      systemContext += `\n\nNow ask the next appropriate question based on the progress above.`;
    }

    return [
      { role: "user", content: systemContext },
      {
        role: "assistant",
        content: projectOverview
          ? `Understood. I will conduct this interview about "${projectOverview}" and will customize every question to reference this specific project.`
          : "Understood. I will conduct this structured interview following the categories and questions defined.",
      },
      {
        role: "user",
        content:
          previousAnswers.length === 0
            ? projectOverview
              ? `Begin the interview by asking the first question about "${projectOverview}". Remember to rewrite the question to reference this specific project.`
              : "Begin the interview by asking the first question."
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
      content:
        "Understood. I will help guide the planning process and signal when a step is complete.",
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

export function buildGapAnalysisAssessmentPrompt(
  projectDescription: string,
  hasExistingRequirements: string,
): Message[] {
  const systemContext = `You are Sherpy, an expert PM planning assistant. Your task is to assess whether a gap analysis is needed for this project.

**Gap Analysis Decision Rules:**

1. **SKIP gap analysis (needsGapAnalysis: false) when:**
   - User is building from scratch (greenfield project)
   - User explicitly says "new project", "starting from scratch", "build from nothing"
   - No mention of existing documentation, requirements, or PRDs
   - Project description focuses on "what to build" rather than "what we have"
   - User says they DON'T have requirements/docs

2. **RUN gap analysis (needsGapAnalysis: true) when:**
   - User mentions having existing requirements, PRDs, documentation
   - User explicitly says "I have" or "we have" when talking about docs
   - Project involves migration, refactoring, or replacing existing systems
   - User mentions analyzing existing artifacts
   - User says they HAVE requirements/docs

**Confidence Levels:**
- "high": Clear indicators from user input (explicit statements)
- "medium": Reasonable inference from context (implied by project type)
- "low": Ambiguous or unclear from input (could go either way)

**Response Format:**
You must respond with a JSON object containing:
{
  "needsGapAnalysis": boolean,
  "reasoning": string (1-2 sentences explaining why),
  "confidence": "high" | "medium" | "low"
}

**Examples:**

Input: "Build a todo list app from scratch"
→ {"needsGapAnalysis": false, "reasoning": "User is building from scratch with no mention of existing requirements.", "confidence": "high"}

Input: "I have PRD documents for a payment system migration"
→ {"needsGapAnalysis": true, "reasoning": "User explicitly has existing PRD documents that need gap analysis.", "confidence": "high"}

Input: "Create a mobile fitness tracker"
→ {"needsGapAnalysis": false, "reasoning": "Greenfield project with no indication of existing requirements.", "confidence": "high"}

Input: "Refactor our authentication system"
→ {"needsGapAnalysis": true, "reasoning": "Refactoring existing system likely requires analyzing current state vs. desired state.", "confidence": "medium"}`;

  const userContext = `Project Description: "${projectDescription}"

Has Existing Requirements Response: "${hasExistingRequirements}"

Based on the above, assess whether gap analysis is needed. Respond with a JSON object only.`;

  return [
    { role: "user", content: systemContext },
    {
      role: "assistant",
      content:
        "Understood. I will assess whether gap analysis is needed based on the decision rules.",
    },
    { role: "user", content: userContext },
  ];
}
