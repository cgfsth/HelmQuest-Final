import * as THREE from 'three';
import { BOAT_LOA_METERS } from './normalizeBoatScale.js';

const WATER_SURFACE_Y = 0.06;
const KNOTS_TO_METERS_PER_SECOND = 0.514444;

/** Soft, broken foam with transparent edges instead of solid white rectangles. */
function createFoamTexture() {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1) * 2 - 1;
      const v = y / (size - 1) * 2 - 1;
      const edge = 1 - THREE.MathUtils.smoothstep(Math.hypot(u, v), 0.35, 1);
      const strands = Math.sin(u * 23 + Math.sin(v * 13) * 2);
      const flecks = Math.sin(u * 71 + v * 47) * Math.sin(v * 59 - u * 31);
      const foam = THREE.MathUtils.clamp(0.48 + strands * 0.23 + flecks * 0.26, 0, 1);
      const i = (y * size + x) * 4;
      pixels[i] = 225;
      pixels[i + 1] = 239;
      pixels[i + 2] = 240;
      pixels[i + 3] = Math.round(edge * foam * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Both bow foam and stern wash stay on the water and scale with boat length. */
function createFoamSystem(scene, bow, { sampleHeight = () => 0 } = {}) {
  const group = new THREE.Group();
  group.name = bow ? 'BowSpray' : 'BoatWake';
  scene.add(group);

  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const texture = createFoamTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const pool = Array.from({ length: bow ? 48 : 192 }, () => {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.visible = false;
    mesh.renderOrder = 2;
    group.add(mesh);
    return {
      mesh, life: 0, maxLife: 1, length: 1, width: 1, opacity: 0,
      origin: new THREE.Vector3(), drift: new THREE.Vector3(),
    };
  });
  material.dispose();

  let poolIndex = 0;
  let previousBoat = null;
  let distanceSinceEmission = 0;
  const previousPosition = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const emissionPosition = new THREE.Vector3();

  function clear() {
    for (const p of pool) p.mesh.visible = false;
    distanceSinceEmission = 0;
  }

  function spawn(loa, speed, side) {
    const p = pool[poolIndex++ % pool.length];
    const strength = THREE.MathUtils.clamp(speed / 14, 0, 1);
    const isCenter = side === 0;
    const alongHull = bow ? loa * 0.43 : -loa * 0.48;
    const sideOffset = loa * (bow ? 0.055 : 0.045) * side;
    p.origin.copy(emissionPosition).addScaledVector(forward, alongHull).addScaledVector(right, sideOffset);
    p.origin.y = WATER_SURFACE_Y + (poolIndex % 3) * 0.004;
    p.mesh.position.copy(p.origin);
    p.mesh.position.y += sampleHeight(p.origin.x, p.origin.z);
    p.mesh.rotation.y = Math.atan2(-forward.z, forward.x) + side * (bow ? -0.22 : 0.18);
    const variation = 0.88 + Math.random() * 0.24;
    p.length = (bow ? THREE.MathUtils.clamp(loa * 0.03, 0.6, 5.4)
      : THREE.MathUtils.clamp(loa * 0.12, 1.4, 21.6)) * (0.7 + strength * 0.3) * variation;
    p.width = (bow ? THREE.MathUtils.clamp(loa * 0.014, 0.25, 2.5)
      : THREE.MathUtils.clamp(loa * (isCenter ? 0.1 : 0.035), 0.45, 18)) * variation;
    p.opacity = (bow ? 0.34 : isCenter ? 0.22 : 0.38) * (0.45 + strength * 0.55);
    p.maxLife = bow ? 0.8 + Math.sqrt(loa) * 0.06 : 3 + Math.sqrt(loa) * 0.22 + strength * 1.2;
    p.drift.copy(right).multiplyScalar(side * Math.sqrt(loa) * (bow ? 0.1 : 0.065));
    p.drift.addScaledVector(forward, -speed * KNOTS_TO_METERS_PER_SECOND * 0.06);
    p.life = 0;
    p.mesh.scale.set(p.length, 1, p.width);
    p.mesh.material.opacity = 0;
    p.mesh.visible = true;
  }

  return {
    group,
    update(boat, speedKnots, delta) {
      if (!boat || !Number.isFinite(delta) || delta <= 0) return;
      // Growth and fading depend on elapsed time, not the number of rendered frames.
      for (const p of pool) {
        if (!p.mesh.visible) continue;
        p.life += delta;
        const t = p.life / p.maxLife;
        if (t >= 1) {
          p.mesh.visible = false;
          continue;
        }
        p.mesh.material.opacity = p.opacity * THREE.MathUtils.smoothstep(t, 0, 0.12) * (1 - t) ** 2;
        p.mesh.scale.set(p.length * (1 + t * 0.28), 1, p.width * (1 + t * 0.65));
        p.mesh.position.copy(p.origin).addScaledVector(p.drift, p.life);
        p.mesh.position.y += sampleHeight(p.mesh.position.x, p.mesh.position.z);
      }

      const length = Number(boat.userData?.loaMeters);
      const loa = Number.isFinite(length) && length > 0 ? length : BOAT_LOA_METERS;
      if (boat !== previousBoat) {
        clear();
        previousBoat = boat;
        previousPosition.copy(boat.position);
        return;
      }

      const distance = Math.hypot(boat.position.x - previousPosition.x, boat.position.z - previousPosition.z);
      if (distance > Math.max(50, loa * 2)) {
        // Boat resets/teleports must not leave a trail across the map.
        clear();
        previousPosition.copy(boat.position);
        return;
      }

      const speed = Number.isFinite(Number(speedKnots)) ? Math.max(0, Number(speedKnots)) : 0;
      if (speed > (bow ? 4.5 : 0.8) && distance > 0.0001) {
        forward.set(1, 0, 0).applyQuaternion(boat.quaternion);
        forward.y = 0;
        forward.normalize();
        right.set(-forward.z, 0, forward.x);
        // Distribute foam along the actual route; bigger boats leave a wider, longer wash.
        const spacing = Math.max(0.35, loa * (bow ? 0.018 : 0.025), speed * KNOTS_TO_METERS_PER_SECOND * 0.14);
        let nextDistance = spacing - distanceSinceEmission;
        let emitted = 0;
        while (nextDistance <= distance && emitted < 6) {
          emissionPosition.lerpVectors(previousPosition, boat.position, Math.max(0, nextDistance / distance));
          spawn(loa, speed, -1);
          spawn(loa, speed, 1);
          if (!bow) spawn(loa, speed, 0);
          nextDistance += spacing;
          emitted++;
        }
        distanceSinceEmission = (distanceSinceEmission + distance) % spacing;
      } else if (speed <= (bow ? 4.5 : 0.8)) {
        distanceSinceEmission = 0;
      }
      previousPosition.copy(boat.position);
    },
    dispose() {
      scene.remove(group);
      geometry.dispose();
      texture.dispose();
      pool.forEach(p => p.mesh.material.dispose());
    },
  };
}

/** Fading stern wash and spreading side trails, with soft edges. */
export function createBoatWake(scene, options) {
  return createFoamSystem(scene, false, options);
}

/** Low bow foam on both shoulders of the moving hull. */
export function createBowSpray(scene, options) {
  return createFoamSystem(scene, true, options);
}
