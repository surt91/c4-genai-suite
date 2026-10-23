import { describe, expect, it } from 'vitest';
import { texts } from './index';

// i18next returns the key itself for missing translations, e.g. 'chat.updateRating.foo'.
const looksLikeKey = (value: string) => /^[a-zA-Z]+(\.[a-zA-Z0-9_]+)+$/.test(value);

function missingTexts(value: unknown, path: string): string[] {
  if (typeof value === 'string') {
    return looksLikeKey(value) ? [path] : [];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => missingTexts(child, path ? `${path}.${key}` : key));
  }
  return [];
}

describe('texts', () => {
  it('has a translation for every text', () => {
    expect(missingTexts(texts, '')).toEqual([]);
  });
});
