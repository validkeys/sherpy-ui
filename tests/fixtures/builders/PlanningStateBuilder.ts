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

    if (stepNumber === 4) {
      const artifact = this.generateStyleAnchorsArtifact();
      if (!this.state.artifacts) {
        this.state.artifacts = {};
      }
      this.state.artifacts[4] = artifact;
      return this;
    }

    if (stepNumber === 5) {
      this.state.step5Responses = {
        approach: "incremental",
        testStrategy: "TDD with integration tests",
        deploymentStrategy: "CI/CD with automated testing",
      };
      const artifact = this.generateImplementationPlanArtifact();
      if (!this.state.artifacts) {
        this.state.artifacts = {};
      }
      this.state.artifacts[5] = artifact;
      return this;
    }

    if (stepNumber === 6) {
      const artifact = this.generateQATestPlanArtifact();
      if (!this.state.artifacts) {
        this.state.artifacts = {};
      }
      this.state.artifacts[6] = artifact;
      return this;
    }

    if (stepNumber === 7) {
      this.state.step7Edits = null;
      const artifact = this.generateArchitectureDecisionsArtifact();
      if (!this.state.artifacts) {
        this.state.artifacts = {};
      }
      this.state.artifacts[7] = artifact;
      return this;
    }

    if (stepNumber === 8) {
      const artifact = this.generateDeliveryTimelineArtifact();
      if (!this.state.artifacts) {
        this.state.artifacts = {};
      }
      this.state.artifacts[8] = artifact;
      return this;
    }

    if (stepNumber === 9) {
      const artifact = this.generateDefinitionOfDoneArtifact();
      if (!this.state.artifacts) {
        this.state.artifacts = {};
      }
      this.state.artifacts[9] = artifact;
      return this;
    }

    if (stepNumber === 10) {
      const artifact = this.generateExecutiveSummaryArtifact();
      if (!this.state.artifacts) {
        this.state.artifacts = {};
      }
      this.state.artifacts[10] = artifact;
      return this;
    }

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
        (answer, _index) =>
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
        (answer, _index) =>
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

  /**
   * Generate Style Anchors artifact for Step 4
   */
  private generateStyleAnchorsArtifact(): Artifact {
    const content = `# Style Anchors Collection

## Metadata
generated_at: "${new Date().toISOString()}"
project_type: "healthcare_patient_portal"

## Code Examples

### React Component Pattern
\`\`\`typescript
// Preferred: Functional component with TypeScript
interface PatientCardProps {
  patientId: string;
  onSelect: (id: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patientId, onSelect }) => {
  return (
    <div className="patient-card" onClick={() => onSelect(patientId)}>
      {/* Component content */}
    </div>
  );
};
\`\`\`

### State Management Pattern
\`\`\`typescript
// Preferred: XState for complex workflows
import { createMachine } from 'xstate';

export const appointmentMachine = createMachine({
  id: 'appointment',
  initial: 'idle',
  states: {
    idle: {
      on: { SCHEDULE: 'scheduling' }
    },
    scheduling: {
      on: { SUCCESS: 'scheduled', ERROR: 'error' }
    }
  }
});
\`\`\`

## Summary
Style anchors collected for healthcare patient portal application using React, TypeScript, and XState patterns.
`;

    return {
      type: "yaml",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Implementation Plan artifact for Step 5
   */
  private generateImplementationPlanArtifact(): Artifact {
    const content = `# Implementation Plan

## Metadata
generated_at: "${new Date().toISOString()}"
approach: "${this.state.step5Responses?.approach || "incremental"}"
test_strategy: "${this.state.step5Responses?.testStrategy || "TDD"}"

## Milestones

### Milestone 1: Core Infrastructure (Week 1-2)
- Set up project structure
- Configure CI/CD pipeline
- Implement authentication system
- **Definition of Done:** All infrastructure tests pass, deployment automated

### Milestone 2: Patient Portal (Week 3-4)
- Build patient dashboard
- Implement appointment scheduling UI
- Add secure messaging interface
- **Definition of Done:** UI components functional, unit tests pass

### Milestone 3: Integration (Week 5-6)
- Integrate with EHR system
- Implement data synchronization
- Add audit logging
- **Definition of Done:** Integration tests pass, HIPAA compliance verified

### Milestone 4: Testing & Launch (Week 7-8)
- Conduct QA testing
- Perform security audit
- Deploy to production
- **Definition of Done:** All acceptance criteria met, production stable

## Risk Mitigation
- HIPAA compliance: Engage security consultant early
- EHR integration: Start API testing in Milestone 1
- Performance: Load testing during Milestone 3

## Summary
Implementation plan with 4 milestones over 8 weeks, TDD approach, incremental delivery strategy.
`;

    return {
      type: "yaml",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate QA Test Plan artifact for Step 6
   */
  private generateQATestPlanArtifact(): Artifact {
    const content = `# QA Test Plan

## Metadata
generated_at: "${new Date().toISOString()}"
test_types: ["functional", "integration", "security", "performance"]

## Test Suites

### Functional Tests
- User authentication flow
- Appointment scheduling workflow
- Secure messaging functionality
- Patient data display

### Integration Tests
- EHR system integration
- Email notification system
- Calendar synchronization
- Data export functionality

### Security Tests
- HIPAA compliance validation
- Authentication/authorization checks
- Data encryption verification
- Audit log completeness

### Performance Tests
- Load testing (10,000+ concurrent users)
- Response time benchmarks
- Database query optimization
- API endpoint performance

## Test Coverage Goals
- Unit tests: 80%+
- Integration tests: 70%+
- E2E tests: Critical paths only

## Summary
Comprehensive QA test plan covering functional, integration, security, and performance testing for healthcare patient portal.
`;

    return {
      type: "yaml",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Architecture Decisions artifact for Step 7
   */
  private generateArchitectureDecisionsArtifact(): Artifact {
    const content = `# Architecture Decision Records

## ADR-001: Use React for Frontend Framework

**Status:** Accepted

**Context:** Need to choose frontend framework for patient portal with complex UI interactions.

**Decision:** Use React with TypeScript for type safety and component reusability.

**Consequences:**
- Large ecosystem of libraries and tools
- Team expertise readily available
- Strong TypeScript integration

---

## ADR-002: Use XState for State Management

**Status:** Accepted

**Context:** Complex multi-step workflows (appointment scheduling, interview flows) require robust state management.

**Decision:** Use XState for complex workflows, React Context for simpler state.

**Consequences:**
- Explicit state machine definitions prevent bugs
- Visual state charts aid debugging
- Learning curve for team

---

## ADR-003: PostgreSQL for Primary Database

**Status:** Accepted

**Context:** Need HIPAA-compliant, ACID-compliant database for patient data.

**Decision:** Use PostgreSQL with row-level security and audit logging.

**Consequences:**
- Strong ACID guarantees
- Excellent performance for healthcare workloads
- Mature ecosystem and tooling

---

## Summary
Three architecture decisions documented covering frontend framework, state management, and database selection.
`;

    return {
      type: "markdown",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Delivery Timeline artifact for Step 8
   */
  private generateDeliveryTimelineArtifact(): Artifact {
    const content = `# Delivery Timeline

## Metadata
generated_at: "${new Date().toISOString()}"
total_duration: "8 weeks"
team_size: "5-7 engineers"

## Timeline

### Phase 1: Foundation (Weeks 1-2)
**Start:** 2026-05-20
**End:** 2026-06-03

Deliverables:
- Project infrastructure setup
- CI/CD pipeline operational
- Authentication system implemented
- Development environment configured

**Milestone:** Core Infrastructure Complete

---

### Phase 2: Core Features (Weeks 3-4)
**Start:** 2026-06-04
**End:** 2026-06-17

Deliverables:
- Patient dashboard UI
- Appointment scheduling system
- Secure messaging interface
- Basic EHR integration

**Milestone:** Patient Portal Functional

---

### Phase 3: Integration & Testing (Weeks 5-6)
**Start:** 2026-06-18
**End:** 2026-07-01

Deliverables:
- Full EHR integration
- Data synchronization
- Audit logging system
- Integration test suite

**Milestone:** Integration Complete

---

### Phase 4: Launch Preparation (Weeks 7-8)
**Start:** 2026-07-02
**End:** 2026-07-15

Deliverables:
- QA testing complete
- Security audit passed
- Performance optimization
- Production deployment

**Milestone:** Production Launch

## Summary
8-week delivery timeline with 4 phases, culminating in production launch on 2026-07-15.
`;

    return {
      type: "yaml",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Definition of Done artifact for Step 9
   */
  private generateDefinitionOfDoneArtifact(): Artifact {
    const content = `# Definition of Done

## Metadata
generated_at: "${new Date().toISOString()}"

## Acceptance Criteria

### Code Quality
- [ ] All code reviewed and approved
- [ ] TypeScript strict mode enabled
- [ ] No linting errors
- [ ] Code coverage ≥ 80%

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass for critical paths
- [ ] Manual QA testing complete

### Security
- [ ] HIPAA compliance verified
- [ ] Security audit passed
- [ ] Penetration testing complete
- [ ] Vulnerability scan clean

### Performance
- [ ] Load testing passed (10,000+ users)
- [ ] Response times < 200ms (p95)
- [ ] Database queries optimized
- [ ] CDN configured for static assets

### Documentation
- [ ] API documentation complete
- [ ] User guide written
- [ ] Deployment runbook created
- [ ] Architecture diagrams updated

### Deployment
- [ ] CI/CD pipeline verified
- [ ] Rollback procedure tested
- [ ] Monitoring and alerting configured
- [ ] Production environment validated

## Exit Checklist
- [ ] All acceptance criteria met
- [ ] Stakeholder sign-off received
- [ ] Production deployment successful
- [ ] Post-launch monitoring active

## Summary
Comprehensive definition of done covering code quality, testing, security, performance, documentation, and deployment criteria.
`;

    return {
      type: "yaml",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Executive Summary artifact for Step 10
   */
  private generateExecutiveSummaryArtifact(): Artifact {
    const content = `# Executive Summary: Healthcare Patient Portal

## Project Overview
A modern web-based patient portal enabling appointment scheduling and secure messaging between patients and healthcare providers.

## Business Goals
- **Primary Objective:** Improve patient engagement and reduce administrative burden
- **Target Users:** Patients seeking appointments and secure provider communication
- **Success Metrics:** 50% reduction in phone calls, 80% patient adoption within 6 months

## Technical Approach
- **Frontend:** React + TypeScript for type-safe, maintainable UI
- **State Management:** XState for complex workflows
- **Backend:** Node.js with PostgreSQL database
- **Infrastructure:** AWS deployment with CI/CD automation
- **Security:** HIPAA-compliant with end-to-end encryption and MFA

## Delivery Timeline
- **Duration:** 8 weeks
- **Phase 1:** Foundation (Weeks 1-2)
- **Phase 2:** Core Features (Weeks 3-4)
- **Phase 3:** Integration & Testing (Weeks 5-6)
- **Phase 4:** Launch Preparation (Weeks 7-8)
- **Target Launch:** 2026-07-15

## Key Risks & Mitigation
- **HIPAA Compliance:** Early security consultant engagement
- **EHR Integration:** API testing starts in Phase 1
- **Performance:** Load testing during Phase 3
- **Adoption:** User training and support plan

## Resource Requirements
- **Team Size:** 5-7 engineers
- **External Dependencies:** EHR system API access, security audit vendor
- **Budget:** Standard healthcare application development costs

## Expected Outcomes
✓ Reduced administrative phone call volume by 50%
✓ Improved patient satisfaction scores
✓ Streamlined appointment scheduling process
✓ Enhanced provider-patient communication
✓ HIPAA-compliant secure messaging platform

## Recommendation
**Proceed with project as planned.** The technical approach is sound, timeline is realistic, and business case is strong. Early focus on security and compliance will ensure successful deployment.

---

*Generated: ${new Date().toISOString()}*
`;

    return {
      type: "markdown",
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  build(): PlanningContext {
    this.validate();
    return this.state as PlanningContext;
  }

  /**
   * Persist state to localStorage via seed API (for E2E tests)
   *
   * @returns projectId that can be used to navigate to the project
   *
   * @example
   * ```typescript
   * const projectId = await PlanningStateBuilder.atStep(5).persist();
   * await page.goto(`/project/${projectId}/build`);
   * ```
   */
  async persist(): Promise<string> {
    // Validate and build state
    const state = this.build();

    // Call seed API to persist state
    const baseUrl = process.env.BASE_URL || "http://localhost:5180";
    const response = await fetch(`${baseUrl}/api/dev/seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        step: state.currentStepNumber,
        projectName: state.projectId,
        snapshot: {
          status: "active",
          value: `step${state.currentStepNumber}`,
          context: state,
          children: {},
          historyValue: {},
          tags: [],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to persist state: ${errorData.error || response.statusText}`,
      );
    }

    const data = await response.json();

    // Note: The /api/dev/seed endpoint handles localStorage persistence
    // No need to set localStorage here as this runs in Node.js context

    return data.projectId;
  }

  /**
   * Validate state consistency before building
   * Ensures invalid states cannot be constructed
   */
  private validate(): void {
    const currentStep = this.state.currentStepNumber ?? 1;
    const completed = this.state.completedSteps ?? [];
    const artifacts = this.state.artifacts ?? {};

    // Rule 1: Cannot be at step N without completing all steps 1 to N-1
    const requiredCompletedSteps = Array.from(
      { length: currentStep - 1 },
      (_, i) => i + 1,
    );
    const missingSteps = requiredCompletedSteps.filter(
      (step) => !completed.includes(step),
    );

    if (missingSteps.length > 0) {
      const stepList = missingSteps.join(", ");
      throw new Error(
        `Cannot be at step ${currentStep} without completing steps ${stepList}`,
      );
    }

    // Rule 2: Each completed step must have corresponding artifact
    for (const stepNumber of completed) {
      if (!artifacts[stepNumber]) {
        throw new Error(
          `Step ${stepNumber} is marked complete but has no artifact. Use completeStep(${stepNumber}) or withArtifact(${stepNumber}, artifact)`,
        );
      }
    }

    // Rule 3: Step 2 specific validation
    if (completed.includes(2) && this.state.step2Answers?.length === 0) {
      throw new Error(
        "Step 2 is marked complete but has no answers. Use withBusinessRequirements() or withStep2Answers()",
      );
    }

    // Rule 4: Step 3 specific validation
    if (completed.includes(3) && this.state.step3Answers?.length === 0) {
      throw new Error(
        "Step 3 is marked complete but has no answers. Use withTechnicalRequirements() or withStep3Answers()",
      );
    }

    // Rule 5: Step 1 specific validation
    if (completed.includes(1)) {
      const step1Responses = this.state.step1Responses ?? {};
      if (Object.keys(step1Responses).length === 0) {
        throw new Error(
          "Step 1 is marked complete but has no responses. Use withGapAnalysis() or withStep1Responses()",
        );
      }
    }

    // Rule 6: Step 5 specific validation
    if (completed.includes(5)) {
      const step5Responses = this.state.step5Responses ?? {};
      if (Object.keys(step5Responses).length === 0) {
        throw new Error(
          "Step 5 is marked complete but has no responses. Use completeStep(5) or withStep5Responses()",
        );
      }
    }
  }
}
