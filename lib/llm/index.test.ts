import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildLLM, getLLM } from './index';

const ORIGINAL_ENV = { ...process.env };

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('buildLLM', () => {
  beforeEach(() => {
    // Reset to baseline env for each test.
    process.env = { ...ORIGINAL_ENV };
    // Wipe BYOK-related keys that the LLM factory reads.
    for (const k of [
      'LLM_PROVIDER',
      'DEEPSEEK_API_KEY',
      'OPENAI_API_KEY',
      'DEEPSEEK_BASE_URL',
      'OPENAI_BASE_URL',
    ]) {
      delete process.env[k];
    }
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('uses the apiKey override when provided (BYOK path)', () => {
    const llm = buildLLM({ apiKey: 'sk-test', provider: 'deepseek' });
    expect(llm.name).toBe('deepseek');
    expect(llm.defaultChatModel).toBe('deepseek-chat');
  });

  it('falls back to DEEPSEEK_API_KEY when no override is provided', () => {
    setEnv('DEEPSEEK_API_KEY', 'sk-fallback');
    const llm = buildLLM();
    expect(llm.name).toBe('deepseek');
  });

  it('throws a clear error when no key is available anywhere', () => {
    expect(() => buildLLM({ provider: 'deepseek' })).toThrow(/DEEPSEEK_API_KEY/);
  });

  it('falls back to deepseek and warns when an unknown provider is requested', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setEnv('DEEPSEEK_API_KEY', 'sk-fallback');
    const llm = buildLLM({ provider: 'not-a-real-provider' });
    expect(llm.name).toBe('deepseek');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown LLM_PROVIDER="not-a-real-provider"'),
    );
    warn.mockRestore();
  });

  it('uses the OPENAI branch when apiKey + provider=openai override is provided', () => {
    const llm = buildLLM({ apiKey: 'sk-openai', provider: 'openai' });
    expect(llm.name).toBe('openai');
  });

  it('throws on openai when no key is available', () => {
    expect(() => buildLLM({ provider: 'openai' })).toThrow(/OPENAI_API_KEY/);
  });
});

describe('getLLM (env-based, cached default)', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const k of ['LLM_PROVIDER', 'DEEPSEEK_API_KEY', 'OPENAI_API_KEY']) {
      delete process.env[k];
    }
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('throws when neither env vars nor the override are present', () => {
    expect(() => getLLM()).toThrow();
  });

  it('returns a usable provider when DEEPSEEK_API_KEY is set in env', () => {
    setEnv('DEEPSEEK_API_KEY', 'sk-env-test');
    const llm = getLLM();
    expect(llm.name).toBe('deepseek');
    expect(llm.defaultChatModel).toBe('deepseek-chat');
  });
});
