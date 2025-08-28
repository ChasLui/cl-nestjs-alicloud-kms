# Commitlint Usage Guide

This project uses [commitlint](https://commitlint.js.org/) to enforce conventional commit messages. This ensures consistent and meaningful commit history.

## Commit Message Format

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

The following commit types are allowed:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

```bash
# Good examples
git commit -m "feat: add user authentication"
git commit -m "fix(api): resolve login endpoint error"
git commit -m "docs: update installation guide"
git commit -m "refactor: simplify user validation logic"

# Bad examples (will be rejected)
git commit -m "fixed bug"
git commit -m "FEAT: new feature"
git commit -m "update code"
```

### Rules

- Type must be lowercase
- Type cannot be empty
- Subject cannot be empty
- Subject must not end with a period
- Header (type + scope + subject) must not exceed 100 characters
- Scope (if present) must be lowercase

## Validation

Commitlint validation happens automatically on every commit via Husky git hooks. If your commit message doesn't follow the conventional format, the commit will be rejected.

To manually validate a commit message:

```bash
echo "feat: add new feature" | npx commitlint
```

## Configuration

The commitlint configuration is defined in [`commitlint.config.mjs`](./commitlint.config.mjs).
