import * as THREE from 'three';
import { createTerrainTextureSet, createTerrainDetailNormal } from './proceduralTextures.js';
import { createTerrainMaterial, updateTerrainSun } from './terrainMaterial.js';
import {
  ELEVATION_MIN,
  ELEVATION_MAX,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_SIZE,
  TILES_X,
  TILES_Z,
  getHeightmapCache,
  sampleHeightmapElevation,
  worldToTileIndex,
  tileCenterWorld,
} from './terrainHeightmap.js';

export const TERRAIN_CONFIG = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  minElevation: ELEVATION_MIN,
  maxElevation: ELEVATION_MAX,
  waterY: 0,
  tileSize: TILE_SIZE,
  hiSegments: 96,
  loSegments: 24,
  backdropSegments: 96,
  hiRadiusTiles: 1,
  loRadiusTiles: 0,
  tilesPerFrame: 2,
};

/**
 * Build one terrain tile mesh from cached heightmap samples.
 * @param {Object} params
 * @returns {THREE.Mesh | null}
 */
export function createTerrainTile({
  tileX,
  tileZ,
  segments,
  cache,
  material,
  lod = 'hi',
}) {
  if (tileX < 0 || tileZ < 0 || tileX >= TILES_X || tileZ >= TILES_Z) return null;

  const { x: centerX, z: centerZ } = tileCenterWorld(tileX, tileZ);
  const half = TILE_SIZE * 0.5;
  const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE, segments, segments);
  const positions = geometry.attributes.position;
  const elevations = new Float32Array(positions.count);

  for (let i = 0; i < positions.count; i++) {
    const lx = positions.getX(i);
    const ly = positions.getY(i);
    const worldX = centerX + lx;
    const worldZ = centerZ - ly;
    const worldY = sampleHeightmapElevation(cache, worldX, worldZ);
    elevations[i] = worldY;
    positions.setZ(i, worldY);
  }

  positions.needsUpdate = true;
  geometry.setAttribute('elevation', new THREE.BufferAttribute(elevations, 1));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `TerrainTile_${lod}_${tileX}_${tileZ}`;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(centerX, lod === 'hi' ? 0.05 : 0, centerZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.renderOrder = lod === 'hi' ? 2 : lod === 'lo' ? 1 : 0;
  mesh.userData.tileX = tileX;
  mesh.userData.tileZ = tileZ;
  mesh.userData.lod = lod;
  mesh.userData.boundingBox = new THREE.Box3(
    new THREE.Vector3(centerX - half, ELEVATION_MIN, centerZ - half),
    new THREE.Vector3(centerX + half, ELEVATION_MAX, centerZ + half)
  );
  return mesh;
}

/**
 * Low-detail full-world backdrop (Mount Apo, Samal, entire gulf silhouette).
 */
export function createTerrainBackdrop(cache, material, segments = TERRAIN_CONFIG.backdropSegments) {
  const halfW = WORLD_WIDTH * 0.5;
  const halfH = WORLD_HEIGHT * 0.5;
  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_HEIGHT, segments, segments);
  const positions = geometry.attributes.position;
  const elevations = new Float32Array(positions.count);

  for (let i = 0; i < positions.count; i++) {
    const lx = positions.getX(i);
    const ly = positions.getY(i);
    const worldX = lx;
    const worldZ = -ly;
    const worldY = sampleHeightmapElevation(cache, worldX, worldZ);
    elevations[i] = worldY;
    positions.setZ(i, worldY);
  }

  positions.needsUpdate = true;
  geometry.setAttribute('elevation', new THREE.BufferAttribute(elevations, 1));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'TerrainBackdrop';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.renderOrder = 0;
  mesh.userData.lod = 'backdrop';
  mesh.userData.boundingBox = new THREE.Box3(
    new THREE.Vector3(-halfW, ELEVATION_MIN, -halfH),
    new THREE.Vector3(halfW, ELEVATION_MAX, halfH)
  );
  return mesh;
}

/**
 * Streaming tile manager: 3×3 hi-res around player, 7×7 lo-res ring, full backdrop.
 */
export class TerrainTileManager {
  constructor() {
    /** @type {THREE.Group | null} */
    this.root = null;
    /** @type {THREE.Material | null} */
    this.sharedMaterial = null;
    /** @type {import('./terrainHeightmap.js').HeightmapCache | null} */
    this.cache = null;
    /** @type {Map<string, THREE.Mesh>} */
    this.tiles = new Map();
    /** @type {THREE.Mesh | null} */
    this.backdrop = null;
    this.lastTileX = null;
    this.lastTileZ = null;
    /** @type {Map<string, { tx: number, tz: number, lod: string }>} */
    this.pendingTiles = new Map();
  }

  async init() {
    this.cache = await getHeightmapCache();
    const textureSet = createTerrainTextureSet();
    const detailNormal = createTerrainDetailNormal(this.cache.texture.image);
    this.sharedMaterial = createTerrainMaterial(textureSet, {
      detailNormal,
      waterLevel: TERRAIN_CONFIG.waterY,
    });

    this.root = new THREE.Group();
    this.root.name = 'RegionXI_Terrain';
    this.root.userData.isProceduralTerrain = true;
    this.root.userData.isTiledTerrain = true;
    this.root.userData.terrainMaterial = this.sharedMaterial;
    this.root.userData.heightmapTexture = this.cache.texture;
    this.root.userData.terrainSize = { width: WORLD_WIDTH, height: WORLD_HEIGHT };
    this.root.userData.minElevation = ELEVATION_MIN;
    this.root.userData.maxElevation = ELEVATION_MAX;
    this.root.userData.tileManager = this;

    this.backdrop = createTerrainBackdrop(
      this.cache,
      this.sharedMaterial,
      TERRAIN_CONFIG.backdropSegments
    );
    this.root.add(this.backdrop);

    console.info(
      '[terrain] Tiled Davao Gulf ready:',
      `${TILES_X}×${TILES_Z} tiles @ ${TILE_SIZE}m`,
      `(hi ${TERRAIN_CONFIG.hiSegments} seg, lo ${TERRAIN_CONFIG.loSegments} seg)`
    );

    return this.root;
  }

  /** Rebuild the 3×3 tile window around the player (async, a few tiles per frame). */
  forceUpdate(worldX, worldZ) {
    this.lastTileX = null;
    this.lastTileZ = null;
    this.update(worldX, worldZ);
  }

  /** @param {number} worldX @param {number} worldZ */
  update(worldX, worldZ) {
    if (!this.root || !this.cache || !this.sharedMaterial) return;

    const { tileX, tileZ } = worldToTileIndex(worldX, worldZ);
    if (tileX !== this.lastTileX || tileZ !== this.lastTileZ) {
      this.lastTileX = tileX;
      this.lastTileZ = tileZ;

      const needed = new Map();
      for (let dz = -TERRAIN_CONFIG.hiRadiusTiles; dz <= TERRAIN_CONFIG.hiRadiusTiles; dz++) {
        for (let dx = -TERRAIN_CONFIG.hiRadiusTiles; dx <= TERRAIN_CONFIG.hiRadiusTiles; dx++) {
          const tx = tileX + dx;
          const tz = tileZ + dz;
          if (tx < 0 || tz < 0 || tx >= TILES_X || tz >= TILES_Z) continue;
          needed.set(`${tx},${tz}`, { tx, tz, lod: 'hi' });
        }
      }

      if (TERRAIN_CONFIG.loRadiusTiles > 0) {
        for (let dz = -TERRAIN_CONFIG.loRadiusTiles; dz <= TERRAIN_CONFIG.loRadiusTiles; dz++) {
          for (let dx = -TERRAIN_CONFIG.loRadiusTiles; dx <= TERRAIN_CONFIG.loRadiusTiles; dx++) {
            const tx = tileX + dx;
            const tz = tileZ + dz;
            if (tx < 0 || tz < 0 || tx >= TILES_X || tz >= TILES_Z) continue;
            const key = `${tx},${tz}`;
            if (!needed.has(key)) needed.set(key, { tx, tz, lod: 'lo' });
          }
        }
      }

      for (const [key, tile] of this.tiles) {
        if (!needed.has(key) || needed.get(key).lod !== tile.userData.lod) {
          this.root.remove(tile);
          tile.geometry.dispose();
          this.tiles.delete(key);
        }
      }

      this.pendingTiles.clear();
      for (const [key, spec] of needed) {
        const existing = this.tiles.get(key);
        if (existing && existing.userData.lod === spec.lod) continue;
        if (existing) {
          this.root.remove(existing);
          existing.geometry.dispose();
          this.tiles.delete(key);
        }
        this.pendingTiles.set(key, spec);
      }
    }

    let built = 0;
    for (const [key, { tx, tz, lod }] of this.pendingTiles) {
      if (built >= TERRAIN_CONFIG.tilesPerFrame) break;
      if (this.tiles.has(key)) {
        this.pendingTiles.delete(key);
        continue;
      }

      const segments = lod === 'hi' ? TERRAIN_CONFIG.hiSegments : TERRAIN_CONFIG.loSegments;
      const mesh = createTerrainTile({
        tileX: tx,
        tileZ: tz,
        segments,
        cache: this.cache,
        material: this.sharedMaterial,
        lod,
      });
      if (mesh) {
        this.tiles.set(key, mesh);
        this.root.add(mesh);
      }
      this.pendingTiles.delete(key);
      built += 1;
    }

    if (this.pendingTiles.size === 0 && this.tiles.size > 0) {
      rebuildIslandBoxes(this.root);
    }
  }

  dispose() {
    for (const mesh of this.tiles.values()) {
      mesh.geometry.dispose();
    }
    this.tiles.clear();
    this.backdrop?.geometry?.dispose();
    this.sharedMaterial?.dispose?.();
    this.root = null;
    this.backdrop = null;
    this.cache = null;
    this.sharedMaterial = null;
  }
}

/**
 * MAIN TERRAIN GENERATOR (Region XI / Davao Gulf — tiled)
 */
export async function generateDavaoGulfTerrain() {
  const manager = new TerrainTileManager();
  const group = await manager.init();
  return group;
}

export { updateTerrainSun };

export function rebuildIslandBoxes(group) {
  if (!group) return;
  const box = new THREE.Box3();
  group.traverse((obj) => {
    if (!obj.isMesh || obj.userData.lod === 'backdrop') return;
    obj.userData.boundingBox = new THREE.Box3().setFromObject(obj);
  });
  group.userData.boundingBox = box.setFromObject(group);
}

export function resolveTerrainCollision(x, z, group, cache = null) {
  if (!group) return false;
  const point = new THREE.Vector3(x, 0, z);
  for (const obj of group.children) {
    if (!obj.isMesh || obj.userData.lod === 'backdrop') continue;
    if (!obj.userData.boundingBox?.containsPoint(point)) continue;
    if (cache) {
      const elev = sampleHeightmapElevation(cache, x, z);
      if (elev > TERRAIN_CONFIG.waterY + 0.35) return true;
      continue;
    }
    return true;
  }
  return false;
}

export function collectTerrainFootprints(group) {
  if (!group) return [];

  const backdrop = group.children?.find((c) => c.name === 'TerrainBackdrop');
  if (backdrop?.userData?.boundingBox) {
    const b = backdrop.userData.boundingBox;
    return [
      {
        name: 'DavaoGulf',
        label: 'Region XI',
        minX: b.min.x,
        maxX: b.max.x,
        minZ: b.min.z,
        maxZ: b.max.z,
      },
    ];
  }

  const out = [];
  group.traverse((obj) => {
    if (!obj.isMesh || obj.userData.lod === 'backdrop') return;
    if (!obj.userData.boundingBox) return;
    const b = obj.userData.boundingBox;
    if (b.max.y < TERRAIN_CONFIG.waterY + 1) return;
    out.push({
      name: obj.name,
      label: obj.userData.lod === 'hi' ? 'Land' : 'Coast',
      minX: b.min.x,
      maxX: b.max.x,
      minZ: b.min.z,
      maxZ: b.max.z,
    });
  });
  return out;
}

/** @deprecated Use createTerrainTile via TerrainTileManager */
export function createHeightmapTerrain() {
  console.warn('[terrain] createHeightmapTerrain is deprecated — use tiled terrain');
  return null;
}
