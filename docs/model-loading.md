# Model loading

The runtime uses compressed GLBs from `public/assets/optimized/`. The original
models remain at their existing paths for extraction tools and reference tests.
`src/helpers/optimizedModelManifest.js` maps those paths to content-hashed files.
Commit the manifest and its generated assets together, then rebuild and deploy
the frontend to apply the changes to the hosted site.

| Model | Original MB | Download MB |
| --- | ---: | ---: |
| Medium boat | 100.17 | 17.40 |
| Small boat | 11.78 | 1.64 |
| Large boat | 3.08 | 1.29 |
| Wharf | 69.96 | 15.63 |
| Large bridge interior | 11.82 | 1.52 |
| Steering wheel | 2.20 | 0.40 |
| Dock planks | 4.56 | 0.69 |

Sizes are decimal MB and are recorded in `public/assets/optimized/report.json`.
They measure download size, not elapsed loading time or frame rate. Texture
resolution is capped at 2048 pixels with WebP quality 85. Meshopt compresses
geometry with 16-bit positions; triangle topology and named parts are preserved.
No models are simplified or merged. Small texture/position differences are
expected from compression.

Boat and harbor preparation run concurrently. The active hull and the harbor
are reused when entering the same world. In-flight boat requests are shared,
and obsolete results are disposed when the user selects another hull.
The shared loader retains at most 32 MiB of compressed model bytes, with least
recently used eviction; live scenes, materials and textures belong to each caller.

After replacing an original GLB, regenerate the compressed assets:

```sh
npm install
npm run optimize:models
npm run build
node --test tests/model-loading.test.mjs tests/boat-loading-flow.test.mjs tests/simulation-spawn.test.mjs tests/simulation-waves.test.mjs tests/system-audit.test.mjs tests/big-boat-bridge.test.mjs tests/big-boat-lights.test.mjs tests/helm-camera.test.mjs
```

Optimization runs separately from the normal build; generated assets are ready
to deploy. Keep old hashed assets during deployments if older open tabs still
need them. For hosting, `/assets/optimized/*` can use
`Cache-Control: public, max-age=31536000, immutable` because changing a model
changes its URL. Keep the HTML entry point revalidated so it picks up new builds.
