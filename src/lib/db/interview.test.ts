/**
 * Tests for interview_answers database operations
 */

import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./index";
import {
  deleteInterviewAnswers,
  getInterviewAnswers,
  saveInterviewAnswer,
} from "./interview";

beforeEach(() => {
  // Clean up any existing test data
  db.prepare("DELETE FROM interview_answers").run();
  db.prepare("DELETE FROM projects").run();
});

describe("saveInterviewAnswer", () => {
  it("should insert new interview answer", () => {
    const projectId = "test-proj-1";
    createTestProject(projectId);

    const answerId = saveInterviewAnswer(
      projectId,
      2,
      "What is your business goal?",
      "Increase revenue by 20%",
    );

    expect(answerId).toBeDefined();
    expect(typeof answerId).toBe("string");

    const row = db
      .prepare("SELECT * FROM interview_answers WHERE id = ?")
      .get(answerId) as any;

    expect(row).toBeDefined();
    expect(row.project_id).toBe(projectId);
    expect(row.step_number).toBe(2);
    expect(row.question).toBe("What is your business goal?");
    expect(row.answer).toBe("Increase revenue by 20%");
    expect(row.created_at).toBeDefined();
  });

  it("should support multiple answers for same project and step", () => {
    const projectId = "test-proj-2";
    createTestProject(projectId);

    const id1 = saveInterviewAnswer(projectId, 2, "Question 1?", "Answer 1");
    const id2 = saveInterviewAnswer(projectId, 2, "Question 2?", "Answer 2");

    expect(id1).not.toBe(id2);

    const rows = db
      .prepare("SELECT * FROM interview_answers WHERE project_id = ?")
      .all(projectId);

    expect(rows).toHaveLength(2);
  });

  it("should support step 2 and step 3", () => {
    const projectId = "test-proj-3";
    createTestProject(projectId);

    const id2 = saveInterviewAnswer(projectId, 2, "Q2?", "A2");
    const id3 = saveInterviewAnswer(projectId, 3, "Q3?", "A3");

    const row2 = db
      .prepare("SELECT * FROM interview_answers WHERE id = ?")
      .get(id2) as any;
    const row3 = db
      .prepare("SELECT * FROM interview_answers WHERE id = ?")
      .get(id3) as any;

    expect(row2.step_number).toBe(2);
    expect(row3.step_number).toBe(3);
  });
});

describe("getInterviewAnswers", () => {
  it("should return empty array when no answers exist", () => {
    const result = getInterviewAnswers("non-existent", 2);
    expect(result).toEqual([]);
  });

  it("should retrieve all answers for a project and step", () => {
    const projectId = "test-proj-4";
    createTestProject(projectId);

    saveInterviewAnswer(projectId, 2, "Q1?", "A1");
    saveInterviewAnswer(projectId, 2, "Q2?", "A2");
    saveInterviewAnswer(projectId, 3, "Q3?", "A3"); // Different step

    const step2Answers = getInterviewAnswers(projectId, 2);

    expect(step2Answers).toHaveLength(2);
    expect(step2Answers[0].question).toBe("Q1?");
    expect(step2Answers[0].answer).toBe("A1");
    expect(step2Answers[1].question).toBe("Q2?");
    expect(step2Answers[1].answer).toBe("A2");
  });

  it("should return answers in chronological order (oldest first)", () => {
    const projectId = "test-proj-5";
    createTestProject(projectId);

    // Insert answers with delays to ensure different timestamps
    saveInterviewAnswer(projectId, 2, "First?", "A1");
    saveInterviewAnswer(projectId, 2, "Second?", "A2");
    saveInterviewAnswer(projectId, 2, "Third?", "A3");

    const answers = getInterviewAnswers(projectId, 2);

    expect(answers).toHaveLength(3);
    expect(answers[0].question).toBe("First?");
    expect(answers[1].question).toBe("Second?");
    expect(answers[2].question).toBe("Third?");
  });

  it("should include all required fields in response", () => {
    const projectId = "test-proj-6";
    createTestProject(projectId);

    saveInterviewAnswer(projectId, 2, "Test question?", "Test answer");
    const answers = getInterviewAnswers(projectId, 2);

    expect(answers).toHaveLength(1);
    const answer = answers[0];

    expect(answer).toHaveProperty("id");
    expect(answer).toHaveProperty("project_id", projectId);
    expect(answer).toHaveProperty("step_number", 2);
    expect(answer).toHaveProperty("question", "Test question?");
    expect(answer).toHaveProperty("answer", "Test answer");
    expect(answer).toHaveProperty("created_at");
  });
});

describe("deleteInterviewAnswers", () => {
  it("should delete all answers for a project", () => {
    const projectId = "test-proj-7";
    createTestProject(projectId);

    saveInterviewAnswer(projectId, 2, "Q1?", "A1");
    saveInterviewAnswer(projectId, 2, "Q2?", "A2");
    saveInterviewAnswer(projectId, 3, "Q3?", "A3");

    const beforeDelete = getInterviewAnswers(projectId, 2);
    expect(beforeDelete).toHaveLength(2);

    deleteInterviewAnswers(projectId);

    const afterDelete = getInterviewAnswers(projectId, 2);
    expect(afterDelete).toHaveLength(0);
  });

  it("should not error when deleting for non-existent project", () => {
    expect(() => deleteInterviewAnswers("non-existent")).not.toThrow();
  });

  it("should only delete answers for specified project", () => {
    const project1 = "test-proj-8";
    const project2 = "test-proj-9";
    createTestProject(project1);
    createTestProject(project2);

    saveInterviewAnswer(project1, 2, "Q1?", "A1");
    saveInterviewAnswer(project2, 2, "Q2?", "A2");

    deleteInterviewAnswers(project1);

    expect(getInterviewAnswers(project1, 2)).toHaveLength(0);
    expect(getInterviewAnswers(project2, 2)).toHaveLength(1);
  });
});

describe("foreign key cascade", () => {
  it("should delete interview answers when project is deleted", () => {
    const projectId = "test-proj-10";
    createTestProject(projectId);

    saveInterviewAnswer(projectId, 2, "Q1?", "A1");
    saveInterviewAnswer(projectId, 3, "Q2?", "A2");

    expect(getInterviewAnswers(projectId, 2)).toHaveLength(1);
    expect(getInterviewAnswers(projectId, 3)).toHaveLength(1);

    // Delete the project - should cascade to interview_answers
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);

    expect(getInterviewAnswers(projectId, 2)).toHaveLength(0);
    expect(getInterviewAnswers(projectId, 3)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Create a test project in the database
 */
function createTestProject(projectId: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    `TEST-${projectId.slice(-3)}`,
    `Test Project ${projectId}`,
    "active",
    "scratch",
    1,
    now,
    now,
  );
}
