/**
 * WorkflowChat Storybook - Complete workflow mockup
 *
 * Shows examples from all 10 stages in a continuous chat conversation
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkflowChat } from "./WorkflowChat";

const meta = {
  title: "Workflow/Chat-Based Workflow",
  component: WorkflowChat,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof WorkflowChat>;

export default meta;
type Story = StoryObj<typeof meta>;

// Stage colors from design system
const STAGE_COLORS = {
  1: "var(--bot-1)", // lichen
  2: "var(--bot-2)", // sage
  3: "var(--bot-3)", // sea-glass
  4: "var(--bot-4)", // moss
  5: "var(--bot-5)", // dried grass
  6: "var(--bot-6)", // honey
  7: "var(--bot-7)", // ochre
  8: "var(--bot-8)", // terracotta
  9: "var(--bot-9)", // plum
  10: "var(--neutral-4)", // neutral for final stage
};

const SAMPLE_MESSAGES = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 1: GAP ANALYSIS (Form)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 2: BUSINESS REQUIREMENTS (Interview)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    type: "question" as const,
    id: "msg-10",
    role: "assistant" as const,
    timestamp: "1 hour ago",
    question:
      "How will you measure success? What metrics matter most to your business?",
    formFields: [
      {
        id: "successMetrics",
        label: "Success metrics",
        type: "textarea" as const,
        placeholder: "e.g., DAU, retention rate, NPS score...",
      },
    ],
  },
  {
    type: "answer" as const,
    id: "msg-11",
    role: "user" as const,
    timestamp: "1 hour ago",
    question: "How will you measure success?",
    answer:
      "Weekly active users, project completion rate, time saved vs. traditional tools, and user satisfaction score (CSAT > 4.5/5)",
  },
  {
    type: "artifact" as const,
    id: "msg-12",
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
- Customer Satisfaction (CSAT > 4.5/5)

## Market Positioning
- Target: Small to medium construction firms
- Differentiation: Real-time collaboration + budget tracking integration`,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 3: TECHNICAL REQUIREMENTS (Interview)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-3",
    stageNumber: 3,
    stageName: "Technical Requirements",
    stageColor: STAGE_COLORS[3],
  },
  {
    type: "text" as const,
    id: "msg-13",
    role: "assistant" as const,
    timestamp: "1 hour ago",
    content:
      "Now let's talk technical requirements. I'll ask about your tech stack preferences, constraints, and integration needs.",
  },
  {
    type: "question" as const,
    id: "msg-14",
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
    id: "msg-15",
    role: "user" as const,
    timestamp: "1 hour ago",
    question: "Do you have existing tech stack preferences or constraints?",
    answer: "Must integrate with existing systems",
    selectedOption: 2,
  },
  {
    type: "question" as const,
    id: "msg-16",
    role: "assistant" as const,
    timestamp: "55 min ago",
    question: "What systems do you need to integrate with?",
    formFields: [
      {
        id: "integrations",
        label: "Required integrations",
        type: "textarea" as const,
        placeholder: "e.g., QuickBooks, Salesforce, Slack...",
      },
    ],
  },
  {
    type: "answer" as const,
    id: "msg-17",
    role: "user" as const,
    timestamp: "55 min ago",
    question: "What systems do you need to integrate with?",
    answer:
      "QuickBooks for accounting, Procore for existing project data, Slack for team notifications",
  },
  {
    type: "artifact" as const,
    id: "msg-18",
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
- Offline-first for job site usage

## Performance Requirements
- Page load < 2s
- Real-time updates < 500ms latency
- Support 50 concurrent users per project

## Security Requirements
- SOC 2 compliance path
- Role-based access control (RBAC)
- Data encryption at rest and in transit`,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 4: QA TEST PLAN (Automated Generation)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-4",
    stageNumber: 4,
    stageName: "QA Test Plan",
    stageColor: STAGE_COLORS[4],
  },
  {
    type: "loading" as const,
    id: "msg-19",
    role: "assistant" as const,
    timestamp: "50 min ago",
    content: "Analyzing your requirements and generating QA test plan...",
  },
  {
    type: "artifact" as const,
    id: "msg-20",
    role: "assistant" as const,
    timestamp: "50 min ago",
    content:
      "Based on your business and technical requirements, I've generated a comprehensive QA test plan covering functional, integration, and performance testing:",
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
- Share project with team members

### Real-time Collaboration
- Multiple users editing simultaneously
- Conflict resolution
- Change notification propagation
- Offline mode sync

## Integration Test Suites

### QuickBooks Integration
- Sync budget data
- Create expense entries
- Handle API rate limits
- Error recovery

### Procore Integration
- Import existing projects
- Data transformation accuracy
- Large dataset handling

## Performance Test Suites
- Load test: 50 concurrent users
- Stress test: Real-time updates under load
- Soak test: 24-hour stability
- Mobile network simulation`,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 5: IMPLEMENTATION PLANNER (Form)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-5",
    stageNumber: 5,
    stageName: "Implementation Planner",
    stageColor: STAGE_COLORS[5],
  },
  {
    type: "text" as const,
    id: "msg-21",
    role: "assistant" as const,
    timestamp: "45 min ago",
    content:
      "Great progress! Now let's talk about implementation. I need to understand your team and timeline.",
  },
  {
    type: "question" as const,
    id: "msg-22",
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
      {
        id: "constraints",
        label: "Any constraints or blockers?",
        type: "textarea" as const,
        placeholder: "Budget, resources, dependencies...",
      },
    ],
  },
  {
    type: "answer" as const,
    id: "msg-23",
    role: "user" as const,
    timestamp: "40 min ago",
    question: "Team size",
    answer: "3 full-stack engineers, 1 UX designer, 1 PM",
  },
  {
    type: "answer" as const,
    id: "msg-24",
    role: "user" as const,
    timestamp: "40 min ago",
    question: "Target timeline",
    answer: "4 months to beta launch with 10 pilot customers",
  },
  {
    type: "answer" as const,
    id: "msg-25",
    role: "user" as const,
    timestamp: "40 min ago",
    question: "Any constraints or blockers?",
    answer:
      "Limited budget for third-party services. Need to use free tiers initially.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 6: DEVELOPER SUMMARY (Automated)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-6",
    stageNumber: 6,
    stageName: "Developer Summary",
    stageColor: STAGE_COLORS[6],
  },
  {
    type: "loading" as const,
    id: "msg-26",
    role: "assistant" as const,
    timestamp: "35 min ago",
    content: "Creating developer-focused summary...",
  },
  {
    type: "artifact" as const,
    id: "msg-27",
    role: "assistant" as const,
    timestamp: "35 min ago",
    content: "Here's a concise developer summary for your engineering team:",
    artifactName: "developer-summary.yaml",
    artifactId: "artifact-4",
    artifactContent: `# Developer Summary

## Project: Construction PM SaaS

### Tech Stack (Recommended)
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + PostgreSQL
- **Real-time**: Socket.io for collaboration
- **Hosting**: Vercel (frontend) + Railway (backend)

### Core Features (MVP)
1. Project dashboard with budget tracking
2. Real-time collaborative editing
3. Timeline/Gantt chart visualization
4. Team member management & permissions
5. QuickBooks integration (read-only for MVP)

### Integration Points
- QuickBooks OAuth + REST API
- Procore API for data import
- Slack incoming webhooks

### Performance Targets
- < 2s initial load
- < 500ms for real-time updates
- Support 50 concurrent users/project

### Timeline: 4 months to beta
- Month 1: Core auth + project CRUD
- Month 2: Real-time collaboration + timeline viz
- Month 3: Integrations (QB, Procore, Slack)
- Month 4: Polish + pilot customer onboarding`,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 7: ARCHITECTURE DECISIONS (Automated)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-7",
    stageNumber: 7,
    stageName: "Architecture Decisions",
    stageColor: STAGE_COLORS[7],
  },
  {
    type: "loading" as const,
    id: "msg-28",
    role: "assistant" as const,
    timestamp: "30 min ago",
    content: "Documenting key architecture decisions...",
  },
  {
    type: "artifact" as const,
    id: "msg-29",
    role: "assistant" as const,
    timestamp: "30 min ago",
    content: "I've documented the key architectural decisions with rationale:",
    artifactName: "architecture-decisions.yaml",
    artifactId: "artifact-5",
    artifactContent: `# Architecture Decision Records (ADR)

## ADR-001: Monorepo with pnpm workspaces
**Decision**: Use single repo with separate packages for frontend/backend
**Rationale**: Small team, shared types, easier deployment
**Consequences**: Single CI/CD pipeline, shared dependencies

## ADR-002: PostgreSQL over MongoDB
**Decision**: Use PostgreSQL as primary database
**Rationale**:
- Strong ACID guarantees for financial data
- Better support for complex queries (reports)
- Free tier on Railway
**Consequences**: Need migration strategy for schema changes

## ADR-003: Socket.io for real-time
**Decision**: Use Socket.io over native WebSockets
**Rationale**:
- Built-in reconnection logic
- Room management for projects
- Fallback to long-polling
**Consequences**: Additional dependency, but proven at scale

## ADR-004: Optimistic UI updates
**Decision**: Apply changes immediately, sync in background
**Rationale**: Better UX for collaboration features
**Consequences**: Need conflict resolution strategy

## ADR-005: JWT + HTTP-only cookies
**Decision**: Store auth tokens in HTTP-only cookies
**Rationale**: Better XSS protection than localStorage
**Consequences**: Need CSRF protection, can't access from JS`,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 8: DELIVERY TIMELINE (Automated)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-8",
    stageNumber: 8,
    stageName: "Delivery Timeline",
    stageColor: STAGE_COLORS[8],
  },
  {
    type: "loading" as const,
    id: "msg-30",
    role: "assistant" as const,
    timestamp: "25 min ago",
    content: "Generating detailed delivery timeline...",
  },
  {
    type: "artifact" as const,
    id: "msg-31",
    role: "assistant" as const,
    timestamp: "25 min ago",
    content: "Here's your 4-month delivery timeline with milestones:",
    artifactName: "delivery-timeline.yaml",
    artifactId: "artifact-6",
    artifactContent: `# Delivery Timeline

## Month 1: Foundation (Weeks 1-4)
- Week 1: Project setup, CI/CD, hosting
- Week 2-3: Auth system (login, signup, session mgmt)
- Week 4: Project CRUD + basic dashboard

**Milestone**: User can create account and manage projects

## Month 2: Core Features (Weeks 5-8)
- Week 5: Real-time collaboration foundation (Socket.io)
- Week 6: Timeline visualization (Gantt chart)
- Week 7: Budget tracking UI + calculations
- Week 8: Team member management + permissions

**Milestone**: MVP feature-complete for internal testing

## Month 3: Integrations (Weeks 9-12)
- Week 9: QuickBooks OAuth + read-only sync
- Week 10: Procore data import tool
- Week 11: Slack notification system
- Week 12: Error handling + retry logic

**Milestone**: All integrations functional

## Month 4: Beta Launch (Weeks 13-16)
- Week 13: Performance optimization + load testing
- Week 14: Bug fixes from internal QA
- Week 15: Pilot customer onboarding (5 customers)
- Week 16: Gather feedback + iteration

**Milestone**: 10 pilot customers using platform

## Key Dates
- **Week 8**: Internal demo to stakeholders
- **Week 12**: Beta feature freeze
- **Week 15**: Pilot launch
- **Week 16**: Retrospective + planning for v1.1`,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 9: EXECUTIVE SUMMARY (Automated)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-9",
    stageNumber: 9,
    stageName: "Executive Summary",
    stageColor: STAGE_COLORS[9],
  },
  {
    type: "loading" as const,
    id: "msg-32",
    role: "assistant" as const,
    timestamp: "20 min ago",
    content: "Creating executive summary for stakeholders...",
  },
  {
    type: "artifact" as const,
    id: "msg-33",
    role: "assistant" as const,
    timestamp: "20 min ago",
    content:
      "Here's a high-level executive summary for leadership and stakeholders:",
    artifactName: "executive-summary.yaml",
    artifactId: "artifact-7",
    artifactContent: `# Executive Summary

## Project: Construction PM SaaS Platform

### Vision
A modern, cloud-based project management platform purpose-built for construction firms, enabling real-time collaboration and budget visibility.

### Business Opportunity
- **Market**: $2B construction project management software market
- **Target**: Small to mid-size construction firms (10-50 employees)
- **Problem**: Current tools lack real-time collaboration + budget integration

### Success Metrics (Year 1)
- 100 active users (validation goal)
- 4.5+ CSAT score
- Measurable time savings vs. spreadsheets/legacy tools

### Investment Required
- **Team**: 5 people (3 engineers, 1 designer, 1 PM)
- **Timeline**: 4 months to beta with 10 pilot customers
- **Budget**: Minimal - leveraging free tiers initially

### Key Risks & Mitigation
1. **Risk**: Integration complexity with QB/Procore
   **Mitigation**: Start with read-only, expand later

2. **Risk**: Real-time performance at scale
   **Mitigation**: Load testing before pilot launch

3. **Risk**: Customer adoption in conservative industry
   **Mitigation**: Pilot with friendly customers, gather feedback

### Go/No-Go Decision Points
- **Week 8**: Internal demo - features meet expectations?
- **Week 12**: Beta ready - performance/stability acceptable?
- **Week 16**: Pilot feedback - continue to v1.1?

### Recommendation
**PROCEED** - Clear market need, achievable scope, experienced team.`,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 10: COMPLETE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    type: "divider" as const,
    id: "divider-10",
    stageNumber: 10,
    stageName: "Complete",
    stageColor: STAGE_COLORS[10],
  },
  {
    type: "text" as const,
    id: "msg-34",
    role: "assistant" as const,
    timestamp: "15 min ago",
    content:
      "🎉 Congratulations! Your project plan is complete. I've generated 7 comprehensive artifacts covering everything from business requirements to executive summary. You can review all artifacts in the Artifacts tab, or download them for your team. Ready to start building?",
  },
];

const SAMPLE_ARTIFACTS = [
  {
    id: "artifact-1",
    name: "business-requirements.yaml",
    stage: 2,
    stageName: "Business Requirements",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-12")
      ?.artifactContent as string,
    createdAt: "1 hour ago",
  },
  {
    id: "artifact-2",
    name: "technical-requirements.yaml",
    stage: 3,
    stageName: "Technical Requirements",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-18")
      ?.artifactContent as string,
    createdAt: "55 min ago",
  },
  {
    id: "artifact-3",
    name: "qa-test-plan.yaml",
    stage: 4,
    stageName: "QA Test Plan",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-20")
      ?.artifactContent as string,
    createdAt: "50 min ago",
  },
  {
    id: "artifact-4",
    name: "developer-summary.yaml",
    stage: 6,
    stageName: "Developer Summary",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-27")
      ?.artifactContent as string,
    createdAt: "35 min ago",
  },
  {
    id: "artifact-5",
    name: "architecture-decisions.yaml",
    stage: 7,
    stageName: "Architecture Decisions",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-29")
      ?.artifactContent as string,
    createdAt: "30 min ago",
  },
  {
    id: "artifact-6",
    name: "delivery-timeline.yaml",
    stage: 8,
    stageName: "Delivery Timeline",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-31")
      ?.artifactContent as string,
    createdAt: "25 min ago",
  },
  {
    id: "artifact-7",
    name: "executive-summary.yaml",
    stage: 9,
    stageName: "Executive Summary",
    status: "created" as const,
    content: SAMPLE_MESSAGES.find((m) => m.id === "msg-33")
      ?.artifactContent as string,
    createdAt: "20 min ago",
  },
];

/**
 * Complete 10-stage workflow showing:
 * - Stage 1: Form-based gap analysis
 * - Stage 2-3: Interview-style Q&A
 * - Stage 4-9: Automated artifact generation
 * - Stage 10: Completion
 *
 * Shows all interaction patterns: forms, multiple choice, free text,
 * loading states, artifact pills, and stage dividers.
 */
export const CompleteWorkflow: Story = {
  args: {
    messages: SAMPLE_MESSAGES,
    artifacts: SAMPLE_ARTIFACTS,
  },
};

/**
 * Early stage - showing just Stage 1 & 2
 */
export const EarlyStage: Story = {
  args: {
    messages: SAMPLE_MESSAGES.slice(0, 12),
    artifacts: SAMPLE_ARTIFACTS.slice(0, 1),
  },
};

/**
 * Mid-stage - showing through Stage 5
 */
export const MidStage: Story = {
  args: {
    messages: SAMPLE_MESSAGES.slice(0, 26),
    artifacts: SAMPLE_ARTIFACTS.slice(0, 4),
  },
};
