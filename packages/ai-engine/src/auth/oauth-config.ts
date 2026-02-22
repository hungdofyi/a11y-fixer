/**
 * OAuth configuration for Claude Agent SDK PKCE flow.
 * Uses the same CLIENT_ID and endpoints as claude.ai OAuth.
 */

export const OAUTH_CONFIG = {
  clientId: '9d1c250a-e61b-48f7-a536-4b56f49c4de3',
  authorizationUrl: 'https://claude.ai/oauth/authorize',
  tokenUrl: 'https://claude.ai/oauth/token',
  redirectUri: 'http://localhost:54321/oauth/callback',
  scopes: ['user:inference', 'user:profile'],
} as const;

/** Local HTTP server port for OAuth callback */
export const CALLBACK_PORT = 54321;

/** OAuth callback path */
export const CALLBACK_PATH = '/oauth/callback';
