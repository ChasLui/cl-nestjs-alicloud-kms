import { describe, expect, it } from 'vitest';
import {
  // String utilities
  capitalize,
  slugify,
  truncate,
  // Array utilities
  chunk,
  unique,
  shuffle,
  // Object utilities
  deepMerge,
  pick,
  isObject,
  // Async utilities
  delay,
  retry,
  // Validation utilities
  isEmail,
  isUrl,
  isEmpty,
} from '../src/index';

// String utilities
describe('String utilities', () => {
  it('capitalize should capitalize first letter', () => {
    expect(capitalize('hello world')).toBe('Hello world');
    expect(capitalize('HELLO')).toBe('Hello');
    expect(capitalize('')).toBe('');
  });

  it('slugify should create URL-friendly strings', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    expect(slugify('Special@#$Characters')).toBe('specialcharacters');
  });

  it('truncate should truncate strings properly', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
    expect(truncate('Hello World', 5, '***')).toBe('Hello***');
  });
});

// Array utilities
describe('Array utilities', () => {
  it('chunk should divide array into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  it('unique should remove duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(unique([])).toEqual([]);
  });

  it('shuffle should return array with same elements', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffle(original);
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort()).toEqual(original.sort());
  });
});

// Object utilities
describe('Object utilities', () => {
  it('deepMerge should merge objects deeply', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { b: { d: 3 }, e: 4 };
    const result = deepMerge(obj1, obj2);
    expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
  });

  it('pick should select specified properties', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(pick(obj, [])).toEqual({});
  });

  it('isObject should identify objects correctly', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject('string')).toBe(false);
    expect(isObject(123)).toBe(false);
  });
});

// Async utilities
describe('Async utilities', () => {
  it('delay should wait for specified time', async () => {
    const start = Date.now();
    await delay(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
  });

  it('retry should retry failed operations', async () => {
    let attempts = 0;
    const unreliableFunction = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return `Success on attempt ${attempts}`;
    };

    const result = await retry(unreliableFunction, 5, 10);
    expect(result).toBe('Success on attempt 3');
    expect(attempts).toBe(3);
  });

  it('retry should throw after max attempts', async () => {
    const alwaysFailFunction = async () => {
      throw new Error('Always fails');
    };

    await expect(retry(alwaysFailFunction, 2, 10)).rejects.toThrow('Always fails');
  });
});

// Validation utilities
describe('Validation utilities', () => {
  it('isEmail should validate email addresses', () => {
    expect(isEmail('test@example.com')).toBe(true);
    expect(isEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(isEmail('invalid-email')).toBe(false);
    expect(isEmail('test@')).toBe(false);
    expect(isEmail('@example.com')).toBe(false);
  });

  it('isUrl should validate URLs', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('http://localhost:3000/path?query=1')).toBe(true);
    expect(isUrl('ftp://files.example.com')).toBe(true);
    expect(isUrl('not-a-url')).toBe(false);
    expect(isUrl('example.com')).toBe(false);
  });

  it('isEmpty should check for empty values', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);

    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty([1, 2, 3])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
  });
});
