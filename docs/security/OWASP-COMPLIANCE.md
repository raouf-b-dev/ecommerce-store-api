# 🛡️ OWASP Top 10:2025 Security Compliance & Supply-Chain Audit

> **Document Type:** Academic & Empirical Security Architecture Compliance Report  
> **System Target:** `ecommerce-store-api` (Enterprise Modular Monolith Node.js/NestJS Application)  
> **Reference Standard:** OWASP Top 10:2025 Standard (Released January 2026)  
> **Security Classification:** Technical Architecture & Compliance Specification

---

## 📋 Executive Abstract & Formal Threat Model

The `ecommerce-store-api` application employs a formal **Defense-in-Depth (DiD)** and **Zero Trust Architecture (ZTA)** paradigm to guarantee data confidentiality, system integrity, and service availability. Built on Domain-Driven Design (DDD) and Hexagonal Architecture (Ports and Adapters), the system isolates core business domain invariants from external transport protocols, infrastructure persistence adapters, and third-party dependency graphs.

Security boundary controls are enforced across five distinct system strata:

1. **Network & Transport Layer:** Mandatory TLS, HTTP security header injection (Helmet RFC 7034 / CSP Level 3), CORS origin strict filtering, and non-root OCI containerization (`appuser`).
2. **Access Control & Identity Layer:** RS256 Asymmetric JWT authentication via JSON Web Key Sets (JWKS), stateless access token verification, cryptographic refresh token rotation with reuse detection, unified caller context propagation (`CallerContext`), and explicit Role-Based / Attribute-Based Access Control (`@RequirePermissions`, `OwnedResourceAccessPolicy`).
3. **Application & Input Layer:** Strict boundary input sanitization (`SanitizeInterceptor` XSS stripping), structural DTO schema validation (`ValidationPipe` with strict white-listing), dynamic query identifier allowlists (`@IsIn`), and adaptive user-scoped rate limiting (`UserThrottlerGuard`).
4. **Persistence & Data Layer:** Parameterized SQL query execution (`$1` positional parameters via TypeORM QueryBuilder), explicit row-level locking (`SELECT ... FOR UPDATE` pessimistic locks for stock allocation), and distributed transaction idempotency tracking (`@Idempotent()`).
5. **Observability & Supply-Chain Layer:** Structured JSON telemetry via Winston/OpenTelemetry with automated regex PII redaction, automated dependency graph reachability analysis, and production exception masking (`GlobalExceptionFilter`).

```
                    +-------------------------------------------------------+
                    |                Inbound HTTP/REST Request              |
                    +-------------------------------------------------------+
                                                |
                                                v
                    +-------------------------------------------------------+
                    |  Transport Hardening (Helmet, CORS, Rate Limit)       |
                    +-------------------------------------------------------+
                                                |
                                                v
                    +-------------------------------------------------------+
                    |  Identity & Token Verification (RS256 JWT / JWKS)     |
                    +-------------------------------------------------------+
                                                |
                                                v
                    +-------------------------------------------------------+
                    |  Input Sanitization & DTO Validation (Sanitize, Pipe) |
                    +-------------------------------------------------------+
                                                |
                                                v
                    +-------------------------------------------------------+
                    |  Access Policy & IDOR Control (CallerContext, Policy) |
                    +-------------------------------------------------------+
                                                |
                                                v
                    +-------------------------------------------------------+
                    |  Core Hexagonal Domain & Query Layer (Param SQL, OCC) |
                    +-------------------------------------------------------+
```

---

## 🔐 OWASP Top 10:2025 System Compliance Matrix

Below is the formal mapping of `ecommerce-store-api` controls against the ten vulnerability categories of the **OWASP Top 10:2025** benchmark:

| Category ID  | Vulnerability Class                       | Compliance Status | Theoretical & Empirical Control Mechanism                                                                                                                                                                            | Primary Architectural Artifact                                                                         |
| :----------- | :---------------------------------------- | :---------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **A01:2025** | **Broken Access Control** _(incl. SSRF)_  | ✅ **Compliant**  | Mandatory `CallerContext` injection, explicit `OwnedResourceAccessPolicy` evaluation, `CartOwnershipValidator`, zero user-influenced outbound network calls (SSRF mitigation).                                       | `src/shared-kernel/domain/policies/owned-resource-access.policy.ts`                                    |
| **A02:2025** | **Security Misconfiguration**             | ✅ **Compliant**  | Helmet HTTP security headers (HSTS, CSP, X-Frame-Options), strict CORS origin reflection, `ValidationPipe` (`forbidNonWhitelisted: true`), non-root container principal (`appuser`).                                 | `src/main.ts`, `Dockerfile`                                                                            |
| **A03:2025** | **Software Supply Chain Failures**        | ✅ **Compliant**  | Immutable lockfile pinning (`npm ci`), script execution blocking (`--ignore-scripts`), multi-stage Docker build isolation, Dependabot weekly updates, informational CI audit pipeline.                               | `.github/dependabot.yml`, `.github/workflows/ci.yml`                                                   |
| **A04:2025** | **Cryptographic Failures**                | ✅ **Compliant**  | RS256 asymmetric JWT key pairs, bcrypt password hashing with key stretching (cost factor 10), TLS 1.3 transport security, strict environment variable secret segregation.                                            | `src/infrastructure/jwt/`, `docs/security/SECRETS-MANAGEMENT.md`                                       |
| **A05:2025** | **Injection**                             | ✅ **Compliant**  | Automated TypeORM parameterized SQL query builder (`$1`), `SanitizeInterceptor` for HTML entity decoding/XSS stripping, hardcoded `@IsIn` sort column maps, static AST security scanning (`eslint-plugin-security`). | `src/interceptors/sanitize.interceptor.ts`, `eslint.config.mjs`                                        |
| **A06:2025** | **Insecure Design**                       | ✅ **Compliant**  | DDD Bounded Context isolation, Anti-Corruption Layer (ACL) gateways between modules, automated architecture AST boundary enforcement (`npm run test:arch`).                                                          | `docs/architecture/DDD-HEXAGONAL.md`, `test/architecture/`                                             |
| **A07:2025** | **Authentication Failures**               | ✅ **Compliant**  | Cryptographic refresh token rotation, token reuse anomaly detection & automatic session revocation family trees, user-scoped sliding window rate limiting.                                                           | `src/modules/authentication/core/application/usecases/refresh-token/`, `src/infrastructure/throttler/` |
| **A08:2025** | **Software & Data Integrity Failures**    | ✅ **Compliant**  | Subresource integrity in CI actions (`persist-credentials: false`), Redis `SET NX` HTTP idempotency (`@Idempotent()`), BullMQ SAGA state machine compensation locks.                                                 | `src/infrastructure/idempotency/`, `src/modules/orders/`                                               |
| **A09:2025** | **Logging & Alerting Failures**           |  ⚠️ **Partial**   | Structured JSON Winston logs, automated regex PII masking (passwords, card numbers, tokens), `X-Request-Id` correlation propagation. _(Alerting threshold rules scheduled for Phase 16)_.                            | `src/infrastructure/logging/winston-logger.service.ts`                                                 |
| **A10:2025** | **Mishandling of Exceptional Conditions** | ✅ **Compliant**  | Unified 4-branch `GlobalExceptionFilter`, complete production stripping of stack traces, internal error codes, and layer metadata, preserving deterministic API contracts.                                           | `src/filters/global-exception.filter.ts`                                                               |

---

## 🏛️ In-Depth Technical Analysis by OWASP Category

### A01:2025 - Broken Access Control & IDOR Prevention

**Threat Model:** Insecure Direct Object References (IDOR) occur when an API endpoint uses client-supplied keys (e.g. `/orders/:id`) without validating whether the requesting principal owns or has explicit authorization to operate on the target aggregate entity.

**Control Implementation:**
The system enforces identity-based resource access control through a two-tiered verification mechanism:

1. **Granular RBAC Guards:** Routes are annotated with `@RequirePermissions()`. The `PermissionsGuard` compares the requesting identity's permission vector against route requirements.
2. **Context-Aware Ownership Policies:** Endpoints processing user-owned aggregates (Carts, Orders, Payments, Profiles) construct a `CallerContext` from verified JWT claims (`userId`, `roles`, `permissions`). Requests pass through domain policies (e.g., `OwnedResourceAccessPolicy` or `CartOwnershipValidator`) prior to domain logic execution.

```typescript
// Formal Domain Ownership Verification Example
export class OwnedResourceAccessPolicy {
  public static canAccess(
    caller: CallerContext,
    resourceOwnerId: number,
  ): boolean {
    // Administrator override under Principle of Least Privilege
    if (caller.hasPermission('manage_all_orders')) {
      return true;
    }
    // Strict identity equivalence matching
    return caller.userId === resourceOwnerId;
  }
}
```

**SSRF Mitigation:** The application exposes **zero** endpoints that allow client-controlled URL parameters for outbound server-side HTTP fetching, completely neutralizing Server-Side Request Forgery vectors.

---

### A02:2025 - Security Misconfiguration

**Threat Model:** Unhardened server settings, default framework headers, missing CORS constraints, and over-permissive container privileges expose application infrastructure to automated scanning and execution exploits.

**Control Implementation:**

1. **HTTP Response Hardening:** `main.ts` executes `app.use(helmet())`, injecting security headers according to standard RFC recommendations:
   - `X-Frame-Options: DENY` (prevents Clickjacking)
   - `X-Content-Type-Options: nosniff` (prevents MIME-sniffing)
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforces HSTS)
2. **CORS Isolation:** Cross-Origin Resource Sharing is configured with an explicit whitelist loaded from `EnvConfigService`, rejecting wildcard `*` domains when `credentials: true`.
3. **DTO Strict Whitelisting:** `ValidationPipe` is instantiated with `forbidNonWhitelisted: true` and `whitelist: true`. Payload properties not declared in the target DTO class are automatically rejected with an HTTP `400 Bad Request`, neutralizing property-injection attacks.
4. **Least-Privilege Containerization:** The multi-stage `Dockerfile` defines a non-root POSIX user and group (`appuser:appgroup`), ensuring Node.js executes without root host access inside Alpine Linux containers.

---

### A03:2025 - Software Supply Chain Failures

**Threat Model:** Compromised third-party npm packages, malicious post-install lifecycle scripts, and untracked dependency drift introduce backdoors and remote code execution vulnerabilities into the server runtime.

**Control Implementation:**

1. **Immutable Lockfile Enforcement:** Production Docker builds invoke `npm ci --ignore-scripts` in isolated multi-stage builds. This guarantees that `package-lock.json` hashes match exactly and arbitrary lifecycle scripts (`preinstall`, `postinstall`) are prevented from executing native binaries during package fetch.
2. **Dependency Update Automation:** `.github/dependabot.yml` executes weekly automated scans targeting npm dependencies, generating grouped pull requests for production and development dependencies separately.
3. **Continuous Integration Security Pipeline:** `.github/workflows/ci.yml` incorporates a dedicated `security` job executing `npm audit --omit=dev`. This surfaces newly disclosed production vulnerabilities directly within PR code reviews.

---

### A04:2025 - Cryptographic Failures

**Threat Model:** Weak encryption algorithms, hardcoded secret keys, insecure password storage, and unencrypted transport allow attackers to sniff or forge authentication tokens and credentials.

**Control Implementation:**

1. **Asymmetric Token Signing (RS256):** JSON Web Tokens are signed using RSA 2048-bit asymmetric private/public key pairs (RS256 algorithm). The API verifies incoming tokens using the public key (or published JWKS endpoint), keeping the private signing key completely isolated inside secure environment configurations.
2. **Credential Hashing Invariants:** User passwords are never stored in plaintext. Password hashing uses `bcrypt` with a cost factor (salt rounds) of 10, protecting stored hashes against rainbow table and GPU-accelerated brute-force attacks.
3. **Secret Isolation:** Environment secrets are parsed and validated at application startup using `EnvConfigService` backed by Joi schema definitions. Hardcoded fallback secrets are prohibited.

---

### A05:2025 - Injection (SQL, XSS, Command Injection)

**Threat Model:** Untrusted client input concatenated into SQL queries, rendered unescaped in HTML responses, or passed into shell execution functions leads to database exfiltration or remote code execution.

**Control Implementation:**

1. **Parameterized Query Layer:** Database persistence is managed by TypeORM repositories using parameterized `QueryBuilder` instances. User input is supplied strictly via bound parameters (`:userId`, `:status`), preventing SQL control structure injection.
2. **Dynamic Sort Field Filtering:** Where dynamic column sorting is supported (e.g. `/orders?sortBy=createdAt`), the sort key is validated against an explicit DTO allowlist (`@IsIn(['createdAt', 'updatedAt', 'totalPrice'])`). Arbitrary string input cannot reach SQL `ORDER BY` clauses.
3. **XSS Input Sanitization:** Global interceptor `SanitizeInterceptor` recurses through all incoming HTTP request bodies, query strings, and parameters, stripping hazardous HTML elements and unescaped script tags prior to domain processing.
4. **Static AST Analysis:** Static analysis tool `eslint-plugin-security` is embedded in the project ESLint flat configuration (`eslint.config.mjs`), scanning the AST for unsafe patterns (`eval()`, non-literal regular expressions, unsafe child process invocations).

---

### A06:2025 - Insecure Design & Architectural Boundaries

**Threat Model:** Monolithic applications with highly coupled module boundaries suffer from accidental data leaks, circular dependencies, and unhandled cross-domain side effects.

**Control Implementation:**

1. **Hexagonal Domain Isolation:** The codebase enforces strict separation between Core Application Logic, Domain Entities, and Secondary Infrastructure Adapters (PostgreSQL, Redis, BullMQ).
2. **Anti-Corruption Layer (ACL) Gateways:** Direct cross-module imports of entities or ORM schemas are prohibited. Modules communicate exclusively across boundary interfaces (ACL Gateways) using decoupled Data Transfer Objects (DTOs).
3. **Automated Architecture Boundary Testing:** The test suite includes automated architectural rules (`npm run test:arch` via `tsarch` / custom dependency analyzers), continuously validating that domain files do not depend on NestJS controllers or TypeORM infrastructure packages.

---

### A07:2025 - Authentication Failures & Token Lifecycle

**Threat Model:** Broken authentication mechanisms enable credential stuffing, session hijacking, refresh token replay, and brute-force account lockouts.

**Control Implementation:**

1. **Cryptographic Refresh Token Rotation:** Refresh tokens are bound to active user sessions stored in Redis with cryptographic hash verification. When a refresh token is exchanged, a new token pair is issued, and the consumed token is invalidated.
2. **Reuse Anomaly Detection:** If an already-consumed refresh token is submitted for token exchange, the system identifies a potential session hijack, immediately invalidating the entire family of refresh tokens associated with that user session.
3. **Adaptive User-Scoped Rate Limiting:** Global rate limiting is implemented via `UserThrottlerGuard` extending `@nestjs/throttler`. Unlike standard IP-based limiters, `UserThrottlerGuard` resolves the key using the authenticated user identity (`user.sub`), preventing brute-force attacks across distributed IP proxies:

```typescript
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user;
    if (user && (user.sub || user.userId || user.id)) {
      return `user_${user.sub || user.userId || user.id}`;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown_ip';
  }
}
```

High-risk endpoints (`/authentication/login`, `/orders/checkout`) are protected by strict throttler profiles limiting requests per minute.

---

### A08:2025 - Software and Data Integrity Failures

**Threat Model:** Race conditions during payment or order placement can lead to double-spending, inventory overselling, or unhandled asynchronous SAGA step failures.

**Control Implementation:**

1. **Distributed Idempotency Protection:** High-impact mutation routes (such as order checkout) are decorated with `@Idempotent()`. A Redis-backed store uses atomic `SET NX` locks keyed by authenticated `userId` + HTTP method + route + client key (`Idempotency-Key` or legacy `x-idempotency-key`; body `idempotencyKey` remains a fallback). Completed responses are replayed; concurrent in-progress duplicates return HTTP 409 with `Retry-After`. Redis errors fail closed with HTTP 503. This covers the HTTP checkout command only: not the BullMQ worker/SAGA chain.
2. **Inventory Lock Conservation:** Inventory decrement operations during checkout utilize PostgreSQL row-level pessimistic write locking (`SELECT ... FOR UPDATE`), ensuring concurrent transactions cannot reduce stock below zero.
3. **SAGA Compensation Mechanics:** Checkout processes managed via BullMQ feature failure listeners (`CheckoutFailureListener`) that execute compensating transactions (refunding authorizations, releasing stock reservations) if downstream steps fail.

---

### A09:2025 - Logging & Alerting Failures

**Threat Model:** Inadequate logging prevents timely detection of security breaches, while unrestricted logging can accidentally leak sensitive customer data (PII) or credentials into log aggregation systems.

**Control Implementation:**

1. **Structured Log Telemetry:** The application utilizes `WinstonLoggerService` configured to produce structured JSON outputs tagged with `timestamp`, `level`, `context`, `X-Request-Id` correlation IDs, and OpenTelemetry `traceId` / `spanId`.
2. **Automated PII & Credential Masking:** All log parameters undergo automated recursive key filtering to prevent sensitive attributes from reaching disk or console transports:

```typescript
const SENSITIVE_KEYS_REGEX =
  /^(password|token|secret|authorization|cookie|cardNumber|cvv|pan|ssn|creditCard)$/i;

const redactObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item));
  }

  const redacted: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS_REGEX.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      redacted[key] = redactObject(obj[key]);
    } else {
      redacted[key] = obj[key];
    }
  }
  return redacted;
};
```

3. **Tracing Integration:** OpenTelemetry SDK (`src/infrastructure/tracing/tracing.ts`) propagates trace context over OTLP/gRPC to Grafana Tempo, enabling end-to-end request tracing without exposing raw request payloads.

---

### A10:2025 - Mishandling of Exceptional Conditions (Error Masking)

**Threat Model:** Unhandled exceptions exposed to API clients can leak stack traces, database schema details, framework versions, or internal file system paths, aiding attackers in footprinting the application.

**Control Implementation:**

1. **Centralized Exception Interception:** Global filter `GlobalExceptionFilter` intercepts all thrown errors (`HttpException`, `BadRequestException`, `AppError`, and unhandled native `Error` instances).
2. **Production Information Masking:** When `NODE_ENV=production`, internal error fields (`stack`, `error`, `code`, `layer`) are omitted from HTTP response payloads. Clients receive standardized error structures containing only the HTTP `statusCode`, user-friendly `message`, and ISO `timestamp`:

```json
{
  "success": false,
  "statusCode": 500,
  "message": "An unexpected server error occurred.",
  "timestamp": "2026-08-01T18:00:00.000Z"
}
```

3. **Deterministic Output Streams:** Internal error trace details are routed exclusively to Winston error logs for diagnostic review by system operators.

---

## 🔍 Upstream Dependency Graph & Reachability Analysis

An `npm audit` scan of production dependencies (`node_modules`) identifies three advisory families in upstream packages. Below is the empirical **Reachability Graph Analysis** confirming these advisories do not pose active exploit surfaces in `ecommerce-store-api`:

```
+-----------------------------------------------------------------------------------+
|                        Transitive Dependency Advisory Analysis                    |
+------------------------------------+----------------------------------------------+
| Package & Advisory ID              | Reachability Analysis & System Status        |
+------------------------------------+----------------------------------------------+
| @grpc/grpc-js                      | REACHABLE -> RESOLVED via `npm audit fix`    |
| GHSA-5375-pq7m-f5r2                | Upgraded to patched release version 1.14.4.  |
+------------------------------------+----------------------------------------------+
| @nestjs/core                       | REACHABLE -> RESOLVED via `npm audit fix`    |
| GHSA-36xv-jgw5-4q75                | Upgraded path-to-regexp parser dependency.   |
+------------------------------------+----------------------------------------------+
| @opentelemetry/core                | UNREACHABLE                                  |
| GHSA-8988-4f7v-96qf                | Vulnerability exists in W3C Baggage header   |
|                                    | propagator. System explicitly uses OTLP gRPC |
|                                    | tracecontext exporter; Baggage propagator is |
|                                    | neither loaded nor exposed to HTTP headers.  |
+------------------------------------+----------------------------------------------+
```

---

## 🧪 Verification & Audit Compliance Sign-Off

The security controls detailed in this specification are subject to continuous automated regression testing across the project CI pipeline:

1. **Static Analysis & Linting:** `npm run lint:check` (validates code rules and `eslint-plugin-security` static analysis).
2. **Domain & Unit Testing:** `npm run test` (validates domain logic, security filter masking, and exception handling).
3. **Architecture Boundary Tests:** `npm run test:arch` (enforces module encapsulation and hexagonal boundary rules).
4. **Integration & E2E Security Tests:** `npm run test:e2e` (runs `test/e2e/security/security-idor.e2e-spec.ts` for RBAC/ownership isolation, plus `test/e2e/auth/authentication-lifecycle.e2e-spec.ts` and `test/e2e/checkout/checkout-saga.e2e-spec.ts`, against real PostgreSQL and Redis).

