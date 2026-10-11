Mission visibility follows the creator's instructor account. Instructors can list, read, edit, delete, and clear scores only for their own missions. Active students can read missions only from their current assigned instructor. Admins retain read access for administration.

New missions receive `instructorId`, `instructorid`, and `createdBy` from the authenticated server session. Requests cannot assign or transfer ownership. Older missions with `createdBy` still work; records with no identifiable owner remain hidden from instructors and students until their ownership is explicitly repaired.

Both `/missions` and the `/modules` compatibility API require a signed bearer session issued by successful login. Class summaries and student training records enforce the same account boundaries. The frontend retains mission ownership in its cache, filters restored data, and ignores catalog responses from previous accounts.

Set `AUTH_SESSION_SECRET` to a private random value shared by backend instances to keep sessions valid across restarts. If it is absent, the backend generates an in-memory secret, and users must sign in again after a restart. Sessions last 12 hours; account status and student assignment are checked against the database on each mission request. Existing demo accounts obtain sessions through `/auth/demo-login`.

Verification: `npm test -- --runInBand tests/missionAccess.test.js tests/instructorOverview.test.js tests/studentManagement.test.js tests/adminPortal.test.js` in `backend`, and `node --test tests/mission-visibility.test.mjs tests/instructor-overview.test.mjs tests/student-management.test.mjs tests/mission-quiz-button.test.mjs tests/firebase-api-timeout.test.mjs tests/training-records.test.mjs` in the project root.
