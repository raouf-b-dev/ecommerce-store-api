# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.2] - 2026-09-29

### Added

- Cart line `imageUrl` is snapshotted onto demo orders and order lines so clients can render product images on past orders.

### Changed

- CI: Docker publish is gated on the required jobs, including redis-chaos tests.

### Security

- Bump `multer` from 2.3.0 to 2.4.0 (`GHSA-3pph-fpjx-jg34`). This landed on `master` first and is included here so the next tag does not drop it.

## [0.9.1] - 2026-09-28

Patch with no application changes since 0.9.0.

### Changed

- CI: Docker Validate on pull requests; Docker Publish on `master` and version tags. First versioned image: `ghcr.io/raouf-b-dev/ecommerce-store-api:0.9.1`.
- Pre-push hook blocks direct pushes to `master` and `develop` by destination so tag pushes work.
- GitHub Actions dependency updates (checkout, download-artifact, Docker actions).

[Compare v0.9.0...v0.9.1](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.9.0...v0.9.1)

## [0.9.0] - 2026-09-28

### Added

- Demo product images served from `/media` with long-lived caching; seed populates and refreshes them.
- `imageUrl` on order-item detail responses.
- Required `PUBLIC_BASE_URL` for the externally reachable API origin (HTTPS in production/staging).

### Changed

- App version is read from `package.json` for OpenTelemetry and Swagger.
- Typed `CheckStockQueryDto`: `GET /inventory/check/:productId` rejects a `quantity` that is not an integer >= 1.

[Compare v0.8.0...v0.9.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.8.0...v0.9.0)

## [0.8.0] - 2026-09-20

Shopper HTTP contract, mock checkout webhook simulation, money/cart currency alignment, fail-closed Stripe webhook path (mock adapter), CQRS fields for companion UIs, and CI/community hygiene. Live Stripe and hosted staging stayed out of scope.

[Compare v0.7.0...v0.8.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.7.0...v0.8.0)

## [0.7.0] - 2026-09-06

Categories, product activate/deactivate, HTTP role assignment, addresses on user detail, admin analytics, shopper catalog GETs, OpenAPI generate/audit, forced password rotation, and `npm run setup`.

[Compare v0.6.0...v0.7.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.6.0...v0.7.0)

## [0.6.0] - 2026-08-22

Single-instance production foundation: OWASP map, OCC and inventory locks, CQRS read path, fan-out CI, E2E/integration confidence, baseline migration, Redis degradation, health probes, backup/restore, secret rotation. Payments still mock.

[Compare v0.5.0...v0.6.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.5.0...v0.6.0)

## [0.5.0] - 2026-07-27

IAM split into Identity, Authentication, and Authorization; IDOR ownership policies; database seeding; stricter TypeScript and ArchUnit gates.

[Compare v0.4.1...v0.5.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.4.1...v0.5.0)

## [0.4.1] - 2026-05-17

Hexagonal boundary hardening, Command/Query ports, JWT and cache ports, type-safety sweep, shared test infrastructure.

[Compare v0.4.0...v0.4.1](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.4.0...v0.4.1)

## [0.4.0] - 2026-05-13

Observability, RBAC, and architecture hardening. See the GitHub release for the full note.

[Compare v0.3.0...v0.4.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.3.0...v0.4.0)

## [0.3.0] - 2026-04-24

Security hardening, production readiness, and observability.

[Compare v0.2.0...v0.3.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.2.0...v0.3.0)

## [0.2.0] - 2026-04-11

Architecture polish and DDD hardening.

[Compare v0.1.0...v0.2.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.1.0...v0.2.0)
