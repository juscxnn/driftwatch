/**
 * Symmetric encryption of org-scoped secrets (LLM keys, etc) using
 * pgcrypto's `pgp_sym_encrypt` / `pgp_sym_decrypt` inside Supabase.
 *
 * The symmetric key comes from the `ENCRYPTION_KEY` env var (32+ chars).
 * It is never persisted in the database — only the calling server has it.
 *
 * Wire:
 *
 *   encrypt_secret(plain, key) -> text     (base64 ciphertext)  (RPC)
 *   decrypt_secret(cipher, key) -> text                          (RPC)
 *
 * Both functions are `SECURITY DEFINER` and revoke public/anon/authenticated;
 * only the admin client (service role key) can invoke them.
 *
 * If `ENCRYPTION_KEY` is not set at call time we throw. We do not silently
 * fallback to a derived or empty key.
 */

import { createAdminClient } from './supabase/admin';

let warned = false;

function readKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length === 0) {
    if (!warned) {
      // eslint-disable-next-line no-console
      console.error(
        '[encrypt] ENCRYPTION_KEY is not set. Org-level LLM key encryption is disabled. Set a 32+ char random string in your env.',
      );
      warned = true;
    }
    throw new Error(
      'ENCRYPTION_KEY is not configured. Add a 32+ character random string to your environment to encrypt org secrets.',
    );
  }
  return key;
}

/**
 * Encrypt a plaintext string with the configured symmetric key. Returns a
 * base64 string (text column) safe for direct persistence.
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = readKey();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('encrypt_secret', {
    plaintext,
    key,
  });
  if (error) {
    throw new Error(`Failed to encrypt secret: ${error.message}`);
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('encrypt_secret RPC returned a non-string payload');
  }
  return data;
}

/**
 * Decrypt a base64 ciphertext with the configured symmetric key. Returns
 * the original plaintext string.
 */
export async function decryptSecret(ciphertextB64: string): Promise<string> {
  const key = readKey();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('decrypt_secret', {
    ciphertextB64,
    key,
  });
  if (error) {
    throw new Error(`Failed to decrypt secret: ${error.message}`);
  }
  if (typeof data !== 'string') {
    throw new Error('decrypt_secret RPC returned a non-string payload');
  }
  return data;
}

/**
 * Did the operator configure `ENCRYPTION_KEY`? Cheap env check used by
 * the engine to gracefully fall back to the env-based provider when
 * stored keys exist but we can't decrypt them locally.
 */
export function encryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return typeof key === 'string' && key.length > 0;
}

/**
 * Compute a short, non-secret hint about a plaintext secret. Used to show
 * "sk-…wxyz" in the UI so users can recognize which key they saved
 * without the action ever echoing the full secret back.
 */
export function hintForSecret(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length === 0) return '';
  const tail = trimmed.slice(-4);
  const match = trimmed.match(/^([a-zA-Z]{2,5}[-_])/);
  const prefix = match ? match[1] : '';
  const combined = `${prefix}…${tail}`;
  return combined.length > 12 ? combined.slice(0, 12) : combined;
}
