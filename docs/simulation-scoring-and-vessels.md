The practical simulation uses one shared rubric in `shared/simulationPerformance.js`:

| Criterion | Weight | Evidence |
| --- | --- | --- |
| Objective completion | 40% | Completed required mission steps; an assigned vessel exercise meeting the required response and clearance counts as one additional objective. |
| Task accuracy | 40% | Mean of recorded navigation precision, task sequence accuracy, docking accuracy when measured, and the assigned encounter response. Untouched starting scores are excluded. |
| Safety compliance | 20% | Confirmed collision, clearance and encounter-response events. Warnings alone have no penalty. |

These are HelmQuest practical rubric weights, not the academic grading weights on syllabus page 5. Lesson objectives in syllabus pages 2–4 determine the practical tasks. The same function computes the tracker report and server result. Quiz scores and time diagnostics do not change the practical score. Missing evidence is marked unassessed; the server does not accept an incomplete assessment as a saved practical completion.

The mission editor contains **Navigation rules & vessel safety exercise**. Choose no exercise, an anchored vessel, a red-sidelight crossing, or a green-sidelight crossing. Existing missions retain their configured tasks until edited. New official lesson 4/5/6 missions suggest a relevant exercise that the instructor can change.

Minimum hull clearance defaults to 100 m and the warning distance to 600 m. Both are instructor-configurable training margins, not legal distances. The warning distance must be at least three times the clearance. A clear-water position and NPC crossing path are checked before spawning. The NPC uses the existing trawler asset, with a procedural hull available while loading or if that asset fails.

Crossing scenarios assume two ordinary power-driven vessels in sight, outside narrow channels and without engaged fishing or special vessel status. The red-aspect scenario makes the student give way. In the green-aspect scenario the NPC visibly alters to starboard and slows while the student practises standing on. Students still receive instructions to avoid collision if danger develops. Anchored vessels remain stationary and show the anchor-light configuration; sidelights use their directional sectors.

The rules reference is the [USCG International Navigation Rules](https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/navrules.pdf), particularly Rules 5, 7, 8, 15–17, 21 and 30. This provides basic crossing/obstacle practice; full COLREG encounter classification and full SOLAS assessment are not implemented.

Exercise completion requires an actual approach and a clear, receding separation; waiting alone does not complete it. A vessel collision, failure to meet required clearance, or an incorrect required give-way/stand-on response prevents a pass. The NPC establishes its crossing speed while the simulator's player boat accelerates, then commits to that speed for the encounter; it does not mirror a student's give-way slowdown. Confirmed events are counted once per exercise. Result, exercise summary and rubric breakdown are saved together through the existing mission-result persistence path. Existing first-pass/XP protection remains in place, and previous saved results are not recalculated.

Verification: `node --test tests/vessel-encounters.test.mjs`, the course/mission regression tests, backend `npm test -- --runInBand tests/`, and `npm run verify:vessels`. The browser fixture renders the actual NPC and guidance and runs the App encounter lifecycle with deterministic steering in isolated open water; it does not write to a live database.
