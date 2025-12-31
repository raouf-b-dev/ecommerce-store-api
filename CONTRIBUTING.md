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
   git remote add upstream https://github.com/PrimeRaouf/ecommerce-store-api.git
   ```

## Development Setup

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 11
- **Docker Desktop** ≥ 28
- **Git** ≥ 2.49

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

The API will be available at `http://localhost:3000` with Swagger docs at `http://localhost:3000/api`.

## Making Changes

1. **Create a new branch** from `develop`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our code style guidelines

3. **Write or update tests** for your changes

4. **Run the test suite** to ensure everything passes:

   ```bash
   npm test
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

This project follows **Domain-Driven Design (DDD)** principles. Please ensure:

- **Domain Layer**: Contains only pure business logic (entities, value objects, repository interfaces)
- **Application Layer**: Contains use cases that orchestrate domain logic
- **Infrastructure Layer**: Contains implementations (database repositories, external services)
- **Presentation Layer**: Contains controllers, DTOs, and API-related code

## Testing

We maintain high test coverage. Please include tests for any new functionality:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:cov
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
- [ ] Tests pass locally (`npm test`)
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
