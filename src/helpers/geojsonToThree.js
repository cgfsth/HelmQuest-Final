import * as THREE from 'three';
import { gpsToWorld } from './davaoGulfData.js';

function buildShapeFromCoords(coords) {
  const shape = new THREE.Shape();
  coords.forEach((pt, idx) => {
    const lon = pt[0];
    const lat = pt[1];
    const w = gpsToWorld(lat, lon);
    if (idx === 0) shape.moveTo(w.x, w.z);
    else shape.lineTo(w.x, w.z);
  });
  return shape;
}

/**
 * Add a GeoJSON layer to the provided scene.
 * @param {THREE.Scene} scene
 * @param {string} url - URL to fetch the GeoJSON (e.g., '/export.geojson')
 * @param {Object} [opts]
 */
export async function addGeoJSONLayer(scene, url, opts = {}) {
  if (!scene) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const geo = await res.json();

    const group = new THREE.Group();
    group.name = 'GeoJSON_Layer';

    const material = new THREE.MeshStandardMaterial({
      color: opts.color || 0x1e90ff,
      roughness: 0.6,
      metalness: 0.0,
      transparent: true,
      opacity: opts.opacity !== undefined ? opts.opacity : 0.6,
      side: THREE.DoubleSide
    });

    const extrudeSettings = { depth: opts.depth || 0.2, bevelEnabled: false };

    if (!geo.features || !Array.isArray(geo.features)) return group;

    for (const feat of geo.features) {
      const geom = feat.geometry;
      if (!geom) continue;
      if (geom.type === 'Polygon') {
        const rings = geom.coordinates; // array of linear rings
        const outer = rings[0];
        const shape = buildShapeFromCoords(outer);
        const geom3 = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mesh = new THREE.Mesh(geom3, material);
        mesh.rotation.x = -Math.PI / 2; // rotate so X/Z plane maps to world X/Z
        mesh.position.y = opts.height || 0; // place at water level by default
        group.add(mesh);
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          const outer = poly[0];
          const shape = buildShapeFromCoords(outer);
          const geom3 = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const mesh = new THREE.Mesh(geom3, material);
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.y = opts.height || 0;
          group.add(mesh);
        }
      } else if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
        const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
        for (const line of lines) {
          const points = line.map((pt) => {
            const { x, z } = gpsToWorld(pt[1], pt[0]);
            return new THREE.Vector3(x, 0.02, z);
          });
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const mat = new THREE.LineBasicMaterial({ color: opts.color || 0x1e90ff, linewidth: 2 });
          const ln = new THREE.Line(geometry, mat);
          ln.rotation.x = -Math.PI / 2;
          group.add(ln);
        }
      }
    }

    scene.add(group);
    return group;
  } catch (err) {
    console.warn('[geojsonToThree] Error loading GeoJSON:', err);
    return null;
  }
}

export default addGeoJSONLayer;
