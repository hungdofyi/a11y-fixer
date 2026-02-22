/**
 * OAuth 2.0 PKCE flow for web UI context.
 * Backend builds auth URL + stores PKCE state in memory.
 * Frontend opens auth URL in new tab, user copies code, frontend sends it back.
 */
import { OAUTH_CONFIG } from './oauth-config.js';
import { generatePkceParams } from './pkce.js';
import { saveToken, loadToken, isTokenValid } from './token-storage.js';
import type { OAuthToken } from './token-storage.js';

/** In-memory PKCE state for the current auth flow */
interface OAuthState {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  expiresAt: number;
}

let currentOAuthState: OAuthState | null = null;

/** Build authorization URL with PKCE params and store state in memory */
export function buildAuthorizationUrl(): { authUrl: string; state: string } {
  const pkce = generatePkceParams();

  currentOAuthState = {
    state: pkce.state,
    codeVerifier: pkce.codeVerifier,
    codeChallenge: pkce.codeChallenge,
    expiresAt: Date.now() + OAUTH_CONFIG.stateExpiryMs,
  };

  const params = new URLSearchParams({
    code: 'true',
    client_id: OAUTH_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: OAUTH_CONFIG.redirectUri,
    scope: OAUTH_CONFIG.scopes,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    state: pkce.state,
  });

  const authUrl = `${OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
  return { authUrl, state: pkce.state };
}

/** Exchange authorization code for tokens using stored PKCE verifier */
export async function exchangeAuthCode(code: string, state: string): Promise<OAuthToken> {
  if (!currentOAuthState) {
    throw new Error('No OAuth state found. Please start authentication again.');
  }

  if (Date.now() >= currentOAuthState.expiresAt) {
    currentOAuthState = null;
    throw new Error('OAuth state expired. Please try again.');
  }

  if (currentOAuthState.state !== state) {
    currentOAuthState = null;
    throw new Error('OAuth state mismatch — possible CSRF attack.');
  }

  // Capture verifier and clear state before exchange to prevent reuse
  const codeVerifier = currentOAuthState.codeVerifier;
  const storedState = currentOAuthState.state;
  currentOAuthState = null;

  // Clean code (strip URL fragments/extra params if user pastes full URL)
  const cleanCode = code.split('#')[0]?.split('&')[0] ?? code;

  const body = {
    grant_type: 'authorization_code',
    client_id: OAUTH_CONFIG.clientId,
    code: cleanCode,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    code_verifier: codeVerifier,
    state: storedState,
  };

  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://claude.ai/',
      Origin: 'https://claude.ai',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText) as { error_description?: string; error?: string };
      errorMessage = errorJson.error_description ?? errorJson.error ?? errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`Token exchange failed (${response.status}): ${errorMessage}`);
  }

  const data = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  if (!data.access_token) {
    throw new Error('Token exchange succeeded but no access_token in response');
  }

  const token: OAuthToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    tokenType: data.token_type ?? 'Bearer',
  };

  saveToken(token);
  return token;
}

/** Refresh an expired access token using the refresh token */
export async function refreshToken(token: OAuthToken): Promise<OAuthToken> {
  if (!token.refreshToken) throw new Error('No refresh token available');

  const body = {
    grant_type: 'refresh_token',
    client_id: OAUTH_CONFIG.clientId,
    refresh_token: token.refreshToken,
  };

  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://claude.ai/',
      Origin: 'https://claude.ai',
    },
    body: JSON.stringify(body),
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
 * Get a valid OAuth token, refreshing if needed.
 * Returns null if no token stored.
 */
export async function getValidToken(): Promise<OAuthToken | null> {
  const stored = loadToken();

  if (stored && isTokenValid(stored)) return stored;

  if (stored?.refreshToken) {
    try {
      return await refreshToken(stored);
    } catch {
      // Refresh failed, needs re-auth
    }
  }

  return null;
}
