# Mission and quiz result persistence

Live read-only audit on 2026-10-06 found:

| Collection | Documents | Valid unique student/result keys | Duplicate groups |
| --- | ---: | ---: | --- |
| `mission_score` | 4 | 3 | One pair has 2 documents (failed and passed). |
| `quiz_score` | 6 | 2 | Two pairs have 2 and 3 documents. One document has an incomplete key. |
| `quiz_submissions` | 0 | 0 | None. |
| `quiz_results` | 0 | 0 | None. |

Existing documents were preserved. This change prevents new duplicate creation; it does not delete or migrate historical duplicates. The audit omits student identities, credentials, and quiz answers. Run `node scripts/inspect-score-duplicates.mjs` from `backend` to repeat it.

The old mission handler checked XP duplicates only within five seconds, awarded XP separately from the result save, and overwrote passed results. Both score handlers queried and then used random document IDs outside a transaction, permitting concurrent requests to create duplicates. The alternate quiz submission and grading routes always added documents.

`backend/services/scorePersistence.js` now owns the save rules:

- A stable ID is used for new student/mission and student/quiz results. Existing random IDs are reused. Quiz identity does not change when client module context changes.
- Firestore transactions read the deterministic target and matching legacy records before any writes. Mission result and student XP commit together.
- Failed retries update the same result, preserving creation timestamps and unrelated fields. Older delayed results are ignored.
- A passed mission, or a legacy completion carrying a positive recorded XP award, is immutable. Subsequent requests return the existing result with `skipped: true`, award zero XP, and write nothing.
- A submitted quiz is immutable, including a failed quiz. Mission retries reuse its saved score and update only the failed mission result. New clients send `missionId`; module-only clients retain a completion guard for existing synthetic missions.
- Repeated grading reuses the same quiz result record and commits grading status atomically. Question content, grading calculations, mission scoring, pass thresholds, and XP rewards are unchanged.

Both mission-score and quiz-score POST routes use the service, as do the alternate quiz submission and grading routes. `src/App.vue` reconciles saved mission results and CUSTOM aliases before choosing practice mode, waits for quiz saving before enabling mission reporting, and handles a backend rejection before creating local awards. The local progress store retains an earned mission pass and reuses failed retry records.

Mission reporting remains available in practice when the anchor is deployed and the engine is off. Practice opens the existing saved mission result without saving scores or awarding XP. Failed missions use the normal report flow with the completed quiz score. Previously, `!isTrainingReviewMode` hid the report button, quiz restoration skipped practice, and practice completion exited to the dashboard instead of showing a report.

Verification: 23 backend tests passed with an in-memory Firestore adapter modeling serializable transactions and commit failures. These cover concurrent saves, failed retries, pass immutability after a different timestamp, XP awarded once, commit rollback, legacy IDs and duplicates, separate students/results, linked quiz protection, delayed results, and repeated grading. All 27 frontend/progression tests passed, including actual App.vue practice guards and restored persisted mission state. Production build passed with the existing large-bundle warning.

The backend was restarted and its health endpoint checked. The frontend dev server remains available. No simulated student results were submitted to live Firestore, and a full interactive simulation/retry was not exercised. Concurrency behavior was tested against the adapter rather than the live database or Firestore emulator.

The subsequent missing-XP fix and verified live repair are documented in `missing-mission-xp.md`.
