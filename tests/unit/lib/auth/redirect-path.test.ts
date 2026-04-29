import { describe, expect, test } from 'vitest';

import { normalizeAuthRedirectPath } from '@/lib/auth/redirect-path';

describe('normalizeAuthRedirectPath', () => {
  test('uses the fallback for empty input', () => {
    expect(normalizeAuthRedirectPath(null, '/home')).toBe('/home');
    expect(normalizeAuthRedirectPath(undefined, '/home')).toBe('/home');
    expect(normalizeAuthRedirectPath('', '/home')).toBe('/home');
  });

  test('rejects external and protocol-relative paths', () => {
    expect(normalizeAuthRedirectPath('https://example.com/home', '/home')).toBe('/home');
    expect(normalizeAuthRedirectPath('//example.com/home', '/home')).toBe('/home');
    expect(normalizeAuthRedirectPath('login', '/home')).toBe('/home');
  });

  test('rejects paths containing backslashes', () => {
    expect(normalizeAuthRedirectPath('/login\\evil', '/home')).toBe('/home');
  });

  test('preserves safe internal path details', () => {
    expect(normalizeAuthRedirectPath('/accept-invite?token=abc#join', '/home')).toBe(
      '/accept-invite?token=abc#join',
    );
  });
});
