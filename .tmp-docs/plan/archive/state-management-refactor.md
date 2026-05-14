# State Management Refactoring Proposal

**Date:** 2026-05-09  
**Branch:** `feature/structured-output`  
**Status:** Proposal - Awaiting Approval

---

## Executive Summary

Investigation of reported "option cards not rendering" bug revealed deeper architectural issues. The application forces all 10 planning steps into a single interview pattern, when in reality only 2 steps are interviews. This document proposes an enterprise-grade state management architecture using Domain-Driven Design (DDD), Command Query Responsibility Segregation (CQRS), and state machine patterns.

---

## Problem Statement

### Initial Bug Report

**User Report:** "Option cards not rendering in UI + getting asked the same question over and over"

### Investigation Findings

#### 1. Option Rendering (✅ NOT A BUG)
- **Parser works:** `src/features/ai/parse-options.ts` - all 25 tests passing
- **Rendering works:** `InterviewThread.tsx:295-305` - options display when data present
- **Backend works:** API returns correct `**Options:**` format
- **Verified:** Manual API call + browser automation confirmed functionality

#### 2. Repeated Question Bug (✅ ROOT CAUSE FOUND)
- **Symptom:** Question counter increments (Q09→Q10→Q11) but displayed text doesn't update
- **Root Cause:** `useStreamingQuestion` hook clears state on fetch start, but UI shows stale `streamedQuestion` during loading
- **Location:** `src/features/ai/hooks.ts:51` clears, but `InterviewThread.tsx:268` still renders old value
- **Impact:** User sees old question text while new question loads, appears as "repeating"

#### 3. Premature Step Completion (✅ CRITICAL BUG)
- **Expected:** Steps 2-4 should ask 10+ questions each (see `skills-content.ts`)
- **Actual:** Steps 2-4 auto-complete without asking questions
- **Evidence:** Browser test showed Step 1 → Step 5 directly
- **Hypothesis:** AI signals `[STEP_COMPLETE]` too early OR step completion logic is broken

#### 4. Lost Context (✅ CRITICAL BUG)
- **Expected:** Step 5+ should receive project overview from Step 1
- **Actual:** Step 5 asks generic "What are you building?" instead
- **Location:** `app/api/ai/interview.ts:38-50` tries to fetch context but fails
- **Issue:** `step1?.answers` may not have expected 2 entries (choice + overview)

---

## Architectural Root Cause

### The God Component Problem

**Current Architecture:**
```
InterviewThread.tsx (1,500+ lines)
├── Handles all 10 steps identically
├── Assumes every step is multi-turn Q&A
├── Mixes UI state, domain logic, API calls
├── No clear state machine
└── Impossible to reason about flow
```

### Reality Check: Step Type Diversity

| Step | Name | Actual Type | User Interaction |
|------|------|-------------|------------------|
| 1 | Gap Analysis | **Form** | 2 fixed questions |
| 2 | Business Requirements | **Interview** | 10-16 dynamic Q&A |
| 3 | Technical Requirements | **Interview** | 10-16 dynamic Q&A |
| 4 | Style Anchors | **Automated** | None (reads code) |
| 5 | Implementation Planner | **Form** | Fixed questions upfront |
| 6 | Definition of Done | **Automated** | None (derives from artifacts) |
| 7 | Architecture Decisions | **Artifact-Only** | View/edit only |
| 8 | Delivery Timeline | **Automated** | None (calculates from tasks) |
| 9 | QA Test Plan | **Automated** | None (generates from requirements) |
| 10 | Summaries | **Automated** | None (aggregates artifacts) |

**Only 2 of 10 steps are interviews**, yet the entire codebase forces interview pattern.

### Current State Management Issues

#### 1. **No Clear State Model**
```typescript
// Ambiguous, overloaded structure
interface PlanningStep {
  stepNumber: number;
  name: string;
  status: StepStatus;           // What does "now" mean?
  question: string;             // Only relevant for interviews
  options?: StepOption[];       // Only relevant for multiple-choice
  answer?: StepAnswer;          // Single answer (legacy)
  answers?: StepAnswer[];       // Multi-turn (new)
  artifact?: string;            // Generated output
}
```

**Problems:**
- Mixed concerns: user input, AI state, artifacts
- Optional fields everywhere → runtime errors
- No type safety for step-specific data
- Impossible to validate state transitions

#### 2. **Scattered State Transitions**
```typescript
// State changes happen in 6+ places:
- InterviewThread.tsx:103 - auto-advance on completion
- InterviewThread.tsx:178 - clear options after submit
- hooks.ts:51-54 - reset streaming state
- server.ts - backend mutations
- store.ts:67 - pre-fill logic
- step-config.ts - step metadata
```

**Problems:**
- No single source of truth
- Race conditions between UI and backend
- Hard to debug state corruption
- No validation of illegal transitions

#### 3. **Mixed Layers**
```
┌─────────────────────────────────────┐
│ InterviewThread.tsx                 │
│ • UI rendering (React)              │
│ • Business logic (when to advance)  │
│ • API calls (fetch questions)       │
│ • Local state (optimistic updates)  │
│ • Domain rules (can submit?)        │
└─────────────────────────────────────┘
       ↓ ↑ ↓ ↑ ↓ ↑
┌─────────────────────────────────────┐
│ Backend store.ts                    │
│ • Also has business logic           │
│ • Different validation rules        │
│ • Duplicated state shape            │
└─────────────────────────────────────┘
```

**Problems:**
- Business logic duplicated in frontend and backend
- No clear API contract
- Frontend can't validate before calling backend
- Backend can't trust frontend state

---

## Proposed Solution: Enterprise-Grade State Management

### Core Principles

1. **Single Responsibility:** Each layer has one job
2. **Type Safety:** Discriminated unions, no `any`
3. **Testability:** Pure functions, mockable dependencies
4. **Predictability:** State machine enforces valid transitions
5. **Scalability:** Easy to add new step types

### Architecture Layers

```
┌──────────────────────────────────────────────────────┐
│ DOMAIN LAYER (Pure TypeScript)                      │
│ • State machine definition                           │
│ • Business logic & validation                        │
│ • State transitions (pure functions)                 │
│ • NO: React, API calls, side effects                 │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ APPLICATION LAYER (Orchestration)                    │
│ • Commands: submitAnswer(), completeStep()           │
│ • Queries: getState(), getCurrentStep()              │
│ • Effect handlers: execute side effects              │
│ • NO: UI logic, direct persistence                   │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER (External Systems)              │
│ • Store: persist/retrieve state                      │
│ • API Client: HTTP calls to backend                  │
│ • Event Bus: pub/sub for cross-cutting concerns      │
│ • NO: Business logic                                 │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (React Components)                │
│ • UI state: forms, modals, animations                │
│ • Consumes via hooks: usePlanning()                  │
│ • NO: Business logic, direct API calls               │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Domain Layer: State Machine

**File:** `src/features/planning/domain/state-machine.ts`

```typescript
// Explicit step types
export type StepType = 'form' | 'interview' | 'automated' | 'artifact-only';

// Clear status values
export type StepStatus = 
  | 'pending'      // Not started
  | 'ready'        // Ready for user input
  | 'in-progress'  // User actively working
  | 'generating'   // AI generating artifact
  | 'complete';    // Done, artifact saved

// All possible events (user actions + system events)
export type PlanningEvent =
  | { type: 'PROJECT_CREATED'; projectId: string; entryPath: EntryPath }
  | { type: 'STEP_STARTED'; stepNumber: number }
  | { type: 'ANSWER_SUBMITTED'; stepNumber: number; answer: string; question: string }
  | { type: 'FORM_SUBMITTED'; stepNumber: number; responses: Record<string, string> }
  | { type: 'ARTIFACT_GENERATED'; stepNumber: number; artifact: string }
  | { type: 'STEP_COMPLETED'; stepNumber: number }
  | { type: 'ARTIFACT_EDITED'; stepNumber: number; newContent: string };

// Aggregate root: entire planning state
export interface PlanningState {
  projectId: string;
  projectStatus: 'created' | 'in-progress' | 'complete' | 'archived';
  currentStep: number;
  steps: StepState[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    entryPath: EntryPath;
  };
}

// Discriminated union for step data
export interface StepState {
  stepNumber: number;
  name: string;
  type: StepType;
  status: StepStatus;
  data: InterviewData | FormData | AutomatedData;
  artifact?: {
    type: 'yaml' | 'markdown';
    content: string;
    generatedAt: string;
  };
}

interface InterviewData {
  type: 'interview';
  answers: Array<{ question: string; value: string; timestamp: string }>;
  currentQuestion?: { text: string; options?: StepOption[] };
}

interface FormData {
  type: 'form';
  questions: FormQuestion[];
  responses: Record<string, string>;
}

interface AutomatedData {
  type: 'automated';
  inputs: Record<string, any>; // Derived from prior steps
}

// State machine: pure function
export class PlanningStateMachine {
  static transition(
    state: PlanningState,
    event: PlanningEvent
  ): { state: PlanningState; effects: Effect[] } {
    
    switch (event.type) {
      case 'ANSWER_SUBMITTED': {
        // 1. Validate event
        const step = state.steps[event.stepNumber - 1];
        if (step.type !== 'interview') {
          throw new InvalidTransitionError(
            `Cannot submit answer to ${step.type} step`
          );
        }
        if (step.status !== 'in-progress') {
          throw new InvalidTransitionError(
            `Step must be in-progress, currently: ${step.status}`
          );
        }
        
        // 2. Apply transition (pure)
        const newAnswers = [
          ...step.data.answers,
          { 
            question: event.question, 
            value: event.answer, 
            timestamp: new Date().toISOString() 
          }
        ];
        
        const newState = {
          ...state,
          steps: state.steps.map((s, i) => 
            i === event.stepNumber - 1 
              ? { 
                  ...s, 
                  data: { 
                    ...s.data, 
                    answers: newAnswers,
                    currentQuestion: undefined // Clear current question
                  } 
                }
              : s
          ),
          metadata: {
            ...state.metadata,
            updatedAt: new Date().toISOString()
          }
        };
        
        // 3. Return new state + effects to execute
        return {
          state: newState,
          effects: [
            { 
              type: 'FETCH_NEXT_QUESTION', 
              stepNumber: event.stepNumber, 
              previousAnswers: newAnswers.map(a => a.value)
            }
          ]
        };
      }
      
      case 'STEP_COMPLETED': {
        const currentStep = state.steps[event.stepNumber - 1];
        const nextStepNumber = event.stepNumber + 1;
        const hasNextStep = nextStepNumber <= state.steps.length;
        
        const newState = {
          ...state,
          currentStep: hasNextStep ? nextStepNumber : state.currentStep,
          projectStatus: !hasNextStep ? 'complete' : state.projectStatus,
          steps: state.steps.map((s) =>
            s.stepNumber === event.stepNumber
              ? { ...s, status: 'complete' as const }
              : s.stepNumber === nextStepNumber
                ? { ...s, status: 'ready' as const }
                : s
          ),
          metadata: {
            ...state.metadata,
            updatedAt: new Date().toISOString()
          }
        };
        
        return {
          state: newState,
          effects: [
            { type: 'GENERATE_ARTIFACT', stepNumber: event.stepNumber },
            ...(hasNextStep ? [
              { type: 'START_STEP', stepNumber: nextStepNumber }
            ] : [])
          ]
        };
      }
      
      case 'FORM_SUBMITTED': {
        const step = state.steps[event.stepNumber - 1];
        if (step.type !== 'form') {
          throw new InvalidTransitionError(
            `Cannot submit form to ${step.type} step`
          );
        }
        
        const newState = {
          ...state,
          steps: state.steps.map((s, i) =>
            i === event.stepNumber - 1
              ? { ...s, data: { ...s.data, responses: event.responses } }
              : s
          )
        };
        
        return {
          state: newState,
          effects: [
            { type: 'COMPLETE_STEP', stepNumber: event.stepNumber }
          ]
        };
      }
      
      // ... other transitions
      
      default:
        const _exhaustive: never = event;
        throw new Error(`Unhandled event: ${JSON.stringify(event)}`);
    }
  }
  
  // Validators: pure predicates
  static canSubmitAnswer(state: PlanningState, stepNumber: number): boolean {
    const step = state.steps[stepNumber - 1];
    return (
      step.type === 'interview' && 
      step.status === 'in-progress' &&
      state.currentStep === stepNumber
    );
  }
  
  static canCompleteStep(state: PlanningState, stepNumber: number): boolean {
    const step = state.steps[stepNumber - 1];
    return step.status === 'in-progress' || step.status === 'generating';
  }
}

// Side effects to execute
export type Effect =
  | { type: 'FETCH_NEXT_QUESTION'; stepNumber: number; previousAnswers: string[] }
  | { type: 'GENERATE_ARTIFACT'; stepNumber: number }
  | { type: 'START_STEP'; stepNumber: number }
  | { type: 'COMPLETE_STEP'; stepNumber: number };

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}
```

**Benefits:**
- ✅ All state transitions in one place
- ✅ Pure functions → easy to test
- ✅ Type-safe → compiler catches invalid transitions
- ✅ Clear input (event) → output (new state + effects)
- ✅ No side effects → predictable

---

### 2. Application Layer: Commands & Queries

**File:** `src/features/planning/application/commands.ts`

```typescript
// CQRS: Commands for writes
export class PlanningCommands {
  constructor(
    private store: PlanningStore,
    private apiClient: PlanningApiClient,
    private eventBus: EventBus
  ) {}

  async submitAnswer(params: {
    projectId: string;
    stepNumber: number;
    question: string;
    answer: string;
  }): Promise<void> {
    // 1. Load current state
    const state = await this.store.getState(params.projectId);
    
    // 2. Validate command (business rules)
    if (!PlanningStateMachine.canSubmitAnswer(state, params.stepNumber)) {
      throw new Error(
        `Cannot submit answer: step ${params.stepNumber} is not ready`
      );
    }
    
    // 3. Apply state transition
    const { state: newState, effects } = PlanningStateMachine.transition(state, {
      type: 'ANSWER_SUBMITTED',
      stepNumber: params.stepNumber,
      answer: params.answer,
      question: params.question
    });
    
    // 4. Persist new state
    await this.store.setState(params.projectId, newState);
    
    // 5. Execute side effects
    for (const effect of effects) {
      await this.executeEffect(params.projectId, effect);
    }
    
    // 6. Publish event (for analytics, webhooks, etc.)
    this.eventBus.emit('ANSWER_SUBMITTED', {
      projectId: params.projectId,
      stepNumber: params.stepNumber,
      timestamp: new Date().toISOString()
    });
  }
  
  async completeStep(params: {
    projectId: string;
    stepNumber: number;
  }): Promise<void> {
    const state = await this.store.getState(params.projectId);
    
    if (!PlanningStateMachine.canCompleteStep(state, params.stepNumber)) {
      throw new Error(`Cannot complete step ${params.stepNumber}`);
    }
    
    const { state: newState, effects } = PlanningStateMachine.transition(state, {
      type: 'STEP_COMPLETED',
      stepNumber: params.stepNumber
    });
    
    await this.store.setState(params.projectId, newState);
    
    for (const effect of effects) {
      await this.executeEffect(params.projectId, effect);
    }
    
    this.eventBus.emit('STEP_COMPLETED', {
      projectId: params.projectId,
      stepNumber: params.stepNumber
    });
  }
  
  async submitForm(params: {
    projectId: string;
    stepNumber: number;
    responses: Record<string, string>;
  }): Promise<void> {
    const state = await this.store.getState(params.projectId);
    
    const { state: newState, effects } = PlanningStateMachine.transition(state, {
      type: 'FORM_SUBMITTED',
      stepNumber: params.stepNumber,
      responses: params.responses
    });
    
    await this.store.setState(params.projectId, newState);
    
    for (const effect of effects) {
      await this.executeEffect(params.projectId, effect);
    }
  }
  
  // Effect executor: side effects in isolation
  private async executeEffect(projectId: string, effect: Effect): Promise<void> {
    switch (effect.type) {
      case 'FETCH_NEXT_QUESTION':
        await this.apiClient.fetchQuestion({
          projectId,
          stepNumber: effect.stepNumber,
          previousAnswers: effect.previousAnswers
        });
        break;
        
      case 'GENERATE_ARTIFACT':
        const state = await this.store.getState(projectId);
        const step = state.steps[effect.stepNumber - 1];
        const artifact = await this.apiClient.generateArtifact({
          projectId,
          stepNumber: effect.stepNumber,
          stepData: step.data
        });
        
        // Update state with artifact
        const updatedState = {
          ...state,
          steps: state.steps.map(s =>
            s.stepNumber === effect.stepNumber
              ? { ...s, artifact }
              : s
          )
        };
        await this.store.setState(projectId, updatedState);
        break;
        
      case 'START_STEP':
        // Initialize step data based on type
        const currentState = await this.store.getState(projectId);
        const nextStep = currentState.steps[effect.stepNumber - 1];
        
        if (nextStep.type === 'interview') {
          // Fetch first question
          await this.apiClient.fetchQuestion({
            projectId,
            stepNumber: effect.stepNumber,
            previousAnswers: []
          });
        } else if (nextStep.type === 'automated') {
          // Auto-generate immediately
          await this.executeEffect(projectId, {
            type: 'COMPLETE_STEP',
            stepNumber: effect.stepNumber
          });
        }
        break;
        
      case 'COMPLETE_STEP':
        await this.completeStep({ projectId, stepNumber: effect.stepNumber });
        break;
    }
  }
}
```

**File:** `src/features/planning/application/queries.ts`

```typescript
// CQRS: Queries for reads
export class PlanningQueries {
  constructor(private store: PlanningStore) {}
  
  async getProjectState(projectId: string): Promise<PlanningState> {
    return this.store.getState(projectId);
  }
  
  async getCurrentStep(projectId: string): Promise<StepState> {
    const state = await this.store.getState(projectId);
    return state.steps[state.currentStep - 1];
  }
  
  async getStep(projectId: string, stepNumber: number): Promise<StepState> {
    const state = await this.store.getState(projectId);
    return state.steps[stepNumber - 1];
  }
  
  async getStepHistory(projectId: string, stepNumber: number): Promise<StepAnswer[]> {
    const state = await this.store.getState(projectId);
    const step = state.steps[stepNumber - 1];
    if (step.data.type !== 'interview') {
      throw new Error(`Step ${stepNumber} is not an interview`);
    }
    return step.data.answers;
  }
  
  async getProjectOverview(projectId: string): Promise<string | undefined> {
    const state = await this.store.getState(projectId);
    const step1 = state.steps[0];
    if (step1.data.type === 'interview' && step1.data.answers.length >= 2) {
      return step1.data.answers[1].value;
    }
    return undefined;
  }
  
  async canSubmitAnswer(projectId: string, stepNumber: number): Promise<boolean> {
    const state = await this.store.getState(projectId);
    return PlanningStateMachine.canSubmitAnswer(state, stepNumber);
  }
}
```

**Benefits:**
- ✅ Single entry point for all operations
- ✅ Async/await for side effects
- ✅ Clear separation: commands (write) vs queries (read)
- ✅ Easy to add logging, metrics, tracing
- ✅ Testable with mocked dependencies

---

### 3. Infrastructure Layer: Store & API Client

**File:** `src/features/planning/infrastructure/store.ts`

```typescript
// Adapter interface
export interface PlanningStore {
  getState(projectId: string): Promise<PlanningState>;
  setState(projectId: string, state: PlanningState): Promise<void>;
  deleteState(projectId: string): Promise<void>;
}

// In-memory implementation (current)
export class InMemoryPlanningStore implements PlanningStore {
  private store = new Map<string, PlanningState>();
  
  async getState(projectId: string): Promise<PlanningState> {
    const state = this.store.get(projectId);
    if (!state) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return state;
  }
  
  async setState(projectId: string, state: PlanningState): Promise<void> {
    this.store.set(projectId, state);
  }
  
  async deleteState(projectId: string): Promise<void> {
    this.store.delete(projectId);
  }
}

// Future: Server-backed implementation
export class ServerPlanningStore implements PlanningStore {
  async getState(projectId: string): Promise<PlanningState> {
    const response = await fetch(`/api/planning/${projectId}/state`);
    if (!response.ok) {
      throw new Error(`Failed to fetch state: ${response.statusText}`);
    }
    return response.json();
  }
  
  async setState(projectId: string, state: PlanningState): Promise<void> {
    const response = await fetch(`/api/planning/${projectId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!response.ok) {
      throw new Error(`Failed to save state: ${response.statusText}`);
    }
  }
  
  async deleteState(projectId: string): Promise<void> {
    await fetch(`/api/planning/${projectId}/state`, { method: 'DELETE' });
  }
}

// Future: LocalStorage implementation (offline support)
export class LocalStoragePlanningStore implements PlanningStore {
  private keyPrefix = 'planning:';
  
  async getState(projectId: string): Promise<PlanningState> {
    const json = localStorage.getItem(this.keyPrefix + projectId);
    if (!json) throw new Error(`Project not found: ${projectId}`);
    return JSON.parse(json);
  }
  
  async setState(projectId: string, state: PlanningState): Promise<void> {
    localStorage.setItem(this.keyPrefix + projectId, JSON.stringify(state));
  }
  
  async deleteState(projectId: string): Promise<void> {
    localStorage.removeItem(this.keyPrefix + projectId);
  }
}
```

**File:** `src/features/planning/infrastructure/api-client.ts`

```typescript
export class PlanningApiClient {
  async fetchQuestion(params: {
    projectId: string;
    stepNumber: number;
    previousAnswers: string[];
  }): Promise<{ question: string; options?: StepOption[] }> {
    const response = await fetch('/api/ai/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let text = '';
    
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    
    // Parse options from text
    const options = parseOptions(text);
    return { question: text, options };
  }
  
  async generateArtifact(params: {
    projectId: string;
    stepNumber: number;
    stepData: InterviewData | FormData | AutomatedData;
  }): Promise<Artifact> {
    const response = await fetch('/api/ai/artifact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    const content = await response.text();
    return {
      type: params.stepNumber === 2 ? 'yaml' : 'markdown',
      content,
      generatedAt: new Date().toISOString()
    };
  }
}
```

**File:** `src/features/planning/infrastructure/event-bus.ts`

```typescript
type EventHandler = (data: any) => void;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  
  on(event: string, handler: EventHandler): () => void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    };
  }
  
  emit(event: string, data: any): void {
    const handlers = this.handlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }
}
```

**Benefits:**
- ✅ Swappable implementations (memory → server → localStorage)
- ✅ No business logic in infrastructure
- ✅ Easy to mock for testing
- ✅ Event bus for cross-cutting concerns (analytics, logging)

---

### 4. Presentation Layer: React Hooks

**File:** `src/features/planning/presentation/hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningCommands, planningQueries } from '../container';

// Facade: single entry point for all planning operations
export function usePlanning(projectId: string) {
  const queryClient = useQueryClient();
  
  // Query: get full state
  const { data: state, isLoading, error } = useQuery({
    queryKey: ['planning', projectId],
    queryFn: () => planningQueries.getProjectState(projectId),
    staleTime: 0, // Always refetch (real-time updates)
  });
  
  // Derived state (memoized)
  const currentStep = useMemo(
    () => state?.steps[state.currentStep - 1],
    [state]
  );
  
  // Command: submit answer
  const submitAnswerMutation = useMutation({
    mutationFn: (params: { stepNumber: number; question: string; answer: string }) =>
      planningCommands.submitAnswer({ projectId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning', projectId] });
    },
    onError: (error) => {
      console.error('Failed to submit answer:', error);
    }
  });
  
  // Command: complete step
  const completeStepMutation = useMutation({
    mutationFn: (stepNumber: number) =>
      planningCommands.completeStep({ projectId, stepNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning', projectId] });
    }
  });
  
  // Command: submit form
  const submitFormMutation = useMutation({
    mutationFn: (params: { stepNumber: number; responses: Record<string, string> }) =>
      planningCommands.submitForm({ projectId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning', projectId] });
    }
  });
  
  return {
    // State
    state,
    currentStep,
    isLoading,
    error,
    
    // Commands
    submitAnswer: submitAnswerMutation.mutate,
    completeStep: completeStepMutation.mutate,
    submitForm: submitFormMutation.mutate,
    
    // Command status
    isSubmittingAnswer: submitAnswerMutation.isPending,
    isCompletingStep: completeStepMutation.isPending,
    isSubmittingForm: submitFormMutation.isPending,
    
    // Errors
    submitAnswerError: submitAnswerMutation.error,
    completeStepError: completeStepMutation.error,
  };
}

// Component usage
function InterviewStep({ projectId }: Props) {
  const { currentStep, submitAnswer, isSubmittingAnswer } = usePlanning(projectId);
  
  if (currentStep?.type !== 'interview') {
    return <div>Invalid step type</div>;
  }
  
  const handleSubmit = (answer: string) => {
    submitAnswer({
      stepNumber: currentStep.stepNumber,
      question: currentStep.data.currentQuestion?.text || '',
      answer
    });
  };
  
  return (
    <Composer 
      onSubmit={handleSubmit} 
      disabled={isSubmittingAnswer}
      currentQuestion={currentStep.data.currentQuestion}
    />
  );
}
```

**Benefits:**
- ✅ Components have no business logic
- ✅ React Query handles caching, refetching, loading states
- ✅ Single hook for all operations
- ✅ Type-safe usage

---

### 5. Dependency Injection Container

**File:** `src/features/planning/container.ts`

```typescript
// Singleton container
class PlanningContainer {
  private static instance: PlanningContainer;
  
  // Infrastructure
  public readonly store: PlanningStore;
  public readonly apiClient: PlanningApiClient;
  public readonly eventBus: EventBus;
  
  // Application
  public readonly commands: PlanningCommands;
  public readonly queries: PlanningQueries;
  
  private constructor() {
    // Initialize infrastructure
    this.store = new InMemoryPlanningStore();
    this.apiClient = new PlanningApiClient();
    this.eventBus = new EventBus();
    
    // Initialize application services
    this.commands = new PlanningCommands(
      this.store,
      this.apiClient,
      this.eventBus
    );
    this.queries = new PlanningQueries(this.store);
    
    // Set up event listeners
    this.eventBus.on('ANSWER_SUBMITTED', (data) => {
      console.log('[Analytics] Answer submitted:', data);
    });
    
    this.eventBus.on('STEP_COMPLETED', (data) => {
      console.log('[Analytics] Step completed:', data);
    });
  }
  
  static getInstance(): PlanningContainer {
    if (!PlanningContainer.instance) {
      PlanningContainer.instance = new PlanningContainer();
    }
    return PlanningContainer.instance;
  }
  
  // For testing: reset singleton
  static reset(): void {
    PlanningContainer.instance = undefined as any;
  }
}

// Export singleton instances
export const planningCommands = PlanningContainer.getInstance().commands;
export const planningQueries = PlanningContainer.getInstance().queries;
export const planningEventBus = PlanningContainer.getInstance().eventBus;
```

**Benefits:**
- ✅ Single place to wire up dependencies
- ✅ Easy to swap implementations (e.g., testing)
- ✅ Lazy initialization
- ✅ Type-safe exports

---

## File Structure

```
src/features/planning/
├── domain/
│   ├── state-machine.ts         # Pure state transitions + validation
│   ├── step-types.ts            # Step type definitions
│   ├── validators.ts            # Business rule validators
│   └── errors.ts                # Domain errors
├── application/
│   ├── commands.ts              # Write operations (CQRS)
│   ├── queries.ts               # Read operations (CQRS)
│   └── effects.ts               # Side effect handlers
├── infrastructure/
│   ├── store.ts                 # State persistence (adapter pattern)
│   ├── api-client.ts            # HTTP calls
│   └── event-bus.ts             # Pub/sub system
├── presentation/
│   ├── hooks/
│   │   ├── usePlanning.ts       # Main facade hook
│   │   └── useStepNavigation.ts # Navigation helpers
│   └── components/
│       ├── StepContainer.tsx    # Routes to correct component
│       ├── InterviewStep/       # Multi-turn Q&A (Steps 2, 3)
│       ├── FormStep/            # Fixed questions (Steps 1, 5)
│       ├── AutomatedStep/       # No input (Steps 4, 6, 8, 9, 10)
│       └── ArtifactReview/      # View/edit (Step 7)
├── container.ts                 # DI container (singleton)
└── index.ts                     # Public exports
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
**Goal:** Set up new architecture without breaking existing code

- [ ] Create new folder structure
- [ ] Implement domain layer (state machine)
- [ ] Write unit tests for state machine
- [ ] Implement application layer (commands/queries)
- [ ] Implement infrastructure layer (store, API client)
- [ ] Set up DI container
- [ ] **Result:** New architecture exists alongside old code

### Phase 2: Feature Parity (Week 2)
**Goal:** New system handles all current use cases

- [ ] Implement `usePlanning` hook
- [ ] Create `StepContainer` router component
- [ ] Build `InterviewStep` (refactor from `InterviewThread`)
- [ ] Add integration tests
- [ ] **Result:** Can route between old and new systems

### Phase 3: Gradual Migration (Week 3)
**Goal:** Switch traffic to new system, one step at a time

- [ ] Add feature flag: `USE_NEW_STATE_MANAGEMENT`
- [ ] Switch Step 2 to new system (interview)
- [ ] Monitor for issues, fix bugs
- [ ] Switch Step 3 to new system (interview)
- [ ] Monitor, fix
- [ ] **Result:** Steps 2-3 on new system

### Phase 4: Expand (Week 4)
**Goal:** Build out remaining step types

- [ ] Build `FormStep` component
- [ ] Switch Steps 1, 5 to `FormStep`
- [ ] Build `AutomatedStep` component
- [ ] Switch Steps 4, 6, 8, 9, 10 to `AutomatedStep`
- [ ] Build `ArtifactReview` component
- [ ] Switch Step 7 to `ArtifactReview`
- [ ] **Result:** All steps on new system

### Phase 5: Cleanup (Week 5)
**Goal:** Remove old code, finalize migration

- [ ] Remove `InterviewThread` component
- [ ] Remove old hooks (`useSubmitAnswer`, `useCompleteStep`)
- [ ] Remove old store logic
- [ ] Remove feature flag
- [ ] Update documentation
- [ ] **Result:** Clean codebase, new architecture only

---

## Success Metrics

### Developer Experience
- **Before:** 1,500-line god component, unclear state flow
- **After:** ~200 lines per component, clear separation of concerns
- **Measure:** Developer onboarding time (days to first contribution)

### Maintainability
- **Before:** State changes in 6+ files, no validation
- **After:** All transitions in state machine, type-safe
- **Measure:** Time to add new step type (should be < 1 day)

### Reliability
- **Before:** Race conditions, invalid state transitions possible
- **After:** State machine prevents invalid transitions
- **Measure:** Production errors related to state (should drop to zero)

### Testability
- **Before:** Integration tests only (slow, flaky)
- **After:** Unit tests for state machine (fast, reliable)
- **Measure:** Test coverage (target: 90%+)

---

## Risks & Mitigations

### Risk 1: Migration Takes Too Long
**Mitigation:** Phase-based approach, feature flag for gradual rollout

### Risk 2: Bugs During Migration
**Mitigation:** Extensive testing, monitor error rates, quick rollback via feature flag

### Risk 3: Performance Regression
**Mitigation:** Benchmark before/after, use React Query caching, profile if needed

### Risk 4: Team Unfamiliar with DDD/CQRS
**Mitigation:** Pair programming, code reviews, documentation, training sessions

---

## Next Steps

1. **Review & Approve:** Stakeholders review this proposal
2. **Prototype:** Build minimal state machine + one step type
3. **Demo:** Show working prototype to team
4. **Commit:** Get buy-in for full migration
5. **Execute:** Follow phase-based migration plan

---

## Appendix: Current Issues Summary

### Critical Bugs to Fix
1. ✅ Stale question text during rapid submission
2. ✅ Steps 2-4 auto-completing without asking questions
3. ✅ Step 5+ losing project context from Step 1

### Architectural Debt
1. ❌ God component (`InterviewThread` 1,500+ lines)
2. ❌ Mixed step types forced into single pattern
3. ❌ Scattered state management (6+ locations)
4. ❌ No state machine or validation
5. ❌ Mixed layers (UI + business logic + API)
6. ❌ Hard to test, debug, extend

**This refactoring addresses all issues above.**

---

**Document Status:** ✅ Complete - Ready for Review  
**Author:** Claude (AI Assistant)  
**Date:** 2026-05-09
