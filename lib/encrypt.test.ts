import { describe, it, expect } from 'vitest';
import { hintForSecret } from './encrypt';

describe('hintForSecret', () => {
  it('returns empty string for empty input', () => {
    expect(hintForSecret('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(hintForSecret('   ')).toBe('');
  });

  it('captures a known API-key prefix + last 4 chars', () => {
    expect(hintForSecret('sk-abcdefghijklmnop1234')).toContain('sk-');
    expect(hintForSecret('sk-abcdefghijklmnop1234').endsWith('1234')).toBe(
      true,
    );
  });

  it('uses last 4 chars when no recognizable prefix is present', () => {
    expect(hintForSecret('someapikey-wxyz')).toContain('wxyz');
  });

  it('caps length at 12 characters', () => {
    const hint = hintForSecret('sk-proj-abcdefghijklmnop');
    expect(hint.length).toBeLessThanOrEqual(12);
  });

  it('trims whitespace before computing the hint', () => {
    expect(hintForSecret('  sk-abcdef1234  ').endsWith('1234')).toBe(true);
  });

  it('handles ghp_ (GitHub) prefix', () => {
    expect(hintForSecret('ghp_abcdefghijklmnop1234')).toContain('ghp_');
  });

  it('handles sk- (OpenAI / DeepSeek) prefix', () => {
    expect(hintForSecret('sk-abcdefghijklmnop1234')).toContain('sk-');
  });
});
