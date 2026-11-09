# Simulation performance changes

The medium vessel's decorative ropes and the static wharf dominated the render
budget. The previously compressed models still contained over 3.3 million
triangles between them.

| Asset | Previous download | New download | Previous triangles | New triangles |
| --- | ---: | ---: | ---: | ---: |
| Medium vessel | 17.40 MB | 9.71 MB | 1,350,169 | 522,565 |
| Wharf | 15.63 MB | 8.07 MB | 1,987,412 | 779,150 |

Only decorative rope meshes and the wharf are simplified, with a 0.01% geometric
error limit and locked mesh borders. Source models remain available. Named parts,
functional boat geometry, and world-space hull bounds are checked against the
source GLBs. The loader uses the new hashed model URLs; include both new GLBs and
the updated manifest when publishing.

All current model, image and PDF assets are stored as ordinary Git binaries.
Render checks out the whole repository, including older source assets; leaving
those assets in LFS prevented checkout when the account's LFS budget was exhausted.
The deployment fix converts the 78 remaining LFS pointers to their exact local
files without rewriting history. All asset SHA-256 hashes were checked before
conversion, and every file is below GitHub's 100 MiB individual-file limit.
The initial clone is larger, but no LFS quota is needed to check out this branch.
Historical commits retain their original LFS dependencies.

After this fix reaches the branch connected to Render, use **Manual Deploy >
Clear build cache & deploy**. If deploying this branch directly, select
`fix/simulation-performance` in the service's branch setting. Frontend builds use
`npm ci && npm run build` with publish directory `dist`; the API service keeps
its existing backend root/build/start settings. Setting a build-time LFS skip
variable alone does not restore missing images or models.

Rendering now applies the selected graphics/shadow settings at startup. Medium
graphics disable bloom, retain SMAA, and cap pixel ratio at 1.25. Low shadows use
a 512px map. Water reflections use a 1024px target rather than 2048px, updating
at up to 30 Hz on Medium and 15 Hz on Low; water animation and vessel physics
continue every simulation frame. High water quality refreshes every frame.

Opaque screens and hidden tabs skip scene rendering. Animated landing backdrops
are capped at 30 FPS. Terrain bounds rebuild only after streamed tiles change.
Radar and helm share a chart snapshot, and the mission timer display refreshes
at its existing 120ms HUD cadence. Physics, grading, collision rules, mission
completion requirements, and persistence are not changed.

## Terrain deployment fix

The legacy terrain fallback previously shipped its `.gltf` without the referenced
`scene.bin` in production. Its referenced image files are also absent from the
source repository. The fallback now explicitly imports the binary through Vite
and parses the preserved scene geometry with solid materials. Both files are
loaded only if the primary Davao heightmap fails. The normal terrain is unchanged.

Startup terrain rejection is observed immediately. If both terrain sources fail,
Quick Sail and training stay out of the simulation, show the terrain error, and
Retry reloads the page to retry asset downloads.

## Verification

- All 232 frontend Node regression tests passed, including missions, scores,
  quizzes, boat movement, radar, model integrity, and the new performance checks.
- Production build passed. Vite still reports its existing large bundle warning.
- Local Edge browser checks covered driving all three boats, chase/orbit/helm
  cameras, anchor deploy/retract, rain, graphics/shadow settings, and high-DPI
  postprocessing resolution. No browser exceptions or fatal simulation errors
  occurred in these checks.
- Visual screenshots confirmed the vessel, wharf and bridge remain visible.
- Production-preview Edge checks covered the normal heightmap, deliberately
  blocked heightmap with a successful fallback buffer download, and both terrain
  downloads failing followed by a successful Retry. No unhandled exceptions
  occurred; Quick Sail launched with both terrain sources and the production
  footer showed DNSC.

A short local headless Edge sample at 1280x720 and device pixel ratio 1 observed
medium-vessel frame rates rise from about 14.5 to 24.6 FPS. These are local
development measurements, not guaranteed client-device frame rates. The download
and triangle counts above are reproducible asset measurements. Client hardware,
network download speed, production hosting and live backend behavior still need
acceptance testing on the actual client setup.

To regenerate just the changed assets:

```powershell
npm run optimize:models -- 'trawler (1).glb' seaside_wharf.glb
```

To verify:

```powershell
node --test --test-concurrency=1 tests/*.test.mjs
npm run build
```
