/**
 * Demo route for WorkflowChat component
 * Shows the chat-based workflow UI with sample data
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/header/Header";
import { AppLayout } from "@/components/layouts";
import {
  SpectrumStepper,
  type Stage,
} from "@/components/spectrum-stepper/SpectrumStepper";
import type { WorkflowChatProps } from "@/components/workflow-chat";
import { WorkflowChat } from "@/components/workflow-chat";

export const Route = createFileRoute("/demo/workflow-chat")({
  component: WorkflowChatDemo,
});

// Stage colors from design system
const STAGE_COLORS = {
  1: "#9AA68F", // lichen
  2: "#8AA89A", // sage
  3: "#7DA8AE", // sea-glass
  4: "#A6B889", // moss
  5: "#C9C285", // dried grass
  6: "#E0B97A", // honey
  7: "#D49A6E", // ochre
  8: "#C97C61", // terracotta
  9: "#A87391", // plum
  10: "var(--neutral-4)", // neutral
};

// Stages for spectrum stepper
const DEMO_STAGES: Stage[] = [
  { id: "1", num: 1, name: "Gap Analysis", status: "complete" },
  { id: "2", num: 2, name: "Business Requirements", status: "complete" },
  { id: "3", num: 3, name: "Technical Requirements", status: "complete" },
  { id: "4", num: 4, name: "QA Test Plan", status: "complete" },
  { id: "5", num: 5, name: "Implementation Planner", status: "now" },
  { id: "6", num: 6, name: "Developer Summary", status: "pending" },
  { id: "7", num: 7, name: "Architecture Decisions", status: "pending" },
  { id: "8", num: 8, name: "Delivery Timeline", status: "pending" },
  { id: "9", num: 9, name: "Executive Summary", status: "pending" },
  { id: "10", num: 10, name: "Complete", status: "pending" },
];

const SAMPLE_MESSAGES = [
  // STAGE 1: GAP ANALYSIS (Form)
  {
    type: "divider" as const,
    id: "divider-1",
    stageNumber: 1,
    stageName: "Gap Analysis",
    stageColor: STAGE_COLORS[1],
  },
  {
    type: "text" as const,
    id: "msg-1",
    role: "assistant" as const,
    timestamp: "2 hours ago",
    content:
      "Welcome! I'm here to help you plan your project. Let's start by understanding where you're at. I'll ask a few questions to capture your current situation and goals.",
  },
  {
    type: "question" as const,
    id: "msg-2",
    role: "assistant" as const,
    timestamp: "2 hours ago",
    question: "First, let's understand your starting point:",
    formFields: [
      {
        id: "existingRequirements",
        label: "Do you have existing requirements?",
        type: "text" as const,
        placeholder: "e.g., Yes, a PRD document / No, starting from scratch",
      },
      {
        id: "projectDescription",
        label: "What are you building?",
        type: "textarea" as const,
        placeholder: "Brief description of your project...",
      },
    ],
  },
  {
    type: "answer" as const,
    id: "msg-3",
    role: "user" as const,
    timestamp: "2 hours ago",
    question: "Do you have existing requirements?",
    answer: "No, starting from scratch",
  },
  {
    type: "answer" as const,
    id: "msg-4",
    role: "user" as const,
    timestamp: "2 hours ago",
    question: "What are you building?",
    answer:
      "A SaaS platform for managing construction projects with real-time collaboration features, budget tracking, and timeline visualization.",
  },

  // STAGE 2: BUSINESS REQUIREMENTS (Interview)
  {
    type: "divider" as const,
    id: "divider-2",
    stageNumber: 2,
    stageName: "Business Requirements",
    stageColor: STAGE_COLORS[2],
  },
  {
    type: "text" as const,
    id: "msg-5",
    role: "assistant" as const,
    timestamp: "2 hours ago",
    content:
      "Great! Now let's dive into the business side. I'll ask you a series of questions to understand your goals, users, and success metrics.",
  },
  {
    type: "question" as const,
    id: "msg-6",
    role: "assistant" as const,
    timestamp: "2 hours ago",
    question: "Who is the primary user of this platform?",
    options: [
      "Construction project managers",
      "General contractors",
      "Architects and designers",
      "Property owners/clients",
    ],
  },
  {
    type: "answer" as const,
    id: "msg-7",
    role: "user" as const,
    timestamp: "2 hours ago",
    question: "Who is the primary user of this platform?",
    answer: "Construction project managers",
    selectedOption: 0,
  },
  {
    type: "question" as const,
    id: "msg-8",
    role: "assistant" as const,
    timestamp: "2 hours ago",
    question: "What's the primary business goal for year one?",
    options: [
      "Acquire 1,000 paying customers",
      "Achieve $1M ARR",
      "Prove product-market fit with 100 active users",
      "Build brand awareness in construction tech",
    ],
  },
  {
    type: "answer" as const,
    id: "msg-9",
    role: "user" as const,
    timestamp: "1 hour ago",
    question: "What's the primary business goal for year one?",
    answer: "Prove product-market fit with 100 active users",
    selectedOption: 2,
  },
  {
    type: "artifact" as const,
    id: "msg-10",
    role: "assistant" as const,
    timestamp: "1 hour ago",
    content:
      "Perfect! I've captured your business requirements. Here's the document:",
    artifactName: "business-requirements.yaml",
    artifactId: "artifact-1",
    artifactContent: `# Business Requirements Document

## Project Overview
- **Project Name**: Construction Project Management SaaS
- **Description**: A SaaS platform for managing construction projects with real-time collaboration features, budget tracking, and timeline visualization.

## Primary Users
- Construction project managers

## Business Goals
- **Year 1**: Prove product-market fit with 100 active users
- Focus on user validation over revenue in initial phase

## Success Metrics
- Weekly active users (WAU)
- Project completion rate
- Time saved vs. traditional tools
- Customer Satisfaction (CSAT > 4.5/5)`,
  },

  // STAGE 3: TECHNICAL REQUIREMENTS
  {
    type: "divider" as const,
    id: "divider-3",
    stageNumber: 3,
    stageName: "Technical Requirements",
    stageColor: STAGE_COLORS[3],
  },
  {
    type: "text" as const,
    id: "msg-11",
    role: "assistant" as const,
    timestamp: "1 hour ago",
    content:
      "Now let's talk technical requirements. I'll ask about your tech stack preferences, constraints, and integration needs.",
  },
  {
    type: "question" as const,
    id: "msg-12",
    role: "assistant" as const,
    timestamp: "1 hour ago",
    question: "Do you have existing tech stack preferences or constraints?",
    options: [
      "Yes, we have specific requirements",
      "Open to recommendations",
      "Must integrate with existing systems",
    ],
  },
  {
    type: "answer" as const,
    id: "msg-13",
    role: "user" as const,
    timestamp: "55 min ago",
    question: "Do you have existing tech stack preferences or constraints?",
    answer: "Must integrate with existing systems",
    selectedOption: 2,
  },
  {
    type: "artifact" as const,
    id: "msg-14",
    role: "assistant" as const,
    timestamp: "55 min ago",
    content: "Got it. Here are your technical requirements:",
    artifactName: "technical-requirements.yaml",
    artifactId: "artifact-2",
    artifactContent: `# Technical Requirements Document

## Integration Requirements
- QuickBooks API for accounting/budget sync
- Procore API for project data migration
- Slack webhooks for team notifications

## Technology Constraints
- Must support real-time collaboration (WebSocket/SSE)
- Mobile-responsive (React Native or PWA)
- Offline-first for job site usage`,
  },

  // STAGE 4: QA TEST PLAN
  {
    type: "divider" as const,
    id: "divider-4",
    stageNumber: 4,
    stageName: "QA Test Plan",
    stageColor: STAGE_COLORS[4],
  },
  {
    type: "loading" as const,
    id: "msg-15",
    role: "assistant" as const,
    timestamp: "50 min ago",
    content: "Analyzing your requirements and generating QA test plan...",
  },
  {
    type: "artifact" as const,
    id: "msg-16",
    role: "assistant" as const,
    timestamp: "50 min ago",
    content:
      "Based on your business and technical requirements, I've generated a comprehensive QA test plan:",
    artifactName: "qa-test-plan.yaml",
    artifactId: "artifact-3",
    artifactContent: `# QA Test Plan

## Functional Test Suites
### User Authentication
- Login with valid credentials
- Login with invalid credentials
- Password reset flow
- Session timeout handling

### Project Management
- Create new project
- Edit project details
- Archive/delete project
- Share project with team members`,
  },

  // STAGE 5: IMPLEMENTATION PLANNER
  {
    type: "divider" as const,
    id: "divider-5",
    stageNumber: 5,
    stageName: "Implementation Planner",
    stageColor: STAGE_COLORS[5],
  },
  {
    type: "text" as const,
    id: "msg-17",
    role: "assistant" as const,
    timestamp: "45 min ago",
    content:
      "Great progress! Now let's talk about implementation. I need to understand your team and timeline.",
  },
  {
    type: "question" as const,
    id: "msg-18",
    role: "assistant" as const,
    timestamp: "45 min ago",
    question: "Tell me about your implementation:",
    formFields: [
      {
        id: "teamSize",
        label: "Team size",
        type: "text" as const,
        placeholder: "e.g., 2 frontend, 1 backend, 1 designer",
      },
      {
        id: "timeline",
        label: "Target timeline",
        type: "text" as const,
        placeholder: "e.g., 3 months to MVP",
      },
    ],
  },
  {
    type: "answer" as const,
    id: "msg-19",
    role: "user" as const,
    timestamp: "40 min ago",
    question: "Team size",
    answer: "3 full-stack engineers, 1 UX designer, 1 PM",
  },

  // STAGE 10: COMPLETE
  {
    type: "divider" as const,
    id: "divider-10",
    stageNumber: 10,
    stageName: "Complete",
    stageColor: STAGE_COLORS[10],
  },
  {
    type: "text" as const,
    id: "msg-20",
    role: "assistant" as const,
    timestamp: "15 min ago",
    content:
      "🎉 Congratulations! Your project plan is complete. I've generated 7 comprehensive artifacts covering everything from business requirements to executive summary. You can review all artifacts in the Artifacts tab.",
  },
];

const SAMPLE_ARTIFACTS = [
  {
    id: "artifact-1",
    name: "gap-analysis.yaml",
    stage: 1,
    stageName: "Gap Analysis",
    status: "created" as const,
    content: "# Gap Analysis\n\n...",
    createdAt: "2 hours ago",
  },
  {
    id: "artifact-2",
    name: "business-requirements.yaml",
    stage: 2,
    stageName: "Business Requirements",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-10")
      ?.artifactContent as string,
    createdAt: "1 hour ago",
  },
  {
    id: "artifact-3",
    name: "technical-requirements.yaml",
    stage: 3,
    stageName: "Technical Requirements",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-14")
      ?.artifactContent as string,
    createdAt: "55 min ago",
  },
  {
    id: "artifact-4",
    name: "qa-test-plan.yaml",
    stage: 4,
    stageName: "QA Test Plan",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-16")
      ?.artifactContent as string,
    createdAt: "50 min ago",
  },
  {
    id: "artifact-5",
    name: "implementation-plan.yaml",
    stage: 5,
    stageName: "Implementation Planner",
    status: "pending" as const,
  },
  {
    id: "artifact-6",
    name: "developer-summary.yaml",
    stage: 6,
    stageName: "Developer Summary",
    status: "pending" as const,
  },
  {
    id: "artifact-7",
    name: "architecture-decisions.yaml",
    stage: 7,
    stageName: "Architecture Decisions",
    status: "pending" as const,
  },
  {
    id: "artifact-8",
    name: "delivery-timeline.yaml",
    stage: 8,
    stageName: "Delivery Timeline",
    status: "pending" as const,
  },
  {
    id: "artifact-9",
    name: "executive-summary.yaml",
    stage: 9,
    stageName: "Executive Summary",
    status: "pending" as const,
  },
];

function WorkflowChatDemo() {
  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        {/* Header with breadcrumb, stage info */}
        <Header
          breadcrumb={[{ label: "Demo Project" }, { label: "run-01" }]}
          stageNum={5}
          stageTotal={10}
          stageName="Implementation Planner"
          mode="build"
          artifactCount={SAMPLE_ARTIFACTS.length}
        />

        {/* Spectrum Stepper */}
        <SpectrumStepper stages={DEMO_STAGES} activeIndex={4} />

        {/* Two-Column Layout: Artifacts + Chat */}
        <div className="flex-1 min-h-0">
          <WorkflowChat
            messages={SAMPLE_MESSAGES}
            artifacts={SAMPLE_ARTIFACTS}
          />
        </div>
      </div>
    </AppLayout>
  );
}
