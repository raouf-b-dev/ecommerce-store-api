# Roadmap Changelog

> History of structural changes to [`ROADMAP.md`](ROADMAP.md): renumbering, moved tracks, and new phases. Phase IDs in the roadmap are stable; this file explains where older IDs went.

---

## 2026-09-25: Hosted staging, local DX, stable error codes

- Added Phase **16c** (Hosted Staging & Public Demo). It absorbs the optional staging track from Phase **16**; demo data is protected with a dedicated RBAC role instead of route blocking.
- Added Phase **16d** (Full-Stack Local DX) and Phase **16e** (Stable Error Codes).
- Replaced "Next up" with a Now / Next / Later list.
- Moved the old → new mapping and the "Former / Bumped" notes out of the roadmap into this file.

---

## 2026: Roadmap renumbering

The pending work was re-sequenced so pricing and payment correctness land before multi-instance work, and the commercial loop lands before notifications.

### Old → New Mapping

| Old item                                                                           | New phase / track | Rationale                                             |
| ---------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- |
| Platform hygiene backports                                                         | **15**            | engines, CI OpenAPI, Action pins, webhook fail-closed |
| Pin Actions SHAs / `timeout-minutes` / redis chaos `forceExit` (tooling backlog)   | **15-B**          | Pulled into P0 hygiene                                |
| 14e remainder (value matrix, C4, Bruno)                                            | **16**            | Finish onboarding showcase                            |
| Staging / production-like env (old 14 recommended)                                 | **16c**           | Hosted staging before real Stripe                     |
| Money VO (old 17e)                                                                 | **17**            | Before real Stripe                                    |
| Real Stripe (old 17b)                                                              | **18**            | After Money; mock fail-closed in 15                   |
| Multi-instance (old 15)                                                            | **19**            | After pricing/payments correctness                    |
| Commercial loop (old 17c)                                                          | **20**            | Before email/webhooks                                 |
| Email / cart recovery / webhooks (old 17a remainder)                               | **21**            | After commercial loop                                 |
| Performance (old 16)                                                               | **22**            | Preserved                                             |
| Analytics attention (old 17d)                                                      | **23**            | Gated on traffic                                      |
| Enterprise / K8s (old 18)                                                          | **24**            | Preserved                                             |
| Catalog GETs (old 17a)                                                             | **Completed**     | Already shipped                                       |
| Staff-audit shopper contract gaps (GET /me, current cart, inventory ACL, 403 code) | **15b** (done)    | Shopper HTTP contract for cart/checkout clients       |

### Former IDs by current phase

| Current phase | Former ID                 | Note                                                        |
| ------------- | ------------------------- | ----------------------------------------------------------- |
| **16**        | 14e remainder             | Bootstrap slice shipped as 14e                              |
| **17**        | 17e                       | Bumped ahead of real Stripe                                 |
| **18**        | 17b                       | Bumped behind Money alignment                               |
| **19**        | Phase 15                  | Moved behind pricing and payment correctness                |
| **20**        | 17c                       | Moved ahead of email and webhooks                           |
| **21**        | 17a remainder             | Catalog GETs from old 17a shipped separately                |
| **22**        | Phase 16                  | Role-permission cache from old Phase 16 tooling had shipped |
| **23**        | 17d                       | Gated on real payment and storefront traffic                |
| **24**        | Phase 18                  | Conditional; builds on Phase 19 outbox                      |
| **15-B**      | Tooling backlog (Actions) | Pulled into P0 hygiene                                      |
