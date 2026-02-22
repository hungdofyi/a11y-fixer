/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0.
 * Matches the exact encoding used by Claude's OAuth provider.
 */
import { randomBytes, createHash } from 'node:crypto';

/** Generate a cryptographically random code verifier (base64url, ~43 chars) */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/** Derive S256 code challenge from verifier using SHA256 + base64url */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Generate a random state parameter (hex, 64 chars) */
export function generateState(): string {
  return randomBytes(32).toString('hex');
}

export interface PkceParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state: string;
}

/** Generate all PKCE parameters needed for an OAuth authorization request */
export function generatePkceParams(): PkceParams {
  const codeVerifier = generateCodeVerifier();
  return {
    codeVerifier,
    codeChallenge: generateCodeChallenge(codeVerifier),
    codeChallengeMethod: 'S256',
    state: generateState(),
  };
}
