import { describe, expect, test } from 'vitest';

import { getLocaleFromPathname, stripLocalePrefix, toLocalizedPathname } from '@/lib/i18n/pathname';

describe('i18n pathname helpers', () => {
  test('localizes paths without duplicating an existing locale prefix', () => {
    expect(toLocalizedPathname('en', 'home')).toBe('/en/home');
    expect(toLocalizedPathname('en', '/home')).toBe('/en/home');
    expect(toLocalizedPathname('en', '/en/home')).toBe('/en/home');
    expect(toLocalizedPathname('vi', '/')).toBe('/vi');
  });

  test('extracts the leading locale when present', () => {
    expect(getLocaleFromPathname('/en/home')).toBe('en');
    expect(getLocaleFromPathname('/vi')).toBe('vi');
    expect(getLocaleFromPathname('/fr/home')).toBeNull();
    expect(getLocaleFromPathname('home')).toBeNull();
  });

  test('strips only supported locale prefixes', () => {
    expect(stripLocalePrefix('/en/home')).toBe('/home');
    expect(stripLocalePrefix('/vi')).toBe('/');
    expect(stripLocalePrefix('/fr/home')).toBe('/fr/home');
    expect(stripLocalePrefix('home')).toBe('/home');
  });
});
