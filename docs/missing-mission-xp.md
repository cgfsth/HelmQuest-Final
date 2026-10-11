# Missing XP repair

The award handler looked up a literal simulation mission ID (`CUSTOM-custom-mission-*`), while the Firestore mission document is `custom-mission-*`. The missing document produced a zero award, but the old handler still marked `xpAwarded: true`. Immutable passed-result protection then prevented a later retry from fixing the missing credit. The earlier overview fix normalized IDs only for its summary and missed the XP award path.

`backend/services/missionRewards.js` now centralizes canonical mission IDs, aliases, configured reward parsing, and valid completion markers. Score persistence and the total-XP endpoint use the same lookup. Mission saves commit XP/result together, recognize equivalent IDs without creating another document, and set `xpAwarded` only for a positive actual award. `xpProcessed` distinguishes an intentionally resolved zero reward from a missing lookup. Failed missions receive no XP. A true/zero marker on a failed legacy result does not block a valid retry.

`backend/services/reconcileMissionXp.js` repairs verified passed missions with missing credits. It groups equivalent mission IDs, skips positive recorded awards and intentionally processed zero rewards, and updates existing award metadata and the student's additive XP/rank/badge fields in one transaction. It preserves scores, pass status, completion dates, duplicate historical records, quizzes, and unrelated student fields. Missing mission/reward configuration is reported without awarding guessed XP. Use `backend/scripts/reconcile-mission-xp.mjs --student <document-id>` for a dry run; `--apply` applies the verified credits.

Live repair on 2026-10-06 updated the reported student's XP from **0 to 110**, using actual Firestore rewards:

| Mission | Configured XP | Credit |
| --- | ---: | ---: |
| Mission 1: New Mission | 0 | 0 |
| Test Mission 2 | 10 | 10 |
| Test Mission 3 | 100 | 100 |

The Mission 1 card previously displayed +100 because `0 || 100` substituted the default. `src/App.vue` now preserves zero rewards in mission cards, mission context, and the completion component. `src/helpers/studentMotivation.js` preserves an explicit zero in local reward compatibility logic. Reward configuration and scoring calculations were not changed.

Repeated live repair added **0 XP**. The live student endpoint and total-XP endpoint both returned **110 XP**, and repeated student refresh retained it. All three saved passes remained intact; their award amounts now match the table. Deck Cadet remains correct at 110 XP; the next rank requires 500 XP.

Verification: **38 backend tests and 32 frontend/progression tests passed**. These cover custom mission IDs, equivalent-ID retries, zero/missing rewards, atomic rollback, duplicate historical passes, repeated repair, valid existing credits, failed retries, and existing overview/progression behavior. Production build passed with the existing bundle-size warning. Backend restarted and live API results verified. A complete new interactive simulation was not run for this fix.
