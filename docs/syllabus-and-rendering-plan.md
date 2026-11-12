# Syllabus alignment and rendering migration plan

The supplied six-page FISH ELECT 6 syllabus is the academic source. Pages 2–4 define the CLOs and course matrix; page 5 defines the 60% / 40% grading structure. The source filename, revision and SHA-256 accompany the read-only transcription in `shared/officialSyllabus.js`. This is separate from instructor-authored resources. No final-grade calculation or transmutation is introduced.

Reuse `LearningMaterials`, `CourseOutline`, the private PDF/PowerPoint preview path, the instructor mission/quiz editors, existing completion/progression services and the existing simulator. Official courses use the current `syllabi` and `syllabus_modules` collections with a syllabus key and section IDs. There is no replacement mission/progress collection. Existing records and uploaded files remain intact. Official titles, order, week schedule and matrix are immutable reference data; instructor descriptions and activities remain editable.

Student navigation moves mission access into course lessons. Quiz rows are hidden from students: mission-assigned quizzes are optional stages after actual objective and docking validation. Simulation results must be saved before quiz lookup, so a failed lookup cannot lose training results. Existing duplicate-result/XP guards remain in use. Simulation metrics and quiz results are separate; no new combined scoring formula is introduced. Academic weighting is displayed as syllabus information only.

The checked-in implementation uses `missions`, `quiz`, `quiz_assignments`, `mission_attempts`, `mission_score`, `quiz_score` and `student_module_progress`; these take precedence over illustrative collection names in the request. Live records cannot be inspected without backend credentials, which are not present in this checkout. Tests use isolated fixtures and never create/delete production student records.

## Mission compatibility

| Official section | Existing capability to review | Explicit gaps |
| --- | --- | --- |
| Lesson 1 | Instructor-selected relevant mission only | No automatic assignment for theoretical history |
| Lesson 2 | Heading, compass and basic steering | Does not replace terminology instruction |
| Lesson 3 | Existing waypoint routes, coordinates, distance/bearing and training chart | Full projection/chart-interpretation assessment is not implemented |
| Lesson 4 | Collision checks, safe speed/maneuvering, vessel lights | Complete moving-vessel COLREG encounter evaluation is not implemented |
| Lesson 5 | Handling, anchoring, docking, navigation lights | Knot tying and flag exercises are not implemented |
| Lesson 6 | Existing safety/weather/emergency objectives where relevant | Full SOLAS conventions, lifeboat and rescue exercises are not implemented |

Mission IDs and definitions come from the instructor's Firestore catalog. Suggestions require instructor review; no mission is generated or automatically assigned. A lesson without a practical shows a management hint and no student simulation row.

## Babylon.js prototype and compatibility risks

Three.js dependencies include App.vue's renderer/scene/cameras/raycasting, GLTF loading, model scale/bounds, ocean shaders, buoy/boat motion, terrain, collision bounds, anchor meshes, boat lights, radar/cockpit, fishing nets, post-processing and resource disposal. Swapping renderer objects would break these engine-specific helpers. Keep production rendering in Three.js while evaluating a separate experiment with the existing GLB vessel and harbor assets.

The experiment must use right-handed world coordinates, normalize model bounds from actual meshes, preserve the source asset hierarchy/materials, measure asset loading and frame times, exercise chase/bridge cameras and existing movement conventions, and dispose resources/listeners on exit. Reuse movement helpers where their engine dependencies permit; do not duplicate scoring or write prototype outcomes as student results.

Risks requiring parity checks before promotion: GLTF handedness and vessel forward axes; water/buoy/terrain height agreement; helm/anchor/light node names; collision world bounds; asynchronous asset cancellation; mobile input/fullscreen; material/color-space differences; overlay pause behavior; memory/GPU limits. The optional quiz overlay is HTML and remains independent of the canvas renderer.

Low/medium/high quality presets and a comparison runner should report measured FPS/frame times, observable JS heap, asset load times and scene counts. Browser-emulated mobile viewports are layout checks, not real mobile GPU measurements. Promotion requires working feature parity and repeatable benefits on target hardware. Do not migrate the production simulator merely because a prototype renders successfully.
