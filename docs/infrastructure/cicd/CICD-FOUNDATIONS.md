# CI/CD Foundations — Pipelines, Automation & Deployment Theory

A reference guide covering Continuous Integration, Continuous Delivery, and Continuous Deployment principles. This document is designed to be consumed by any engineering team — it contains no project-specific configuration, module names, or environment variables.

> _This document covers universal CI/CD concepts. For a project-specific implementation walkthrough, see the companion [applied document](PROJECT-PIPELINE.md)._

---

## Table of Contents

1. [Core Definitions](#1-core-definitions)
2. [The CI/CD Pipeline Model](#2-the-cicd-pipeline-model)
3. [Pipeline Architecture — Jobs, Steps & Stages](#3-pipeline-architecture--jobs-steps--stages)
4. [GitHub Actions Execution Model](#4-github-actions-execution-model)
5. [Parallelisation Strategies](#5-parallelisation-strategies)
6. [The Testing Pyramid in CI](#6-the-testing-pyramid-in-ci)
7. [Service Containers & Integration Testing](#7-service-containers--integration-testing)
8. [Branch Protection & Status Checks](#8-branch-protection--status-checks)
9. [Secrets Management in CI](#9-secrets-management-in-ci)
10. [Deployment Models](#10-deployment-models)
11. [Container Image Build Strategies](#11-container-image-build-strategies)
12. [Anti-Patterns](#12-anti-patterns)
13. [References](#13-references)

---

## 1. Core Definitions

### Continuous Integration (CI)

The practice of merging all developer working copies to a shared mainline **frequently** — at least once per day — and validating each merge with an automated build and test run. The goal is to detect integration errors early, when they are cheap to fix.

> _"Continuous Integration doesn't get rid of bugs, but it does make them dramatically easier to find and remove."_
> — Martin Fowler, _Continuous Integration_ (2006)

### Continuous Delivery (CD)

An extension of CI where the software is always in a **releasable state**. Every commit that passes the full pipeline _could_ be deployed to production, but the actual deployment is a manual business decision (e.g., pressing a button).

### Continuous Deployment

Goes one step beyond Continuous Delivery: every commit that passes all pipeline stages is **automatically deployed** to production with no human intervention. This requires extremely high confidence in automated testing.

| Dimension          | Continuous Delivery | Continuous Deployment          |
| :----------------- | :------------------ | :----------------------------- |
| Deploy trigger     | Manual approval     | Automatic                      |
| Testing confidence | High                | Very high                      |
| Rollback strategy  | Pre-planned         | Automated (canary, blue-green) |
| Adoption maturity  | Most organisations  | Mature DevOps teams            |

> **Source**: Humble, J. & Farley, D. — _Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation_ (2010). ISBN 978-0-321-60191-9.

---

## 2. The CI/CD Pipeline Model

A CI/CD pipeline is a **directed acyclic graph (DAG)** of automated stages that transform source code into a validated, deployable artifact. The canonical pipeline has four stages:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source   │───▶│  Build   │───▶│   Test   │───▶│  Deploy  │
│  (SCM)   │    │ (compile)│    │ (verify) │    │ (release)│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Stage breakdown

| Stage      | Purpose                                                                     | Typical Duration |
| :--------- | :-------------------------------------------------------------------------- | :--------------- |
| **Source** | Triggered by a SCM event (push, PR, tag). Checks out the code.              | 5–15s            |
| **Build**  | Compiles source, resolves dependencies, produces artifacts.                 | 15–120s          |
| **Test**   | Runs linting, type-checking, unit tests, integration tests, security scans. | 30s–15m          |
| **Deploy** | Publishes artifacts, pushes container images, updates infrastructure.       | 30s–10m          |

The key insight is that stages should be ordered by **feedback speed** — fast, cheap checks run first. If linting fails in 10 seconds, there is no reason to wait 5 minutes for integration tests to discover the same broken commit.

> **Source**: Kim, G. et al. — _The DevOps Handbook_ (2016), Chapter 10: "Enable Fast and Reliable Automated Testing". ISBN 978-1-942788-00-3.

---

## 3. Pipeline Architecture — Jobs, Steps & Stages

Most CI/CD platforms (GitHub Actions, GitLab CI, Jenkins, CircleCI) organise pipelines using three levels of granularity:

### Steps

The smallest unit of work. A step is a single command or action execution (e.g., `npm ci`, `npm run test`). Steps within a job run **sequentially** in the same environment.

### Jobs

A job is a collection of steps that execute on a **single runner** (virtual machine or container). Jobs can run in parallel or be ordered with dependency declarations.

### Stages / Workflows

The top-level grouping. A workflow defines the trigger conditions, the jobs to run, and the dependency graph between them.

```
Workflow
├── Job A (lint)        ← runs in parallel
├── Job B (typecheck)   ← runs in parallel
├── Job C (unit-tests)  ← runs in parallel
├── Job D (build)       ← runs in parallel
└── Job E (integration) ← depends on A, B, C, D
```

### Why separate jobs instead of separate steps?

| Dimension      | Sequential Steps (1 Job)      | Parallel Jobs                        |
| :------------- | :---------------------------- | :----------------------------------- |
| **Speed**      | Total = sum of all step times | Total = max of parallel job times    |
| **Isolation**  | Shared filesystem, shared env | Each job gets a clean VM             |
| **Feedback**   | First failure blocks all      | All failures reported simultaneously |
| **Cost**       | 1 runner                      | N runners (billable minutes × N)     |
| **Complexity** | Simple YAML                   | Dependency graph required            |

The trade-off is clear: parallel jobs are faster and provide better failure isolation, but consume more runner minutes. For open-source projects with generous free-tier minutes, parallelisation is almost always worth it.

> **Source**: GitHub Docs — [Using jobs in a workflow](https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow).

---

## 4. GitHub Actions Execution Model

GitHub Actions is an event-driven CI/CD platform built into GitHub. Understanding its execution model is essential for writing efficient workflows.

### Runners

A **runner** is a virtual machine (or self-hosted machine) that executes a single job. GitHub-hosted runners are ephemeral — they are provisioned for the job, execute it, and are destroyed. Each runner starts with a clean filesystem.

### Event triggers

Workflows are triggered by repository events. Common triggers:

| Event               | Description                          | Common use case        |
| :------------------ | :----------------------------------- | :--------------------- |
| `push`              | Commit pushed to a branch            | CI on main/develop     |
| `pull_request`      | PR opened, synchronised, or reopened | PR validation          |
| `workflow_dispatch` | Manual trigger via GitHub UI or API  | On-demand deployments  |
| `release`           | GitHub Release published             | Production deployment  |
| `schedule`          | Cron expression                      | Nightly builds, audits |

### Concurrency control

The `concurrency` key ensures that only one workflow run per group key is active at a time. When a new run is queued, the previous in-progress run can be cancelled:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

This prevents wasted runner minutes when a developer pushes multiple commits in quick succession — only the latest commit is tested.

### Permissions

The `permissions` key restricts the `GITHUB_TOKEN` scope using the **principle of least privilege**. A CI workflow that only reads code and PRs should declare:

```yaml
permissions:
  contents: read
  pull-requests: read
```

> **Source**: GitHub Docs — [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions).

---

## 5. Parallelisation Strategies

### Fan-out / Fan-in

The most common parallelisation pattern. Independent verification jobs fan out in parallel, and a dependent job fans in after all pass:

```
         ┌── lint ──────┐
         ├── typecheck ──┤
push ───▶├── unit-tests ─┼──▶ integration ──▶ deploy
         ├── build ──────┤
         └── arch-tests ─┘
```

**Why this works**: lint, typecheck, unit tests, and build are _independent_ — they don't share state. The integration job depends on all of them because:

1. There is no point running expensive integration tests if the code doesn't compile.
2. Service containers (databases, caches) consume runner resources and boot slowly.

### Matrix strategies

When testing across multiple runtime versions (e.g., Node.js 18, 20, 22), GitHub Actions provides `strategy.matrix`:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
```

This spawns N parallel jobs — one per matrix entry. Useful for library authors who support multiple runtimes.

### Dependency caching

Dependency installation (`npm ci`) can account for 30–60% of job time. Caching the dependency directory across runs eliminates redundant downloads:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
```

The `cache` option hashes `package-lock.json` and restores `~/.npm` if the hash matches. A cache hit reduces `npm ci` from 30s+ to under 5s.

> **Source**: GitHub Docs — [Caching dependencies to speed up workflows](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows).

---

## 6. The Testing Pyramid in CI

The testing pyramid (coined by Mike Cohn) prescribes that a healthy test suite should have:

```
          ┌─────┐
         /  E2E  \          ← Few, slow, expensive
        /─────────\
       / Integration \      ← Moderate count, moderate speed
      /───────────────\
     /   Unit Tests    \    ← Many, fast, cheap
    /───────────────────\
```

### Mapping the pyramid to CI jobs

| Layer           | CI job characteristics                                             | Service deps   |
| :-------------- | :----------------------------------------------------------------- | :------------- |
| **Unit**        | Fast (seconds). No external deps. Runs with mocked boundaries.     | None           |
| **Integration** | Medium (seconds–minutes). Tests real database/cache interactions.  | DB, cache      |
| **E2E**         | Slow (minutes). Full HTTP request/response cycles through the app. | DB, cache, app |

### CI optimisation principle

Run fast checks first, expensive checks last. If a unit test catches a bug in 5 seconds, the 2-minute integration test is wasted effort. This is why the fan-out/fan-in pattern places unit tests, linting, and type-checking in parallel _before_ integration tests.

> **Source**: Cohn, M. — _Succeeding with Agile: Software Development Using Scrum_ (2009), Chapter 16: "The Testing Pyramid". ISBN 978-0-321-57936-2.

---

## 7. Service Containers & Integration Testing

Integration tests need real infrastructure — databases, caches, message brokers. CI platforms provide two approaches:

### Approach 1: Service containers (GitHub Actions)

GitHub Actions can spawn Docker containers alongside the job runner. These containers are accessible via `localhost` on the runner:

```yaml
services:
  postgres:
    image: postgres:16
    ports: ['5432:5432']
    env:
      POSTGRES_PASSWORD: test
    options: >-
      --health-cmd="pg_isready -q"
      --health-interval=10s
      --health-timeout=5s
      --health-retries=5
```

**Advantages**: Simple configuration, no external dependencies, health-check support built in.

**Disadvantages**: Containers boot before _any_ step runs — if used in a monolithic job, they idle during lint/typecheck steps. This is why integration tests should be in a **separate job** that only starts service containers when needed.

### Approach 2: Testcontainers

The Testcontainers library (available for Java, Node.js, Python, Go) programmatically starts and stops Docker containers within test code. The test suite manages the container lifecycle:

```typescript
const container = await new PostgreSqlContainer('postgres:16')
  .withDatabase('test_db')
  .start();
```

**Advantages**: Fine-grained lifecycle control, port randomisation prevents conflicts, container version is co-located with test code.

**Disadvantages**: Requires Docker-in-Docker or a Docker socket mount on the CI runner, slightly more complex setup.

> **Source**: GitHub Docs — [About service containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers). Testcontainers — [Node.js module](https://node.testcontainers.org/).

---

## 8. Branch Protection & Status Checks

Branch protection rules enforce quality gates _before_ code can be merged. The two key mechanisms:

### Required status checks

A **status check** is a job name (or the workflow name) that must pass before a PR can be merged. GitHub evaluates the check by matching the job name or the workflow's final reported status.

**The aggregator pattern**: When splitting a monolithic CI job into parallel jobs, branch protection rules that referenced the old single job name break. The solution is to add a final **status check job** that depends on all parallel jobs and reports a single pass/fail:

```yaml
ci:
  name: CI Status Check
  needs: [lint, typecheck, unit-tests, build, integration]
  if: always()
  steps:
    - name: Evaluate results
      run: |
        # Check each job's result and exit 1 if any failed
```

This pattern allows the branch protection rule to require only the `ci` job name, regardless of how many parallel jobs exist upstream.

### Required reviews

Complementary to automated checks. At least one (or more) human reviewers must approve the PR before merging. Automated checks verify _correctness_; reviews verify _intent_ and _design_.

> **Source**: GitHub Docs — [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

---

## 9. Secrets Management in CI

CI pipelines often need credentials (database passwords, API keys, deployment tokens). Key principles:

### Never hardcode secrets

Secrets must be injected at runtime via the CI platform's secret store, never committed to the repository. Even in private repositories, secrets in code are a security incident waiting to happen.

### Scope secrets narrowly

| Scope level      | Description                                             | Use case               |
| :--------------- | :------------------------------------------------------ | :--------------------- |
| **Repository**   | Available to all workflows in the repo                  | DB passwords, API keys |
| **Environment**  | Scoped to a named environment (e.g., `staging`, `prod`) | Deployment credentials |
| **Organisation** | Shared across all repos in the org                      | Registry credentials   |

### Fork safety

Forks of public repositories should **never** have access to the upstream repository's secrets. GitHub Actions enforces this by default — `secrets.*` values are empty for PRs from forks. Workflows should handle this gracefully by skipping secret-dependent steps (e.g., integration tests) for fork PRs.

```yaml
if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
```

> **Source**: GitHub Docs — [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions). OWASP — [CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/).

---

## 10. Deployment Models

### Manual deployment

The simplest model. A human triggers the deployment (e.g., `workflow_dispatch`, SSH into a server, pressing a button in a dashboard). Suitable for early-stage projects.

### Environment-based deployment

GitHub Actions supports named **environments** (`staging`, `production`) with:

- **Protection rules**: Required reviewers, wait timers.
- **Scoped secrets**: Different credentials per environment.
- **Deployment history**: Audit trail of who deployed what and when.

```yaml
deploy:
  environment: production
  needs: [ci]
```

### Blue-Green deployment

Two identical production environments exist: Blue (current) and Green (new). Traffic is switched atomically from Blue to Green once the new version passes health checks. Rollback is instant — switch traffic back to Blue.

### Canary deployment

A small percentage of production traffic (e.g., 5%) is routed to the new version. If error rates remain stable, traffic is gradually increased. If errors spike, traffic is rolled back to the old version.

| Model      | Rollback speed | Resource cost | Complexity | Risk     |
| :--------- | :------------- | :------------ | :--------- | :------- |
| Manual     | Slow           | Low           | Low        | High     |
| Blue-Green | Instant        | 2× infra      | Medium     | Low      |
| Canary     | Fast           | 1× + margin   | High       | Very low |
| Rolling    | Medium         | 1×            | Medium     | Medium   |

> **Source**: Humble, J. & Farley, D. — _Continuous Delivery_ (2010), Chapters 10–12. ISBN 978-0-321-60191-9. AWS — [Blue/Green Deployments](https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/bluegreen-deployments.html).

---

## 11. Container Image Build Strategies

### Multi-stage Docker builds

Multi-stage builds produce minimal production images by separating build-time dependencies from runtime dependencies:

```dockerfile
# Stage 1: Install all deps and compile
FROM node:20-alpine AS build
COPY . .
RUN npm ci && npm run build

# Stage 2: Production-only deps
FROM node:20-alpine AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 3: Final minimal image
FROM node:20-alpine
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
```

**Benefits**: The final image contains no dev dependencies, no source code, no build tools — only the compiled output and production `node_modules`.

### Image tagging strategies

| Strategy    | Tag format        | Use case                                    |
| :---------- | :---------------- | :------------------------------------------ |
| **Git SHA** | `abc1234`         | Immutable, traceable to exact commit        |
| **Semver**  | `v1.2.3`          | Release versioning                          |
| **Branch**  | `develop`, `main` | Latest build of a branch (mutable)          |
| **Latest**  | `latest`          | Convenience alias (never use in production) |

The recommended practice is to tag with both the Git SHA (immutable, for traceability) and the semantic version (human-readable, for releases).

> **Source**: Docker Docs — [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/). Google — [Best practices for building containers](https://cloud.google.com/architecture/best-practices-for-building-containers).

---

## 12. Anti-Patterns

| Anti-Pattern                            | Problem                                                                                                                                                            | Correct Approach                                                                                                         |
| :-------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **Monolithic CI job**                   | All checks run sequentially in one job. A lint failure at step 2 blocks test results at step 8. Feedback is slow.                                                  | Split into parallel jobs. Fast checks (lint, typecheck) run independently from slow checks (integration tests).          |
| **Service containers in every job**     | Databases and caches boot for jobs that don't need them (e.g., linting). Wastes 20–40 seconds per unnecessary container.                                           | Only declare service containers in integration/e2e jobs that actually use them.                                          |
| **`--runInBand` for unit tests**        | Forces single-threaded test execution. Appropriate for integration tests sharing state, but cripples unit test performance.                                        | Use `--runInBand` only for tests that share mutable external state. Run unit tests in parallel (Jest default).           |
| **Hardcoded secrets in workflow files** | Credentials in YAML files are committed to SCM history forever. Even if deleted, they remain in git history.                                                       | Use the CI platform's encrypted secret store. Reference via `${{ secrets.KEY }}`.                                        |
| **No concurrency control**              | Multiple workflow runs for the same branch execute simultaneously, wasting runner minutes and producing confusing results.                                         | Use `concurrency` groups with `cancel-in-progress: true`.                                                                |
| **Auto-tagging on every merge**         | Creates tags on every commit to a branch, not just version bumps. Tags become noise, and the tag may not correspond to a meaningful release.                       | Tag intentionally: via `git tag` locally, or trigger on GitHub Release creation.                                         |
| **Testing only in CI**                  | Developers push broken code because they don't run checks locally. CI becomes a slow feedback loop.                                                                | Use pre-commit hooks (e.g., Husky + lint-staged) for fast local checks. CI is the safety net, not the primary check.     |
| **No status check aggregator**          | After splitting a monolithic job into parallel jobs, branch protection rules reference a job name that no longer exists. PRs can be merged without checks passing. | Add a final aggregator job that depends on all parallel jobs and reports a single pass/fail status.                      |
| **Ignoring fork PR security**           | Fork PRs access repository secrets, enabling secret exfiltration via malicious workflow modifications.                                                             | Skip secret-dependent steps for fork PRs using `if: github.event.pull_request.head.repo.full_name == github.repository`. |
| **No dependency caching**               | `npm ci` downloads the entire dependency tree on every run, adding 30–90 seconds to every job.                                                                     | Cache the npm/yarn/pnpm store and restore on cache hits using `actions/setup-node` with `cache: 'npm'`.                  |

---

## 13. References

|  #  | Source                                                   | URL / ISBN                                                                                                                                      |
| :-: | :------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  | Humble, J. & Farley, D. — _Continuous Delivery_ (2010)   | ISBN 978-0-321-60191-9                                                                                                                          |
|  2  | Kim, G. et al. — _The DevOps Handbook_ (2016)            | ISBN 978-1-942788-00-3                                                                                                                          |
|  3  | Cohn, M. — _Succeeding with Agile_ (2009)                | ISBN 978-0-321-57936-2                                                                                                                          |
|  4  | Fowler, M. — _Continuous Integration_ (2006)             | https://martinfowler.com/articles/continuousIntegration.html                                                                                    |
|  5  | GitHub Docs — Workflow syntax for GitHub Actions         | https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions                                                           |
|  6  | GitHub Docs — Using jobs in a workflow                   | https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow                                                                          |
|  7  | GitHub Docs — Caching dependencies to speed up workflows | https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows                                                   |
|  8  | GitHub Docs — About service containers                   | https://docs.github.com/en/actions/using-containerized-services/about-service-containers                                                        |
|  9  | GitHub Docs — About protected branches                   | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches |
| 10  | GitHub Docs — Using secrets in GitHub Actions            | https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions                                                              |
| 11  | OWASP — Top 10 CI/CD Security Risks                      | https://owasp.org/www-project-top-10-ci-cd-security-risks/                                                                                      |
| 12  | Docker Docs — Multi-stage builds                         | https://docs.docker.com/build/building/multi-stage/                                                                                             |
| 13  | Google Cloud — Best practices for building containers    | https://cloud.google.com/architecture/best-practices-for-building-containers                                                                    |
| 14  | AWS — Blue/Green Deployments                             | https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/bluegreen-deployments.html                                           |
| 15  | Testcontainers — Node.js module                          | https://node.testcontainers.org/                                                                                                                |
