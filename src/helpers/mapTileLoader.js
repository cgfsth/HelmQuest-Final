import * as THREE from 'three';

/**
 * Load OpenStreetMap map tiles for Three.js terrain.
 * Converts lat/lon bounds to map tile coordinates and creates textures.
 */

const TILE_SIZE = 256; // Standard OSM tile size
const MAX_ZOOM = 15; // Maximum zoom level for detail

/**
 * Convert lat/lon to tile coordinates at a given zoom level.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} zoom - Zoom level
 * @returns {{x: number, y: number}} Tile coordinates
 */
export function latLonToTile(lat, lon, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return { x, y };
}

/**
 * Convert tile coordinates to lat/lon bounds.
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} zoom - Zoom level
 * @returns {{minLat: number, maxLat: number, minLon: number, maxLon: number}} Bounds
 */
export function tileToBounds(x, y, zoom) {
  const n = Math.pow(2, zoom);
  const minLon = x / n * 360 - 180;
  const maxLon = (x + 1) / n * 360 - 180;
  
  const minLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const maxLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  
  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Load a single map tile as a texture.
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} zoom - Zoom level
 * @param {string} tileServer - Tile server URL (default: OpenStreetMap)
 * @returns {Promise<THREE.Texture>} - Texture promise
 */
export function loadMapTile(x, y, zoom, tileServer = 'https://tile.openstreetmap.org') {
  return new Promise((resolve, reject) => {
    const url = `${tileServer}/${zoom}/${x}/${y}.png`;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        console.log(`[mapTileLoader] Successfully loaded tile ${x},${y} at zoom ${zoom}`);
        resolve(texture);
      },
      (progress) => {
        // Progress callback - optional
      },
      (error) => {
        console.error(`[mapTileLoader] Failed to load tile ${x},${y} at zoom ${zoom}:`, error);
        reject(error);
      }
    );
  });
}

/**
 * Load multiple map tiles for a region and create a combined texture.
 * @param {number} minLat - Minimum latitude
 * @param {number} maxLat - Maximum latitude
 * @param {number} minLon - Minimum longitude
 * @param {number} maxLon - Maximum longitude
 * @param {number} zoom - Zoom level
 * @param {string} tileServer - Tile server URL
 * @returns {Promise<THREE.Texture>} - Combined texture promise
 */
export async function loadMapTilesForRegion(minLat, maxLat, minLon, maxLon, zoom = MAX_ZOOM, tileServer = 'https://a.tile.openstreetmap.org') {
  const minTile = latLonToTile(minLat, minLon, zoom);
  const maxTile = latLonToTile(maxLat, maxLon, zoom);
  
  const tiles = [];
  
  for (let x = minTile.x; x <= maxTile.x; x++) {
    for (let y = minTile.y; y <= maxTile.y; y++) {
      tiles.push({ x, y });
    }
  }
  
  console.log(`[mapTileLoader] Loading ${tiles.length} tiles for region at zoom ${zoom}`);
  console.log(`[mapTileLoader] Tile range: x(${minTile.x} to ${maxTile.x}), y(${minTile.y} to ${maxTile.y})`);
  console.log(`[mapTileLoader] Region bounds: lat(${minLat} to ${maxLat}), lon(${minLon} to ${maxLon})`);
  
  // Load tiles with concurrency limit to prevent overwhelming the network
  const MAX_CONCURRENT = 4;
  const loadedTextures = [];
  
  for (let i = 0; i < tiles.length; i += MAX_CONCURRENT) {
    const batch = tiles.slice(i, i + MAX_CONCURRENT);
    const batchPromises = batch.map(tile => 
      loadMapTile(tile.x, tile.y, zoom, tileServer).catch(err => {
        console.warn(`[mapTileLoader] Failed to load tile ${tile.x},${tile.y}:`, err);
        return null;
      })
    );
    const batchResults = await Promise.all(batchPromises);
    loadedTextures.push(...batchResults);
  }
  
  // Filter out failed loads
  const validTextures = loadedTextures.filter(t => t !== null);
  
  if (validTextures.length === 0) {
    console.error('[mapTileLoader] No tiles loaded successfully - falling back to procedural terrain');
    // Create a simple procedural texture as fallback
    return createProceduralTexture();
  }
  
  // Create a canvas to combine tiles
  const canvas = document.createElement('canvas');
  const tileCountX = maxTile.x - minTile.x + 1;
  const tileCountY = maxTile.y - minTile.y + 1;
  canvas.width = tileCountX * TILE_SIZE;
  canvas.height = tileCountY * TILE_SIZE;
  const ctx = canvas.getContext('2d');
  
  // Fill with default color
  ctx.fillStyle = '#1a5f2a'; // Green for land
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw tiles onto canvas
  let index = 0;
  for (let x = minTile.x; x <= maxTile.x; x++) {
    for (let y = minTile.y; y <= maxTile.y; y++) {
      const texture = loadedTextures[index];
      const image = texture?.image;
      
      if (image) {
        ctx.drawImage(
          image,
          (x - minTile.x) * TILE_SIZE,
          (y - minTile.y) * TILE_SIZE
        );
      }
      
      index++;
    }
  }
  
  // Create texture from combined canvas
  const combinedTexture = new THREE.CanvasTexture(canvas);
  combinedTexture.wrapS = THREE.ClampToEdgeWrapping;
  combinedTexture.wrapT = THREE.ClampToEdgeWrapping;
  combinedTexture.minFilter = THREE.LinearFilter;
  combinedTexture.magFilter = THREE.LinearFilter;
  
  console.log(`[mapTileLoader] Created combined texture: ${canvas.width}x${canvas.height}px from ${validTextures.length}/${tiles.length} tiles`);
  
  return combinedTexture;
}

/**
 * Create a simple procedural texture as fallback when map tiles fail to load.
 * @returns {THREE.Texture} - Procedural texture
 */
function createProceduralTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Create a simple gradient representing land and water
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1a5f2a'); // Green land
  gradient.addColorStop(0.5, '#2d8a4e'); // Lighter green
  gradient.addColorStop(1, '#4a9f6f'); // Light green
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some noise for texture
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
    ctx.fillRect(x, y, 2, 2);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  console.log('[mapTileLoader] Created procedural fallback texture');
  
  return texture;
}

/**
 * Create a terrain mesh with map tile texture.
 * @param {number} minLat - Minimum latitude
 * @param {number} maxLat - Maximum latitude
 * @param {number} minLon - Minimum longitude
 * @param {number} maxLon - Maximum longitude
 * @param {number} zoom - Zoom level
 * @param {Object} options - Additional options
 * @returns {Promise<THREE.Mesh>} - Terrain mesh promise
 */
export async function createMapTileTerrain(minLat, maxLat, minLon, maxLon, zoom = MAX_ZOOM, options = {}) {
  const {
    segments = 256,
    elevationScale = 100,
    tileServer = 'https://tile.openstreetmap.org'
  } = options;
  
  // Load map tiles for the region
  const texture = await loadMapTilesForRegion(minLat, maxLat, minLon, maxLon, zoom, tileServer);
  
  // Calculate world dimensions (approximate conversion)
  const latCenter = (minLat + maxLat) / 2;
  const metersPerDegreeLat = 111320; // Approximate meters per degree latitude
  const metersPerDegreeLon = 111320 * Math.cos(latCenter * Math.PI / 180); // Approximate meters per degree longitude
  
  const width = (maxLon - minLon) * metersPerDegreeLon;
  const height = (maxLat - minLat) * metersPerDegreeLat;
  
  // Create plane geometry
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  
  // Create material with map tile texture
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'MapTileTerrain';
  mesh.position.y = -10; // Position below water line to prevent z-fighting
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  
  console.log(`[mapTileLoader] Created terrain mesh: ${width.toFixed(0)}x${height.toFixed(0)} meters at y=-10`);
  
  return mesh;
}
