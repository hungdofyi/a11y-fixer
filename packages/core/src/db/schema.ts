import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url'),
  repoPath: text('repo_path'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const scans = sqliteTable('scans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  scanType: text('scan_type').notNull(), // browser | static | keyboard | combined
  status: text('status').notNull().default('pending'), // pending | running | completed | failed
  config: text('config'), // JSON string of scan configuration
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  totalPages: integer('total_pages').default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scanId: integer('scan_id').notNull().references(() => scans.id),
  ruleId: text('rule_id').notNull(),
  wcagCriteria: text('wcag_criteria').notNull(), // JSON array string
  severity: text('severity').notNull(), // critical | serious | moderate | minor
  description: text('description').notNull(),
  element: text('element'),
  selector: text('selector'),
  html: text('html'),
  pageUrl: text('page_url'),
  filePath: text('file_path'),
  line: integer('line'),
  column: integer('column'),
  fixSuggestion: text('fix_suggestion'), // JSON string of FixSuggestion
  failureSummary: text('failure_summary'),
  helpUrl: text('help_url'),
  screenshotPath: text('screenshot_path'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const vpatEntries = sqliteTable('vpat_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  scanId: integer('scan_id').references(() => scans.id),
  criterionId: text('criterion_id').notNull(),
  standard: text('standard').notNull(), // wcag | section508 | en301549
  conformanceStatus: text('conformance_status').notNull(),
  remarks: text('remarks').notNull(),
  evidence: text('evidence'), // JSON string of VpatEvidence[]
  remediationPlan: text('remediation_plan'),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
