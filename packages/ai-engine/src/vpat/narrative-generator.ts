/**
 * Generates professional VPAT conformance narrative for a single criterion
 * using Claude AI with structured evidence from scan results.
 */
import type { VpatEntry, VpatEvidence } from '@a11y-fixer/core';
import type { ConformanceStatus } from '@a11y-fixer/core';
import { queryAgent } from '../client/claude-client.js';
import { getCached, setCached, computeCacheKey } from '../client/response-cache.js';
import { VPAT_SYSTEM_PROMPT, VPAT_USER_PROMPT } from '../prompts/vpat-narrative-prompt.js';
import { interpolate } from '../prompts/prompt-builder.js';
import { getCriterionTitle, getCriterionLevel } from '../vpat/criterion-lookup.js';

/** Evidence passed to narrative generation */
export interface NarrativeEvidence {
  criterionId: string;
  standard: 'wcag' | 'section508' | 'en301549';
  conformanceStatus: ConformanceStatus;
  violations: Array<{ ruleId: string; description: string; nodeCount: number }>;
  passes: Array<{ ruleId: string; description: string }>;
}

interface AiNarrativeResponse {
  remarks: string;
  remediationPlan?: string | null;
}

/** Parse AI JSON response, tolerating markdown fences */
function parseResponse(text: string): AiNarrativeResponse {
  const jsonText = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(jsonText) as AiNarrativeResponse;
}

/**
 * Generate a professional VPAT narrative for a single WCAG/508 criterion.
 * Uses cache keyed on criterionId + evidence hash to avoid redundant calls.
 */
export async function generateNarrative(evidence: NarrativeEvidence): Promise<VpatEntry> {
  const cacheKey = computeCacheKey('vpat-narrative', evidence.criterionId, evidence.conformanceStatus, evidence.violations);
  const cached = getCached(cacheKey);

  let aiResponse: AiNarrativeResponse;

  if (cached) {
    aiResponse = parseResponse(cached);
  } else {
    const violationSummary = evidence.violations.length === 0
      ? 'No violations detected'
      : evidence.violations.map(v => `- ${v.ruleId}: ${v.description} (${v.nodeCount} node(s))`).join('\n');

    const passSummary = evidence.passes.length === 0
      ? 'No passing checks'
      : evidence.passes.map(p => `- ${p.ruleId}: ${p.description}`).join('\n');

    const title = getCriterionTitle(evidence.criterionId);
    const level = getCriterionLevel(evidence.criterionId);

    const userPrompt = interpolate(VPAT_USER_PROMPT, {
      criterionId: evidence.criterionId,
      criterionTitle: title,
      level: level ?? 'N/A',
      standard: evidence.standard,
      conformanceStatus: evidence.conformanceStatus,
      violationCount: String(evidence.violations.length),
      violationSummary,
      passCount: String(evidence.passes.length),
      passSummary,
    });

    const response = await queryAgent(userPrompt, {
      systemPrompt: VPAT_SYSTEM_PROMPT,
      maxTokens: 512,
    });

    setCached(cacheKey, response.text);
    aiResponse = parseResponse(response.text);
  }

  const title = getCriterionTitle(evidence.criterionId);
  const level = getCriterionLevel(evidence.criterionId);

  const vpatEvidence: VpatEvidence[] = evidence.violations.map(v => ({
    source: 'automated' as const,
    description: `${v.ruleId}: ${v.description} (${v.nodeCount} affected element(s))`,
    ruleIds: [v.ruleId],
  }));

  return {
    standard: evidence.standard,
    criterionId: evidence.criterionId,
    title,
    level: level ?? undefined,
    conformanceStatus: evidence.conformanceStatus,
    remarks: aiResponse.remarks,
    evidence: vpatEvidence,
    remediationPlan: aiResponse.remediationPlan ?? undefined,
  };
}
