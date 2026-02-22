/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0.
 * Generates cryptographically secure code verifier and challenge.
 */
import { randomBytes, createHash } from 'node:crypto';

/** Base64url encode a buffer (no padding, URL-safe chars) */
function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Generate a cryptographically random code verifier (43-128 chars per RFC 7636) */
export function generateCodeVerifier(): string {
  return base64urlEncode(randomBytes(48));
}

/** Derive S256 code challenge from verifier */
export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return base64urlEncode(hash);
}

/** Generate a random state parameter to prevent CSRF */
export function generateState(): string {
  return base64urlEncode(randomBytes(16));
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
