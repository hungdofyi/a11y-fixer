/**
 * Analyzes complex accessibility violations using Claude AI
 * and returns structured fix suggestions with confidence scoring.
 */
import type { Violation, FixSuggestion } from '@a11y-fixer/core';
import { queryAgent } from '../client/claude-client.js';
import { getCached, setCached, computeCacheKey } from '../client/response-cache.js';
import { FIX_SYSTEM_PROMPT, FIX_USER_PROMPT } from '../prompts/fix-suggestion-prompt.js';
import { interpolate } from '../prompts/prompt-builder.js';

/** Parsed AI response for a fix suggestion */
interface AiFixResponse {
  description: string;
  codeSnippetBefore: string;
  codeSnippetAfter: string;
  confidence: number;
  wcagCriteria?: string[];
}

/** Parse JSON from AI response, tolerating markdown code fences */
function parseAiResponse(text: string): AiFixResponse {
  // Strip markdown code fences if present
  const jsonText = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  const parsed = JSON.parse(jsonText) as AiFixResponse;

  // Clamp confidence to 0-1
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));
  return parsed;
}

/**
 * Analyze a complex accessibility violation using Claude AI.
 * Returns a FixSuggestion with AI-generated code fix and confidence score.
 * Uses cache to avoid redundant API calls for identical inputs.
 */
export async function analyzeComplexIssue(
  violation: Violation,
  sourceCode: string
): Promise<FixSuggestion> {
  const cacheKey = computeCacheKey('fix', violation.ruleId, violation.nodes[0]?.html, sourceCode);
  const cached = getCached(cacheKey);

  if (cached) {
    const parsed = parseAiResponse(cached);
    return buildFixSuggestion(violation, parsed);
  }

  const firstNode = violation.nodes[0];
  const userPrompt = interpolate(FIX_USER_PROMPT, {
    ruleId: violation.ruleId,
    violationDescription: violation.description,
    wcagCriteria: violation.wcagCriteria.join(', '),
    severity: violation.severity,
    elementHtml: firstNode?.html ?? 'N/A',
    failureSummary: firstNode?.failureSummary ?? 'N/A',
    sourceCode: sourceCode.slice(0, 4000), // Limit source to avoid token overflow
  });

  const response = await queryAgent(userPrompt, {
    systemPrompt: FIX_SYSTEM_PROMPT,
    maxTokens: 1024,
  });

  setCached(cacheKey, response.text);
  const parsed = parseAiResponse(response.text);
  return buildFixSuggestion(violation, parsed);
}

function buildFixSuggestion(violation: Violation, ai: AiFixResponse): FixSuggestion {
  return {
    violationId: `${violation.ruleId}:${violation.nodes[0]?.target.join(',')}`,
    ruleId: violation.ruleId,
    description: ai.description,
    codeSnippetBefore: ai.codeSnippetBefore,
    codeSnippetAfter: ai.codeSnippetAfter,
    confidence: ai.confidence,
    source: 'ai',
    wcagCriteria: ai.wcagCriteria ?? violation.wcagCriteria,
  };
}
