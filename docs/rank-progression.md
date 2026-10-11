# Rank achievements and badge consistency

The old application used an eight-rank table in the mission-score backend and
rank cards, a different six-rank table in `studentMotivation.js`, and manual
local badge records. The profile badge could also show Welcome Aboard as a
placeholder while the corresponding badge card was locked. The header mixed
recomputed mission XP with a rank derived from a different local XP value.

`shared/progression.js` now defines one progression path:

**Persisted total XP → highest eligible rank → eligible rank achievements → badges.**

| Stable rank ID | Rank | Minimum XP |
| --- | --- | ---: |
| deck_cadet | Deck Cadet | 0 |
| ordinary_seaman | Ordinary Seaman (OS) | 500 |
| able_seaman | Able Seaman (AB) | 1000 |
| bosun | Bosun | 2000 |
| third_officer | Third Officer (3/O) | 3500 |
| second_officer | Second Officer (2/O) | 5000 |
| chief_officer | Chief Officer (C/O) | 7000 |
| master_captain | Master / Captain | 10000 |

These retain the existing eight-rank thresholds. The inspected Firestore project
had no `course_settings/global` document, so the central defaults apply. An optional
complete `ranks` array in that document can override thresholds using the stable
IDs and `minXp` or legacy `requiredXP` fields. Deck Cadet must remain at 0 and
thresholds must increase in rank order; invalid or incomplete tables use defaults.

Welcome Aboard has ID `welcome-aboard` and requires `deck_cadet`. Higher rank
achievements use `rank-<rank ID>`. Earlier achievements remain earned after
promotion. Non-rank mission badges and certificates retain their existing rules.
Rank badges cannot be manually revoked or awarded, and they do not depend on the
course's automatic mission badge setting.

The canonical XP field is a finite, nonnegative `xp` value, including numeric
strings and zero. If invalid or absent, use valid `total_xp`, otherwise zero for
display purposes. Reconciliation does **not** write or reset either XP field.
Mission awards still use the existing reward amount and pass/fail condition.

`backend/services/progression.js` reconciles only derived rank, progress and badge
fields in a Firestore transaction. Login and student detail/progress reads repair
legacy records; student/admin lists derive the same presentation. Passed mission
awards persist XP and progression together. Badge IDs are deduplicated, unrelated
badge metadata and student fields are preserved, and subsequent reconciliation
does not write again when nothing changed. No separate achievement-unlock flags
or invented award dates are stored.

The frontend overview, sidebar/header, progress indicator, achievement/badge
cards, rank cards, instructor badge counts and admin rank view use the shared
rules. Rank milestones appear only in the compact Rank grid; the Badges grid and
badge counters include Welcome Aboard and activity badges, without duplicating
the maritime ranks. Both grids wrap within the available screen width.
Leaderboard sort order and its existing XP aggregation are unchanged;
maritime rank labels use each student's persisted XP. The leftover random
display-only XP callback was removed. A duplicate mission retry now retains its
XP-awarded marker so a later retry cannot award again.

Changed implementation files:

- `shared/progression.js`, `backend/services/progression.js`
- `backend/routes/mission_scores.js`, `students.js`, `progress.js`, `admin.js`
- `src/App.vue`, `src/components/admin/GlobalStudentView.vue`
- `src/helpers/studentMotivation.js`, `src/helpers/progressStore.js`
- `src/firebase/auth.js`, `firestore.js`, `progressStore.js`, `migration.js`
- `package.json`, `tests/progression.test.mjs`, `tests/progression-dashboard.test.mjs`
- `backend/tests/progression.test.js`
- `backend/scripts/inspect-progression.mjs`, `backend/scripts/reconcile-progression.mjs`
- `scripts/preview-student-overview.mjs` (local browser layout verification)

Verification commands:

```powershell
# Frontend/shared logic and actual dashboard binding/template tests
npm run test:progression
npm run build

# From backend/: actual route/service integration with an in-memory Firestore adapter
npm test -- --runInBand tests/progression.test.js --silent

# Live data: dry run by default; --apply writes only progression fields
node scripts/reconcile-progression.mjs
node scripts/reconcile-progression.mjs --apply
```

Automated coverage includes 0 XP, below/exactly at every rank threshold, multiple
promotions in one award, retained Welcome Aboard, locked requirement text, earned
styling, reactive dashboard updates, local legacy fallback, inconsistent ranks
and badges, XP aliases, deduplication, repeat reconciliation/login, failed missions,
duplicate submissions, and configured thresholds. The backend tests do not write
live student data. Dashboard tests render the actual overview markup and run its
reactive bindings without starting WebGL.

The actual overview markup and styles were checked in headless Edge at viewport
widths 1365, 1024, 768 and 375 pixels. The dashboard, content panel, badges grid
and rank grid had no horizontal overflow at any width. Rank cards measured 108px
high, and the Badges section contained only the eight original badge types.
Full interactive browser sign-in and simulation gameplay are outside this
verification; quiz behavior and simulation scoring are unchanged.

Verification results (October 6, 2026):

- 21 shared-logic/dashboard tests passed.
- 8 actual backend route/service integration tests passed.
- Production frontend build passed; Vite reports the existing large-bundle warning.
- Live reconciliation repaired all 3 existing students to Deck Cadet with one
  Welcome Aboard badge each. XP before and after remained 0 for every student.
- A second live dry run reported zero changed fields for all students, confirming
  reconciliation is idempotent.
