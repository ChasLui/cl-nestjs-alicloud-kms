# Node.js TypeScript Library Starter 🚀

> A clean and modern TypeScript library starter template with essential utilities and comprehensive development toolchain.

## ✨ Features

### 📦 Module Format Support

- **ESM (ES Modules)**: Modern JavaScript module format
- **CJS (CommonJS)**: Traditional Node.js module format
- **Dual Format Output**: Automatically generates `.mjs` and `.cjs` files
- **TypeScript Declarations**: Provides corresponding type definitions for each format
- **Backward Compatibility**: Supports legacy Node.js projects

### 🎮 CLI Playground

- **Interactive Demonstrations**: Rich terminal-based showcases of all utilities
- **Real-time Testing**: Live function testing with colored output and performance metrics
- **Comprehensive Coverage**: All utility functions demonstrated with examples
- **Performance Tracking**: Execution time measurement and benchmarks
- **Error Handling**: Graceful error display and reporting

### 🛠️ Development Tools

- **[Unbuild](https://github.com/unjs/unbuild)** - Library bundler with dual CJS/ESM output
- **[TypeScript](https://github.com/microsoft/TypeScript)** - Type-safe development
- **[Vitest](https://github.com/vitest-dev/vitest)** - Fast unit testing framework
- **[ESLint](https://github.com/eslint/eslint)** - Code linting with TypeScript support
- **[Prettier](https://prettier.io/)** - Code formatting
- **[TSX](https://github.com/esbuild-kit/tsx)** - TypeScript execution for playground

### 📦 Essential Utilities Library Features

#### 🎯 Core Utilities

- **String Utilities**: `capitalize`, `slugify`, `truncate`
- **Array Utilities**: `chunk`, `unique`, `shuffle`
- **Object Utilities**: `deepMerge`, `pick`, `isObject`
- **Async Utilities**: `delay`, `retry`
- **Validation Utilities**: `isEmail`, `isUrl`, `isEmpty`

## 📦 Module Import Examples

### ESM (ES Modules)

```javascript
// Using import syntax
import { capitalize, chunk, isEmail } from 'your-library-name';

// Or using specific file path
import { capitalize } from './dist/index.mjs';

console.log(capitalize('hello world')); // "Hello world"
```

### CommonJS (CJS)

```javascript
// Using require syntax
const { capitalize, chunk, isEmail } = require('your-library-name');

// Or using specific file path
const { capitalize } = require('./dist/index.cjs');

console.log(capitalize('hello world')); // "Hello world"
```

### TypeScript

```typescript
// Automatic type support in TypeScript projects
import { capitalize, chunk, isEmail } from 'your-library-name';

const result: string = capitalize('hello world');
const chunks: number[][] = chunk([1, 2, 3, 4, 5], 2);
const isValid: boolean = isEmail('test@example.com');
```

## 🚀 Quick Start

### 📋 Prerequisites

This project uses [pnpm](https://pnpm.io/) as the package manager, providing faster installation speeds and more efficient disk space utilization.

**Why choose pnpm?**

- ⚡ **Faster installation speed**: Parallel installation and smart caching
- 💾 **Save disk space**: Global storage, avoiding duplicate downloads
- 🔒 **Stricter dependency management**: Avoids phantom dependency issues
- 🌳 **Better monorepo support**: Native workspace support

If you haven't installed pnpm yet:

```bash
# Install using npm
npm install -g pnpm

# Or using curl
curl -fsSL https://get.pnpm.io/install.sh | sh

# Or using PowerShell (Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

Verify installation:

```bash
pnpm --version
# Should display version number, recommended >= 8.0.0
```

### 1. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 2. Start Development

```bash
pnpm dev
```

This will start the CLI playground in your terminal, demonstrating all available utilities with colorful output and performance metrics.

## 📋 Commands

### Development

```bash
# Start CLI playground (demonstrates all utilities)
pnpm dev

# Run TypeScript compiler in watch mode
pnpm dev:watch
```

### Building & Testing

```bash
# Build the library (outputs to dist/)
pnpm build

# Run comprehensive test suite
pnpm test

# Test ESM and CJS module loading
pnpm test:modules

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm coverage
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint --fix

# Format code with Prettier
pnpm format
```

### Publishing

```bash
# Build and prepare for publishing
pnpm prepublishOnly
```

## 📁 Project Structure

```
.
├── src/                    # Library source code
│   └── index.ts           # Main library exports with core utilities
├── playground/            # CLI development environment
│   └── index.ts           # Interactive terminal playground
├── tests/                 # Comprehensive unit tests
│   └── unit.test.ts       # Test files covering all utilities
├── dist/                  # Built library output
│   ├── index.cjs          # CommonJS build
│   ├── index.mjs          # ES Module build
│   └── index.d.ts         # TypeScript declarations
├── build.config.ts        # Unbuild configuration
├── vitest.config.ts       # Test configuration
└── tsconfig.json          # TypeScript configuration
```

## 🎯 Usage Guide

### Using the CLI Playground

1. **Start the playground**: `pnpm dev`
2. **Watch demonstrations**: Each utility category is demonstrated with:
   - Live examples with sample data
   - Performance measurements
   - Error handling examples
   - Colorful terminal output
3. **Learn by example**: See real-world usage patterns for each utility

### Building Your Library

1. **Add your functions** to `src/index.ts`
2. **Export them** using named exports
3. **Add comprehensive tests** in `tests/unit.test.ts`
4. **Add playground demos** in `playground/index.ts`
5. **Build and test**: `pnpm build && pnpm test`

### Example Function Addition

```typescript
// src/index.ts - Add your utility function
export function processData(data: string): string {
  return capitalize(slugify(data));
}

// tests/unit.test.ts - Add comprehensive tests
import { processData } from '../src/index';

describe('processData', () => {
  it('should process data correctly', () => {
    expect(processData('Hello World!')).toBe('Hello-world');
  });
});

// playground/index.ts - Add to demonstrations
async function demonstrateMyUtils(): Promise<void> {
  header('My Custom Utilities');

  const result = processData('Hello World!');
  console.log('Processed data:', result);
  success('Custom utility demonstrated successfully');
}
```

## 🌟 Available Utilities

### String Utilities

```typescript
// Capitalize first letter
const result = capitalize('hello world'); // "Hello world"

// Convert to URL-friendly slug
const slug = slugify('Hello World!'); // "hello-world"

// Truncate with custom suffix
const short = truncate('Very long text', 10, '...'); // "Very long..."
```

### Array Utilities

```typescript
// Split array into chunks
const chunks = chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Remove duplicates
const uniqueItems = unique([1, 2, 2, 3, 3]); // [1, 2, 3]

// Randomly shuffle array
const shuffled = shuffle([1, 2, 3, 4, 5]); // [3, 1, 5, 2, 4]
```

### Object Utilities

```typescript
// Deep merge objects
const merged = deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 }, e: 4 }); // { a: 1, b: { c: 2, d: 3 }, e: 4 }

// Pick specific properties
const selected = pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // { a: 1, c: 3 }

// Check if value is object
const check = isObject({}); // true
```

### Async Utilities

```typescript
// Delay execution
await delay(1000); // Wait 1 second

// Retry failed operations
const result = await retry(
  async () => {
    // Your async operation
    return 'success';
  },
  3,
  500,
); // 3 attempts, 500ms delay
```

### Validation Utilities

```typescript
// Validate email
const validEmail = isEmail('test@example.com'); // true

// Validate URL
const validUrl = isUrl('https://example.com'); // true

// Check if empty
const empty = isEmpty(''); // true
const notEmpty = isEmpty('hello'); // false
```

## 🔧 Configuration

- **Library build**: `build.config.ts` (unbuild configuration)
- **Tests**: `vitest.config.ts` (Vitest configuration)
- **TypeScript**: `tsconfig.json` (Strict TypeScript compiler options)
- **ESLint**: TypeScript-aware linting configuration

## 🎨 Key Features in Detail

### Modern Development Stack

- **TypeScript strict mode**: Full type safety throughout
- **Dual module support**: Both ESM and CommonJS formats
- **Zero dependencies**: Pure utility functions without external deps
- **Comprehensive testing**: 15+ test cases covering all utilities

### Developer Experience

- **Rich CLI playground** with colored output and demonstrations
- **Comprehensive documentation** with usage examples
- **Hot reloading** during development with `tsx`
- **Type-safe development** with strict TypeScript configuration
- **Package.json exports** for optimal CJS/ESM compatibility

## 📦 Building & Publishing

The library builds to both CommonJS and ES Module formats:

```bash
pnpm build
```

Outputs:

- `dist/index.cjs` - CommonJS format
- `dist/index.mjs` - ES Module format
- `dist/index.d.ts` - TypeScript declarations

## License

[MIT License](./LICENSE)

Copyright (c) ChasLui ([@ChasLui](https://github.com/ChasLui))
