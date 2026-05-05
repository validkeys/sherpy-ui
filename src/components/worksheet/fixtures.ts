import type { WorksheetRowProps } from './WorksheetRow'

export type WorksheetRowData = Omit<WorksheetRowProps, 'status'>

export const WORKSHEET_GAPS_NINE_ROW: WorksheetRowData[] = [
  {
    n: '01',
    category: 'Success metrics',
    question: "What's the v1 success metric and target value?",
    why: "Doc states 'measure outcomes' but no metric defined.",
  },
  {
    n: '02',
    category: 'User roles',
    question: 'Are there read-only viewers, or is it write-access for everyone?',
    why: "PRD lists 'users' once. Permissions implied but not specified.",
  },
  {
    n: '03',
    category: 'Constraints',
    question: 'Hard launch date — is it a real deadline or directional?',
    why: "'Q2 launch' mentioned without commitment language.",
  },
  {
    n: '04',
    category: 'Scope',
    question: 'Does v1 include billing, or is that a fast-follow?',
    why: 'Billing referenced in goals but not in feature list.',
    muted: true,
  },
  {
    n: '05',
    category: 'Integrations',
    question: 'Which existing systems must this read from / write to?',
    muted: true,
  },
  {
    n: '06',
    category: 'Compliance',
    question: 'Any data-residency or audit-log requirements?',
  },
  {
    n: '07',
    category: 'Personas',
    question: 'Who is the primary user of Sherpy on day one — PM, IC, or exec?',
  },
  {
    n: '08',
    category: 'Success',
    question: "What does 'done' look like at the end of the first interview run?",
  },
  {
    n: '09',
    category: 'Rollout',
    question: 'Is there a phased rollout or a full launch to all users from day one?',
  },
]

export const WORKSHEET_FRAME_E_ROWS: WorksheetRowProps[] = [
  { ...WORKSHEET_GAPS_NINE_ROW[0], status: 'filled', why: 'Answer: "WAU ≥ 200 by week 8 post-launch"', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[1], status: 'filled', why: 'Answer: "Three roles — admin / editor / viewer"', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[2], status: 'needs-review', why: 'Answer: "Q2" — Sherpy: needs an exact date for sequencing.', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[3], status: 'filled', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[4], status: 'merging', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[5], muted: true },
]

export const WORKSHEET_FRAME_F_ROWS: WorksheetRowProps[] = [
  { ...WORKSHEET_GAPS_NINE_ROW[0], status: 'filled', why: 'WAU ≥ 200 by week 8 post-launch', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[1], status: 'filled', why: 'Three roles — admin / editor / viewer', muted: false },
  {
    ...WORKSHEET_GAPS_NINE_ROW[2],
    status: 'needs-review',
    why: 'Answer was "Q2". Sherpy needs an exact date for sequencing — pick one or confirm directional.',
    muted: false,
  },
  { ...WORKSHEET_GAPS_NINE_ROW[3], status: 'filled', why: 'Fast-follow — billing not in v1', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[4], status: 'filled', why: 'Read: GitHub, Slack. Write: Confluence.', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[5], status: 'filled', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[6], status: 'filled', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[7], status: 'filled', muted: false },
  { ...WORKSHEET_GAPS_NINE_ROW[8], status: 'filled', muted: false },
]
