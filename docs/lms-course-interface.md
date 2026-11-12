# HelmQuest course interface

Open **Learning Materials** in the student portal, **Learning Materials** in the instructor console, or **Syllabus Management** in the admin console. Open a syllabus to see General followed by instructor-created modules. Existing syllabus/module PDFs remain available without a migration.

## Authoring

1. Create a syllabus with its PDF and, optionally, an announcement. General includes the syllabus plus any additional resources (for example, a course outline).
2. Add a module with a title, description and learning objectives. Its initial PDF is optional.
3. Use **Add lesson or activity** for PDF resources, PowerPoint lessons, existing simulation missions or existing quizzes. The selectors contain content belonging to that course's instructor, including older module-linked quiz records.
4. Configure instructions, optional opening/closing times, and completion requirements. New activities start as drafts; check **Publish to students** when ready. Courses and modules also support publishing.
5. Reorder modules with their arrows. Reorder resources within the lesson, simulation or quiz phase. Lessons precede simulations, and quizzes finish the module.
6. Use **Preview as student** to inspect published activities without starting missions or creating progress. Administrators can inspect and edit courses through the same interface and permissions.

Deleting a course section requires removing its child content first. Removing a linked activity retains the original mission/quiz and historical results. Replacing or deleting a file uses the existing durable cleanup queue; **Retry cleanup** also handles activity files.

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

The practical button refreshes the mission catalog, resolves the exact linked mission, preserves mission locks/schedules, and calls the existing `startMissionSimulation` path. It uses the existing boats, physics, mission steps, scoring, XP, ranks, badges and report flow. Exiting training returns to the student's Learning Materials tab and remembered course.

Course quizzes use the existing quiz-taking/results overlays. The new authenticated course submission endpoint grades answers server-side and delegates to the existing `saveQuizResult` service, preserving duplicate-submission guards. The course module ID supplies the standalone quiz context, so completing the practical first does not incorrectly suppress the course quiz. Failed saves leave the answers open for retry; account changes invalidate late responses. Previously saved quizzes open their existing results instead of starting another attempt.

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
npm run build
```

The browser verification uses hidden Edge, local servers and an isolated Firestore/storage fixture. It checks student/teacher/admin behavior, rendered PDF pages, course collapse, completion popovers, exact mission links and layouts at 375, 768 and 1365 pixels. Screenshots are written under `../.tmp/learning-materials-verification`. The presentation converter is substituted only in this browser fixture. Backend tests exercise the converter's actual temporary-file/profile/timeout/error lifecycle with an injected executable runner; a genuine LibreOffice PPT/PPTX conversion additionally requires the installed backend dependency.
