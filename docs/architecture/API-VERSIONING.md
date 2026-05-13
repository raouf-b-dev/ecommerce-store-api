# API Versioning — Strategy & Reference

A comprehensive, framework-agnostic guide to API versioning strategy for RESTful services. Covers rationale, implementation patterns (with NestJS examples), deployment considerations, DTO mapping via the Anti-Corruption Layer, deprecation protocols, and common anti-patterns.

> _This document is designed to be consumed by any engineering team. It is not tied to a specific project or codebase._

---

## 1. Versioning Strategy

> _"API versioning is a contract between the provider and consumers. Breaking changes must never be introduced within a version."_

### 1.1 Choosing a Versioning Approach

```http
GET /v1/products
GET /v1/orders/123
POST /v1/auth/login
```

| Strategy     | Example                                     | Pros                                                | Cons                                          |
| ------------ | ------------------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| **URI Path** | `/v1/products`                              | Explicit, cacheable, easy to route at load balancer | Version in URL, not "RESTful" in purist sense |
| Header       | `Accept: application/vnd.api.v1+json`       | Clean URLs                                          | Hidden, harder to test, CDN/proxy unfriendly  |
| Query Param  | `/products?version=1`                       | Easy to add                                         | Easy to forget, cache key pollution           |
| Media Type   | `Content-Type: application/vnd.api.v1+json` | Precise                                             | Complex, poor tooling support                 |

**URI Path is the recommended default** for most teams, for these reasons:

1. **Explicitness** — The version is visible in every request. No ambiguity.
2. **Load Balancer Routing** — NGINX, AWS ALB, and Cloudflare can route `/v1/*` and `/v2/*` to different backends without inspecting headers.
3. **Cache Safety** — CDNs and reverse proxies key on URL by default. Different versions are automatically cached separately.
4. **Developer Experience** — Swagger UI, Postman, and curl all work naturally. No custom header setup required.
5. **Framework Support** — Most modern frameworks (NestJS, Express, ASP.NET, Spring Boot) support URI versioning natively.

### 1.2 Implementation (NestJS)

```typescript
// main.ts — enables versioning globally with a default
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1', // All controllers inherit v1 unless overridden
});
```

With `defaultVersion`, every controller automatically becomes v1 without any per-controller annotation. Only controllers that need to **opt out** of versioning (e.g. health checks) require explicit decoration:

```typescript
// Business controller — inherits defaultVersion '1'
// Routes become /v1/products/* with zero extra config
@Controller('products')
export class ProductsController { ... }

// Version-neutral controller — explicitly overrides the default
// Routes stay at /health (no version prefix)
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController { ... }
```

> **Why `defaultVersion` over per-controller declarations?**
>
> Hardcoding `version: '1'` in every controller is a DRY violation. If you ever need to change the default version, you'd have to touch every file. With `defaultVersion`, version policy is centralized in the bootstrap file — the single source of truth. Only controllers that _differ_ from the default need an explicit override.

### 1.3 What Gets Versioned vs What Doesn't

| Category                                    | Versioned?                | Rationale                                                  |
| ------------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| **Business endpoints** (CRUD, auth, etc.)   | ✅ Yes                    | API contract — breaking changes require a new version      |
| **Health checks** (`/health`, `/readiness`) | ❌ No (`VERSION_NEUTRAL`) | Infrastructure probes — must be stable across all versions |
| **Metrics** (`/metrics`)                    | ❌ No (`VERSION_NEUTRAL`) | Prometheus/monitoring scrape targets — version-agnostic    |
| **Documentation** (`/api/docs`)             | ❌ No                     | Static content served outside the controller layer         |
| **WebSocket Gateways**                      | ❌ No                     | Socket protocols use their own versioning mechanisms       |

---

## 2. Version Lifecycle

### 2.1 When to Introduce a New Version

Create a new version **only** when you need to make a **breaking change** to an existing endpoint's contract:

| Change Type                             | Breaking? | Requires New Version?            |
| --------------------------------------- | --------- | -------------------------------- |
| Add a new optional field to a response  | No        | ❌ Add to current version        |
| Add a new endpoint                      | No        | ❌ Add to current version        |
| Remove a field from a response          | **Yes**   | ✅ New version                   |
| Rename a field                          | **Yes**   | ✅ New version                   |
| Change a field's type (string → number) | **Yes**   | ✅ New version                   |
| Change validation rules (tighter)       | **Yes**   | ✅ New version                   |
| Remove an endpoint                      | **Yes**   | ✅ New version (deprecate first) |
| Change pagination format                | **Yes**   | ✅ New version                   |
| Change error response structure         | **Yes**   | ✅ New version                   |

### 2.2 Adding a New Version — Step by Step

When a breaking change is needed:

1. **Create a new versioned controller** alongside the existing one:

   ```text
   src/modules/products/
   ├── products.controller.ts          ← v1 (existing — kept alive)
   ├── products-v2.controller.ts       ← v2 (new contract)
   ```

2. **Version the new controller** (explicitly, since it differs from `defaultVersion`):

   ```typescript
   @Controller({ path: 'products', version: '2' })
   export class ProductsV2Controller {
     // New contract — can have different DTOs, responses, etc.
   }
   ```

3. **Both versions coexist.** The framework routes `/v1/products` to the original controller and `/v2/products` to the new one.

4. **Reuse the application layer.** Both controllers call the **same use cases** — the controller is just a presentation adapter. This is a direct benefit of layered/hexagonal architecture:

   ```text
   ProductsController (v1)  ──┐
                                ├──→ CreateProductUseCase (shared)
   ProductsV2Controller (v2) ──┘
   ```

5. **Deprecate the old version** with a timeline (see §2.4). Add a `Sunset` header.

6. **Remove the old version** after the deprecation period expires.

### 2.3 Handling Internal Changes Without Breaking Consumers

> **The core question**: _If the application layer changes its input shape, doesn't that break the old version?_
>
> **No.** The old version's controller acts as an **Anti-Corruption Layer (ACL)** — it maps the frozen external contract to whatever the application layer currently expects. Consumers of the old version never see the internal change.

#### Controller DTOs ≠ Application DTOs

This is the most important architectural distinction. There are **two separate DTO layers**:

| Layer                         | DTO                  | Owned By                              | Changes When                  |
| ----------------------------- | -------------------- | ------------------------------------- | ----------------------------- |
| **Presentation** (controller) | `CreateProductDto`   | The API contract (frozen per version) | A new API version is released |
| **Application** (use case)    | `CreateProductInput` | The internal application logic        | Business requirements change  |

The controller's **only job** is to translate between these two layers.

#### Example: Field Rename (`name` → `title`)

Suppose the business decides to rename the `name` field to `title` internally:

```typescript
// ── Application Layer — internal input changed ──────────────────
export interface CreateProductInput {
  title: string; // was: name
  amount: number; // was: price
}

// ── V1 Controller — frozen API contract, absorbs change via mapping
@Controller('products')
export class ProductsController {
  @Post()
  async create(@Body() dto: CreateProductDto) {
    // dto.name still works for v1 clients — contract unchanged
    return this.createProductUseCase.execute({
      title: dto.name, // ← map old field to new internal name
      amount: dto.price, // ← map old field to new internal name
    });
  }
}

// ── V2 Controller — new API contract, matches internal shape directly
@Controller({ path: 'products', version: '2' })
export class ProductsV2Controller {
  @Post()
  async create(@Body() dto: CreateProductDtoV2) {
    return this.createProductUseCase.execute({
      title: dto.title,
      amount: dto.amount,
    });
  }
}
```

**Result**: V1 clients continue sending `{ name, price }` and it works. V2 clients send `{ title, amount }`. Both hit the same use case. No one breaks.

#### Example: New Required Field

Suppose a new version adds a mandatory `categoryId` field:

```typescript
// ── V1 Controller — provides a sensible default ─────────────────
@Controller('products')
export class ProductsController {
  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.createProductUseCase.execute({
      ...dto,
      categoryId: dto.categoryId ?? DEFAULT_CATEGORY_ID, // ← backfill
    });
  }
}

// ── V2 Controller — requires it explicitly ──────────────────────
@Controller({ path: 'products', version: '2' })
export class ProductsV2Controller {
  @Post()
  async create(@Body() dto: CreateProductDtoV2) {
    // categoryId is required in v2 DTO — no default needed
    return this.createProductUseCase.execute(dto);
  }
}
```

#### When Is a Change Truly Unmappable?

In rare cases, no reasonable mapping or default exists — for example:

- A required field is added that has **no sensible default** and cannot be derived
- The operation semantics changed entirely (e.g., sync → async with a job ID)
- A security model change makes the old contract inherently unsafe

**Only then** do you deprecate the old version with a `Sunset` header and a migration timeline. The goal is to give consumers time to migrate — **never** to silently break them.

#### Decision Flowchart

```text
Application input changed?
├── Can the old controller MAP old fields to new ones?
│   └── YES → Update the controller mapper. No new version needed.
├── Can a sensible DEFAULT be provided for new required fields?
│   └── YES → Backfill in the old controller. No new version needed.
├── Is the change truly unmappable?
│   └── YES → Create new version. Deprecate old version with Sunset header.
└── Does the RESPONSE shape change?
    ├── Adding fields → Non-breaking. Add to current version response.
    └── Removing/renaming fields → Create new version with new response DTO.
```

> **Key takeaway**: Most internal changes can be absorbed by the old controller's mapping logic. Creating a new version is a **last resort**, not the default reaction to any change.

### 2.4 Deprecation Protocol

When a version must be retired:

```typescript
// Old controller — add sunset headers to signal deprecation
@Controller('products')
@Header('Sunset', 'Sat, 01 Mar 2027 00:00:00 GMT')
@Header('Deprecation', 'true')
export class ProductsController { ... }
```

Timeline:

- **T+0**: Announce deprecation. Add `Sunset` and `Deprecation` headers.
- **T+3 months**: Log warnings for deprecated version traffic. Monitor usage dashboards.
- **T+6 months**: Remove deprecated controllers. Return `410 Gone` for retired routes.

### 2.5 Version Number Immutability

> **Version numbers are permanent, immutable identifiers. They must never be reused.**

Once a version number has been assigned and exposed to consumers, it is permanently associated with a specific API contract. Even after a version is retired and removed, its number is **burned** — it can never be reassigned to a different contract.

#### Why Reusing Version Numbers Is Forbidden

Consider this scenario: v1 is retired, v2 and v3 are active, then v3 is "renamed" to v1:

| Problem                 | Consequence                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Cached responses**    | CDNs, proxies, and clients may serve stale v1 responses from before retirement. The old and new contracts will collide.                 |
| **Client assumptions**  | Any client that previously integrated with v1 and stored the contract schema will assume the old shape. Silent data corruption follows. |
| **Documentation drift** | Blog posts, tutorials, Stack Overflow answers, and internal wikis referencing "v1" now describe the wrong contract.                     |
| **Audit & compliance**  | Regulatory systems that logged "called v1 at timestamp X" can no longer correlate which contract was active.                            |
| **Trust erosion**       | Consumers expect version numbers to be stable references. Reusing them destroys confidence in the versioning contract itself.           |

#### The Correct Alternative

If you want to simplify your version space after retiring old versions:

```text
❌ WRONG: Retire v1, rename v3 → v1
✅ RIGHT: Retire v1, keep v3 as v3. Accept that version numbers are not sequential.
```

Active versions `v2, v3, v5` are perfectly normal in mature APIs. Gaps in version numbers are a sign of healthy lifecycle management, not a problem to fix.

> _"Version numbers are like database primary keys — they are identifiers, not counters. Gaps are expected and harmless."_

---

## 3. Deployment Considerations

### 3.1 Load Balancer Routing

URI versioning enables **version-based routing** at the infrastructure level:

```nginx
# NGINX — route different versions to different backends
location /v1/ {
    proxy_pass http://api-v1-backend;
}

location /v2/ {
    proxy_pass http://api-v2-backend;
}
```

This enables **blue-green deployments** per version — you can deploy v2 independently without affecting v1 consumers.

### 3.2 Webhook URLs

> **Important**: External services (Stripe, PayPal, etc.) that call your API via webhooks must be updated when versioning is first enabled.

When introducing URI versioning to an existing API, webhook URLs change (e.g., `/webhooks/stripe` → `/v1/webhooks/stripe`). Update webhook URLs in external provider dashboards **before** deploying the versioned API.

For machine-to-machine webhook endpoints, consider making them `VERSION_NEUTRAL` since they are contracts controlled by the external provider, not by your API consumers.

### 3.3 OpenAPI / Swagger

Most frameworks automatically discover versioned routes and include the version prefix in generated specs. No manual configuration is typically needed.

When multiple versions coexist, generate **separate OpenAPI specs per version**:

```typescript
// NestJS example — separate docs per version
const v1Doc = SwaggerModule.createDocument(app, config, {
  include: [ProductsModule, OrdersModule],
});
SwaggerModule.setup('api/v1/docs', app, v1Doc);

const v2Doc = SwaggerModule.createDocument(app, config, {
  include: [ProductsV2Module],
});
SwaggerModule.setup('api/v2/docs', app, v2Doc);
```

### 3.4 Client Migration Checklist

When deploying a versioned API for the first time:

- [ ] Update all client base URLs to include the version prefix (e.g., `/v1/`)
- [ ] Update webhook URLs in external service dashboards
- [ ] Verify OpenAPI docs reflect versioned paths
- [ ] Test infrastructure endpoints are accessible without a version prefix
- [ ] Update API documentation and README with versioned examples
- [ ] Communicate the version policy to all API consumers

---

## 4. Architecture Alignment

### 4.1 Layered / Hexagonal Architecture & Versioning

Versioning is a **presentation concern** — it belongs exclusively in the **Primary Adapter** layer (controllers). The application core (use cases, domain entities) is **version-agnostic**:

```text
┌─────────────────────────────────────────────────┐
│              PRIMARY ADAPTERS                    │
│                                                  │
│  Controller (v1)  ──┐                            │
│                      ├──→ UseCase (shared)        │
│  Controller (v2)  ──┘                            │
│                                                  │
│              APPLICATION CORE                    │
│  (version-agnostic — no version awareness)       │
│                                                  │
│              SECONDARY ADAPTERS                  │
│  (version-agnostic — no version awareness)       │
└─────────────────────────────────────────────────┘
```

**Rules**:

- ✅ Version policy is centralized in the bootstrap/entry point
- ✅ Business controllers use the default version — no per-controller decoration
- ✅ New version controllers explicitly declare their version
- ✅ Infrastructure controllers override with `VERSION_NEUTRAL`
- ✅ Different versions can have different DTOs (input/output transformation)
- ✅ All versions share the same use cases and domain layer
- ❌ Never add version awareness to the domain or application layer
- ❌ Never version repositories, gateways, or infrastructure

### 4.2 File Organization (Multi-Version)

When a new version is needed for a specific module:

```text
src/modules/products/
├── core/                          ← Shared across all versions
│   ├── domain/
│   └── application/
├── primary-adapters/
│   ├── dto/                       ← Current version DTOs
│   ├── dto-v2/                    ← v2 DTOs (if contract changed)
│   └── jobs/
├── secondary-adapters/            ← Shared across all versions
├── products.controller.ts         ← Default version
├── products-v2.controller.ts      ← v2 (explicit)
└── products.module.ts             ← Registers both controllers
```

---

## 5. Anti-Patterns

| Anti-Pattern                                | Why It's Wrong                                           | Correct Approach                                            |
| ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| **Reusing retired version numbers**         | Breaks caches, client assumptions, audit logs (see §2.5) | Accept gaps in version numbers                              |
| **Hardcoding version in every controller**  | DRY violation, error-prone                               | Use `defaultVersion` in the bootstrap                       |
| **Versioning at the domain/use case layer** | Violates separation of concerns                          | Version only at the controller (presentation) layer         |
| **Creating a new version for every change** | Unnecessary complexity; most changes are non-breaking    | Use the decision flowchart (§2.3)                           |
| **No deprecation period**                   | Breaks consumers without warning                         | Always use `Sunset` + `Deprecation` headers with a timeline |
| **Versioning infrastructure endpoints**     | Health checks, metrics, etc. must be stable              | Mark as `VERSION_NEUTRAL`                                   |
| **Duplicating use cases per version**       | Massive code duplication, diverging logic                | Share use cases; adapt at the controller layer              |

---

## References

- NestJS Documentation — [Versioning](https://docs.nestjs.com/techniques/versioning)
- Fielding, Roy T. _Architectural Styles and the Design of Network-based Software Architectures_. Doctoral dissertation, University of California, Irvine, 2000. ([full text](https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm))
- Richardson, Chris. _Microservices Patterns: With Examples in Java_. Manning, 2018. ISBN 978-1617294549.
- Masse, Mark. _REST API Design Rulebook_. O'Reilly, 2011. ISBN 978-1449310509.
- Sturgeon, Phil. _Build APIs You Won't Hate_. LeanPub, 2015. ISBN 978-0692232699.
- IETF RFC 8594 — [The Sunset HTTP Header Field](https://datatracker.ietf.org/doc/html/rfc8594). Wilde, E., June 2019.
- IETF Draft — [The Deprecation HTTP Header Field](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-deprecation-header). Dalal, S. & Wilde, E.
