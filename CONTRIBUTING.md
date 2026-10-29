# Contributing to E-commerce Store API

First off, thank you for considering contributing to this project! 🎉

Whether it's a bug report, new feature, correction, or additional documentation, your contributions are greatly appreciated.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ecommerce-store-api.git
   cd ecommerce-store-api
   ```
3. **Add the upstream repository** as a remote:
   ```bash
   git remote add upstream https://github.com/raouf-b-dev/ecommerce-store-api.git
   ```

## Development Setup

### Prerequisites

- **Node.js** LTS, see `.nvmrc` (26)
- **npm** 12.2.1, pinned in `package.json` `devEngines.packageManager` (`npm install -g npm@12.2.1`)
- **Docker Desktop** ≥ 28, with the engine running (open a new terminal after install)
- **Git** ≥ 2.47

### Node version policy

`.nvmrc` is the single source of truth for the Node.js major (current LTS). CI reads it through `node-version-file`, the `Dockerfile` base image pins the matching patch by digest, and `package.json` `engines` follows the same major (`devEngines.runtime` in `package.json` uses the same range with `onFail: "error"`, so `npm ci` fails with `EBADDEVENGINES` on an older runtime; npm 12 no longer enforces the root `engines.node` even with the `.npmrc` `engine-strict=true`, which stays for dependencies). Dependabot bumps the Docker patch and digest but ignores Node majors. The major is therefore written in four places that no tool can share: `.nvmrc` (CI and nvm), the `Dockerfile` `FROM` tag (Docker cannot read a file at build time for its base image), `engines.node`, and `devEngines.runtime.version` in `package.json`. No CI check compares them, so to move to a new LTS, edit `.nvmrc`, the `Dockerfile` pin, `engines.node`, and `devEngines.runtime.version` in one PR.

The npm version has one source: `devEngines.packageManager` in `package.json` (`onFail: "error"`), so `npm ci` and `npm install` fail with `EBADDEVENGINES` on any other npm. No Node.js release bundles npm 12 yet, so the pin is installed explicitly: CI through the `.github/actions/setup-node-ci` composite action and the `Dockerfile` through `npm install -g` in each stage that runs npm, both reading the version from `package.json`. `engines.npm` stays a lower bound and is not the pin. Revisit this when a Node.js LTS bundles npm 12 or later: the explicit install can then be dropped.

### Installation

```bash
# Install dependencies
npm install

# Generate environment files
npm run env:init:dev

# Start infrastructure services (PostgreSQL, Redis)
npm run d:up:dev

# Run database migrations
npm run migration:run:dev

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3000` with Swagger docs at `http://localhost:3000/api/docs`.

## Making Changes

1. **Create a new branch** from `develop`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our code style guidelines

3. **Write or update tests** for your changes

4. **Run the pre-PR gate** to ensure everything passes:

   ```bash
   npm run verify
   ```

5. **Commit your changes** with a clear message:
   ```bash
   git commit -m "Add: brief description of your change"
   ```

### Commit Message Guidelines

We follow a simple commit convention:

- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for changes to existing features
- `Refactor:` for code refactoring
- `Docs:` for documentation changes
- `Test:` for test-related changes

## Code Style

This project uses ESLint and Prettier to maintain code quality. Before committing:

```bash
# Run linter with auto-fix
npm run lint

# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### Architecture Guidelines

This project follows **Domain-Driven Design (DDD)** and **Hexagonal Architecture** (Ports & Adapters). Please ensure:

- **Core** (`core/domain/`): Pure business logic: entities, value objects, repository interfaces. Zero external dependencies.
- **Core** (`core/application/`): Use cases that orchestrate domain logic. Depends only on Domain.
- **Primary Adapters** (`primary-adapters/`): Driving adapters: DTOs, job handlers, event listeners. NestJS Controllers live at the module root and inject Use Cases directly (no intermediate controller classes). When changing controllers or Swagger DTOs, run `npm run audit:openapi` so the published spec stays aligned with handlers.
- **Secondary Adapters** (`secondary-adapters/`): Driven adapters: repository implementations, ORM entities, mappers, external service integrations.
- **Shared Kernel** (`src/shared-kernel/`): Cross-cutting infrastructure (database, Redis, jobs, error types, interceptors).

## Testing

We maintain high test coverage. Please include tests for any new functionality:

```bash
# Pre-PR gate (typecheck, lint, format, arch, unit)
npm run verify

# Unit tests only
npm test

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:cov

# After controller or Swagger DTO changes
npm run audit:openapi
```

### Test Location

- Unit tests should be co-located with the code they test (e.g., `usecase.spec.ts` next to `usecase.ts`)
- Use the `testing/` folder within each module for test utilities and factories

## Submitting a Pull Request

1. **Update your fork** with the latest upstream changes:

   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Push your branch** to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request** on GitHub with:
   - A clear title describing the change
   - A description of what changed and why
   - Reference any related issues (e.g., "Fixes #123")

4. **Wait for review** - maintainers will review your PR and may request changes

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Pre-PR gate passes locally (`npm run verify`)
- [ ] New functionality includes appropriate tests
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear and descriptive

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)
- Any relevant logs or screenshots

### Feature Requests

For feature requests, please describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternative solutions you've considered

---

## Questions?

Feel free to open an issue for any questions or discussions. We're happy to help!

Thank you for contributing! 🙏
