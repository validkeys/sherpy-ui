/**
 * Test fixture builder for PlanningContext state
 * Enables testing workflow steps without completing previous steps
 */

import type {
  Artifact,
  InterviewAnswer,
  PlanningContext,
} from "../../../src/features/planning/machines/types";
import {
  InterviewAnswerSchema,
  Step1ResponsesSchema,
  type ValidatedInterviewAnswer,
  type ValidatedStep1Responses,
} from "../validation";

export class PlanningStateBuilder {
  private state: Partial<PlanningContext>;

  private constructor(initialState: Partial<PlanningContext> = {}) {
    this.state = initialState;
  }

  static new(): PlanningStateBuilder {
    const now = new Date().toISOString();
    return new PlanningStateBuilder({
      projectId: "test-project",
      entryPath: "new-project",
      startedAt: now,
      updatedAt: now,
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber: 1,
      error: null,
    });
  }

  static atStep(stepNumber: number): PlanningStateBuilder {
    const builder = PlanningStateBuilder.new();
    builder.state.currentStepNumber = stepNumber;
    builder.state.completedSteps = Array.from(
      { length: stepNumber - 1 },
      (_, i) => i + 1,
    );
    return builder;
  }

  withProjectId(projectId: string): PlanningStateBuilder {
    this.state.projectId = projectId;
    return this;
  }

  withEntryPath(
    entryPath: "new-project" | "existing-project",
  ): PlanningStateBuilder {
    this.state.entryPath = entryPath;
    return this;
  }

  withStep1Responses(responses: Record<string, string>): PlanningStateBuilder {
    this.state.step1Responses = responses;
    return this;
  }

  withStep2Answers(answers: InterviewAnswer[]): PlanningStateBuilder {
    this.state.step2Answers = answers;
    return this;
  }

  withStep2CurrentQuestion(
    question: string | null,
    options: string[] | null = null,
  ): PlanningStateBuilder {
    this.state.step2CurrentQuestion = question;
    this.state.step2CurrentOptions = options;
    return this;
  }

  withStep3Answers(answers: InterviewAnswer[]): PlanningStateBuilder {
    this.state.step3Answers = answers;
    return this;
  }

  withStep3CurrentQuestion(
    question: string | null,
    options: string[] | null = null,
  ): PlanningStateBuilder {
    this.state.step3CurrentQuestion = question;
    this.state.step3CurrentOptions = options;
    return this;
  }

  withStep5Responses(responses: Record<string, string>): PlanningStateBuilder {
    this.state.step5Responses = responses;
    return this;
  }

  withStep7Edits(edits: string | null): PlanningStateBuilder {
    this.state.step7Edits = edits;
    return this;
  }

  withArtifact(stepNumber: number, artifact: Artifact): PlanningStateBuilder {
    if (!this.state.artifacts) {
      this.state.artifacts = {};
    }
    this.state.artifacts[stepNumber] = artifact;
    return this;
  }

  withCompletedSteps(steps: number[]): PlanningStateBuilder {
    this.state.completedSteps = steps;
    return this;
  }

  withCurrentStepNumber(stepNumber: number): PlanningStateBuilder {
    this.state.currentStepNumber = stepNumber;
    return this;
  }

  withError(error: string | null): PlanningStateBuilder {
    this.state.error = error;
    return this;
  }

  /**
   * Populate Step 1 (Gap Analysis) responses and generate artifact
   * @param responses Step 1 form responses (validated with Zod)
   */
  withGapAnalysis(responses: ValidatedStep1Responses): PlanningStateBuilder {
    const validated = Step1ResponsesSchema.parse(responses);
    this.state.step1Responses = validated;

    const artifact = this.generateGapAnalysisArtifact(validated);
    if (!this.state.artifacts) {
      this.state.artifacts = {};
    }
    this.state.artifacts[1] = artifact;

    return this;
  }

  /**
   * Populate Step 2 (Business Requirements) answers and generate artifact
   * @param answers Step 2 interview answers (validated with Zod)
   */
  withBusinessRequirements(
    answers: ValidatedInterviewAnswer[],
  ): PlanningStateBuilder {
    const validated = answers.map((answer) =>
      InterviewAnswerSchema.parse(answer),
    );
    this.state.step2Answers = validated;

    const artifact = this.generateBusinessReqsArtifact(validated);
    if (!this.state.artifacts) {
      this.state.artifacts = {};
    }
    this.state.artifacts[2] = artifact;

    return this;
  }

  /**
   * Populate Step 3 (Technical Requirements) answers and generate artifact
   * @param answers Step 3 interview answers (validated with Zod)
   */
  withTechnicalRequirements(
    answers: ValidatedInterviewAnswer[],
  ): PlanningStateBuilder {
    const validated = answers.map((answer) =>
      InterviewAnswerSchema.parse(answer),
    );
    this.state.step3Answers = validated;

    const artifact = this.generateTechnicalReqsArtifact(validated);
    if (!this.state.artifacts) {
      this.state.artifacts = {};
    }
    this.state.artifacts[3] = artifact;

    return this;
  }

  /**
   * Complete a step with default data
   * @param stepNumber Step to complete (1-10)
   */
  completeStep(stepNumber: number): PlanningStateBuilder {
    if (stepNumber === 1) {
      return this.withGapAnalysis({
        existingRequirements: "No",
        projectDescription:
          "Healthcare patient portal with appointment scheduling and secure messaging",
      });
    }

    if (stepNumber === 2) {
      return this.withBusinessRequirements([
        {
          question: "What is the primary business goal for this project?",
          value:
            "Improve patient engagement and reduce administrative burden on healthcare staff",
          timestamp: "2026-05-14T10:00:00.000Z",
        },
        {
          question: "Who are the primary users of this system?",
          value:
            "Patients seeking appointments and secure communication with their healthcare providers",
          timestamp: "2026-05-14T10:05:00.000Z",
        },
        {
          question: "What are the key success metrics?",
          value:
            "50% reduction in phone calls for appointment scheduling, 80% patient adoption within 6 months",
          timestamp: "2026-05-14T10:10:00.000Z",
        },
      ]);
    }

    if (stepNumber === 3) {
      return this.withTechnicalRequirements([
        {
          question: "What are the technical constraints for this project?",
          value:
            "Must comply with HIPAA, integrate with existing EHR system, support 10,000+ concurrent users",
          timestamp: "2026-05-14T11:00:00.000Z",
        },
        {
          question: "What is the preferred technology stack?",
          value:
            "React + TypeScript frontend, Node.js backend, PostgreSQL database, deployed on AWS",
          timestamp: "2026-05-14T11:05:00.000Z",
        },
        {
          question: "What are the security requirements?",
          value:
            "End-to-end encryption for messages, MFA authentication, audit logging for all data access",
          timestamp: "2026-05-14T11:10:00.000Z",
        },
      ]);
    }

    // TODO: Implement other steps in future tasks
    throw new Error(`completeStep not yet implemented for step ${stepNumber}`);
  }

  /**
   * Generate Gap Analysis artifact from Step 1 responses
   */
  private generateGapAnalysisArtifact(
    responses: ValidatedStep1Responses,
  ): Artifact {
    const content = `# Gap Analysis Worksheet

## Project Overview
${responses.projectDescription}

## Existing Requirements
**Do you have existing requirements?** ${responses.existingRequirements}

## Gap Analysis
Based on the information provided, this is a ${responses.existingRequirements === "No" ? "new project" : "project with existing requirements"} that requires comprehensive planning.

${
  responses.existingRequirements === "No"
    ? "**Next Steps:**\n- Conduct business requirements interview\n- Define technical requirements\n- Establish project scope and constraints"
    : "**Next Steps:**\n- Review existing documentation\n- Identify gaps in current requirements\n- Supplement with additional requirements gathering"
}
`;

    return {
      type: "markdown",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Business Requirements artifact from Step 2 answers
   */
  private generateBusinessReqsArtifact(
    answers: ValidatedInterviewAnswer[],
  ): Artifact {
    const qaSection = answers
      .map(
        (answer, index) =>
          `  - question: "${answer.question}"\n    answer: "${answer.value}"\n    timestamp: "${answer.timestamp}"`,
      )
      .join("\n");

    const content = `# Business Requirements

## Metadata
generated_at: "${new Date().toISOString()}"
total_questions: ${answers.length}

## Interview Responses
responses:
${qaSection}

## Summary
Business requirements captured through ${answers.length} interview questions covering project goals, user needs, and success criteria.
`;

    return {
      type: "yaml",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Technical Requirements artifact from Step 3 answers
   */
  private generateTechnicalReqsArtifact(
    answers: ValidatedInterviewAnswer[],
  ): Artifact {
    const qaSection = answers
      .map(
        (answer, index) =>
          `  - question: "${answer.question}"\n    answer: "${answer.value}"\n    timestamp: "${answer.timestamp}"`,
      )
      .join("\n");

    const content = `# Technical Requirements

## Metadata
generated_at: "${new Date().toISOString()}"
total_questions: ${answers.length}

## Interview Responses
responses:
${qaSection}

## Summary
Technical requirements captured through ${answers.length} interview questions covering constraints, technology stack, and security requirements.
`;

    return {
      type: "yaml",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  build(): PlanningContext {
    return this.state as PlanningContext;
  }
}
