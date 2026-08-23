# Database Performance: Foundations

An introduction to the fundamental principles of database performance engineering: the I/O cost model, when indexes help (and when they don't), and the systematic query tuning workflow. This document serves as the hub for the performance deep-dive series.

> _This is a technology-agnostic primer. For PostgreSQL-specific internals, see the linked deep-dives._

---

## Deep-Dive Index

| Document                                                      | Scope                                                                                                                                     |
| :------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **[Index Internals](INDEX-INTERNALS.md)**                     | B-tree structure and complexity, Hash, GIN, GiST, and BRIN index types with trade-off analysis                                            |
| **[Index Design](INDEX-DESIGN.md)**                           | Composite column ordering, covering indexes (`INCLUDE`), partial indexes, write penalty, and applied index strategy per e-commerce module |
| **[Query Analysis](QUERY-ANALYSIS.md)**                       | `EXPLAIN ANALYZE` plan interpretation, plan node types, red flags, and the N+1 query problem                                              |
| **[Storage & Maintenance](STORAGE-AND-MAINTENANCE.md)**       | Write-Ahead Log (WAL), TOAST, autovacuum tuning, table partitioning, materialised views, and bulk operations                              |
| **[Connection & Replication](CONNECTION-AND-REPLICATION.md)** | Connection pool sizing, PgBouncer, PostgreSQL memory configuration, streaming and logical replication, and read replica routing           |

**Related series**: [Concurrency Foundations](../concurrency/CONCURRENCY-FOUNDATIONS.md) (locking and isolation: the correctness counterpart to performance)

---

## 1. The I/O Cost Model

> _Source: Ramakrishnan, R. & Gehrke, J. (2003). Database Management Systems (3rd ed.). McGraw-Hill, Chapter 8._

Database performance is fundamentally governed by the **I/O cost model**. Data resides on disk in fixed-size **pages** (typically 8 KB in PostgreSQL). The dominant cost of a query is the number of pages that must be read from disk into memory.

| Operation                             | Cost                                                                                                                                                |
| :------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sequential scan** (full table scan) | Reads every page of the table. Cost proportional to the number of pages: O(N/P) where N = rows and P = rows per page.                               |
| **Index scan**                        | Traverses the index tree (O(log n) pages) + reads data pages for matching rows. Cost proportional to matching rows, not total rows.                 |
| **Index-only scan**                   | Reads only index pages. The data table is not accessed. Only possible when all columns needed by the query are in the index (a **covering index**). |

> _"The single most important factor in query performance is whether the query can use an index to avoid a full table scan. The second most important factor is whether that index scan can be an index-only scan."_
> Source: Winand, M. (2012). SQL Performance Explained, p. 1.

---

## 2. When Indexes Help (and When They Don't)

| Scenario                                                   | Index Helpful? | Explanation                                                                                                  |
| :--------------------------------------------------------- | :------------- | :----------------------------------------------------------------------------------------------------------- |
| `WHERE id = 42` (equality on PK)                           | ✅ Yes         | B-tree traversal: O(log n) page reads.                                                                       |
| `WHERE status = 'ACTIVE'` (low selectivity: 80% match) | ❌ No | Planner prefers sequential scan because reading 80% via random I/O is slower than reading 100% sequentially. |
| `WHERE status = 'CANCELLED'` (high selectivity: 2% match) | ✅ Yes | Index narrows scan to a small fraction. |
| `WHERE name ILIKE '%search%'` (unanchored pattern)         | ❌ No\*        | B-tree cannot support leading-wildcard searches. Requires GIN/trigram.                                       |
| `ORDER BY created_at DESC LIMIT 10`                        | ✅ Yes         | B-tree provides pre-sorted output, avoiding a filesort.                                                      |
| `SELECT COUNT(*) FROM orders`                              | ❌ No          | Counting all rows requires visiting every live tuple (MVCC visibility check).                                |

> \*PostgreSQL's `pg_trgm` extension provides GIN trigram indexes for `LIKE '%pattern%'`. See [Index Internals](INDEX-INTERNALS.md) §3.2.

### 2.1 The Selectivity Threshold

The query planner decides between a sequential scan and an index scan based on **selectivity**: the fraction of rows the query is expected to return.

```mermaid
flowchart LR
    idx["<b>Index Scan (0% to ~5-20% selectivity)</b><br/>Fewer pages accessed. Faster for highly selective queries."]
    seq["<b>Sequential Scan (~5-20% to 100% selectivity)</b><br/>Sequential I/O is faster than random I/O for large volumes."]

    idx --- crossover["<b>Crossover Point (~5-20%)</b>"] --- seq
```

The exact crossover point depends on table size, correlation between indexed column and physical row order, and whether the data is cached in `shared_buffers`.

---

## 3. The Systematic Tuning Workflow

```mermaid
flowchart TD
    id1["<b>1. Identify</b><br/>Locate slow queries via pg_stat_statements or APM"]
    id2["<b>2. Analyse</b><br/>Run EXPLAIN (ANALYZE, BUFFERS) under load"]
    id3["<b>3. Diagnose</b><br/>Identify bottleneck node (Seq Scan, Sort spill, Loops)"]
    id4["<b>4. Hypothesise</b><br/>Propose fix (Indexes, Query rewrite, Memory config)"]
    id5["<b>5. Test</b><br/>Re-run EXPLAIN ANALYZE with the fix applied"]
    id6["<b>6. Validate</b><br/>Confirm latency reduction at p95/p99 under load"]
    id7["<b>7. Monitor</b><br/>Track user stats and metrics post-deploy"]

    id1 --> id2 --> id3 --> id4 --> id5 --> id6 --> id7

    classDef default fill:#1e293b,stroke:#475569,color:#e2e8f0,stroke-width:1px;
    classDef highlight fill:#1e3a8a,stroke:#3b82f6,color:#eff6ff,stroke-width:1px;
    classDef success fill:#115e59,stroke:#14b8a6,color:#f0fdfa,stroke-width:1px;

    class id3 highlight;
    class id6 success;
```

For each step's details: identifying slow queries (§7.2 of [Query Analysis](QUERY-ANALYSIS.md)), reading EXPLAIN plans (§1-4 of [Query Analysis](QUERY-ANALYSIS.md)), and monitoring index health (§5 of [Index Design](INDEX-DESIGN.md)).

---

## 4. Performance Decision Framework

When a query is slow, use this decision tree to identify the right deep-dive:

```mermaid
flowchart TD
    root{"Is the query slow?"}

    q_seq{"Seq Scan on a large table?"}
    r_missing["Missing index<br/>→ See INDEX-DESIGN.md"]

    q_idx{"Using index but still slow?"}

    q_rows{"'Rows Removed by Filter' is high?"}
    r_composite["Index covers partial predicate<br/>→ Refine composite index (INDEX-DESIGN.md §1)"]

    q_fetches{"Index Scan + many heap fetches?"}
    r_covering["Need covering index<br/>→ INDEX-DESIGN.md §2"]

    q_io{"Correct plan but high latency?"}
    r_io["I/O bottleneck (check shared_buffers, disk)<br/>→ CONNECTION-AND-REPLICATION.md §3"]

    q_n1{"Doing too many queries (N+1)?"}
    r_n1["ORM relation loading problem<br/>→ QUERY-ANALYSIS.md §4"]

    q_sort{"Sort spilling to disk?"}
    r_sort["Increase work_mem or add sorted index<br/>→ CONNECTION-AND-REPLICATION.md §3"]

    q_large{"Table very large (100M+ rows)?"}
    r_part["Consider partitioning<br/>→ STORAGE-AND-MAINTENANCE.md §4"]

    q_vacuum{"VACUUM not keeping up?"}
    r_vacuum["Autovacuum tuning<br/>→ STORAGE-AND-MAINTENANCE.md §2"]

    q_overload{"Database overloaded (connections, CPU)?"}
    r_replica["Connection pooling / Read replicas<br/>→ CONNECTION-AND-REPLICATION.md"]

    root --> q_seq
    q_seq -->|Yes| r_missing
    q_seq -->|No| q_idx

    q_idx -->|Yes| q_rows
    q_rows -->|Yes| r_composite
    q_rows -->|No| q_fetches
    q_fetches -->|Yes| r_covering
    q_fetches -->|No| q_io
    q_io -->|Yes| r_io

    q_idx -->|No| q_n1
    q_n1 -->|Yes| r_n1
    q_n1 -->|No| q_sort
    q_sort -->|Yes| r_sort
    q_sort -->|No| q_large
    q_large -->|Yes| r_part
    q_large -->|No| q_vacuum
    q_vacuum -->|Yes| r_vacuum
    q_vacuum -->|No| q_overload
    q_overload -->|Yes| r_replica
```

---

## 5. References

- Ramakrishnan, R. & Gehrke, J. (2003). _Database Management Systems_ (3rd ed.). McGraw-Hill. Chapters 8-10.
- Winand, M. (2012). _SQL Performance Explained_. Self-published. ISBN: 978-3-9503078-0-2. https://use-the-index-luke.com/
- Kleppmann, M. (2017). _Designing Data-Intensive Applications_. O'Reilly. Chapter 3: "Storage and Retrieval."

