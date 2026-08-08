# Engineering Decision Guides

This directory contains actionable decision frameworks helping developers choose between design patterns, persistence choices, and concurrency controls in `ecommerce-store-api`.

---

## 1. Available Decision Guides

- **[WHEN-TO-USE-OPTIMISTIC-VS-PESSIMISTIC-LOCKING.md](WHEN-TO-USE-OPTIMISTIC-VS-PESSIMISTIC-LOCKING.md)**: Decision matrix comparing OCC vs Pessimistic write locking based on write contention, retry latency, and multi-step transaction isolation.
- **[WHEN-TO-DENORMALIZE-DATA.md](WHEN-TO-DENORMALIZE-DATA.md)**: 4-question evaluation framework enforcing _normalize by default; denormalize only when performance justifies consistency costs_.
- **[WHEN-TO-ADD-DATABASE-INDEXES.md](WHEN-TO-ADD-DATABASE-INDEXES.md)**: Index design rules, naming standards, partial status indexing, and keyset cursor requirements.
