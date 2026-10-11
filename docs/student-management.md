# Student Management aligned with saved training data

The instructor Students page now shows a compact list with student identity, rank/XP, missions passed, quizzes taken, actual account status, and View records. Search supports name, school ID, and email. Account status filtering, Refresh, and Export CSV use the same list. Smaller screens use uniform student cards. Pending account approvals keep the established approval flow.

View records reads a fresh class-scoped record with account details, next rank requirement, mission/quiz counts, badge and certificate counts, averages, last training activity, and individual saved results. The old browser-local reset control is absent from this page because it did not reset database records. The existing account removal confirmation remains.

## Cause and backend changes

The old training summary/detail endpoints read `training_modules`, `mission_scores`, `quizzes`, and `quiz_scores`. This project stores its catalog/results in `missions`, `mission_score`, `quiz`, and `quiz_score`. The UI also mixed browser-local sessions and a best-score fallback with those empty summaries, producing 0/3 missions, 0/0 quizzes, and misleading average scores.

`backend/services/studentTrainingRecords.js` provides one read-only projection for the list, View records, CSV, and compatibility APIs:

- `GET /api/v1/instructors/:id/student-management`
- `GET /api/v1/instructors/:id/students/:studentId/training-record`
- Existing student `training-summary`, `missions-detail`, and `quizzes-detail` endpoints now use that projection too.

Class membership uses `students.instructorid`, with `instructorId` compatibility. Student keys use Firestore document IDs, so two accounts sharing a displayed school ID remain distinct. Responses explicitly select public fields and exclude password hashes.

Current shared/owned missions and their linked quizzes define the denominators. Quiz links support scalar/array `moduleId`, `missionId`, and legacy module assignments. Matching strips the uppercase simulation `CUSTOM-` wrapper and retains the lowercase `custom-mission-` document prefix. Foreign or deleted missions and unrelated quiz results cannot inflate the totals.

Mission counts include one earned pass per student/mission and preserve that pass if an old duplicate practice result exists. Failed attempts show the latest saved result. Quizzes taken count one saved submission per student/quiz; quiz retries use the latest submission. Quizzes passed and result labels honor the stored pass/fail decision. Averages use one selected saved score per current mission/quiz, with zero preserved and unattempted scores shown as a dash. No scores are recalculated.

XP/rank/badges use the existing shared progression rules and `course_settings`. Default thresholds remain Deck Cadet 0; Ordinary Seaman 500; Able Seaman 1,000; Bosun 2,000; Third Officer 3,500; Second Officer 5,000; Chief Officer 7,000; Master/Captain 10,000 XP. Reading or refreshing this page does not save results, award XP, or change student documents.

## Files

- `backend/services/studentTrainingRecords.js`: projection and Firestore reads.
- `backend/routes/instructors.js`, `backend/routes/students.js`: list/detail and compatibility endpoints.
- `src/api/firebaseApi.js`, `src/App.vue`: backend loading, compact UI, records modal, filters, CSV, and responsive styles.
- `backend/tests/studentManagement.test.js`, `tests/student-management.test.mjs`: isolated regression tests.
- `scripts/verify-live-student-management.mjs`: read-only check of the actual Vue app against the local live API.

## Verification

The isolated backend progression, overview, and Student Management suites passed: 51 tests. The relevant frontend suites passed: 57 tests. The production build passed with the existing large-bundle warning. Tests cover schema compatibility, class scoping, legacy duplicates, zero scores, rank settings, fresh record retrieval, login/account request order, stale response guards, search/filter behavior, errors, and CSV consistency.

The running API was checked against all three existing instructors. The populated class contains three students. At verification, Kevin ben's record showed 110 XP, Deck Cadet, 3/3 missions passed, 3/3 quizzes taken, two quizzes passed, one earned badge, mission average 73%, and quiz average 67%. The list, fresh detail, and compatibility endpoints agreed. Stored aggregate fields such as `averageScore` and `bestScore` were not overwritten.

Browser verification uses the actual Vue app and saved backend data at widths 1365, 1024, 768, and 375 pixels. It checks list/detail values, search, CSV values, individual mission/quiz records, refresh/reopen consistency, and horizontal overflow. It injects the same role/account/screen state order as login; credential authentication is not part of that check. The unrelated 3D render loop is paused only in the isolated test browser.

Live account approval/removal and new training submissions were not exercised, to preserve existing student records. Their established write flows, simulation scoring, quiz grading, mission XP amounts, and leaderboard ordering were not changed.

## Stuck loading fix

Instructor login previously called the Student Management endpoint through `loadAllStudents()`, then opening Students called it again through the tab watcher. If the first request succeeded and the second Firestore request lost its connection, the successful rows were discarded and the page could remain on “Refreshing…” for Firestore's roughly 100-second retry period. Backend logs reproduced this sequence: one request returned normally, while the duplicate ended after 97.6 seconds with Firestore `UNAVAILABLE / ETIMEDOUT`.

The Students-tab watcher is now the sole automatic loader. Legacy student and pending-account requests are no longer started during instructor login or when this tab opens because the shared projection already contains both. Starting a new request cancels its predecessor; leaving the tab or changing accounts cancels an in-flight request. Student Management list/detail calls stop after 20 seconds and show a Try again message. A background refresh retains the last successful rows instead of replacing the table with a loading message. Approval still refreshes the projection explicitly.
