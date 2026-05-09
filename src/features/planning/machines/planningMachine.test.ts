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
