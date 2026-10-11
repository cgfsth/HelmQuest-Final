import * as THREE from 'three';
import { loadHeightmapTexture } from './loadSRTM.js';

export const ELEVATION_MIN = -37;
export const ELEVATION_MAX = 2941;

export const WORLD_WIDTH = 46000;
export const WORLD_HEIGHT = 60000;
export const TILE_SIZE = 4000;
export const TILES_X = Math.ceil(WORLD_WIDTH / TILE_SIZE);
export const TILES_Z = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

/** @typedef {{ data: Uint8ClampedArray, width: number, height: number, texture: THREE.Texture }} HeightmapCache */

/** @type {HeightmapCache | null} */
let heightmapCache = null;

/**
 * Load heightmap texture once and cache raw pixel data for CPU sampling.
 * @returns {Promise<HeightmapCache>}
 */
export async function getHeightmapCache() {
  if (heightmapCache) return heightmapCache;

  const texture = await loadHeightmapTexture();
  const img = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  heightmapCache = {
    data: imageData.data,
    width: canvas.width,
    height: canvas.height,
    texture,
  };
  return heightmapCache;
}

export function worldToHeightmapUV(worldX, worldZ) {
  const u = (worldX + WORLD_WIDTH * 0.5) / WORLD_WIDTH;
  const v = (worldZ + WORLD_HEIGHT * 0.5) / WORLD_HEIGHT;
  return { u, v };
}

export function sampleHeightmapElevation(
  cache,
  worldX,
  worldZ,
  minElevation = ELEVATION_MIN,
  maxElevation = ELEVATION_MAX
) {
  const { u, v } = worldToHeightmapUV(worldX, worldZ);
  if (u < 0 || u > 1 || v < 0 || v > 1) return minElevation;

  const px = Math.floor(u * (cache.width - 1));
  const py = Math.floor((1 - v) * (cache.height - 1));
  const pixelIndex = (py * cache.width + px) * 4;
  const heightValue = cache.data[pixelIndex] / 255;
  let worldY = minElevation + heightValue * (maxElevation - minElevation);
  if (worldY < 1) worldY = -25;
  return worldY;
}

export function worldToTileIndex(worldX, worldZ) {
  const tileX = Math.floor((worldX + WORLD_WIDTH * 0.5) / TILE_SIZE);
  const tileZ = Math.floor((worldZ + WORLD_HEIGHT * 0.5) / TILE_SIZE);
  return {
    tileX: THREE.MathUtils.clamp(tileX, 0, TILES_X - 1),
    tileZ: THREE.MathUtils.clamp(tileZ, 0, TILES_Z - 1),
  };
}

export function tileCenterWorld(tileX, tileZ) {
  const minX = tileX * TILE_SIZE - WORLD_WIDTH * 0.5;
  const minZ = tileZ * TILE_SIZE - WORLD_HEIGHT * 0.5;
  return {
    x: minX + TILE_SIZE * 0.5,
    z: minZ + TILE_SIZE * 0.5,
    minX,
    minZ,
    maxX: minX + TILE_SIZE,
    maxZ: minZ + TILE_SIZE,
  };
}

export function getCachedHeightmapSync() {
  return heightmapCache;
}
