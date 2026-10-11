import * as THREE from 'three';

// Lens surfaces measured on BigBoat.glb after normalization to 180m, bow +X.
// The asset is one textured mesh, so fixtures cannot be found by object name.
export const BIG_BOAT_LAMPS = [
  { name: 'BowRoofLamp', position: [53.25, 37.86, -0.73], normal: [0, 1, 0], target: [300, 0, 0], color: 0xffedbb, role: 'front' },
  { name: 'FrontRoofLamp', position: [46.48, 37.60, -15.67], normal: [0, 1, 0], target: [270, 0, -55], color: 0xffedbb, role: 'front' },
  { name: 'PortFrontRoofLamp', position: [46.285, 37.562, 15.445], normal: [0.032, 0.996, 0.080], target: [270, 0, 55], color: 0xffedbb, role: 'front' },
  { name: 'RearRoofLamp', position: [27.29, 37.54, -15.72], normal: [0, 1, 0], target: [5, 0, -65], color: 0xffedbb, role: 'side' },
  { name: 'PortRearRoofLamp', position: [27.139, 37.590, 15.187], normal: [0.006, 0.995, 0.103], target: [5, 0, 65], color: 0xffedbb, role: 'side' },
  { name: 'PortNavigationLamp', position: [41.99, 46.88, 9.94], normal: [0.63, -0.22, -0.75], color: 0xff2929 },
  { name: 'StarboardNavigationLamp', position: [42.10, 47.05, -11.54], normal: [0.42, 0.11, -0.90], color: 0x39ff83 },
  { name: 'MastLamp', position: [21.99, 66.32, -7.89], normal: [0.85, -0.04, -0.53], color: 0xfff7df },
  { name: 'PortDeckLamp', position: [0.88, 51.38, 2.41], normal: [0.47, 0.47, -0.74], target: [-45, 13, 9], color: 0xffedbb },
  { name: 'StarboardDeckLamp', position: [-1.91, 51.38, -3.58], normal: [0.54, 0.21, -0.81], target: [-45, 13, -9], color: 0xffedbb },
];

function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0xffedbb) } },
    vertexShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying vec2 beamUv;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        viewNormal = normalMatrix * normal;
        viewDirection = -viewPosition.xyz;
        beamUv = uv;
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying vec2 beamUv;
      void main() {
        float softEdge = pow(abs(dot(normalize(viewNormal), normalize(viewDirection))), 1.5);
        float fade = smoothstep(0.0, 0.25, beamUv.y) * pow(beamUv.y, 0.7);
        gl_FragColor = vec4(color, 0.14 * softEdge * fade);
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
}

function glowTexture() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const index = (y * size + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
      pixels[index + 3] = Math.round((1 - THREE.MathUtils.smoothstep(radius, 0, 1)) ** 2 * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Light the existing roof/mast fixtures, with lenses visible even without bloom. */
export function addBigBoatLights(boat) {
  const existing = boat.getObjectByName('BigBoatLights');
  if (existing) return existing;
  const lamps = new THREE.Group();
  lamps.name = 'BigBoatLights';
  const texture = glowTexture();
  const bulbGeometry = new THREE.SphereGeometry(0.48, 12, 8);
  const lensGeometry = new THREE.PlaneGeometry(1.8, 1.2);
  const scale = (boat.userData.loaMeters || 180) / 180;
  const frontBeamMaterial = beamMaterial();
  const poolGeometry = new THREE.PlaneGeometry(240 * scale, 105 * scale);
  const poolMaterial = new THREE.MeshBasicMaterial({
    map: texture, color: 0xffedbb, transparent: true, opacity: 0.42,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const waterPools = [];

  for (const lamp of BIG_BOAT_LAMPS) {
    const fixture = new THREE.Group();
    fixture.name = lamp.name;
    const normal = new THREE.Vector3().fromArray(lamp.normal).normalize();
    fixture.position.fromArray(lamp.position).addScaledVector(normal, 0.12).multiplyScalar(scale);
    const material = new THREE.MeshBasicMaterial({ color: lamp.color, toneMapped: false, side: THREE.DoubleSide });
    const lens = new THREE.Mesh(lamp.target ? lensGeometry : bulbGeometry, material);
    lens.name = 'LampLens';
    lens.scale.setScalar(scale);
    if (lamp.target) lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: lamp.color, transparent: true, opacity: lamp.role ? 0.9 : 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.name = 'LampGlow';
    halo.scale.setScalar((lamp.role === 'front' ? 11 : lamp.target ? 8 : 5.5) * scale);
    halo.renderOrder = 3;
    fixture.add(lens, halo);
    if (lamp.target) {
      const target = new THREE.Object3D();
      target.name = `${lamp.name}Target`;
      target.position.fromArray(lamp.target).multiplyScalar(scale);
      const isFront = lamp.role === 'front';
      const intensity = isFront ? 120000 : lamp.role === 'side' ? 18000 : 6500;
      const light = new THREE.SpotLight(lamp.color, intensity * scale ** 2,
        (isFront ? 850 : 400) * scale, isFront ? Math.PI / 7 : Math.PI / 5, 0.65, 2);
      light.name = 'LampLight';
      light.castShadow = false;
      light.target = target;
      fixture.add(light);
      lamps.add(target);
      if (isFront) {
        // Water.js does not receive scene spotlights; show the beam and a soft water footprint too.
        const direction = target.position.clone().sub(fixture.position);
        const length = direction.length();
        const geometry = new THREE.ConeGeometry(36 * scale, length, 24, 1, true);
        geometry.translate(0, -length / 2, 0);
        const beam = new THREE.Mesh(geometry, frontBeamMaterial);
        beam.name = 'FrontLightBeam';
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction.normalize());
        beam.renderOrder = 2;
        fixture.add(beam);
        const pool = new THREE.Mesh(poolGeometry, poolMaterial);
        pool.name = `${lamp.name}WaterPool`;
        pool.matrixAutoUpdate = false;
        pool.renderOrder = 3;
        pool.userData.target = target;
        waterPools.push(pool);
        lamps.add(pool);
      }
    } else if (lamp.name.includes('Navigation')) {
      const light = new THREE.PointLight(lamp.color, 60 * scale ** 2, 35 * scale, 2);
      light.name = 'LampLight';
      light.castShadow = false;
      fixture.add(light);
    }
    lamps.add(fixture);
  }
  lamps.userData.glowTexture = texture;
  lamps.userData.waterPools = waterPools;
  lamps.userData.projection = {
    inverse: new THREE.Matrix4(), world: new THREE.Matrix4(), position: new THREE.Vector3(),
    direction: new THREE.Vector3(), rotation: new THREE.Quaternion(),
    flatRotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
    up: new THREE.Vector3(0, 1, 0), scale: new THREE.Vector3(1, 1, 1),
  };
  boat.add(lamps);
  updateBigBoatLightPools(boat);
  return lamps;
}

/** Keep the projected footprints flat on the water as the hull pitches and rolls. */
export function updateBigBoatLightPools(boat, sampleWaterHeight = () => 0) {
  const lamps = boat?.getObjectByName('BigBoatLights');
  if (!lamps?.visible) return;
  boat.updateWorldMatrix(true, true);
  const state = lamps.userData.projection;
  state.inverse.copy(lamps.matrixWorld).invert();
  state.direction.set(1, 0, 0).transformDirection(boat.matrixWorld);
  const yaw = Math.atan2(-state.direction.z, state.direction.x);
  state.rotation.setFromAxisAngle(state.up, yaw).multiply(state.flatRotation);
  for (const pool of lamps.userData.waterPools) {
    pool.userData.target.getWorldPosition(state.position);
    const waterHeight = sampleWaterHeight(state.position.x, state.position.z);
    state.position.y = (Number.isFinite(waterHeight) ? waterHeight : 0) + 0.15;
    state.world.compose(state.position, state.rotation, state.scale);
    pool.matrix.multiplyMatrices(state.inverse, state.world);
    pool.updateMatrixWorld(true);
  }
}

/** Roof-lamp billboard halos and exterior beam shells must not obscure the bridge windshield. */
export function syncBigBoatBridgeLightVisibility(boat, insideBridge) {
  const lamps = boat?.getObjectByName('BigBoatLights');
  if (!lamps) return;
  for (const definition of BIG_BOAT_LAMPS) {
    if (definition.role !== 'front') continue;
    const fixture = lamps.getObjectByName(definition.name);
    for (const name of ['LampGlow', 'FrontLightBeam']) {
      const effect = fixture?.getObjectByName(name);
      if (effect) effect.visible = !insideBridge;
    }
  }
}

export function disposeBigBoatLights(lamps) {
  if (!lamps) return;
  const geometries = new Set(), materials = new Set();
  lamps.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) materials.add(node.material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  lamps.userData.glowTexture?.dispose();
  lamps.removeFromParent();
}
