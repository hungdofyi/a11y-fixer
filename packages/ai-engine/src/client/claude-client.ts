/**
 * Claude Agent SDK wrapper with OAuth token injection.
 * Falls back to ANTHROPIC_API_KEY if no OAuth token is stored.
 */
import { query } from '@anthropic-ai/claude-agent-sdk';
import { getValidToken } from '../auth/oauth-flow.js';

export interface QueryOptions {
  /** Model to use, defaults to claude-sonnet-4-5 */
  model?: string;
  /** Max tokens in response */
  maxTokens?: number;
  /** System prompt override */
  systemPrompt?: string;
}

export interface AgentResponse {
  text: string;
  /** Whether the response came from cache */
  fromCache?: boolean;
}

const DEFAULT_MODEL = 'claude-sonnet-4-5';

/**
 * Load OAuth token and set CLAUDE_CODE_OAUTH_TOKEN env var.
 * No-op if ANTHROPIC_API_KEY is already set.
 * Returns true if auth was configured successfully.
 */
export async function setupAuth(interactive = false): Promise<boolean> {
  // API key takes priority
  if (process.env['ANTHROPIC_API_KEY']) return true;

  // Try to get stored OAuth token (non-interactive by default)
  const token = await getValidToken(interactive);
  if (!token) return false;

  process.env['CLAUDE_CODE_OAUTH_TOKEN'] = token.accessToken;
  return true;
}

/**
 * Send a prompt to Claude via the Agent SDK.
 * Requires either CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY to be set.
 * Call setupAuth() before this if using OAuth.
 */
export async function queryAgent(
  prompt: string,
  options: QueryOptions = {}
): Promise<AgentResponse> {
  const { model = DEFAULT_MODEL, maxTokens = 4096, systemPrompt } = options;

  let fullText = '';

  // query() accepts { prompt, options? }. Model and other settings go in options.
  const queryOpts: Record<string, unknown> = { model };
  if (systemPrompt) {
    queryOpts['systemPrompt'] = systemPrompt;
  }

  const stream = query({
    prompt,
    options: queryOpts as Parameters<typeof query>[0]['options'],
  });

  for await (const event of stream) {
    if (
      event.type === 'assistant' &&
      event.message?.content
    ) {
      for (const block of event.message.content) {
        if (block.type === 'text') {
          fullText += block.text;
        }
      }
    }
  }

  return { text: fullText.trim() };
}
