import { describe, it, expect } from 'vitest';
import { friendlyAuthError } from '@/lib/auth-errors';

describe('friendlyAuthError', () => {
  it('maps invalid login credentials to a friendly message', () => {
    expect(friendlyAuthError('Invalid login credentials')).toBe(
      'Wrong email or password. Please try again.',
    );
  });

  it('maps "Invalid credentials" to a friendly message', () => {
    expect(friendlyAuthError('Invalid credentials')).toBe(
      'Wrong email or password. Please try again.',
    );
  });

  it('maps already-registered errors to a friendly message', () => {
    expect(friendlyAuthError('User already registered')).toBe(
      'An account with that email already exists. Try signing in.',
    );
  });

  it('maps "already been registered" to a friendly message', () => {
    expect(friendlyAuthError('A user has already been registered with this email')).toBe(
      'An account with that email already exists. Try signing in.',
    );
  });

  it('returns the raw password-too-short message verbatim', () => {
    expect(friendlyAuthError('Password should be at least 6 characters')).toBe(
      'Password should be at least 6 characters',
    );
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(friendlyAuthError('something exploded in the database')).toBe(
      'Something went wrong. Please try again.',
    );
  });
});