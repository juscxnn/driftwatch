-- 0004_org_llm_key.sql
-- Add LLM key storage to organizations (encrypted at rest via pgcrypto).
--
-- The symmetric key comes from the application side via the ENCRYPTION_KEY
-- env var and is passed per-call to the RPC wrappers below. Storing the key
-- in Postgres would defeat the purpose; we keep it out of the database
-- entirely.
--
-- The app calls the RPCs with text-encoded base64 strings, and the wrappers
-- cast them to bytea internally. This sidesteps PostgREST's `bytea`
-- framing rules (which would otherwise require a hex-string literal with
-- the `\\x` prefix) and keeps the call sites in plain TypeScript.
--
-- New columns on organizations are all nullable so existing rows and
-- existing environments pick up the schema change without data migrations.

create extension if not exists pgcrypto;

alter table organizations
  add column if not exists llm_key_encrypted text,
  add column if not exists llm_key_hint text,
  add column if not exists llm_key_set_at timestamptz;

-- Wrapper RPCs for symmetric encrypt / decrypt. The key + (en|de)crypted
-- payload are passed as text; we cast to bytea inside the function so
-- callers don't have to worry about PostgREST's hex-string framing.
create or replace function public.encrypt_secret(plaintext text, key text)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select encode(
    pgp_sym_encrypt(plaintext::text, key::text, 'compress-aes=zstd,cipher-algo=aes256'),
    'base64'
  );
$$;

create or replace function public.decrypt_secret(ciphertext_b64 text, key text)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select pgp_sym_decrypt(decode(ciphertext_b64, 'base64'), key::text);
$$;

-- Only the service role (admin client) should be able to call these.
-- The admin client bypasses GRANT rules, so revoking public/anon/authenticated
-- keeps the helpers locked down while still allowing the runtime to encrypt
-- LLM keys through the SUPABASE_SERVICE_ROLE_KEY connection.
revoke all on function public.encrypt_secret(text, text) from public, anon, authenticated;
revoke all on function public.decrypt_secret(text, text) from public, anon, authenticated;
