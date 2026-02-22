/**
 * Encrypted AES-256-GCM token storage at ~/.a11y-fixer/auth.json.
 * Uses machine-derived key so tokens are tied to this machine.
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const STORAGE_DIR = join(homedir(), '.a11y-fixer');
const STORAGE_PATH = join(STORAGE_DIR, 'auth.json');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix ms timestamp
  tokenType: string;
}

/** Derive a stable encryption key from machine identifiers */
function deriveKey(): Buffer {
  const hostname = process.env['HOSTNAME'] ?? 'localhost';
  const salt = createHash('sha256').update(`a11y-fixer:${hostname}`).digest();
  return scryptSync('a11y-fixer-token-key', salt, 32) as Buffer;
}

/** Encrypt plaintext string with AES-256-GCM */
function encrypt(text: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt AES-256-GCM ciphertext */
function decrypt(data: string): string {
  const [ivHex, tagHex, cipherHex] = data.split(':');
  if (!ivHex || !tagHex || !cipherHex) throw new Error('Invalid encrypted token format');
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(cipherHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

/** Load and decrypt stored OAuth token, returns null if not found or invalid */
export function loadToken(): OAuthToken | null {
  try {
    if (!existsSync(STORAGE_PATH)) return null;
    const raw = readFileSync(STORAGE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { encrypted: string };
    const decrypted = decrypt(parsed.encrypted);
    return JSON.parse(decrypted) as OAuthToken;
  } catch {
    return null;
  }
}

/** Encrypt and persist OAuth token to ~/.a11y-fixer/auth.json */
export function saveToken(token: OAuthToken): void {
  mkdirSync(STORAGE_DIR, { recursive: true });
  const encrypted = encrypt(JSON.stringify(token));
  writeFileSync(STORAGE_PATH, JSON.stringify({ encrypted }), { encoding: 'utf8', mode: 0o600 });
}

/** Remove stored token */
export function clearToken(): void {
  try {
    if (existsSync(STORAGE_PATH)) {
      writeFileSync(STORAGE_PATH, JSON.stringify({}), { encoding: 'utf8', mode: 0o600 });
    }
  } catch {
    // ignore cleanup errors
  }
}

/** Check if a token is still valid (with 60s buffer) */
export function isTokenValid(token: OAuthToken): boolean {
  return Date.now() < token.expiresAt - 60_000;
}
