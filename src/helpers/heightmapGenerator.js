import * as THREE from 'three';
import { gpsToWorld, ALL_POLYGONS } from './davaoGulfData.js';

/**
 * Generate a heightmap texture from GPS polygon elevation data.
 * Creates a texture that can be used for displacement mapping in Three.js.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.width - Texture width in pixels (default: 1024)
 * @param {number} options.height - Texture height in pixels (default: 1024)
 * @param {number} options.minLat - Minimum latitude for the heightmap
 * @param {number} options.maxLat - Maximum latitude for the heightmap
 * @param {number} options.minLon - Minimum longitude for the heightmap
 * @param {number} options.maxLon - Maximum longitude for the heightmap
 * @param {number} options.elevationScale - Multiplier for elevation values
 * @returns {THREE.DataTexture} - Heightmap texture
 */
export function generateHeightmap(options = {}) {
  const {
    width = 1024,
    height = 1024,
    minLat = 6.4,
    maxLat = 7.5,
    minLon = 124.0,
    maxLon = 127.0,
    elevationScale = 1.0
  } = options;

  // Create canvas for heightmap
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill with water level (black)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // For each polygon, draw the elevation as grayscale
  for (const poly of ALL_POLYGONS) {
    ctx.beginPath();
    
    for (let i = 0; i < poly.coords.length; i++) {
      const coord = poly.coords[i];
      
      // Convert GPS to canvas coordinates
      const x = ((coord.lon - minLon) / (maxLon - minLon)) * width;
      const y = ((maxLat - coord.lat) / (maxLat - minLat)) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    
    // Fill with grayscale based on average elevation
    const avgElev = poly.coords.reduce((sum, c) => sum + (c.elev || 0), 0) / poly.coords.length;
    const grayValue = Math.min(255, (avgElev * elevationScale));
    ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
    ctx.fill();
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBFormat;

  console.log('[heightmapGenerator] Generated heightmap:', width, 'x', height, 'pixels');
  
  return texture;
}

/**
 * Create a terrain mesh using heightmap displacement.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.width - Terrain width in meters
 * @param {number} options.height - Terrain height in meters
 * @param {number} options.segments - Number of segments for detail
 * @param {number} options.displacementScale - Maximum displacement height
 * @param {THREE.Texture} options.heightmap - Heightmap texture
 * @param {THREE.Texture} options.albedo - Albedo/color texture
 * @returns {THREE.Mesh} - Terrain mesh
 */
export function createHeightmapTerrain(options = {}) {
  const {
    width = 60000,  // 60km for Davao Gulf
    height = 60000,
    segments = 512,
    displacementScale = 500,
    heightmap = null,
    albedo = null
  } = options;

  // Create plane geometry
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  
  // Rotate to lie flat on XZ plane
  geometry.rotateX(-Math.PI / 2);

  // Create material with displacement map
  const material = new THREE.MeshStandardMaterial({
    color: 0x8B7355,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true,
    displacementMap: heightmap,
    displacementScale: displacementScale,
    map: albedo
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'HeightmapTerrain';
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  console.log('[heightmapGenerator] Created heightmap terrain:', width, 'x', height, 'meters');
  
  return mesh;
}
