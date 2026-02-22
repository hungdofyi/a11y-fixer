/**
 * OAuth configuration for Claude PKCE flow.
 * Uses Anthropic's public OAuth endpoints and hosted callback page.
 */

export const OAUTH_CONFIG = {
  clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  authorizationUrl: 'https://claude.ai/oauth/authorize',
  tokenUrl: 'https://console.anthropic.com/v1/oauth/token',
  redirectUri: 'https://console.anthropic.com/oauth/code/callback',
  scopes: 'org:create_api_key user:profile user:inference',
  /** Max time (ms) to complete auth after starting flow */
  stateExpiryMs: 10 * 60 * 1000,
} as const;
