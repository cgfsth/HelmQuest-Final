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

The two new optimized GLBs are stored as ordinary Git binaries through explicit
`.gitattributes` exceptions. Each is under 10 MB, so this update requires no new
LFS uploads. Existing LFS assets keep their tracking rules and still depend on
the repository's LFS availability when fetched for a fresh clone or deployment.
If regenerated filenames change, update the exceptions to match the new files.

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

## Verification

- All 228 frontend Node regression tests passed, including missions, scores,
  quizzes, boat movement, radar, model integrity, and the new performance checks.
- Production build passed. Vite still reports its existing large bundle warning.
- Local Edge browser checks covered driving all three boats, chase/orbit/helm
  cameras, anchor deploy/retract, rain, graphics/shadow settings, and high-DPI
  postprocessing resolution. No browser exceptions or fatal simulation errors
  occurred in these checks.
- Visual screenshots confirmed the vessel, wharf and bridge remain visible.

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
