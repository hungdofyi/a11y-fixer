/**
 * OAuth 2.0 PKCE flow: start authorization, handle callback, refresh tokens.
 * Opens browser for user authorization and runs a local HTTP server for callback.
 */
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { execFile } from 'node:child_process';
import { OAUTH_CONFIG, CALLBACK_PORT, CALLBACK_PATH } from './oauth-config.js';
import { generatePkceParams } from './pkce.js';
import { saveToken, loadToken, isTokenValid } from './token-storage.js';
import type { OAuthToken } from './token-storage.js';

/** Build the authorization URL with PKCE parameters */
function buildAuthUrl(codeChallenge: string, state: string): string {
  const url = new URL(OAUTH_CONFIG.authorizationUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', OAUTH_CONFIG.clientId);
  url.searchParams.set('redirect_uri', OAUTH_CONFIG.redirectUri);
  url.searchParams.set('scope', OAUTH_CONFIG.scopes.join(' '));
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  return url.toString();
}

/** Open URL in the system default browser */
function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  execFile(cmd, [url]);
}

/** Wait for the OAuth callback on the local HTTP server, returns auth code */
async function waitForCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url?.startsWith(CALLBACK_PATH)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const params = new URL(req.url, `http://localhost:${CALLBACK_PORT}`).searchParams;
      const error = params.get('error');
      const code = params.get('code');
      const state = params.get('state');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization failed</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error(`OAuth error: ${error} - ${params.get('error_description') ?? ''}`));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>State mismatch</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error('OAuth state mismatch - possible CSRF attack'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>No code received</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error('No authorization code received'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization successful!</h1><p>You can close this window and return to the terminal.</p>');
      server.close();
      resolve(code);
    });

    server.listen(CALLBACK_PORT, 'localhost', () => {
      // Server ready - browser can now redirect here
    });

    server.on('error', reject);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth callback timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

/** Exchange authorization code for tokens */
async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<OAuthToken> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    client_id: OAUTH_CONFIG.clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    tokenType: data.token_type ?? 'Bearer',
  };
}

/** Refresh an expired access token using the refresh token */
export async function refreshToken(token: OAuthToken): Promise<OAuthToken> {
  if (!token.refreshToken) throw new Error('No refresh token available');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: token.refreshToken,
    client_id: OAUTH_CONFIG.clientId,
  });

  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  const refreshed: OAuthToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? token.refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    tokenType: data.token_type ?? token.tokenType,
  };

  saveToken(refreshed);
  return refreshed;
}

/**
 * Start the OAuth PKCE flow: open browser, wait for callback, exchange code.
 * Returns the stored OAuthToken after successful authorization.
 */
export async function startOAuthFlow(): Promise<OAuthToken> {
  const pkce = generatePkceParams();
  const authUrl = buildAuthUrl(pkce.codeChallenge, pkce.state);

  console.log('\nOpening browser for Claude authorization...');
  console.log('If browser does not open, visit:\n', authUrl, '\n');
  openBrowser(authUrl);

  const code = await waitForCallback(pkce.state);
  const token = await exchangeCodeForToken(code, pkce.codeVerifier);
  saveToken(token);
  return token;
}

/**
 * Get a valid OAuth token, refreshing or re-authorizing as needed.
 * Returns null if no token and flow is skipped (non-interactive mode).
 */
export async function getValidToken(interactive = true): Promise<OAuthToken | null> {
  const stored = loadToken();

  if (stored && isTokenValid(stored)) return stored;

  if (stored?.refreshToken) {
    try {
      return await refreshToken(stored);
    } catch {
      // Refresh failed, fall through to re-auth
    }
  }

  if (!interactive) return null;

  return startOAuthFlow();
}
