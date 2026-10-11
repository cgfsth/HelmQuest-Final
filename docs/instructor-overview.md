# Simple instructor overview

The overview now contains four uniform summary cards (Total Students, Students Passed, Needs Retry, Completion Rate), mission progress, and two short lists (Needs Attention and Recent Results). Each list shows at most five rows. Refresh loads the latest saved results; View Students opens the existing student management page. Rankings remain available through Leaderboards.

All overview values come from `GET /api/v1/instructors/:id/overview`. The read-only backend uses active students assigned to that instructor, shared/owned current missions, and `mission_score`/`quiz_score`. It never writes student data or awards XP. Students with pending/inactive status, other classes, and mission results for deleted missions are excluded from mission counts.

Overall completion = unique passed student/mission pairs divided by enrolled students × current missions. Each mission shows passed students divided by enrolled students. Empty classes or no missions return zero without inventing a denominator. Legacy duplicate mission results preserve an earned pass; quiz results use the latest score. The uppercase simulation prefix `CUSTOM-` is removed during matching while the lowercase Firestore prefix `custom-mission-` is retained.

The previous overview used browser-local sessions, activity-only student counts for its denominator, and module IDs for matching results. This caused overall and per-mission progress to disagree. The new overview uses the same backend result set for both.

Files: `src/App.vue`, `src/api/firebaseApi.js`, `backend/routes/instructors.js`, `backend/services/instructorOverview.js`. Tests: `backend/tests/instructorOverview.test.js` and `tests/instructor-overview.test.mjs`. The existing preview script supports `--instructor --browser`; `backend/scripts/verify-instructor-overview.mjs` verifies the running endpoint against actual Firestore data.

Verified: 9 overview backend tests, 23 existing save tests, and 13 frontend tests passed (including 4 overview data-flow tests). Production build passed with the existing bundle-size warning. A headless browser verified 96px uniform cards and no horizontal overflow at 1365, 1024, 768, and 375px widths. The backend was restarted; the live endpoint was checked for all three instructors and repeated refreshes returned identical summaries. At verification, the populated class had 3 students, 3 missions, 2 completions, 1 student with a passed mission, 1 needing retry, and 22% completion. Live values can change as students train.

Visual checks render actual Vue markup/styles with sample data. Full login and interactive simulation were not exercised in the browser for this overview change. Existing mission scoring, XP awards, quiz grading, and leaderboard ranking rules are unchanged.

## Blank summary on instructor login

The actual login flow changes the role before the current account ID. Two separate Vue watchers previously queued a fetch followed by an identity reset, which cancelled the fresh request and cleared its loading state. This left only the Class Summary toolbar visible, even though the backend returned valid data. Identity resets and automatic loading now run in one watcher, in that order. A missing instructor ID shows a sign-in error. Regression tests exercise the real order of login state changes, account switching, and missing identity. This fix does not change backend calculations or database records.

Verification: the new login regression failed before the fix and passed afterward. All 41 frontend tests and the production build passed. The actual Vue app was checked in an isolated headless browser using live backend data: four cards displayed 3 students, 1 student with passed missions, 0 needing retry, and 33% completion; all three mission cards appeared. Refresh and reopening Overview returned the same summary. `scripts/verify-live-instructor-overview.mjs` performs this read-only browser check using the same role/account/screen state change order as login, without testing credential validation. The unrelated 3D render loop is paused only in that test browser.
