import * as THREE from 'three';
import { createModelLoader } from './modelLoader.js';
import { normalizeBoatToScene } from './normalizeBoatScale.js';
import { disposeBoatModel } from './loadBoatModel.js';
import { ENCOUNTER_VESSEL_RADIUS } from '../../shared/vesselEncounter.js';

export function createEncounterVesselVisual(scene, config, options = {}) {
  const group = new THREE.Group(); group.name = 'TrainingEncounterVessel';
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: .65 });
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-20, -6); hullShape.lineTo(13, -6); hullShape.lineTo(24, 0);
  hullShape.lineTo(13, 6); hullShape.lineTo(-20, 6); hullShape.closePath();
  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, { depth: 5, bevelEnabled: false });
  hullGeometry.rotateX(Math.PI / 2); hullGeometry.translate(0, 3, 0);
  const hull = new THREE.Mesh(hullGeometry, material(0x253c50)); group.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 9), material(0xe9d4a1)); cabin.position.set(-4, 7, 0); group.add(cabin);
  const windows = new THREE.Mesh(new THREE.BoxGeometry(14.2, 2, 9.2), material(0x173b55)); windows.position.set(-4, 9, 0); group.add(windows);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 13, 8), material(0xc9d6de)); mast.position.set(0, 15, 0); group.add(mast);
  const lamps = {};
  for (const [name, color, position] of [
    ['red', 0xff2525, [5.2, 12.3, -2.95]], ['green', 0x24ff69, [5.2, 12.3, 2.82]],
    ['white', 0xffffff, [-19, 6, 0]], ['masthead', 0xffffff, [0, 21, 0]],
  ]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.7, 10, 8), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    lamp.position.fromArray(position); group.add(lamp); lamps[name] = lamp;
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(ENCOUNTER_VESSEL_RADIUS + config.clearance - 1.2, ENCOUNTER_VESSEL_RADIUS + config.clearance, 96),
    new THREE.MeshBasicMaterial({ color: 0xffc456, transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  scene.add(group, ring);
  let disposed = false;
  const ready = (options.loadModel ?? typeof document !== 'undefined')
    ? (options.loader || createModelLoader()).loadAsync('/assets/trawler (1).glb').then(gltf => {
      if (disposed) { disposeBoatModel(gltf.scene); return; }
      let boat;
      try { ({ boat } = normalizeBoatToScene(gltf.scene, { targetLength: 44, targetWaterlineY: 0, waterlineOffset: -2.3, spawnX: 0, spawnZ: 0, modelPath: '/assets/trawler (1).glb' })); }
      catch (error) { disposeBoatModel(gltf.scene); throw error; }
      for (const fallback of [hull, cabin, windows]) disposeBoatModel(fallback);
      group.add(boat); group.userData.modelLoaded = true;
    }).catch(error => { group.userData.modelFailed = true; console.warn('Training vessel model unavailable; using its procedural hull.', error.message); })
    : Promise.resolve();
  return { group, ring, lamps, ready,
    update(state, observer, sampleHeight = () => 0) {
      const { npc } = state;
      group.position.set(npc.x, sampleHeight(npc.x, npc.z) || 0, npc.z);
      group.rotation.y = Math.PI / 2 - npc.heading * Math.PI / 180;
      ring.position.set(npc.x, (sampleHeight(npc.x, npc.z) || 0) + .2, npc.z);
      ring.material.color.setHex(state.resolved ? state.successful ? 0x4be6a8 : 0xff5858 : 0xffc456);
      // Match COLREG sidelight sectors instead of showing both colors through the hull.
      const toward = new THREE.Vector3(observer.x - npc.x, 0, observer.z - npc.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -group.rotation.y);
      const bearing = Math.atan2(toward.z, toward.x) * 180 / Math.PI;
      lamps.red.visible = !npc.anchored && bearing >= -112.5 && bearing <= 0;
      lamps.green.visible = !npc.anchored && bearing >= 0 && bearing <= 112.5;
      lamps.white.visible = !npc.anchored && Math.abs(bearing) >= 112.5;
      lamps.masthead.visible = npc.anchored || Math.abs(bearing) <= 112.5;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeBoatModel(group); disposeBoatModel(ring);
    },
  };
}
