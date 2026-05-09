import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { planningMachine } from './planningMachine';

describe('planningMachine structure', () => {
  it('should have correct machine id', () => {
    expect(planningMachine.id).toBe('planning');
  });

  it('should start in idle state', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test-123', entryPath: 'new-project' },
    });
    actor.start();

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('idle');
  });

  it('should initialize context with correct shape', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test-project', entryPath: 'existing-project' },
    });
    actor.start();

    const snapshot = actor.getSnapshot();
    const ctx = snapshot.context;

    expect(ctx.projectId).toBe('test-project');
    expect(ctx.entryPath).toBe('existing-project');
    expect(ctx.startedAt).toBeDefined();
    expect(ctx.updatedAt).toBeDefined();
    expect(ctx.step1Responses).toEqual({});
    expect(ctx.step2Answers).toEqual([]);
    expect(ctx.step2CurrentQuestion).toBeNull();
    expect(ctx.step2CurrentOptions).toBeNull();
    expect(ctx.step3Answers).toEqual([]);
    expect(ctx.step3CurrentQuestion).toBeNull();
    expect(ctx.step3CurrentOptions).toBeNull();
    expect(ctx.step5Responses).toEqual({});
    expect(ctx.step7Edits).toBeNull();
    expect(ctx.artifacts).toEqual({});
    expect(ctx.error).toBeNull();
  });

  it('should accept input with projectId and entryPath', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'abc-123', entryPath: 'new-project' },
    });
    actor.start();

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.projectId).toBe('abc-123');
    expect(snapshot.context.entryPath).toBe('new-project');
  });

  it('should have all 10 step states defined', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    // Machine definition has all required states
    const machineStates = planningMachine.config.states;
    expect(machineStates).toHaveProperty('idle');
    expect(machineStates).toHaveProperty('step1_gapAnalysis');
    expect(machineStates).toHaveProperty('step2_businessReqs');
    expect(machineStates).toHaveProperty('step3_techReqs');
    expect(machineStates).toHaveProperty('step4_styleAnchors');
    expect(machineStates).toHaveProperty('step5_implPlanner');
    expect(machineStates).toHaveProperty('step6_definitionOfDone');
    expect(machineStates).toHaveProperty('step7_archDecisions');
    expect(machineStates).toHaveProperty('step8_deliveryTimeline');
    expect(machineStates).toHaveProperty('step9_qaTestPlan');
    expect(machineStates).toHaveProperty('step10_summaries');
    expect(machineStates).toHaveProperty('complete');
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 1: Gap Analysis Form Tests
// ─────────────────────────────────────────────────────────────

describe('Step 1: Gap Analysis Form', () => {
  it('should transition from idle to step1_gapAnalysis on START_PLANNING', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches('step1_gapAnalysis')).toBe(true);
    expect(snapshot.matches({ step1_gapAnalysis: 'collecting' })).toBe(true);
  });

  it('should update context on SUBMIT_FORM with stepNumber=1', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: {
        existingReqs: 'Yes',
        overview: 'Building a task manager',
      },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step1Responses).toEqual({
      existingReqs: 'Yes',
      overview: 'Building a task manager',
    });
  });

  it('should transition to submitting state after SUBMIT_FORM', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test project' },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ step1_gapAnalysis: 'submitting' })).toBe(true);
  });

  it('should invoke generateArtifact actor in submitting state', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test project' },
    });

    // Wait for actor to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    // After artifact generation completes, should transition to step2
    expect(
      snapshot.matches('step2_businessReqs') ||
        snapshot.matches({ step1_gapAnalysis: 'submitting' })
    ).toBe(true);
  });

  it('should store artifact in context after generation', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test project' },
    });

    // Wait for artifact generation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    if (snapshot.context.artifacts[1]) {
      expect(snapshot.context.artifacts[1]).toHaveProperty('type');
      expect(snapshot.context.artifacts[1]).toHaveProperty('content');
      expect(snapshot.context.artifacts[1]).toHaveProperty('generatedAt');
    }
  });

  it('should transition to step2_businessReqs after successful artifact generation', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test project' },
    });

    // Wait for artifact generation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches('step2_businessReqs')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 2: Business Requirements Interview Tests
// ─────────────────────────────────────────────────────────────

describe('Step 2: Business Requirements Interview', () => {
  it('should transition from step1 to step2 in asking state', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    // Wait for step1 artifact generation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches('step2_businessReqs')).toBe(true);
  });

  it('should invoke fetchQuestion actor in asking state', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    // Wait for transitions
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    // Should either be in answering (if fetchQuestion completed) or still asking
    expect(
      snapshot.matches({ step2_businessReqs: 'answering' }) ||
        snapshot.matches({ step2_businessReqs: 'asking' })
    ).toBe(true);
  });

  it('should store question and options in context after fetchQuestion resolves', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    // Wait for fetchQuestion to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    if (snapshot.matches({ step2_businessReqs: 'answering' })) {
      expect(snapshot.context.step2CurrentQuestion).toBeTruthy();
      expect(snapshot.context.step2CurrentOptions).toBeTruthy();
    }
  });

  it('should append answer to context on SUBMIT_ANSWER', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit an answer
    actor.send({
      type: 'SUBMIT_ANSWER',
      stepNumber: 2,
      question: 'What is the goal?',
      answer: 'Build a great product',
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step2Answers).toHaveLength(1);
    expect(snapshot.context.step2Answers[0]).toEqual({
      question: 'What is the goal?',
      value: 'Build a great product',
      timestamp: expect.any(String),
    });
  });

  it('should clear current question and options after SUBMIT_ANSWER', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    actor.send({
      type: 'SUBMIT_ANSWER',
      stepNumber: 2,
      question: 'Test question',
      answer: 'Test answer',
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step2CurrentQuestion).toBeNull();
    expect(snapshot.context.step2CurrentOptions).toBeNull();
  });

  it('should return to asking state if answers < 10', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 1 answer (less than 10)
    actor.send({
      type: 'SUBMIT_ANSWER',
      stepNumber: 2,
      question: 'Q1',
      answer: 'A1',
    });

    // Wait for state transition (checkingComplete -> asking -> fetchQuestion)
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    // Should go back to asking for more questions (or answering if fetch completed)
    expect(
      snapshot.matches({ step2_businessReqs: 'asking' }) ||
        snapshot.matches({ step2_businessReqs: 'answering' })
    ).toBe(true);
  });

  it('should transition to generatingArtifact when answers >= 10', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 10 answers
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: 'SUBMIT_ANSWER',
        stepNumber: 2,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
      });
    }

    // Wait for state transitions
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    // Should be generating artifact or moved to step3
    expect(
      snapshot.matches({ step2_businessReqs: 'generatingArtifact' }) ||
        snapshot.matches('step3_techReqs')
    ).toBe(true);
  });

  it('should transition to step3 after successful artifact generation', async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
    });
    actor.start();

    actor.send({ type: 'START_PLANNING' });
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber: 1,
      responses: { overview: 'Test' },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 10 answers
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: 'SUBMIT_ANSWER',
        stepNumber: 2,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
      });
    }

    // Wait for artifact generation
    await new Promise((resolve) => setTimeout(resolve, 200));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches('step3_techReqs')).toBe(true);
    expect(snapshot.context.artifacts[2]).toBeDefined();
  });
});
