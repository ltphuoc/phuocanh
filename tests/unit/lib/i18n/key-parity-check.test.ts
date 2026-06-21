import { describe, expect, it } from 'vitest';

import { findParityIssues, flattenMessageKeys } from '@/../scripts/i18n/check-key-parity.mjs';

describe('i18n key parity', () => {
  it('flattens nested message objects into dotted keys', () => {
    const keys = flattenMessageKeys({
      actions: { trip: { created: 'x', updated: 'y' } },
      title: 'z',
    });
    expect(keys).toEqual(['actions.trip.created', 'actions.trip.updated', 'title']);
  });

  it('reports a key present in canonical but missing from a locale', () => {
    const issues = findParityIssues(['a', 'b', 'c'], [{ locale: 'vi', keys: ['a', 'b'] }]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.missingKeys).toEqual(['c']);
    expect(issues[0]?.unknownKeys).toEqual([]);
  });

  it('reports a key present in a locale but unknown to canonical', () => {
    const issues = findParityIssues(['a', 'b'], [{ locale: 'vi', keys: ['a', 'b', 'extra'] }]);

    expect(issues[0]?.unknownKeys).toEqual(['extra']);
    expect(issues[0]?.missingKeys).toEqual([]);
  });

  it('reports no issues when a locale matches the canonical keys', () => {
    const issues = findParityIssues(['a', 'b'], [{ locale: 'vi', keys: ['b', 'a'] }]);

    expect(issues[0]?.missingKeys).toEqual([]);
    expect(issues[0]?.unknownKeys).toEqual([]);
  });
});
