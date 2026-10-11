# System audit — 11 October 2026

The verified mission/quiz flow, account isolation, record fetching and layouts pass the checks below. This is not a certification that every screen, device or 3D scenario is bug-free.

## Bugs fixed

| Area | Root cause and correction |
| --- | --- |
| Mobile mission UI | A content-box width of `92vw` also added 48px padding and borders. At 375px, the result card extended to x=419. The overlay and card now use border-box sizing, available parent width, viewport-aware height and wrapping. The verified card ends at x=363. The Report Mission prompt exceeded the 375px landscape height; it now has responsive padding and internal scrolling. Completion notifications also include padding inside their viewport width. |
| Mission persistence | A failed backend save still marked the module passed and awarded local XP. Saving now succeeds before local completion/rewards; failure keeps reporting available for retry. Concurrent report calls save once. |
| Account/run changes | A late save could show XP, refresh the wrong account or update a new run. Both the API response handler and report handler check the reporting student/run before applying local effects. |
| Navigation telemetry | The animation loop read nonexistent `stats.heading`, and waypoint IDs were passed as coordinate objects. Tracking now receives `rotationDeg` and resolved waypoint coordinates; invalid positions cannot produce NaN scores. |
| Course deviation | The route tracker received a string and recorded zero; the fallback calculation measured distance to destination. Both trackers now use perpendicular distance from the step's starting course. |
| Objective/waypoint scoring | Generated steps without IDs caused false sequence violations. Stable step IDs now match completion events. Repeated destinations count once, matching unique waypoint visits. |
| Mission lifecycle | Delayed step/review/start callbacks could modify an exited or restarted mission. Callbacks check module/run identity; cancelled performance sessions clear the old route. Missions also retain mission mode rather than being labelled Quick Sail. |
| Engine lifecycle | The delayed starter could turn the engine on after exit or boat replacement. It now verifies the screen, boat and run; leaving simulation clears engine state. |
| Anchor animation | Fixed `1/60` updates made anchor/fishing timing depend on FPS. They now receive elapsed simulation time and pause with simulation. GLTF node-name patterns now recognize the medium boat's actual `main_body_anchor002` and related nodes. |
| Return to port | Anchor-action validation returned before checking its waypoint. Dropping anchor must now satisfy the configured port zone, speed and heading requirements. |
| Score calculations | Zero waypoint/question totals and overcounted visits produced invalid or oversized scores. Scores now remain finite and bounded; waypoint-free exercises are supported, zero pass thresholds are respected and configured mission duration is parsed. |
| Attempts API | Student/mission attempt lookups called routes the backend does not define. They now use the existing query endpoint with encoded IDs. |
| Boat replacement | Old model geometry/materials/textures were retained, and older asynchronous loads could replace a newer selection. Old owned resources are disposed while the shared environment map is preserved; superseded loads are discarded. |
| UI/material cleanup | Removed stray text from the exit dialog and unsupported emissive properties from basic radar materials. |

## Verification completed

- **205 frontend tests passed**, including all simulation, account, quiz/report and new audit regressions.
- **63 backend tests passed** across admin portal, instructor overview, progression and student management, with mocked persistence.
- **Production build passed.** Vite still reports the existing large JavaScript bundle advisory.
- **Live API:** all four instructor overviews returned consistent student/completion counts and percentages across refreshes.
- **Live Student Management UI:** three enrolled students; displayed records, XP/rank, detailed mission/quiz data and CSV matched backend responses. Refresh/reopen remained consistent and the backend projection was unchanged.
- **Student Management viewports:** 1365, 1024, 768 and 375px. No page overflow or clipped record modal. Wide record tables scroll inside their own containers.
- **Actual quiz/report handlers and modal layouts:** quiz, Report Mission prompt and Mission Result at 1366×768, 812×375 and 375×812, plus the completion notification at 375×812. All ten layout captures passed viewport bounds checks. Quiz submission saved once; another submission did not issue another request. A simulated failed mission save granted no completion, and retry succeeded. Dismissal returned to the dashboard with the student still signed in and tracking inactive. No unhandled browser exceptions.

Browser score writes were intercepted with test fixtures. Live verification used read-only API requests; no live student score/account records were modified.

## Simulation verification limit

The small-boat browser check exercised engine startup, throttle, steering, anchoring and camera switching. Tests cover all three hulls' acceleration/turning at 30/60/144 FPS, anchoring, water response, camera/bridge geometry, radar targets, lights and resource cleanup.

The final full-render browser run for all three hulls did **not** complete: the hidden software-rendered browser became unresponsive and was closed. Smooth 3D rendering/FPS on the user's actual computer or phone, sustained sessions and every collision/docking scenario remain unverified. The UI checks paused the unrelated 3D loop and handled transitions explicitly; they do not establish GPU performance.

An initial parallel frontend test run hit a Windows `VirtualAlloc` failure. After closing the old audit browser, the complete suite passed with one test file at a time.

## Re-run automated checks

From the project directory:

```powershell
node --test --test-concurrency=1 tests/*.test.mjs
npm run build
```

From `backend`:

```powershell
npm test -- --runInBand --runTestsByPath tests/adminPortal.test.js tests/instructorOverview.test.js tests/progression.test.js tests/studentManagement.test.js
```

The older route tests that create/delete real Firebase documents were intentionally excluded from this audit.

Local browser evidence is in `node_modules/.cache/system-audit/live-students/` and `node_modules/.cache/system-audit/student-flow/`, including `student-flow/results.json` and desktop/mobile screenshots. These are disposable local artifacts.
