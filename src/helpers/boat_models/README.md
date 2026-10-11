# Boat model files (OBJ / STL / GLTF)

Place your fishing boat model here, then set the path in `App.vue`:

```js
const BOAT_MODEL_FILE = 'helpers/boat_models/your_boat.obj';
// or .stl, .gltf, .glb
```

Leave `BOAT_MODEL_FILE` as `null` to use the built-in procedural trawler.

## Supported formats

| Format | Notes |
|--------|--------|
| **`.obj`** | Works best with a matching **`.mtl`** file (same name). Without MTL, a default hull material is applied. |
| **`.stl`** | Single mesh only (no textures). Good for 3D-print meshes; app applies a blue hull material. |
| **`.gltf` / `.glb`** | Best for web: materials and textures included. |

## Tips

- Export with **Y-up** if possible (Three.js default).
- Scale is adjusted automatically to ~36 scene units long.
- Bow should point along **+X** after import; the game rotates the model if needed during spawn.

## Example filenames

- `fishing_trawler.obj` + `fishing_trawler.mtl`
- `fishing_trawler.stl`
- `fishing_trawler.glb`
