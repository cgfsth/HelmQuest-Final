# HelmQuest — Database Management System Chart

Maritime navigation training platform (`HelmQuest`). This document is the **DBMS reference chart**: architecture, entity relationships, tables, and how data maps from the current browser app to a production database.

**Quick export:** paste [`helmquest-schema.dbml`](./helmquest-schema.dbml) into [dbdiagram.io](https://dbdiagram.io) for a PNG/PDF ERD.

---

## 1. DBMS architecture

Classic DBMS layout: **Database → DBMS → API → App / User**.

**Open the visual diagram:** [`dbms-diagram.html`](./dbms-diagram.html) (open in a browser — matches the reference style with purple Database, central DBMS hub, and blue App/User nodes linked by API).

```mermaid
flowchart LR
    DB[("🗄 Database")]
    DBMS[("DBMS")]
    App1[("App")]
    User[("User")]
    App2[("App")]

    DB --> DBMS
    DBMS ---|API| App1
    DBMS ---|API| User
    DBMS ---|API| App2

    style DB fill:#7b5ea7,color:#fff,stroke:#6b4f97,stroke-width:2px
    style DBMS fill:#1a2744,color:#fff,stroke:#0f172a,stroke-width:3px
    style App1 fill:#4ebfe8,color:#fff,stroke:#38afd8,stroke-width:2px
    style User fill:#4ebfe8,color:#fff,stroke:#38afd8,stroke-width:2px
    style App2 fill:#4ebfe8,color:#fff,stroke:#38afd8,stroke-width:2px
```

### HelmQuest mapping

| Node | HelmQuest component |
|------|---------------------|
| **Database** | PostgreSQL — `user`, `student`, `training_module`, `navigation_mission`, `mission_attempt`, `student_module_pass`, `instructor_feedback` |
| **DBMS** | Database engine — SQL queries, transactions, constraints, backups |
| **API** | REST/GraphQL layer — auth, progress, catalog, instructor feedback endpoints |
| **App** (top) | Student HelmQuest client (`App.vue` — training hub + simulation) |
| **User** | Student or instructor account |
| **App** (bottom) | Instructor review dashboard |

**Today (prototype):** the student app reads/writes `localStorage` directly — no API or server DB yet. The diagram above is the **target production architecture**.

| Layer | Today | Target |
|-------|-------|--------|
| Database | — | PostgreSQL |
| DBMS | — | Managed PostgreSQL / RDS |
| API | — | Node or Python backend |
| App | `App.vue` + `progressStore.js` | Same UI, calls API |
| User | Demo login (`student@` / `instructor@`) | Real accounts |

---

## 2. Entity relationship diagram (logical schema)

Seven core tables for accounts, training catalog, graded attempts, and instructor feedback.

```mermaid
erDiagram
    USER {
        varchar user_id PK
        varchar name
        varchar username
        varchar email UK
        varchar password
        varchar role "student | instructor"
    }

    STUDENT {
        varchar student_id PK
        varchar user_id FK
        varchar name
        varchar email
        int xp
        varchar rank
        int missions_completed
    }

    TRAINING_MODULE {
        varchar module_id PK
        varchar title
        varchar category
        text description
        varchar duration
        varchar difficulty
        varchar reward
    }

    NAVIGATION_MISSION {
        varchar mission_id PK
        varchar module_id FK
        varchar title
        varchar difficulty
        text description
        int pass_score
    }

    MISSION_ATTEMPT {
        varchar attempt_id PK
        varchar student_id FK
        varchar mission_id FK
        varchar module_id FK
        float score
        int pass_score
        boolean passed
        datetime completed_at
    }

    STUDENT_MODULE_PASS {
        varchar pass_id PK
        varchar student_id FK
        varchar module_id FK
        datetime passed_at
    }

    INSTRUCTOR_FEEDBACK {
        varchar feedback_id PK
        varchar attempt_id FK
        varchar instructor_id FK
        text comment
        datetime created_at
    }

    USER ||--o| STUDENT : "has (student role)"
    STUDENT ||--o{ MISSION_ATTEMPT : submits
    TRAINING_MODULE ||--o{ NAVIGATION_MISSION : includes
    NAVIGATION_MISSION ||--o{ MISSION_ATTEMPT : records
    TRAINING_MODULE ||--o{ MISSION_ATTEMPT : "scoped by"
    STUDENT ||--o{ STUDENT_MODULE_PASS : earns
    TRAINING_MODULE ||--o{ STUDENT_MODULE_PASS : awards
    MISSION_ATTEMPT ||--o{ INSTRUCTOR_FEEDBACK : receives
    USER ||--o{ INSTRUCTOR_FEEDBACK : "writes (instructor)"
```

### Relationship summary

| # | Parent | Child | Cardinality | Business rule |
|---|--------|-------|-------------|---------------|
| 1 | USER | STUDENT | 1 : 0..1 | Only student-role accounts have a student profile |
| 2 | TRAINING_MODULE | NAVIGATION_MISSION | 1 : N | Each module contains multiple missions |
| 3 | STUDENT | MISSION_ATTEMPT | 1 : N | **One attempt per mission per student** (enforced in app) |
| 4 | NAVIGATION_MISSION | MISSION_ATTEMPT | 1 : N | Attempts reference the mission graded |
| 5 | STUDENT | STUDENT_MODULE_PASS | 1 : N | Module pass when all missions in module pass |
| 6 | MISSION_ATTEMPT | INSTRUCTOR_FEEDBACK | 1 : N | Instructors comment on submitted attempts |

---

## 3. Training content hierarchy

Catalog data is static today (`App.vue`); in a DBMS it normalizes into module → mission → steps.

```mermaid
flowchart LR
    TM["TRAINING_MODULE<br/>steering-speed"]
    NM1["NAVIGATION_MISSION<br/>HQ-M01 Basic Steering"]
    NM2["NAVIGATION_MISSION<br/>HQ-M02 Speed Control"]
    TS["TRAINING_STEP<br/>speed_min, heading, anchor…"]
    LO["LEARNING_OBJECTIVE<br/>bulleted goals"]
    WZ["WAYPOINT_ZONE<br/>simulation geometry"]

    TM --> NM1
    TM --> NM2
    TM --> TS
    TM --> LO
    NM1 --> WZ
    NM2 --> WZ
```

| Entity | Example ID | Stored today |
|--------|------------|--------------|
| TRAINING_MODULE | `docking-anchoring` | `trainingModules[]` in App.vue |
| NAVIGATION_MISSION | `HQ-M04` | `navigationMissions[]` in App.vue |
| TRAINING_STEP | step 0…N | `module.steps[]` |
| WAYPOINT_ZONE | `dock-parallel` | `missionWaypoints.js` |

---

## 4. Table definitions

### 4.1 USER

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| user_id | VARCHAR | PK | e.g. `student-alex`, `instructor-helen` |
| name | VARCHAR | | Display name |
| username | VARCHAR | | Login handle |
| email | VARCHAR | UK | e.g. `student@helmquest.local` |
| password | VARCHAR | | Hash in production (demo: plain) |
| role | VARCHAR | | `student` or `instructor` |

### 4.2 STUDENT

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| student_id | VARCHAR | PK | Matches `user_id` for student accounts |
| user_id | VARCHAR | FK → USER | Owning account |
| name | VARCHAR | | |
| email | VARCHAR | | |
| xp | INT | | Experience points |
| rank | VARCHAR | | e.g. Deck Hand, Helmsman |
| missions_completed | INT | | Count of passed missions |

### 4.3 TRAINING_MODULE

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| module_id | VARCHAR | PK | e.g. `steering-speed` |
| title | VARCHAR | | |
| category | VARCHAR | | e.g. Fundamentals |
| description | TEXT | | |
| duration | VARCHAR | | Estimated time label |
| difficulty | VARCHAR | | Beginner…Hard |
| reward | VARCHAR | | e.g. +100 XP |

### 4.4 NAVIGATION_MISSION

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| mission_id | VARCHAR | PK | e.g. `HQ-M01` |
| module_id | VARCHAR | FK → TRAINING_MODULE | Parent module |
| title | VARCHAR | | |
| difficulty | VARCHAR | | |
| description | TEXT | | |
| pass_score | INT | | Minimum % to pass |

### 4.5 MISSION_ATTEMPT

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| attempt_id | VARCHAR | PK | e.g. `session-steering-seed` |
| student_id | VARCHAR | FK → STUDENT | |
| mission_id | VARCHAR | FK → NAVIGATION_MISSION | |
| module_id | VARCHAR | FK → TRAINING_MODULE | Denormalized for queries |
| score | FLOAT | | 0–100 |
| pass_score | INT | | Required score at attempt time |
| passed | BOOLEAN | | |
| completed_at | DATETIME | | ISO timestamp |

**Optional JSON column (future):** `metadata` — elapsed seconds, max speed, steps completed, review mode (see `helmquest-design-schema.json`).

### 4.6 STUDENT_MODULE_PASS

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| pass_id | VARCHAR | PK | |
| student_id | VARCHAR | FK → STUDENT | |
| module_id | VARCHAR | FK → TRAINING_MODULE | |
| passed_at | DATETIME | | When module fully completed |

### 4.7 INSTRUCTOR_FEEDBACK

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| feedback_id | VARCHAR | PK | |
| attempt_id | VARCHAR | FK → MISSION_ATTEMPT | |
| instructor_id | VARCHAR | FK → USER | Instructor account |
| comment | TEXT | | |
| created_at | DATETIME | | |

---

## 5. Data flow (mission lifecycle)

```mermaid
sequenceDiagram
    participant S as Student
    participant UI as HelmQuest UI
    participant SIM as Simulation
    participant DB as Database

    S->>UI: Login (email / password)
    UI->>DB: SELECT user, student
    S->>UI: Start mission HQ-M01
    UI->>SIM: Load waypoints & validators
    SIM->>UI: Step completion events
    SIM->>UI: Mission score (PASS/FAIL)
    UI->>DB: INSERT mission_attempt (one per mission)
    alt All module missions passed
        UI->>DB: INSERT student_module_pass
        UI->>DB: UPDATE student (xp, rank)
    end
    participant I as Instructor
    I->>UI: Open review dashboard
    UI->>DB: SELECT mission_attempt JOIN student
    I->>UI: Add feedback
    UI->>DB: INSERT instructor_feedback
```

---

## 6. Current app → table mapping

| DB table | Current storage | File |
|----------|-----------------|------|
| USER | `DEMO_USERS` + session | `helpers/progressStore.js` |
| STUDENT | `progress.students[]` | `helpers/progressStore.js` |
| TRAINING_MODULE | `trainingModules` ref | `App.vue` |
| NAVIGATION_MISSION | `navigationMissions` ref | `App.vue` |
| MISSION_ATTEMPT | `progress.sessions[]` | `helpers/progressStore.js` |
| STUDENT_MODULE_PASS | `progress.completedModules` | `helpers/progressStore.js` |
| INSTRUCTOR_FEEDBACK | Not persisted | Planned |

**localStorage key:** `helmquest-progress-v1`

---

## 7. ASCII ERD (print-friendly)

```
┌──────────────┐       ┌──────────────┐       ┌───────────────────┐
│     USER     │ 1─0..1│   STUDENT    │ 1─N   │  MISSION_ATTEMPT  │
├──────────────┤       ├──────────────┤──────►├───────────────────┤
│ user_id   PK │       │ student_id PK│       │ attempt_id     PK │
│ email     UK │       │ user_id   FK │       │ student_id     FK │
│ role         │       │ xp, rank     │       │ mission_id     FK │
└──────┬───────┘       └──────┬───────┘       │ module_id      FK │
       │ writes               │ earns         │ score, passed     │
       │                      ▼               └─────────┬─────────┘
       │               ┌──────────────┐                 │ receives
       │               │STUDENT_MODULE│                 ▼
       │               │    _PASS     │       ┌───────────────────┐
       │               ├──────────────┤       │INSTRUCTOR_FEEDBACK│
       └──────────────►│ pass_id   PK │       ├───────────────────┤
                       │ student_id FK│       │ feedback_id    PK │
┌──────────────────┐   │ module_id  FK│       │ attempt_id     FK │
│ TRAINING_MODULE  │   └──────▲───────┘       │ instructor_id  FK │
├──────────────────┤          │ awards        └───────────────────┘
│ module_id     PK │          │
│ title, reward    │          │
└────────┬─────────┘          │
         │ includes           │
         ▼                    │
┌──────────────────┐          │
│NAVIGATION_MISSION│ records  │
├──────────────────┤──────────┘
│ mission_id    PK │
│ module_id     FK │
│ pass_score       │
└──────────────────┘
```

---

## Related files

| File | Purpose |
|------|---------|
| [`dbms-diagram.html`](./dbms-diagram.html) | **Visual DBMS chart** (Database → DBMS → API → App/User) |
| [`helmquest-schema.dbml`](./helmquest-schema.dbml) | DBML for dbdiagram.io |
| [`erd.md`](./erd.md) | Extended ERD notes and variants |
| [`json/helmquest-entities.json`](./json/helmquest-entities.json) | Full entity catalog |
| [`json/helmquest-design-schema.json`](./json/helmquest-design-schema.json) | Sample JSON document shape |
| [`data-flow.md`](./data-flow.md) | Application data flow |
