import * as THREE from 'three';
import { BOAT_LOA_METERS } from './normalizeBoatScale.js';

/** Physical dimensions follow the loaded hull; floats and rope stay practical sizes. */
export function getFishingNetDimensions(boat) {
  const length = boat?.userData?.loaMeters;
  const loa = Number.isFinite(length) && length > 0 ? length : BOAT_LOA_METERS;
  return {
    loa,
    width: loa * .6,
    depth: THREE.MathUtils.clamp(loa * .18, 2.5, 24),
    behind: loa * .66,
    sternBack: loa * .46,
    floatRadius: THREE.MathUtils.clamp(loa * .009, .16, .48),
    ropeRadius: THREE.MathUtils.clamp(loa * .0008, .018, .065),
  };
}

const COLS = 36;
const ROWS = 18;
const ROPE_SIDES = 6;
const ROPE_SEGMENTS = 16;

export function createFishingTowRope() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ROPE_SEGMENTS + 1) * 3), 3));
  const rope = new THREE.Line(geometry, new THREE.LineBasicMaterial({
    color: 0xb5aa84, transparent: true, opacity: .85,
  }));
  rope.frustumCulled = false;
  return rope;
}

/** A hanging curve, updated in place so fishing does not allocate geometry every frame. */
export function updateFishingTowRope(rope, start, end, sag) {
  const positions = rope.geometry.attributes.position;
  for (let i = 0; i <= ROPE_SEGMENTS; i++) {
    const t = i / ROPE_SEGMENTS;
    positions.setXYZ(i,
      THREE.MathUtils.lerp(start.x, end.x, t),
      THREE.MathUtils.lerp(start.y, end.y, t) - Math.sin(Math.PI * t) * sag,
      THREE.MathUtils.lerp(start.z, end.z, t));
  }
  positions.needsUpdate = true;
}

/** Flexible diamond mesh with separate corks, a weighted footrope, and no solid surface slab. */
export function createDriftNetVisual() {
  const rig = new THREE.Group();
  rig.name = 'FishingNet';
  const nodes = Array.from({ length: (ROWS + 1) * (COLS + 1) }, () => new THREE.Vector3());
  const headerHeights = new Float32Array(COLS + 1);
  const edges = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const top = r * (COLS + 1) + c;
      const bottom = (r + 1) * (COLS + 1) + c;
      edges.push(top, bottom + 1, top + 1, bottom);
    }
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges.length * 3), 3));
  const netMesh = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({
    color: 0x78968c, transparent: true, opacity: .42, depthWrite: false,
  }));
  netMesh.name = 'NetGrid';
  netMesh.frustumCulled = false;
  rig.add(netMesh);

  function border(name, color) {
    const curve = new THREE.LineCurve3(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, COLS, 1, ROPE_SIDES, false),
      new THREE.MeshStandardMaterial({ color, roughness: .95 }));
    mesh.name = name;
    mesh.frustumCulled = false;
    rig.add(mesh);
    return mesh;
  }
  const header = border('FloatLine', 0x91896a);
  const footrope = border('LeadLine', 0x414a44);
  const floatGeo = new THREE.SphereGeometry(1, 12, 8);
  const corkMaterial = new THREE.MeshStandardMaterial({ color: 0xc6b88b, roughness: .85 });
  const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xca713e, roughness: .8 });
  const weightMaterial = new THREE.MeshStandardMaterial({ color: 0x3c4442, roughness: .7, metalness: .35 });
  const floats = [], weights = [];
  for (let c = 0; c <= COLS; c += 3) {
    const marker = c === 0 || c === COLS;
    const mesh = new THREE.Mesh(floatGeo, marker ? markerMaterial : corkMaterial);
    mesh.name = marker ? 'FloatMarker' : 'NetCork';
    rig.add(mesh);
    floats.push({ mesh, column: c });
  }
  for (let c = 0; c <= COLS; c += 6) {
    const mesh = new THREE.Mesh(floatGeo, weightMaterial);
    mesh.name = 'NetWeight';
    rig.add(mesh);
    weights.push({ mesh, column: c });
  }

  function updateBorder(mesh, row, radius) {
    const positions = mesh.geometry.attributes.position;
    for (let c = 0; c <= COLS; c++) {
      const point = nodes[row * (COLS + 1) + c];
      for (let side = 0; side <= ROPE_SIDES; side++) {
        const angle = side / ROPE_SIDES * Math.PI * 2;
        positions.setXYZ(c * (ROPE_SIDES + 1) + side,
          point.x, point.y + Math.cos(angle) * radius, point.z - Math.sin(angle) * radius);
      }
    }
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  function update(dimensions, unfurl, elapsed, getSurfaceHeight = () => 0) {
    const { width, depth, ropeRadius, floatRadius } = dimensions;
    for (let c = 0; c <= COLS; c++) {
      const u = c / COLS;
      headerHeights[c] = getSurfaceHeight((u - .5) * width * unfurl, Math.sin(u * Math.PI) * width * .025 * unfurl);
    }
    for (let r = 0; r <= ROWS; r++) {
      const d = r / ROWS;
      for (let c = 0; c <= COLS; c++) {
        const u = c / COLS;
        const bow = Math.sin(u * Math.PI);
        const ripple = Math.sin(elapsed * 1.6 + u * 6) * .09;
        nodes[r * (COLS + 1) + c].set(
          (u - .5) * width * unfurl * (1 - .06 * Math.sin(d * Math.PI)),
          headerHeights[c] + .06 + ripple - bow * .06 - depth * d,
          bow * width * .025 * unfurl + depth * d * .13
            + Math.sin(elapsed * .9 + u * 5 + d * 2) * depth * d * .025);
      }
    }
    const positions = netGeo.attributes.position;
    edges.forEach((node, i) => {
      const point = nodes[node];
      positions.setXYZ(i, point.x, point.y, point.z);
    });
    positions.needsUpdate = true;
    updateBorder(header, 0, ropeRadius);
    updateBorder(footrope, ROWS, ropeRadius * 1.2);
    for (const { mesh, column } of floats) {
      mesh.position.copy(nodes[column]);
      mesh.position.y += floatRadius * .15;
      mesh.scale.set(floatRadius * 1.3, floatRadius * .8, floatRadius);
      mesh.rotation.z = Math.cos(elapsed * 1.6 + column / COLS * 6) * .08;
    }
    for (const { mesh, column } of weights) {
      mesh.position.copy(nodes[ROWS * (COLS + 1) + column]);
      mesh.scale.setScalar(ropeRadius * 2.2);
    }
    rig.userData.dimensions = dimensions;
  }

  return { rig, update, portCorner: nodes[0], starboardCorner: nodes[COLS] };
}
