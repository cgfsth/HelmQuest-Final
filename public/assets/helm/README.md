# Helm steering wheel

The center helm panel loads **`/assets/ship_wheel.glb`** (project root `public/assets/ship_wheel.glb`).

The wheel animates with **A/D** and tracks the boat’s turn rate in helm view.

If the GLB fails to load, a built-in procedural wheel is used instead.

The large boat loads `large_boat_bridge.glb`, a standalone textured cabin and
controls extracted from the project's medium trawler. Rebuild it with
`node scripts/extract-large-boat-bridge.mjs`. Its wheel animates with steering;
the separately mounted radar keeps the shared live navigation canvas.
