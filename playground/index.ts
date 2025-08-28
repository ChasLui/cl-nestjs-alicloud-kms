#!/usr/bin/env node
import * as lib from '../src/index.js';

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function header(text: string): void {
  console.log(colorize('cyan', `\n=== ${text} ===`));
}

function success(text: string): void {
  console.log(colorize('green', `✓ ${text}`));
}

function info(text: string): void {
  console.log(colorize('blue', `ℹ ${text}`));
}

// Demo functions
async function demonstrateStringUtils(): Promise<void> {
  header('String Utilities');

  const testString = 'Hello World! This is a test string.';

  console.log(`Original string: "${testString}"`);
  console.log(`Capitalized: "${lib.capitalize(testString)}"`);
  console.log(`Slugified: "${lib.slugify(testString)}"`);
  console.log(`Truncated (20): "${lib.truncate(testString, 20)}"`);
  console.log(`Truncated (20, '***'): "${lib.truncate(testString, 20, '***')}"`);

  success('String utilities demo completed');
}

async function demonstrateArrayUtils(): Promise<void> {
  header('Array Utilities');

  const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const duplicateArray = [1, 2, 2, 3, 3, 3, 4, 5];

  console.log(`Original array: [${testArray.join(', ')}]`);
  console.log(
    `Chunked (size 3): [${lib
      .chunk(testArray, 3)
      .map((chunk) => `[${chunk.join(', ')}]`)
      .join(', ')}]`,
  );
  console.log(`Shuffled: [${lib.shuffle([...testArray]).join(', ')}]`);

  console.log(`\nArray with duplicates: [${duplicateArray.join(', ')}]`);
  console.log(`Unique values: [${lib.unique(duplicateArray).join(', ')}]`);

  success('Array utilities demo completed');
}

async function demonstrateAsyncUtils(): Promise<void> {
  header('Async Utilities');

  info('Testing delay function (1 second)...');
  const start = Date.now();
  await lib.delay(1000);
  const elapsed = Date.now() - start;
  success(`Delay completed, elapsed time: ${elapsed}ms`);

  info('Testing retry function...');
  let attempts = 0;
  const unreliableFunction = async (): Promise<string> => {
    attempts++;
    if (attempts < 3) {
      throw new Error(`Attempt ${attempts} failed`);
    }
    return `Attempt ${attempts} succeeded`;
  };

  try {
    const result = await lib.retry(unreliableFunction, 5, 100);
    success(`Retry result: ${result}`);
  } catch (err) {
    console.error(`Retry failed: ${err}`);
  }

  success('Async utilities demo completed');
}

async function demonstrateValidationUtils(): Promise<void> {
  header('Validation Utilities');

  const emails = ['test@example.com', 'invalid.email', 'user@domain.co.uk'];
  const urls = ['https://example.com', 'http://localhost:3000/path', 'not-a-url'];
  const values = ['', ' ', null, undefined, [], {}, 'hello', [1, 2, 3], { a: 1 }];

  console.log('Email validation:');
  emails.forEach((email) => {
    console.log(`  "${email}": ${lib.isEmail(email) ? '✓' : '✗'}`);
  });

  console.log('\nURL validation:');
  urls.forEach((url) => {
    console.log(`  "${url}": ${lib.isUrl(url) ? '✓' : '✗'}`);
  });

  console.log('\nEmpty value checks:');
  values.forEach((value) => {
    const display = value === null ? 'null' : value === undefined ? 'undefined' : JSON.stringify(value);
    console.log(`  ${display}: ${lib.isEmpty(value) ? 'empty' : 'not empty'}`);
  });

  success('Validation utilities demo completed');
}

async function demonstrateObjectUtils(): Promise<void> {
  header('Object Utilities');

  const obj1 = { a: 1, b: { c: 2, d: 3 } };
  const obj2 = { b: { e: 4 }, f: 5 };
  const merged = lib.deepMerge(obj1, obj2);

  console.log('Object 1:', JSON.stringify(obj1, null, 2));
  console.log('Object 2:', JSON.stringify(obj2, null, 2));
  console.log('Deep merged:', JSON.stringify(merged, null, 2));

  const sampleObj = { name: 'John', age: 30, city: 'New York', country: 'USA' };
  const picked = lib.pick(sampleObj, ['name', 'city']);

  console.log(`\nOriginal object: ${JSON.stringify(sampleObj)}`);
  console.log(`Picked ['name', 'city']: ${JSON.stringify(picked)}`);

  console.log(`\nisObject({}): ${lib.isObject({})}`);
  console.log(`isObject([]): ${lib.isObject([])}`);
  console.log(`isObject(null): ${lib.isObject(null)}`);
  console.log(`isObject('string'): ${lib.isObject('string')}`);

  success('Object utilities demo completed');
}

async function runAllDemos(): Promise<void> {
  console.log(colorize('bright', '🚀 Node.js TypeScript Library - Interactive Playground'));
  console.log(colorize('yellow', 'Demonstrating all available utility functions...\n'));

  const demos = [
    demonstrateStringUtils,
    demonstrateArrayUtils,
    demonstrateAsyncUtils,
    demonstrateValidationUtils,
    demonstrateObjectUtils,
  ];

  for (const demo of demos) {
    try {
      await demo();
      await lib.delay(500); // Small delay between demos for better readability
    } catch (err) {
      console.error(`Demo failed: ${err}`);
    }
  }

  header('All Demos Completed');
  console.log(colorize('green', '✨ All utility functions have been successfully demonstrated!'));
  console.log(
    colorize('yellow', 'Check the src/index.ts source code to understand the implementation of these utilities.'),
  );
}

// Handle command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    runAllDemos().catch((err) => {
      console.error('Demo failed:', err);
      process.exit(1);
    });
  } else {
    console.log(colorize('yellow', 'Usage: tsx playground/index.ts'));
    console.log(colorize('yellow', 'This will run all available utility demonstrations.'));
  }
}
