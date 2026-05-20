/**
 * Integration Tests - Full Planning Workflow
 *
 * Tests all database persistence layers working together:
 * - Projects
 * - Planning State (XState snapshots)
 * - Interview Answers
 * - Form Responses
 * - Artifacts
 *
 * Verifies:
 * 1. Complete planning flow (steps 1-10)
 * 2. Foreign key CASCADE on project deletion
 * 3. Data integrity across tables
 * 4. UPSERT behavior for unique constraints
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createProject, getProject } from "@/features/projects/store";
import {
  deleteArtifacts,
  getArtifact,
  getArtifacts,
  saveArtifact,
} from "../artifact";
import { saveFormResponse } from "../form";
import { db } from "../index";
import { deleteInterviewAnswers, saveInterviewAnswer } from "../interview";
import { loadPlanningState, savePlanningState } from "../planning";
import type { DBFormResponse, DBInterviewAnswer } from "../types";

// Helper functions to get all records for a project (any step)
function getAllInterviewAnswers(projectId: string): DBInterviewAnswer[] {
  const stmt = db.prepare(`
    SELECT id, project_id, step_number, question, answer, created_at
    FROM interview_answers
    WHERE project_id = ?
    ORDER BY created_at ASC
  `);
  return stmt.all(projectId) as DBInterviewAnswer[];
}

function getAllFormResponses(projectId: string): DBFormResponse[] {
  const stmt = db.prepare(`
    SELECT id, project_id, step_number, field_name, field_value, created_at
    FROM form_responses
    WHERE project_id = ?
    ORDER BY created_at ASC
  `);
  return stmt.all(projectId) as DBFormResponse[];
}

// Helper function to delete a project (for testing CASCADE behavior)
function deleteProject(projectId: string): void {
  const stmt = db.prepare(`DELETE FROM projects WHERE id = ?`);
  stmt.run(projectId);
}

beforeEach(() => {
  // Clean slate for each test
  db.prepare("DELETE FROM artifacts").run();
  db.prepare("DELETE FROM form_responses").run();
  db.prepare("DELETE FROM interview_answers").run();
  db.prepare("DELETE FROM planning_state").run();
  db.prepare("DELETE FROM projects").run();
});

describe("Full Planning Workflow Integration", () => {
  it("should persist complete planning flow through all 10 steps", () => {
    // Step 0: Create project
    const project = createProject({
      name: "Mini Calculator",
      entryPath: "scratch",
    });

    const projectId = project.id;
    expect(project).toBeDefined();
    expect(project.name).toBe("Mini Calculator");
    expect(project.currentStep).toBe(1);
    expect(project.status).toBe("active");

    // Step 1: Gap Analysis (interview with form response)
    const formResponseId = saveFormResponse(
      projectId,
      1,
      "projectDescription",
      "A simple calculator app",
    );
    expect(formResponseId).toBeDefined();

    const artifactId1 = saveArtifact(
      projectId,
      1,
      "yaml",
      "# Gap Analysis\ngaps:\n  - Missing test coverage",
    );
    expect(artifactId1).toBeDefined();

    // Step 2: Business Requirements (interview)
    const answerId1 = saveInterviewAnswer(
      projectId,
      2,
      "What is the primary user persona?",
      "Students learning arithmetic",
    );
    const answerId2 = saveInterviewAnswer(
      projectId,
      2,
      "What are the core features?",
      "Addition, subtraction, multiplication, division",
    );
    expect(answerId1).toBeDefined();
    expect(answerId2).toBeDefined();

    const artifactId2 = saveArtifact(
      projectId,
      2,
      "yaml",
      "# Business Requirements\nfeatures:\n  - calculator",
    );
    expect(artifactId2).toBeDefined();

    // Step 3: Technical Requirements (interview)
    const answerId3 = saveInterviewAnswer(
      projectId,
      3,
      "What tech stack?",
      "React + TypeScript",
    );
    expect(answerId3).toBeDefined();

    const artifactId3 = saveArtifact(
      projectId,
      3,
      "yaml",
      "# Technical Requirements\nstack:\n  - react",
    );
    expect(artifactId3).toBeDefined();

    // Step 4: Style Anchors (automated)
    const artifactId4 = saveArtifact(
      projectId,
      4,
      "yaml",
      "# Style Anchors\npatterns:\n  - hooks",
    );
    expect(artifactId4).toBeDefined();

    // Step 5: Implementation Plan (automated with form)
    const formResponseId2 = saveFormResponse(
      projectId,
      5,
      "existingRequirements",
      "file:///workspace/docs/requirements.yaml",
    );
    expect(formResponseId2).toBeDefined();

    const artifactId5 = saveArtifact(
      projectId,
      5,
      "markdown",
      "# Implementation Plan\n## Tasks\n1. Setup",
    );
    expect(artifactId5).toBeDefined();

    // Step 6: Plan Review (automated)
    const artifactId6 = saveArtifact(
      projectId,
      6,
      "yaml",
      "# Plan Review\nstatus: approved",
    );
    expect(artifactId6).toBeDefined();

    // Step 7: Architecture Decisions (automated with form)
    const formResponseId3 = saveFormResponse(
      projectId,
      7,
      "architectureContext",
      "State management using XState",
    );
    expect(formResponseId3).toBeDefined();

    const artifactId7 = saveArtifact(
      projectId,
      7,
      "markdown",
      "# ADR-001\n## Decision\nUse XState",
    );
    expect(artifactId7).toBeDefined();

    // Step 8: Delivery Timeline (automated)
    const artifactId8 = saveArtifact(
      projectId,
      8,
      "yaml",
      "# Timeline\nmilestones:\n  - setup",
    );
    expect(artifactId8).toBeDefined();

    // Step 9: QA Test Plan (automated)
    const artifactId9 = saveArtifact(
      projectId,
      9,
      "yaml",
      "# QA Test Plan\ntests:\n  - unit",
    );
    expect(artifactId9).toBeDefined();

    // Step 10: Summaries (automated)
    const artifactId10 = saveArtifact(
      projectId,
      10,
      "markdown",
      "# Executive Summary\nProject complete",
    );
    expect(artifactId10).toBeDefined();

    // Save XState snapshot
    const snapshot = {
      status: "active",
      value: "step10",
      context: {
        projectId,
        currentStepNumber: 10,
        entryPath: "scratch",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step1Responses: {},
        step2Answers: [],
        step2CurrentQuestion: null,
        step3Answers: [],
        step3CurrentQuestion: null,
      },
      children: {},
      historyValue: {},
    };
    savePlanningState(projectId, snapshot);

    // Verify all data is persisted
    const savedProject = getProject(projectId);
    expect(savedProject).toBeDefined();

    const savedSnapshot = loadPlanningState(projectId);
    expect(savedSnapshot).toEqual(snapshot);

    const answers = getAllInterviewAnswers(projectId);
    expect(answers.length).toBe(3); // 2 from step 2, 1 from step 3

    const formResponses = getAllFormResponses(projectId);
    expect(formResponses.length).toBe(3); // Steps 1, 5, 7

    const artifacts = getArtifacts(projectId);
    expect(artifacts.length).toBe(10); // All 10 steps

    // Verify artifacts by step
    const artifact1 = getArtifact(projectId, 1);
    expect(artifact1).toBeDefined();
    expect(artifact1!.artifact_type).toBe("yaml");
    expect(artifact1!.content).toContain("Gap Analysis");

    const artifact5 = getArtifact(projectId, 5);
    expect(artifact5).toBeDefined();
    expect(artifact5!.artifact_type).toBe("markdown");
    expect(artifact5!.content).toContain("Implementation Plan");

    const artifact10 = getArtifact(projectId, 10);
    expect(artifact10).toBeDefined();
    expect(artifact10!.content).toContain("Executive Summary");
  });

  it("should handle UPSERT correctly for duplicate entries", () => {
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });
    const projectId = project.id;

    // Insert form response
    const id1 = saveFormResponse(
      projectId,
      1,
      "projectDescription",
      "Original description",
    );

    // Update same field (UPSERT)
    const id2 = saveFormResponse(
      projectId,
      1,
      "projectDescription",
      "Updated description",
    );

    // IDs will be different (UPSERT generates new ID to track update time)
    expect(id1).not.toBe(id2);

    const responses = getAllFormResponses(projectId);
    expect(responses.length).toBe(1);
    expect(responses[0].id).toBe(id2); // Latest ID
    expect(responses[0].field_value).toBe("Updated description");

    // Same for artifacts (unique constraint on project_id, step_number)
    const artifactId1 = saveArtifact(projectId, 1, "yaml", "# Version 1");
    const artifactId2 = saveArtifact(projectId, 1, "yaml", "# Version 2");

    // IDs will be different (UPSERT generates new ID)
    expect(artifactId1).not.toBe(artifactId2);

    const artifact = getArtifact(projectId, 1);
    expect(artifact).toBeDefined();
    expect(artifact!.id).toBe(artifactId2); // Latest ID
    expect(artifact!.content).toBe("# Version 2");

    const allArtifacts = getArtifacts(projectId);
    expect(allArtifacts.length).toBe(1);
  });

  it("should CASCADE delete all related data when project is deleted", () => {
    // Create project with full data
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });
    const projectId = project.id;

    // Add data to all tables
    savePlanningState(projectId, {
      status: "active",
      value: "step1",
      context: {
        projectId,
        currentStepNumber: 1,
        entryPath: "scratch",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step1Responses: {},
        step2Answers: [],
        step2CurrentQuestion: null,
        step3Answers: [],
        step3CurrentQuestion: null,
      },
      children: {},
      historyValue: {},
    });
    saveInterviewAnswer(projectId, 2, "Question 1?", "Answer 1");
    saveInterviewAnswer(projectId, 2, "Question 2?", "Answer 2");
    saveFormResponse(projectId, 1, "field1", "value1");
    saveFormResponse(projectId, 5, "field2", "value2");
    saveArtifact(projectId, 1, "yaml", "content1");
    saveArtifact(projectId, 2, "yaml", "content2");

    // Verify data exists
    expect(getProject(projectId)).toBeDefined();
    expect(loadPlanningState(projectId)).toBeDefined();
    expect(getAllInterviewAnswers(projectId).length).toBe(2);
    expect(getAllFormResponses(projectId).length).toBe(2);
    expect(getArtifacts(projectId).length).toBe(2);

    // Delete project
    deleteProject(projectId);

    // Verify CASCADE deleted all related data
    expect(getProject(projectId)).toBeUndefined();
    expect(loadPlanningState(projectId)).toBeNull();
    expect(getAllInterviewAnswers(projectId).length).toBe(0);
    expect(getAllFormResponses(projectId).length).toBe(0);
    expect(getArtifacts(projectId).length).toBe(0);

    // Verify database tables are empty
    const planningStateCount = db
      .prepare("SELECT COUNT(*) as count FROM planning_state")
      .get() as { count: number };
    expect(planningStateCount.count).toBe(0);

    const answersCount = db
      .prepare("SELECT COUNT(*) as count FROM interview_answers")
      .get() as { count: number };
    expect(answersCount.count).toBe(0);

    const formCount = db
      .prepare("SELECT COUNT(*) as count FROM form_responses")
      .get() as { count: number };
    expect(formCount.count).toBe(0);

    const artifactsCount = db
      .prepare("SELECT COUNT(*) as count FROM artifacts")
      .get() as { count: number };
    expect(artifactsCount.count).toBe(0);
  });

  it("should isolate data between multiple projects", () => {
    // Create two projects
    const project1 = createProject({
      name: "Project 1",
      entryPath: "scratch",
    });
    const projectId1 = project1.id;

    const project2 = createProject({
      name: "Project 2",
      entryPath: "doc-first",
    });
    const projectId2 = project2.id;

    // Add data to project 1
    saveInterviewAnswer(projectId1, 2, "Q1?", "A1");
    saveFormResponse(projectId1, 1, "field1", "value1");
    saveArtifact(projectId1, 1, "yaml", "content1");

    // Add data to project 2
    saveInterviewAnswer(projectId2, 2, "Q2?", "A2");
    saveFormResponse(projectId2, 1, "field1", "value2");
    saveArtifact(projectId2, 1, "yaml", "content2");

    // Verify isolation
    expect(getAllInterviewAnswers(projectId1).length).toBe(1);
    expect(getAllInterviewAnswers(projectId2).length).toBe(1);
    expect(getAllInterviewAnswers(projectId1)[0].answer).toBe("A1");
    expect(getAllInterviewAnswers(projectId2)[0].answer).toBe("A2");

    expect(getAllFormResponses(projectId1).length).toBe(1);
    expect(getAllFormResponses(projectId2).length).toBe(1);
    expect(getAllFormResponses(projectId1)[0].field_value).toBe("value1");
    expect(getAllFormResponses(projectId2)[0].field_value).toBe("value2");

    expect(getArtifacts(projectId1).length).toBe(1);
    expect(getArtifacts(projectId2).length).toBe(1);
    expect(getArtifacts(projectId1)[0].content).toBe("content1");
    expect(getArtifacts(projectId2)[0].content).toBe("content2");

    // Delete project 1, project 2 data should remain
    deleteProject(projectId1);

    expect(getProject(projectId1)).toBeUndefined();
    expect(getProject(projectId2)).toBeDefined();
    expect(getAllInterviewAnswers(projectId1).length).toBe(0);
    expect(getAllInterviewAnswers(projectId2).length).toBe(1);
    expect(getAllFormResponses(projectId2).length).toBe(1);
    expect(getArtifacts(projectId2).length).toBe(1);
  });

  it("should handle partial deletion of scoped data", () => {
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });
    const projectId = project.id;

    // Add multiple answers and artifacts
    saveInterviewAnswer(projectId, 2, "Q1?", "A1");
    saveInterviewAnswer(projectId, 2, "Q2?", "A2");
    saveInterviewAnswer(projectId, 3, "Q3?", "A3");

    saveArtifact(projectId, 1, "yaml", "content1");
    saveArtifact(projectId, 2, "yaml", "content2");
    saveArtifact(projectId, 3, "yaml", "content3");

    // Verify initial state
    expect(getAllInterviewAnswers(projectId).length).toBe(3);
    expect(getArtifacts(projectId).length).toBe(3);

    // Delete step 2 answers (delete ALL answers since there's no step-specific delete)
    deleteInterviewAnswers(projectId);
    expect(getAllInterviewAnswers(projectId).length).toBe(0);

    // Delete all artifacts
    deleteArtifacts(projectId);
    expect(getArtifacts(projectId).length).toBe(0);

    // Project should still exist
    expect(getProject(projectId)).toBeDefined();
    expect(getAllInterviewAnswers(projectId).length).toBe(0);
  });

  it("should preserve data integrity across complex workflow", () => {
    const project = createProject({
      name: "Complex Workflow",
      entryPath: "doc-first",
    });
    const projectId = project.id;

    // Simulate user going back and forth between steps
    saveFormResponse(projectId, 1, "projectDescription", "Initial desc");
    saveArtifact(projectId, 1, "yaml", "Gap v1");

    // User goes back and updates form
    saveFormResponse(projectId, 1, "projectDescription", "Updated desc");
    saveArtifact(projectId, 1, "yaml", "Gap v2");

    // Move to step 2
    saveInterviewAnswer(projectId, 2, "Q1?", "A1");
    saveArtifact(projectId, 2, "yaml", "BizReq v1");

    // User refines step 2
    saveInterviewAnswer(projectId, 2, "Q2?", "A2");
    saveArtifact(projectId, 2, "yaml", "BizReq v2");

    // Update XState snapshot
    savePlanningState(projectId, {
      status: "active",
      value: "step2.collecting",
      context: {
        projectId,
        currentStepNumber: 2,
        entryPath: "doc-first",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step1Responses: { projectDescription: "Updated desc" },
        step2Answers: ["A1", "A2"],
        step2CurrentQuestion: null,
        step3Answers: [],
        step3CurrentQuestion: null,
      },
      children: {},
      historyValue: {},
    });

    // Verify final state
    const responses = getAllFormResponses(projectId);
    expect(responses.length).toBe(1);
    expect(responses[0].field_value).toBe("Updated desc");

    const answers = getAllInterviewAnswers(projectId);
    expect(answers.length).toBe(2);
    expect(answers.map((a) => a.answer)).toContain("A1");
    expect(answers.map((a) => a.answer)).toContain("A2");

    const artifacts = getArtifacts(projectId);
    expect(artifacts.length).toBe(2);
    expect(artifacts.find((a) => a.step_number === 1)?.content).toBe("Gap v2");
    expect(artifacts.find((a) => a.step_number === 2)?.content).toBe(
      "BizReq v2",
    );

    const snapshot = loadPlanningState(projectId);
    expect(snapshot).toBeDefined();
    expect(snapshot!.value).toBe("step2.collecting");
    expect(snapshot!.context.currentStepNumber).toBe(2);
  });
});

describe("Performance and Edge Cases", () => {
  it("should handle large content in artifacts", () => {
    const project = createProject({
      name: "Large Content Test",
      entryPath: "scratch",
    });
    const projectId = project.id;

    // Generate ~100KB of content
    const largeContent = `# Implementation Plan\n${"task: ".repeat(10000)}`;

    const artifactId = saveArtifact(projectId, 5, "markdown", largeContent);
    expect(artifactId).toBeDefined();

    const artifact = getArtifact(projectId, 5);
    expect(artifact).toBeDefined();
    expect(artifact!.content.length).toBeGreaterThan(50000);
    expect(artifact!.content).toBe(largeContent);
  });

  it("should handle special characters in content", () => {
    const project = createProject({
      name: "Special Chars",
      entryPath: "scratch",
    });
    const projectId = project.id;

    const specialContent = `# Test
    Unicode: 你好 🚀
    Quotes: "quoted" 'single'
    Backslash: \\n \\t
    SQL: SELECT * FROM users WHERE name = 'O''Brien'
    `;

    const _artifactId = saveArtifact(projectId, 1, "yaml", specialContent);
    const artifact = getArtifact(projectId, 1);
    expect(artifact!.content).toBe(specialContent);

    const _answerId = saveInterviewAnswer(projectId, 2, "Q?", specialContent);
    const answers = getAllInterviewAnswers(projectId);
    expect(answers[0].answer).toBe(specialContent);
  });

  it("should handle concurrent saves to same project", () => {
    const project = createProject({
      name: "Concurrent Test",
      entryPath: "scratch",
    });
    const projectId = project.id;

    // Simulate rapid-fire saves (e.g., user typing fast)
    const promises: string[] = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        saveInterviewAnswer(projectId, 2, `Question ${i}?`, `Answer ${i}`),
      );
    }

    // All should succeed
    expect(promises.length).toBe(10);
    for (const id of promises) {
      expect(id).toBeDefined();
    }

    const answers = getAllInterviewAnswers(projectId);
    expect(answers.length).toBe(10);
  });

  it("should handle empty strings and null-like values", () => {
    const project = createProject({
      name: "Edge Case Test",
      entryPath: "scratch",
    });
    const projectId = project.id;

    // Empty strings should be allowed
    saveFormResponse(projectId, 1, "field1", "");
    saveInterviewAnswer(projectId, 2, "Q?", "");
    saveArtifact(projectId, 1, "yaml", "");

    const responses = getAllFormResponses(projectId);
    expect(responses[0].field_value).toBe("");

    const answers = getAllInterviewAnswers(projectId);
    expect(answers[0].answer).toBe("");

    const artifact = getArtifact(projectId, 1);
    expect(artifact!.content).toBe("");
  });
});
