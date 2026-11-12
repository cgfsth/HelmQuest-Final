# HelmQuest course interface

Open **Syllabus & Lessons** in the student portal or **Syllabus Management** in the instructor/admin console. The new-course dialog defaults to the official **FISH ELECT 6 — NAVIGATION AND SEAMANSHIP WITH SOLAS** structure (First Semester, 2026–2027). Existing custom courses and their uploaded PDFs remain available without a migration. Existing generic courses are not silently rewritten.

## Authoring

1. Create a syllabus with its PDF and, optionally, an announcement. General includes the syllabus plus any additional resources. Select the official template for the supplied syllabus, or choose a custom course for unrelated material. Administrators assign the course to its instructor.
2. Official courses create the six lessons plus Midterm and Final Examination in their prescribed order. General is Class Orientation in Week 1. Use **Lesson details** for the exact week schedule, content, desired outcomes, TLAs, assessments, submission modes and resources transcribed from the PDF. Instructor notes and resources remain separate. Official titles/order cannot be changed or deleted; courses and sections can be unpublished. Custom courses retain editable module creation/order/deletion.
3. Use **Add lesson or activity** for PDF resources, PowerPoint lessons or existing simulation missions. A lesson has no practical until its instructor links one. Configure its optional quiz as **Use the mission assignment**, **No quiz**, or an explicitly assigned quiz from the instructor's catalog. Legacy standalone quiz links remain manageable but are hidden from students and cannot launch independently.
4. Configure instructions, optional opening/closing times, and completion requirements. New activities start as drafts; check **Publish to students** when ready. Courses and modules also support publishing.
5. Reorder resources within each phase: presentations, PDF references, then practical simulations. Quizzes run inside the simulator after docking. Only custom courses expose module reorder arrows.
6. Use **Preview as student** to inspect published activities without starting missions or creating progress. Administrators can inspect and edit courses through the same interface and permissions.

Deleting a custom course section requires removing its child content first. Removing a linked activity retains the original mission/quiz and historical results. Replacing or deleting a file uses the existing durable cleanup queue; **Retry cleanup** also handles activity files.

## Files and PowerPoint deployment

All documents are limited to 15 MB. PDFs use the existing authenticated PDF.js reader. PPT/PPTX uploads are converted on the backend into a PDF preview and then saved to the existing private storage provider. The original file is temporary and is removed after conversion. Students see the lesson title, objectives and slide navigation. Embedded media, transitions and animations are represented by the static PDF export.

Install LibreOffice Impress on the backend. Set `LIBREOFFICE_PATH` to its executable if it is not discoverable:

```env
# Linux
LIBREOFFICE_PATH=/usr/bin/libreoffice
# Windows alternative (no surrounding quotes)
# LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.com
```

The included [backend Dockerfile](../backend/Dockerfile) installs Impress and fonts. Build it using the **repository root** as context. On Render, configure the backend service to use this Dockerfile. Keep Firebase credentials in a Render secret file and set `FIREBASE_SERVICE_ACCOUNT_PATH` to its mounted absolute path. Configure the existing backend-only Supabase/Firebase storage variables and `ALLOWED_ORIGINS` as before. This change does not publish or deploy either service automatically.

Conversion uses an isolated temporary profile, disables macros and document-link updates, hides the process window, and has a 90-second timeout. It uses LibreOffice's documented [command-line conversion](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html) and [PDF export filter](https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html). Each upload uses the existing processing limits (two operations per account, eight in total). If LibreOffice is missing or conversion fails, the upload reports an actionable error and creates no activity/file metadata. Instructors can upload an exported PDF as a presentation lesson.

The frontend never receives storage paths, public preview URLs or storage credentials. PDF bytes are fetched with the current server-issued Bearer session; ownership and publication are rechecked before returning them. PowerPoint files are never sent to a public Office/Google viewer.

## Firestore and storage

Existing collections remain in use:

| Collection | Course feature |
| --- | --- |
| `syllabi` | Course metadata, announcement, publication, original syllabus PDF |
| `syllabus_modules` | Module metadata, objectives, publication, optional original PDF |
| `missions`, `quiz`, `quiz_assignments` | Existing linked simulator/quiz definitions |
| `mission_score`, `quiz_score` | Existing authoritative saved completions |
| `learning_activities` | New resource metadata, order, availability, completion rules and links |
| `learning_activity_progress` | New student-specific view/start records; IDs hash student and activity IDs |

No bulk migration or database mutation script is needed. Existing content defaults to published; new activities default to drafts in the editor. Storage uses `learning_activities/{id}/{uuid}.pdf` alongside existing private PDF prefixes. No extra storage bucket is required.

Merge the additional collection/prefix matches in `firebase/learning-materials.firestore.rules` and `firebase/learning-materials.storage.rules` into your deployed rules. These files are fragments, not complete rule sets. Broader client `allow` matches must exclude **all four** materials collections; Firestore combines matching allows with OR semantics. The API uses Admin SDK access and verifies sessions/roles itself, so the new collections and file prefixes deny direct client access. Supabase buckets must remain private and may keep their PDF-only MIME restriction.

## Completion and integration

File completion records a view after the first PDF page actually renders. A revised activity requires another view. Practical and quiz statuses derive from the current student's existing saved results; `CUSTOM-` mission aliases are recognized. Opening a simulation records only **In Progress**. Completion can require a saved attempt or a passing result/explicit percentage. A failed quiz can therefore remain In Progress when passing is required, even though its saved submission remains locked under the existing one-submission policy.

The practical button refreshes the mission catalog, resolves the exact linked mission, preserves mission locks/schedules, and calls the existing `startMissionSimulation` path. Student mission access is through these course activities; the standalone Missions navigation/list is removed. Instructor mission management and student Training Records, XP, ranks, badges and leaderboard remain available. Back to Lesson returns to the exact originating course and lesson, and refreshes its persisted completion status.

The integrated flow is **objectives → validated docking → save simulation → check assigned quiz → optional quiz → results**. Docking requires all mission steps, the assigned port zone, deployed anchor, stopped engine and safe speed. Merely approaching the dock cannot trigger a quiz. The existing HTML quiz overlay pauses gameplay and controls while preserving the scene. New instructor quizzes start as drafts; instructors explicitly publish them.

Authenticated completion endpoints bind the session student, course, lesson and instructor-owned mission. Quiz answers are graded server-side; answer keys are omitted before submission. The trusted post-simulation save permits a quiz after its mission pass while preserving the existing student/quiz duplicate guard. No assignment skips the quiz without writing a zero score. A lookup error preserves the simulation and offers retry or its saved report. Failed submissions retain answers. Repeated docking events share one in-flight operation; leaving the scene or changing accounts invalidates late callbacks. Relaunching a verified saved completion recovers its pending quiz or saved results.

Simulation and quiz scores remain separate. The integrated simulation uses the existing `PerformanceManager` weights: steering 35%, course 35%, docking 20%, time 10%, with its existing unavailable-metric fallbacks. Safety is a separate diagnostic using documented existing collision penalties. No quiz is folded into that score. Historical results and the legacy combined-score path are not rewritten. The official 60%/40% course grading structure is reference information only; this feature does not calculate academic grades or transmutation.

The production simulator remains Three.js. A separate `/experiments/maritime.html` route compares the same vessel/harbor assets in Three.js and Babylon.js without saving student results. See [rendering validation](rendering-prototype-validation.md) for measurements and remaining migration requirements.

## Validation

```powershell
npm run test:courses
npm run test:materials
node --test tests/*.test.mjs
cd backend
npm run test:courses
# Other isolated backend suites, without running live Firestore integration tests:
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --testPathPatterns=tests/ --silent
cd ..
npm run verify:materials
npm run verify:syllabus
npm run verify:rendering
npm run build
# npm also verifies the generated JS/CSS entrypoint links after building.
```

The browser verification uses hidden Edge, local servers and an isolated Firestore/storage fixture. It checks student/teacher/admin behavior, rendered PDF pages, course collapse, completion popovers, exact mission links and layouts at 375, 768 and 1365 pixels. Screenshots are written under `../.tmp/learning-materials-verification`. The presentation converter is substituted only in this browser fixture. Backend tests exercise the converter's actual temporary-file/profile/timeout/error lifecycle with an injected executable runner; a genuine LibreOffice PPT/PPTX conversion additionally requires the installed backend dependency.

The syllabus/completion implementation was verified with 297 frontend tests and 135 isolated backend tests, plus both course browser runners and the six rendering comparisons. The App integration test uses the actual performance tracker and checks saved raw metrics, failure/retry, zero-valued docking metrics and separate quiz results. No production Firestore credentials are present in this checkout: these checks do not upload the supplied PDF, create live courses or mutate live student records. After deployment, create the official course through Syllabus Management, upload its source PDF and publish the instructor's resources/mission assignments. Existing generic courses remain intact.
