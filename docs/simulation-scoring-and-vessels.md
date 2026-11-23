Lesson missions created or saved with the selected learning outcomes use `lesson-score-v1` in `shared/lessonScoring.js`, persisted as `simulation-v4`. The source is the right-hand learning-outcome column of the saved lesson, not its topic list. Save an existing mission through its lesson's **Edit mission** screen to apply this plan to future attempts; historical saved results are preserved.

| Lesson | Assessed evidence | Practical weighting |
| --- | --- | --- |
| 2 | Branches of navigation and terminology: tagged final-quiz answers. Buoy descriptions and references provide practice. | No driving-based knowledge grade; simulation score is null. |
| 3 | Read reference coordinates, plot the instructor's route in order, and apply its projection. | Each chart criterion 80% / 3; Safety compliance 20%. |
| 4 | Actual crossing response; configure navigation lights for the selected power-driven vessel underway in reduced visibility. | Give-way / stand-on response 80%; Safety compliance 20%. Lights are included inside Safety. Their configuration evidence has no extra weighted row. |
| 5 | Navigation lights for three vessel types: tagged final-quiz answers. The reference covers power-driven, sailing and trawling vessels. | No driving-based knowledge grade; simulation score is null. |

Safety starts at 100. Training deductions: buoy collision 10; port / land / net collision 15; unsafe anchor deployment above 2 kn 10; anchoring at the dock with the engine running 10; propulsion attempted with the anchor down 10 or nets deployed 15; unsafe vessel clearance 20; incorrect crossing response 15; incorrect or missing applied navigation lights 20. Another-vessel collision deducts 100 and triggers a critical failure. These are game rubric points, not legal penalties. Continuous collision frames are coalesced. Results itemize each deduction. Entering port with the engine running is not itself a violation: the engine violation is recorded when deploying the anchor there with the engine running. Submission still requires engine off, anchor down and low speed in port.

The server grades instrument submissions against the saved configuration, validates recorded events and computes the rubric. Boat movement and collision detection remain browser telemetry, not server-authoritative physics. Practical launches have run tokens; the first applied configuration is immutable, retries reuse it, and changed outcomes/configuration invalidate the attempt. Chart reading earns full credit within its stated tolerance, declining to zero at twice that tolerance. The spherical training grid samples chart skills; it does not certify expert chart interpretation. A terminology quiz does not replace an instructor's full discussion assessment.

Buoys contain pictures and descriptions only. Instruments have their own simulation panel; questions stay in the final quiz after saved docking. The quiz never changes a saved practical percentage. Knowledge-only practice is neutral, retained for final-quiz review without duplicate awards, excluded from numeric mission averages, and completed in the course using the selected tagged quiz outcomes. It earns no mission XP from navigation practice alone. The quiz score remains separate.

Chart mathematics follows [PROJ's spherical Mercator formulas](https://proj.org/en/stable/operations/projections/merc.html); light configurations follow [USCG Navigation Rules, Rules 23, 25 and 26](https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/Handbook/Nav%20Rules%20Handbook_Corrected_08-12-2024.pdf). Saved academic wording is preserved. The practical lighting condition is reduced visibility; the original syllabus wording is not used as an operational rule about daylight hours.

Verification: `npm run test:lesson-scoring`; backend `npm test -- --runInBand tests/lessonScoring.test.js tests/progression.test.js`; and `npm run verify:lesson-scoring`. The hidden browser uses real instrument, result and final-quiz components against isolated records. It covers correct chart inputs, deliberately incorrect lights and named net / anchor deductions without changing live course records.

Legacy and other custom simulations retain the shared practice rubric in `shared/simulationPerformance.js`:

| Criterion | Weight | Evidence |
| --- | --- | --- |
| Objective completion | 40% | Completed required mission steps. The vessel exercise does not add an extra objective. |
| Task accuracy | 40% | Mean of recorded navigation precision, task sequence accuracy and docking accuracy when measured. Untouched starting scores earn no accuracy points at reporting. |
| Safety compliance | 20% | Confirmed safety events, capped by the vessel exercise outcome: 100 for a completed correct response, 50 for a clear but incorrect response, and 0 for an unfinished exercise, unsafe clearance or collision. Warnings alone have no penalty. |

These are HelmQuest practical rubric weights, not the academic grading weights on syllabus page 5. Lesson objectives in syllabus pages 2–4 determine the practical tasks. The same function computes the tracker report and server result. Quiz scores and time diagnostics do not change the practical score. New results use `simulation-v3`. Reporting without task-accuracy evidence records zero accuracy instead of preventing results or assuming perfect marks.

The mission editor contains **Navigation rules & vessel safety exercise**. Choose no exercise, an anchored vessel, a red-sidelight crossing, or a green-sidelight crossing. A selected give-way learning outcome defaults to a crossing exercise and requires one before publication.

Minimum hull clearance defaults to 100 m and the warning distance to 600 m. Both are instructor-configurable training margins, not legal distances. The warning distance must be at least three times the clearance. A clear-water position and NPC crossing path are checked before spawning. The NPC uses the existing trawler asset, with a procedural hull available while loading or if that asset fails.

Crossing scenarios assume two ordinary power-driven vessels in sight, outside narrow channels and without engaged fishing or special vessel status. The red-aspect scenario makes the student give way. In the green-aspect scenario the NPC visibly alters to starboard and slows while the student practises standing on. Students still receive instructions to avoid collision if danger develops. Anchored vessels remain stationary and show the anchor-light configuration; sidelights use their directional sectors.

The rules reference is the [USCG International Navigation Rules](https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/navrules.pdf), particularly Rules 5, 7, 8, 15–17, 21 and 30. This provides basic crossing/obstacle practice; full COLREG encounter classification and full SOLAS assessment are not implemented.

Exercise success requires an actual approach and a clear, receding separation; waiting alone does not complete it. An unfinished or unsafe exercise affects only the weighted Safety Compliance criterion and never blocks docking reports, quizzes or results. Actual vessel collisions retain the critical-safety failure rule. The NPC establishes its crossing speed while the simulator's player boat accelerates, then commits to that speed for the encounter; it does not mirror a student's give-way slowdown. Confirmed events are counted once per exercise. Result, exercise summary and rubric breakdown are saved together through the existing mission-result persistence path. Existing first-pass/XP protection remains in place, and previous saved results are not recalculated.

Verification: `node --test tests/vessel-encounters.test.mjs`, the course/mission regression tests, backend `npm test -- --runInBand tests/`, and `npm run verify:vessels`. The browser fixture renders the actual NPC and guidance and runs the App encounter lifecycle with deterministic steering in isolated open water; it does not write to a live database.
