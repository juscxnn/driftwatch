import { describe, it, expect } from 'vitest';
import { formatRelative, formatDate } from './format';

describe('formatRelative', () => {
  const now = Date.now();

  it('returns "just now" for 30 seconds ago', () => {
    const iso = new Date(now - 30 * 1000).toISOString();
    expect(formatRelative(iso)).toBe('just now');
  });

  it('returns "5m ago" for 5 minutes ago', () => {
    const iso = new Date(now - 5 * 60 * 1000).toISOString();
    expect(formatRelative(iso)).toBe('5m ago');
  });

  it('returns "2h ago" for 2 hours ago', () => {
    const iso = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(iso)).toBe('2h ago');
  });

  it('returns "3d ago" for 3 days ago', () => {
    const iso = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(iso)).toBe('3d ago');
  });

  it('returns "14d ago" for 2 weeks ago', () => {
    const iso = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(iso)).toBe('14d ago');
  });

  it('falls back to formatDate for 1 year ago', () => {
    const date = new Date(now - 365 * 24 * 60 * 60 * 1000);
    const iso = date.toISOString();
    expect(formatRelative(iso)).toBe(formatDate(iso));
  });

  it('accepts Date objects as well as ISO strings', () => {
    const date = new Date(now - 5 * 60 * 1000);
    expect(formatRelative(date)).toBe('5m ago');
  });

  it('handles future dates gracefully (returns "just now")', () => {
    const iso = new Date(now + 10 * 60 * 1000).toISOString();
    expect(formatRelative(iso)).toBe('just now');
  });

  it('returns em-dash for null', () => {
    expect(formatRelative(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatRelative(undefined)).toBe('—');
  });

  it('returns em-dash for empty string', () => {
    expect(formatRelative('')).toBe('—');
  });

  it('returns em-dash for invalid date strings', () => {
    expect(formatRelative('not a date')).toBe('—');
  });
});