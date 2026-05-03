# Data Normalisation & Denormalisation — Academic Reference

This document is the **canonical data modelling reference** for decisions involving normalisation and denormalisation. It defines the strict academic foundations of relational normal forms, the conditions under which denormalisation is justified, and the recommended decision framework for this project. All contributors must read and follow this document when designing or modifying database schemas.

> **Companion docs**: [`ARCHITECTURE.md`](ARCHITECTURE.md) (system context & domain flows), [`CQRS.md`](CQRS.md) (read/write model separation), [`EAV-PATTERN.md`](EAV-PATTERN.md) (flexible attribute modelling)

---

## 1. Normalisation — Theoretical Foundations

> _Source: E.F. Codd, "A Relational Model of Data for Large Shared Data Banks", Communications of the ACM, 1970_

**Normalisation** is the process of organising the columns and tables of a relational database to minimise data redundancy and dependency. Its goal is to ensure that each fact is recorded in exactly one place, thereby eliminating update anomalies, insertion anomalies, and deletion anomalies.

### 1.1 The Normal Forms

Each normal form builds upon the previous one. A relation in Third Normal Form (3NF) is automatically in 1NF and 2NF.

| Normal Form | Requirement                                                                                                                      | Eliminates                                                |
| :---------- | :------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **1NF**     | Every column contains atomic (indivisible) values; no repeating groups or arrays in a single field.                              | Repeating groups, multi-valued attributes                 |
| **2NF**     | 1NF + every non-key attribute depends on the **entire** composite primary key, not just part of it.                              | Partial dependencies                                      |
| **3NF**     | 2NF + every non-key attribute depends **only** on the primary key, not on other non-key attributes (no transitive dependencies). | Transitive dependencies                                   |
| **BCNF**    | 3NF + every determinant is a candidate key. Handles edge cases where 3NF still permits certain anomalies.                        | Non-trivial functional dependencies on non-candidate keys |
| **4NF**     | BCNF + no multi-valued dependencies. A table should not contain two or more independent multi-valued facts about an entity.      | Multi-valued dependencies                                 |
| **5NF**     | 4NF + no join dependencies that are not implied by candidate keys. Decomposition cannot lose information.                        | Join dependencies                                         |

> **Practical note (Date, 2003):** For the overwhelming majority of enterprise application development, 3NF (or BCNF) is sufficient. Forms 4NF and 5NF address pathological cases that rarely arise in well-designed operational schemas.

### 1.2 Worked Example — Progressive Normalisation

The following example takes a single **un-normalised** table and applies each normal form step by step. The domain is intentionally generic — a university course enrolment system — to keep the focus on the structural transformations rather than any specific application.

#### Starting Point: Un-Normalised (UNF)

A single flat table that records everything about students, courses, and instructors:

```
┌────────────┬──────────────┬──────────────────────┬─────────────────────────────────────┬──────────────────────────────────┐
│ student_id │ student_name │ student_email        │ courses                             │ instructors                      │
├────────────┼──────────────┼──────────────────────┼─────────────────────────────────────┼──────────────────────────────────┤
│ 1          │ Alice Martin │ alice@university.edu │ CS101 – Intro to CS, MA201 – Algebra│ Dr. Howe (CS), Prof. Lane (Math) │
│ 2          │ Bob Chen     │ bob@university.edu   │ CS101 – Intro to CS                 │ Dr. Howe (CS)                    │
│ 3          │ Carol Davis  │ carol@university.edu │ MA201 – Algebra, PH301 – Optics     │ Prof. Lane (Math), Dr. Ray (Phys)│
└────────────┴──────────────┴──────────────────────┴─────────────────────────────────────┴──────────────────────────────────┘
```

**Problems:**

- The `courses` and `instructors` columns contain **multiple values** (comma-separated lists).
- You cannot query "all students in CS101" without parsing strings.
- Adding a new course to Alice requires rewriting the entire cell.

---

#### Step 1 → First Normal Form (1NF): Eliminate Repeating Groups

**Rule**: Every column must contain exactly one atomic value per row.

**Action**: Expand repeating groups into separate rows — one row per student-course combination.

```
┌────────────┬──────────────┬──────────────────────┬─────────────┬───────────────┬──────────────────┬────────────────────┐
│ student_id │ student_name │ student_email        │ course_code │ course_name   │ instructor_name  │ instructor_dept    │
├────────────┼──────────────┼──────────────────────┼─────────────┼───────────────┼──────────────────┼────────────────────┤
│ 1          │ Alice Martin │ alice@university.edu │ CS101       │ Intro to CS   │ Dr. Howe         │ Computer Science   │
│ 1          │ Alice Martin │ alice@university.edu │ MA201       │ Algebra       │ Prof. Lane       │ Mathematics        │
│ 2          │ Bob Chen     │ bob@university.edu   │ CS101       │ Intro to CS   │ Dr. Howe         │ Computer Science   │
│ 3          │ Carol Davis  │ carol@university.edu │ MA201       │ Algebra       │ Prof. Lane       │ Mathematics        │
│ 3          │ Carol Davis  │ carol@university.edu │ PH301       │ Optics        │ Dr. Ray          │ Physics            │
└────────────┴──────────────┴──────────────────────┴─────────────┴───────────────┴──────────────────┴────────────────────┘

Composite Primary Key: (student_id, course_code)
```

**What improved:**

- Every cell contains exactly one value — the table is queryable with standard SQL.
- `WHERE course_code = 'CS101'` now works without string parsing.

**What remains wrong:**

- `student_name` and `student_email` are repeated on every row for the same student → **update anomaly** (changing Alice's email requires updating multiple rows).
- `course_name` and `instructor_name` are repeated for every student in the same course → **redundancy**.

---

#### Step 2 → Second Normal Form (2NF): Remove Partial Dependencies

**Rule**: Every non-key attribute must depend on the _entire_ composite key, not just part of it.

**Analysis** — The composite key is `(student_id, course_code)`:

| Attribute         | Depends on         | Dependency type                                   |
| :---------------- | :----------------- | :------------------------------------------------ |
| `student_name`    | `student_id` only  | ⚠️ **Partial** — does not depend on `course_code` |
| `student_email`   | `student_id` only  | ⚠️ **Partial**                                    |
| `course_name`     | `course_code` only | ⚠️ **Partial** — does not depend on `student_id`  |
| `instructor_name` | `course_code` only | ⚠️ **Partial**                                    |
| `instructor_dept` | `course_code` only | ⚠️ **Partial**                                    |

**Action**: Extract partially dependent attributes into their own tables.

```
─── students ───────────────────────────────────────
┌────────────┬──────────────┬──────────────────────┐
│ student_id │ student_name │ student_email        │
├────────────┼──────────────┼──────────────────────┤
│ 1          │ Alice Martin │ alice@university.edu │
│ 2          │ Bob Chen     │ bob@university.edu   │
│ 3          │ Carol Davis  │ carol@university.edu │
└────────────┴──────────────┴──────────────────────┘
PK: student_id

─── courses ────────────────────────────────────────────────────────────────
┌─────────────┬───────────────┬──────────────────┬────────────────────┐
│ course_code │ course_name   │ instructor_name  │ instructor_dept    │
├─────────────┼───────────────┼──────────────────┼────────────────────┤
│ CS101       │ Intro to CS   │ Dr. Howe         │ Computer Science   │
│ MA201       │ Algebra       │ Prof. Lane       │ Mathematics        │
│ PH301       │ Optics        │ Dr. Ray          │ Physics            │
└─────────────┴───────────────┴──────────────────┴────────────────────┘
PK: course_code

─── enrolments (junction table) ────────────────────
┌────────────┬─────────────┐
│ student_id │ course_code │
├────────────┼─────────────┤
│ 1          │ CS101       │
│ 1          │ MA201       │
│ 2          │ CS101       │
│ 3          │ MA201       │
│ 3          │ PH301       │
└────────────┴─────────────┘
PK: (student_id, course_code)
FK: student_id → students, course_code → courses
```

**What improved:**

- Changing Alice's email updates exactly **one row** in `students`.
- Course data exists once regardless of how many students are enrolled.
- The `enrolments` junction table cleanly represents the many-to-many relationship.

**What remains wrong:**

- In the `courses` table, `instructor_dept` depends on `instructor_name`, not on `course_code` — this is a **transitive dependency**.

---

#### Step 3 → Third Normal Form (3NF): Remove Transitive Dependencies

**Rule**: No non-key attribute may depend on another non-key attribute. Every non-key column must depend _directly_ on the primary key.

**Analysis** — In the `courses` table:

```
course_code → instructor_name → instructor_dept
              ▲                  ▲
              directly depends   TRANSITIVELY depends on course_code
              on course_code     (via instructor_name)
```

`instructor_dept` is a fact about the **instructor**, not about the **course**. If Dr. Howe moves to the Mathematics department, we would need to update every course she teaches — an update anomaly.

**Action**: Extract the transitive dependency into its own table.

```
─── students (unchanged) ──────────────────────────
┌────────────┬──────────────┬──────────────────────┐
│ student_id │ student_name │ student_email        │
├────────────┼──────────────┼──────────────────────┤
│ 1          │ Alice Martin │ alice@university.edu │
│ 2          │ Bob Chen     │ bob@university.edu   │
│ 3          │ Carol Davis  │ carol@university.edu │
└────────────┴──────────────┴──────────────────────┘
PK: student_id

─── instructors (NEW) ─────────────────────────────
┌─────────────────┬──────────────────┬────────────────────┐
│ instructor_id   │ instructor_name  │ instructor_dept    │
├─────────────────┼──────────────────┼────────────────────┤
│ 1               │ Dr. Howe         │ Computer Science   │
│ 2               │ Prof. Lane       │ Mathematics        │
│ 3               │ Dr. Ray          │ Physics            │
└─────────────────┴──────────────────┴────────────────────┘
PK: instructor_id

─── courses (modified — instructor extracted) ─────
┌─────────────┬───────────────┬─────────────────┐
│ course_code │ course_name   │ instructor_id   │
├─────────────┼───────────────┼─────────────────┤
│ CS101       │ Intro to CS   │ 1               │
│ MA201       │ Algebra       │ 2               │
│ PH301       │ Optics        │ 3               │
└─────────────┴───────────────┴─────────────────┘
PK: course_code
FK: instructor_id → instructors

─── enrolments (unchanged) ────────────────────────
┌────────────┬─────────────┐
│ student_id │ course_code │
├────────────┼─────────────┤
│ 1          │ CS101       │
│ 1          │ MA201       │
│ 2          │ CS101       │
│ 3          │ MA201       │
│ 3          │ PH301       │
└────────────┴─────────────┘
PK: (student_id, course_code)
FK: student_id → students, course_code → courses
```

**What improved:**

- Every non-key attribute depends **directly and exclusively** on its table's primary key.
- Changing Dr. Howe's department updates exactly **one row** in `instructors`.
- The schema is now in **3NF** — free of partial dependencies, transitive dependencies, and repeating groups.

---

#### Step 4 → Boyce-Codd Normal Form (BCNF): Every Determinant Must Be a Candidate Key

**Rule**: For every non-trivial functional dependency X → Y, X must be a **superkey** (a candidate key or a superset of one). BCNF is stricter than 3NF — it catches edge cases where a non-key attribute determines part of a composite key.

> **Note**: The 3NF schema from Step 3 is already in BCNF. To demonstrate the BCNF violation, we introduce a **new scenario** that 3NF permits but BCNF does not.

**Scenario** — The university introduces a tutoring system. Each student studying a subject is assigned a tutor. The constraint is: **each tutor teaches exactly one subject** (but a subject can have many tutors, and a student can have many tutors across different subjects).

A naïve 3NF design:

```
─── student_tutors (3NF but NOT BCNF) ────────────
┌────────────┬─────────────┬──────────────┐
│ student_id │ subject     │ tutor        │
├────────────┼─────────────┼──────────────┤
│ 1          │ Databases   │ Dr. Howe     │
│ 1          │ Networks    │ Dr. Patel    │
│ 2          │ Databases   │ Prof. Lane   │
│ 2          │ Databases   │ Dr. Howe     │
│ 3          │ Networks    │ Dr. Patel    │
└────────────┴─────────────┴──────────────┘
PK: (student_id, subject)  — problematic, see below
```

**Why this is 3NF but not BCNF:**

The functional dependencies are:

- `(student_id, subject) → tutor` — a student in a subject has a tutor ✅
- `tutor → subject` — each tutor teaches exactly one subject ✅

The problem: `tutor` determines `subject`, but `tutor` is **not** a candidate key (it cannot uniquely identify a row, because the same tutor can teach multiple students). A non-key attribute (`tutor`) is determining part of the composite key (`subject`) — this violates BCNF.

**Anomaly**: If Dr. Howe switches from Databases to Data Science, we must update **every row** where she appears — a risk of inconsistent state.

**Action**: Decompose so that every determinant is a candidate key.

```
─── tutor_subjects ────────────────────────────────
┌──────────────┬─────────────┐
│ tutor        │ subject     │
├──────────────┼─────────────┤
│ Dr. Howe     │ Databases   │
│ Prof. Lane   │ Databases   │
│ Dr. Patel    │ Networks    │
└──────────────┴─────────────┘
PK: tutor  (tutor is now a candidate key — it uniquely determines subject)

─── student_tutors ────────────────────────────────
┌────────────┬──────────────┐
│ student_id │ tutor        │
├────────────┼──────────────┤
│ 1          │ Dr. Howe     │
│ 1          │ Dr. Patel    │
│ 2          │ Prof. Lane   │
│ 2          │ Dr. Howe     │
│ 3          │ Dr. Patel    │
└────────────┴──────────────┘
PK: (student_id, tutor)
FK: tutor → tutor_subjects
```

**What improved:**

- Every determinant (`tutor → subject`) is now a candidate key in its table.
- Changing Dr. Howe's subject updates exactly **one row** in `tutor_subjects`.
- The subject for any student-tutor pair is derived via a JOIN — no contradictory facts possible.

---

#### Step 5 → Fourth Normal Form (4NF): Eliminate Multi-Valued Dependencies

**Rule**: A table must not contain two or more **independent** multi-valued facts about an entity. If A →→ B and A →→ C, and B and C are independent of each other, they must be stored in separate tables.

**Scenario** — Each course can use **multiple textbooks** and can be taught by **multiple instructors**. Textbook choices and instructor assignments are **independent** — any textbook can be paired with any instructor for the same course.

A naïve BCNF design:

```
─── course_resources (BCNF but NOT 4NF) ──────────
┌─────────────┬──────────────────────────┬──────────────┐
│ course_code │ textbook                 │ instructor   │
├─────────────┼──────────────────────────┼──────────────┤
│ CS101       │ Intro to Algorithms      │ Dr. Howe     │
│ CS101       │ Intro to Algorithms      │ Prof. Lane   │
│ CS101       │ Data Structures in C     │ Dr. Howe     │
│ CS101       │ Data Structures in C     │ Prof. Lane   │
│ MA201       │ Linear Algebra Done Right│ Dr. Ray      │
└─────────────┴──────────────────────────┴──────────────┘
PK: (course_code, textbook, instructor)
```

**Why this is BCNF but not 4NF:**

There are two independent multi-valued dependencies:

- `course_code →→ textbook` — a course has multiple textbooks (independent of who teaches it)
- `course_code →→ instructor` — a course has multiple instructors (independent of which textbooks are used)

These are **independent facts** — the choice of textbook has nothing to do with who teaches the course. Yet they are stored in the same table, forcing a **Cartesian product**:

- CS101 has 2 textbooks × 2 instructors = **4 rows** (instead of 2 + 2 = 4 individual facts stored in 2 rows each)
- Adding a third textbook would require adding 2 new rows (one per instructor) instead of 1

**Anomalies**: Inserting a new textbook requires knowing all current instructors. Deleting the last instructor for a course silently removes all its textbook associations.

**Action**: Separate independent multi-valued dependencies into their own tables.

```
─── course_textbooks ──────────────────────────────
┌─────────────┬──────────────────────────┐
│ course_code │ textbook                 │
├─────────────┼──────────────────────────┤
│ CS101       │ Intro to Algorithms      │
│ CS101       │ Data Structures in C     │
│ MA201       │ Linear Algebra Done Right│
└─────────────┴──────────────────────────┘
PK: (course_code, textbook)

─── course_instructors ────────────────────────────
┌─────────────┬──────────────┐
│ course_code │ instructor   │
├─────────────┼──────────────┤
│ CS101       │ Dr. Howe     │
│ CS101       │ Prof. Lane   │
│ MA201       │ Dr. Ray      │
└─────────────┴──────────────┘
PK: (course_code, instructor)
```

**What improved:**

- Each independent fact is stored exactly once — adding a textbook is a single INSERT, regardless of instructor count.
- No Cartesian product explosion — storage grows **linearly** with facts, not multiplicatively.
- Deletion of an instructor does not affect textbook associations, and vice versa.

---

#### Step 6 → Fifth Normal Form (5NF): Eliminate Join Dependencies

**Rule**: A table is in 5NF when it cannot be **losslessly decomposed** into smaller tables that, when JOINed back, reproduce the original data — unless those joins are implied by candidate keys. If such a decomposition exists, the table should be split.

> **Note**: 5NF violations are rare. They arise when three or more entities participate in a **cyclic constraint** — the relationship between any two of them depends on the third.

**Scenario** — A university procurement system records which **suppliers** can provide which **parts**, and which **projects** use which parts from which suppliers. The business constraint is:

- If Supplier S can supply Part P, **and**
- Supplier S is approved for Project J, **and**
- Project J uses Part P,
- then **Supplier S supplies Part P to Project J**.

This is a **join dependency**: the three-way fact can be derived from three two-way facts.

A naïve 4NF design that stores the three-way relationship directly:

```
─── supplier_project_parts (4NF but NOT 5NF) ─────
┌──────────┬─────────┬─────────┐
│ supplier │ part    │ project │
├──────────┼─────────┼─────────┤
│ Acme     │ Bolt    │ Alpha   │
│ Acme     │ Bolt    │ Beta    │
│ Acme     │ Nut     │ Alpha   │
│ Bolt Co  │ Bolt    │ Alpha   │
│ Bolt Co  │ Bolt    │ Beta    │
└──────────┴─────────┴─────────┘
PK: (supplier, part, project)
```

**Why this is 4NF but not 5NF:**

The table suffers from a **join dependency**: the data can be losslessly decomposed into three projections, and JOINing them back reproduces the original table exactly. This means the three-way table contains **redundant information** — the three-way fact is derivable from three two-way facts.

**Anomaly**: If Acme becomes approved for a new Project Gamma, and Gamma uses Bolts, we must remember to insert `(Acme, Bolt, Gamma)`. If we forget, the system contradicts the business rule. The redundancy is hidden — it only becomes apparent when the business constraint is violated.

**Action**: Decompose into three binary relationship tables.

```
─── supplier_parts ────────────────────────────────
┌──────────┬─────────┐
│ supplier │ part    │
├──────────┼─────────┤
│ Acme     │ Bolt    │
│ Acme     │ Nut     │
│ Bolt Co  │ Bolt    │
└──────────┴─────────┘
PK: (supplier, part)
"Which parts can each supplier provide?"

─── supplier_projects ─────────────────────────────
┌──────────┬─────────┐
│ supplier │ project │
├──────────┼─────────┤
│ Acme     │ Alpha   │
│ Acme     │ Beta    │
│ Bolt Co  │ Alpha   │
│ Bolt Co  │ Beta    │
└──────────┴─────────┘
PK: (supplier, project)
"Which suppliers are approved for each project?"

─── project_parts ─────────────────────────────────
┌─────────┬─────────┐
│ project │ part    │
├─────────┼─────────┤
│ Alpha   │ Bolt    │
│ Alpha   │ Nut     │
│ Beta    │ Bolt    │
└─────────┴─────────┘
PK: (project, part)
"Which parts does each project use?"
```

**Verification** — JOINing all three tables back reproduces the original five rows exactly:

```
SELECT sp.supplier, pp.part, sp2.project
FROM supplier_parts sp
JOIN supplier_projects sp2 ON sp.supplier = sp2.supplier
JOIN project_parts pp      ON sp2.project = pp.project AND sp.part = pp.part;

→ Acme, Bolt, Alpha  ✅
→ Acme, Bolt, Beta   ✅
→ Acme, Nut, Alpha   ✅
→ Bolt Co, Bolt, Alpha ✅
→ Bolt Co, Bolt, Beta  ✅
```

**What improved:**

- Each two-way fact is stored once — adding Acme to Project Gamma requires a single INSERT into `supplier_projects`, and the three-way relationship is automatically derivable.
- The business constraint ("if S supplies P, and S is approved for J, and J uses P, then S supplies P to J") is now **enforced by the schema structure itself**, not by manual data entry into a flat table.

> **Practical caveat (Date, 2003):** 5NF decompositions are only valid when the join dependency genuinely holds as a business rule. If the three-way relationship is **not** derivable from pairwise relationships (e.g., "Acme supplies Bolts to Alpha, but not Bolts to Beta even though Acme is approved for Beta and Beta uses Bolts"), then the three-way table is already in 5NF and should **not** be decomposed.

---

#### Summary of Transformations

| Step  | Normal Form | Key Action                                                             |        Tables         |
| :---- | :---------- | :--------------------------------------------------------------------- | :-------------------: |
| Start | UNF         | —                                                                      |           1           |
| 1     | **1NF**     | Expand repeating groups into atomic rows                               |           1           |
| 2     | **2NF**     | Extract attributes with partial key dependencies into their own tables |           3           |
| 3     | **3NF**     | Extract attributes with transitive dependencies into their own tables  |           4           |
| 4     | **BCNF**    | Ensure every determinant is a candidate key                            | 2 (separate scenario) |
| 5     | **4NF**     | Separate independent multi-valued dependencies into their own tables   | 2 (separate scenario) |
| 6     | **5NF**     | Decompose cyclic join dependencies into binary relationships           | 3 (separate scenario) |

> **Observation**: The 1NF → 3NF progression follows a single dataset through increasing levels of decomposition. BCNF, 4NF, and 5NF each require different scenarios because they address structural pathologies that do not naturally occur in the student enrolment example — this is why Date (2003) notes that 3NF is sufficient for the vast majority of enterprise schemas.

### 1.3 Why Normalise?

The academic justification for normalisation rests on three pillars:

1. **Anomaly prevention** — Redundant data creates the possibility for inconsistent state. If a customer's address is stored in both the `orders` and `customers` tables, updating one without the other creates a contradiction — the system asserts two different truths simultaneously (Codd, 1970; Kent, 1983).

2. **Storage efficiency** — While less critical in the era of cheap disk, normalisation eliminates duplicate byte sequences. For high-cardinality data (e.g., full addresses stored on every order row), the cumulative waste is significant and compounds indexing costs.

3. **Write optimisation** — A normalised schema minimises the number of rows and indexes that must be updated when a fact changes. Updating a customer's name requires modifying exactly one row in a normalised schema, versus potentially thousands of denormalised order rows.

### 1.4 The "Single Source of Truth" Principle

> _"Each fact should be stored once and only once. Multiple representations of the same fact are a design defect — they create the preconditions for inconsistency."_
> — Kent, William. "A Simple Guide to Five Normal Forms in Relational Database Theory." Communications of the ACM, 1983.

This principle is the philosophical foundation of normalisation. Every violation — every duplicated column, every cached name, every embedded snapshot — is a conscious departure from this ideal, and must be justified by a measurable benefit.

---

## 2. Denormalisation — Deliberate Redundancy

> _"Denormalisation is not the opposite of normalisation. It is a technique applied after normalisation, to selectively reintroduce redundancy for a specific, measurable performance objective."_
> — Elmasri & Navathe, _Fundamentals of Database Systems_ (7th ed., 2015), Ch. 16

### 2.1 What Denormalisation Is

Denormalisation is the **intentional** duplication of data across tables or the pre-computation of derived values, performed to reduce the number of JOIN operations or aggregations required by frequent queries. It trades **write complexity** for **read performance**.

### 2.2 What Denormalisation Is Not

| Common Misconception                                                    | Reality                                                                                                                                                                                        |
| :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Skipping normalisation" — designing a schema without first normalising | That is **un-normalised design**, not denormalisation. Denormalisation presupposes that a normalised schema exists and has been deliberately altered.                                          |
| "Putting everything in one table for simplicity"                        | That is a **flat-file design** — it produces the exact anomalies normalisation was invented to prevent.                                                                                        |
| "Caching data in Redis / application memory"                            | That is **application-level caching** — a complementary strategy, but not denormalisation (the relational schema is unchanged).                                                                |
| "Using database views or materialised views"                            | Views are a **query abstraction**, not denormalisation. Materialised views are a form of **derived storage** managed by the DBMS and can be considered a controlled denormalisation mechanism. |

### 2.3 Forms of Denormalisation

| Technique                         | Description                                                                                                 | Example                                                                                                                         | Risk                                                                                                                                |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicated column**             | Copy a frequently read column from a related table into the referencing table.                              | Store `partner_name` on the `activities` table alongside `partner_id`.                                                          | Stale data if the source changes and the copy is not updated.                                                                       |
| **Pre-computed aggregate**        | Store a derived count, sum, or average on the parent row instead of computing it at query time.             | `orders_count` column on the `customers` table.                                                                                 | Count drifts if increment/decrement logic has bugs or race conditions.                                                              |
| **Merged tables**                 | Combine two normalised tables that are always queried together into a single table.                         | Merging `user_profiles` into `users` if every user query always fetches the profile.                                            | Wider rows, more I/O per row scan, harder to evolve independently.                                                                  |
| **Snapshot / point-in-time copy** | Freeze a value at the moment of an event, preserving the historical state even if the source later changes. | Store `assigned_user_name` on an activity at creation time, preserving who was assigned even if that user's name later changes. | Not actually "stale" — this is intentional historical preservation. Must be clearly documented as a snapshot, not a live reference. |
| **Materialised view**             | A DBMS-managed pre-computed query result, refreshed on a schedule or on demand.                             | `CREATE MATERIALIZED VIEW partner_summary AS SELECT ...`                                                                        | Staleness window between refreshes; storage overhead.                                                                               |

---

## 3. The Tradeoffs — A Rigorous Comparison

### 3.1 Normalisation Tradeoffs

| Advantage                                                                                 | Disadvantage                                                                                                                 |
| :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Data integrity** — Facts exist in exactly one place; updates are atomic and consistent. | **Read complexity** — Queries that span multiple entities require JOIN operations, which can be expensive on large datasets. |
| **Write efficiency** — Updates touch minimal rows and indexes.                            | **Query latency** — Complex JOINs across many tables can produce slower response times for read-heavy workloads.             |
| **Schema flexibility** — Adding or modifying a fact requires changing only one table.     | **Application complexity** — Application code must assemble data from multiple sources to present a complete view.           |
| **Smaller storage footprint** — No duplicated data.                                       | **N+1 risk** — ORM-driven code can inadvertently produce N+1 query patterns when traversing relations.                       |

### 3.2 Denormalisation Tradeoffs

| Advantage                                                                                                             | Disadvantage                                                                                                                                                                             |
| :-------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read performance** — Eliminates JOINs; queries touch fewer tables, reducing I/O and latency.                        | **Write amplification** — Every mutation to the source fact must propagate to all copies.                                                                                                |
| **Simpler read queries** — Flat projections are easier to compose, index, and cache.                                  | **Consistency burden** — The application (or triggers/events) must guarantee that copies stay synchronised. If a synchronisation path is missed, the system asserts contradictory facts. |
| **Reduced database load** — Pre-computed aggregates avoid expensive `COUNT(*)`, `SUM()`, or `GROUP BY` at query time. | **Increased storage** — Duplicated data consumes more disk and enlarges backup volumes.                                                                                                  |
| **Better for CQRS read models** — Denormalised tables serve as natural read projections (Young, 2010).                | **Schema rigidity** — Changing the shape of a denormalised table requires migrating both the source table and all dependents.                                                            |
| **Historical fidelity (snapshots)** — Preserves the exact state at the time of an event.                              | **Ambiguity** — Without clear documentation, developers cannot determine whether a duplicated column is a "live reference" or a "frozen snapshot", leading to bugs in update logic.      |

### 3.3 The Fundamental Law

> _"Normalisation and denormalisation are not opposites on a quality spectrum. Normalisation is the default — the safe, correct baseline. Denormalisation is an optimisation — a deliberate deviation with known costs. You normalise by default and denormalise by necessity."_
> — Adapted from Date, C.J., _An Introduction to Database Systems_ (8th ed., 2003)

---

## 4. When to Denormalise — The Decision Framework

Denormalisation should **never** be a first instinct. It should be the result of a deliberate analysis that meets all of the following criteria:

### 4.1 Prerequisites (All Must Be True)

```
1. A normalised schema EXISTS and has been validated.
   → You cannot denormalise what was never normalised.

2. A MEASURED performance problem exists on the read path.
   → "It might be slow" is not sufficient. Profile the query.
   → EXPLAIN ANALYZE must show that the JOIN is the bottleneck,
     not missing indexes, suboptimal query plans, or N+1 patterns.

3. Simpler optimisations have been EXHAUSTED.
   → Indexes (B-tree, GIN, partial, covering)
   → Query rewriting (EXISTS vs IN, lateral joins)
   → Connection pooling and prepared statements
   → Application-level caching (Redis, in-memory)
   → Database views or materialised views
   → Read replicas for query offloading

4. The CONSISTENCY mechanism is designed BEFORE the denormalisation.
   → How will copies be updated? (Triggers, domain events, application code)
   → What happens on partial failure? (Transaction boundaries)
   → Who is responsible for the synchronisation code?
```

### 4.2 Decision Matrix

| Scenario                                                                                                                       | Recommended Approach                                                                                                                                           | Rationale                                                                                                                                                         |
| :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A query JOINs two tables and is used on every page load, but indexes have not been added to the join columns.                  | **Add indexes first.**                                                                                                                                         | The vast majority of "slow JOIN" complaints are resolved by proper indexing, not denormalisation (Winand, 2012).                                                  |
| A dashboard aggregates `COUNT(*)` over millions of rows, recomputed on every request.                                          | **Materialised view** or **pre-computed aggregate** column updated via domain events.                                                                          | Aggregation is the most defensible case for denormalisation. The alternative (counting millions of rows per request) has O(n) cost that indexes cannot eliminate. |
| A list view needs `partner_name` alongside `activity` records, requiring a JOIN on every list request.                         | **Evaluate first**: Is the JOIN actually slow? If yes after indexing, consider a **dedicated read repository** (CQRS Phase 2/3) before duplicating the column. | A single indexed JOIN is rarely a bottleneck. CQRS read models solve this at the architectural level without polluting the write schema.                          |
| An audit log must record "who did what" with the user's name at the time of the action, even if the user's name later changes. | **Snapshot** the name at write time. This is a **domain requirement**, not a performance optimisation.                                                         | This is not denormalisation in the traditional sense — it is historical fidelity. The snapshot is the source of truth for "what the name was at that moment."     |
| A report query JOINs 6+ tables and runs for 30 seconds.                                                                        | **Materialised view** refreshed on a schedule, or **dedicated reporting database** (read replica with denormalised views).                                     | Complex reporting queries should never run against the operational schema. Isolate them.                                                                          |
| Every query for entity X always needs data from entity Y, and they share the same lifecycle.                                   | **Consider merging** the tables if they are in a 1:1 relationship and neither entity has independent consumers.                                                | Merging 1:1 tables with identical lifecycles is low-risk and eliminates a guaranteed JOIN.                                                                        |

### 4.3 The Exception: Snapshots as Domain Requirements

Not all data duplication is denormalisation. **Point-in-time snapshots** represent a distinct design pattern:

- The `assigned_user_name` on an activity record is not a cached copy of the user's current name — it is a record of **who was assigned at that moment**.
- The `order_total` on an order is not a cached sum of line items — it is the **contractual total agreed at the time of purchase**.
- The `partner_address` on an invoice is not a cached copy — it is the **legal billing address at the time of invoicing**.

These are **domain invariants**, not performance optimisations. They should be modelled as first-class properties of the owning entity, clearly documented as snapshots, and should **not** be synchronised when the source changes — that is their entire purpose.

> _"A snapshot is not denormalisation. A snapshot records a fact about a moment in time. Denormalisation duplicates a fact about the present for the purpose of faster reads. Conflating the two leads to bugs: developers either fail to update snapshots (correct behaviour) or update them (destroying historical fidelity)."_

---

## 5. Recommended Approach

### 5.1 Design Principles

1. **Normalise by default.** Begin every schema design in at least 3NF. Do not preemptively denormalise based on anticipated read patterns.

2. **Measure before optimising.** Do not denormalise without profiled evidence that a JOIN is the bottleneck. Use `EXPLAIN ANALYZE` (PostgreSQL), query plan analysis, and application-level tracing to identify the actual cost.

3. **Exhaust alternatives first.** Indexes, query rewriting, application caching, CQRS read models, and materialised views should all be evaluated before introducing redundant columns.

4. **Document every denormalisation.** If a column is duplicated for performance, document:
   - **Why**: The measured problem that justified it.
   - **How**: The mechanism that keeps the copy synchronised (domain event, trigger, application code).
   - **Who owns the synchronisation**: The specific use case, event handler, or trigger responsible.

5. **Prefer architectural solutions over schema mutations.** The CQRS read model evolution path (see [`CQRS.md`](CQRS.md) §6) provides a structured way to optimise reads without polluting the write schema. Denormalisation should be a last resort after CQRS optimisations have been considered.

6. **Distinguish snapshots from caches.** If a duplicated value should **not** be updated when the source changes, it is a snapshot — model it as a first-class domain property. If it **should** be updated, it is a cache — ensure the synchronisation mechanism is bulletproof or use a materialised view instead.

### 5.2 The Decision Flowchart

```
Is the duplicated value a HISTORICAL RECORD (snapshot)?
  └─ YES → Model as a first-class property on the owning entity.
           Document as a snapshot. Do NOT synchronise on source change.
  └─ NO  → Continue ↓

Is there a MEASURED performance problem caused by JOINs?
  └─ NO  → Do NOT denormalise. Normalised schema is correct.
  └─ YES → Continue ↓

Have you tried INDEXES on the join columns?
  └─ NO  → Add indexes. Re-measure.
  └─ YES → Continue ↓

Have you tried a CQRS READ MODEL (dedicated query repository)?
  └─ NO  → Implement a read-optimised repository or query method.
           See CQRS.md §6 — Phase 2/3.
  └─ YES → Continue ↓

Have you tried a MATERIALISED VIEW?
  └─ NO  → Create a materialised view with scheduled refresh.
  └─ YES → Continue ↓

Denormalise. But:
  1. Document the justification in a comment or ADR.
  2. Implement synchronisation via domain events or database triggers.
  3. Add integration tests that verify consistency.
  4. Review the denormalisation periodically — the bottleneck may disappear
     as data volumes or access patterns change.
```

### 5.3 CQRS Alignment

This approach aligns directly with the CQRS evolution path documented in [`CQRS.md`](CQRS.md):

| CQRS Phase                                | Data Modelling Strategy                                                                                                                                     |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1** — Shared Repository           | Normalised schema. Queries hydrate domain entities. Accept the JOIN cost for simplicity.                                                                    |
| **Phase 2** — Dedicated Read Methods      | Normalised schema. Read methods use `QueryBuilder` projections or raw SQL to return flat DTOs, bypassing entity hydration. JOINs remain, but are optimised. |
| **Phase 3** — Dedicated Read Repositories | Normalised write schema. Read repository may use database views or targeted denormalisations, isolated from the write model.                                |
| **Phase 4** — Separate Read Database      | Write schema is fully normalised. Read database is a denormalised projection, updated via domain events. Full separation of concerns.                       |

> **Key insight**: Denormalisation belongs in the **read model**, not the **write model**. The write schema should remain normalised to preserve domain integrity. If reads need flatter data, solve it at the query layer (CQRS Phases 2–4), not by mutating the canonical schema.

---

## 6. Anti-Patterns to Avoid

### 6.1 "Preemptive Denormalisation"

Adding redundant columns because "we might need them for performance later" — without evidence of a current problem. This introduces consistency obligations with no measurable benefit.

### 6.2 "Denormalisation as the First Optimisation"

Duplicating a column because a query is slow, without first checking for missing indexes, N+1 patterns, or suboptimal query plans.

### 6.3 "Silent Denormalisation"

Adding a duplicated column without documenting the synchronisation mechanism. Future developers will not know whether the column is a snapshot (should not be updated) or a cache (must be updated), leading to data corruption in either case.

### 6.4 "Denormalising Across Bounded Contexts"

Duplicating a column from Module A's table into Module B's table to avoid a cross-context JOIN. This violates both DDD context boundaries and data ownership principles. The correct solution is an ACL Gateway query or a CQRS read projection within the consuming context.

### 6.5 "Synchronising Snapshots"

Updating a point-in-time snapshot column when the source entity changes. If the activity's `assigned_user_name` is a snapshot, updating it when the user changes their name destroys the historical record. If it is intended to be a live reference, it should not be a duplicated column at all — it should be a JOIN.

---

## 7. References & Academic Reading

1. Codd, E.F. (1970). "A Relational Model of Data for Large Shared Data Banks." _Communications of the ACM_, 13(6), pp. 377–387. (The foundational paper defining the relational model and the theoretical basis for normalisation.)
2. Kent, William. (1983). "A Simple Guide to Five Normal Forms in Relational Database Theory." _Communications of the ACM_, 26(2), pp. 120–125. (The canonical accessible explanation of 1NF through 5NF, with practical examples.)
3. Date, C.J. (2003). _An Introduction to Database Systems_. 8th ed. Addison-Wesley. (The authoritative textbook on relational database theory, covering normal forms, dependency theory, and the arguments for and against denormalisation — Ch. 12–14.)
4. Elmasri, R. & Navathe, S.B. (2015). _Fundamentals of Database Systems_. 7th ed. Pearson. (Comprehensive coverage of normalisation algorithms, denormalisation as a physical design technique, and performance trade-offs — Ch. 15–16.)
5. Winand, M. (2012). _SQL Performance Explained_. Self-published. https://use-the-index-luke.com/ (Practical guidance on indexing strategies that frequently eliminate the need for denormalisation.)
6. Young, G. (2010). _CQRS Documents_. (Argues that read-model projections — not schema denormalisation — are the correct architectural response to read-performance concerns.)
7. Fowler, M. (2003). _Patterns of Enterprise Application Architecture_. Addison-Wesley. (Discusses data mapping patterns, identity maps, and the trade-offs of rich domain models vs. flat read projections — Ch. 3, 10, 18.)
8. Kleppmann, M. (2017). _Designing Data-Intensive Applications_. O'Reilly. (Modern treatment of data modelling trade-offs across relational, document, and event-sourced systems — Ch. 2–3.)
9. Karwin, B. (2010). _SQL Antipatterns: Avoiding the Pitfalls of Database Programming_. Pragmatic Bookshelf. (Catalogues common schema design mistakes including improper denormalisation, EAV misuse, and polymorphic associations — Part I.)
