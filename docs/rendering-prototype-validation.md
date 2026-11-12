# Maritime rendering experiment

Production stays on Three.js. Open `/experiments/maritime.html?engine=babylon&quality=low` to review Babylon.js, or use `engine=three` for the equivalent-asset comparison. The experiment has no student-result writes and is not linked into student course navigation.

## Scope

Both adapters load the repository's optimized SmallBoat and seaside_wharf GLBs, preserving their materials and scene hierarchies. Actual mesh bounds normalize the vessel to 18 metres and the harbor's longest horizontal dimension to 320 metres. Both selected GLBs contain zero animation groups; this verifies static hierarchy/material loading, not animated-rig compatibility.

The common state reuses the existing time-based propulsion, steering and ocean sampling helpers. Controls include engine/anchor, throttle/steering, chase/bridge cameras, day/night, pause, touch buttons and low/medium/high presets. The harbor uses explicitly coarse bounding-box collisions. A mission reference and waypoint markers can be supplied without changing the common state when switching camera or quality. This does not run the production mission evaluator or assess docking.

Babylon uses a right-handed scene, local meshoptimizer decoding, explicit local PBR shader registration, and shader compilation before declaring readiness. The runner checks actual material readiness and shader errors as well as mesh metadata. A missing shader registration was detected during visual inspection; measurements made before this correction are excluded. Asset loading by itself is insufficient evidence that a model rendered.

## Reproduce

Run `npm run verify:rendering` with Edge installed, or set `HELMQUEST_BROWSER` to a compatible Chromium executable. The script launches a hidden browser and local Vite server. It tests both engines at desktop low/high and a narrow low-quality viewport, exercises controls/anchoring/cameras/night lighting, and exports screenshots and JSON to `../.tmp/rendering-prototype`.

`npm run build` also verifies that both generated HTML entrypoints link their emitted JavaScript and CSS. The multi-page Vite inputs use absolute file paths to preserve entrypoint injection on Windows.

A hidden-browser smoke check against the built `dist` preview also passed: executable experiment HTML, local GLBs/decoder/shaders, ready materials and rendered frames.

These measurements use **SwiftShader software WebGL**, not the machine's physical GPU. The narrow viewport is browser emulation, not a phone. Load time includes renderer initialization, shader readiness and asset loading in the development server. JS heap is the observable browser heap at the sample point, including retained runtime allocations across navigations; it is not isolated renderer memory or GPU memory. FPS includes slow frames; background visibility pauses reset the frame clock. The short samples are diagnostic, not a statistical performance study.

Verified on 12 November 2026 (Asia/Manila). [Raw session measurements](validation/rendering-prototype-2026-11-12.json) retain the individual asset load times, real mesh/material counts, normalized bounds and viewport details.

| Engine | Quality / viewport width | FPS | p95 frame (ms) | Ready (ms) | Observed JS heap (MiB) |
| --- | --- | ---: | ---: | ---: | ---: |
| Three.js | Low / 1280 | 1.35 | 1433 | 1209 | 28.7 |
| Three.js | Low / 375 | 4.16 | 448 | 403 | 41.1 |
| Three.js | High / 1280 | 1.05 | 1999 | 689 | 53.9 |
| Babylon.js | Low / 1280 | 0.94 | 1798 | 3671 | 104.4 |
| Babylon.js | Low / 375 | 2.73 | 400 | 1287 | 140.6 |
| Babylon.js | High / 1280 | 0.70 | 2082 | 1746 | 108.6 |

All six cases passed shader-readiness, forward input, anchor-stop, camera/night and viewport-overflow checks. Visual inspection confirmed the vessel and harbor rendered after the shader correction. Babylon was slower in this software-rendered sample; these data do not establish its behavior on physical GPUs. Earlier measurements with uncompiled materials are excluded.

## Promotion criteria

No renderer promotion is justified by this harness. Full gameplay parity still requires all vessel variants, production terrain/ports and collision geometry, navigation lights, anchor meshes, radar/cockpit, fishing/net interactions, mission objectives and docking validation, production water/post-processing, overlay/fullscreen behavior, resource cancellation/disposal, and device-specific memory/performance checks. Material color/reflections also need visual calibration against the production scene.

The production optional-quiz coordinator contains no renderer objects. Its existing HTML overlay pauses vessel gameplay/controls while retaining the scene. Thus the implemented syllabus → practical → docking → optional quiz → results flow can be retained during a later renderer migration without duplicating scoring, persistence or rewards.
