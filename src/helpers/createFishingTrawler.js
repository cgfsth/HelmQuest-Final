import * as THREE from 'three';

/**
 * Commercial fishing trawler inspired by classic blue-hull workboats.
 * Bow faces +X (matches normalizeBoatTransform in App.vue).
 */
export function createCommercialFishingTrawler() {
  const boat = new THREE.Group();
  boat.name = 'CommercialFishingTrawler';

  const matHull = new THREE.MeshStandardMaterial({
    color: 0x3a7ec8,
    roughness: 0.46,
    metalness: 0.1,
    emissive: 0x1a3050,
    emissiveIntensity: 0.08
  });
  const matHullStripe = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.42,
    metalness: 0.05
  });
  const matCabin = new THREE.MeshStandardMaterial({
    color: 0xe8edf2,
    roughness: 0.58,
    metalness: 0.04
  });
  const matRoof = new THREE.MeshStandardMaterial({
    color: 0xc62828,
    roughness: 0.52,
    metalness: 0.08
  });
  const matDeck = new THREE.MeshStandardMaterial({
    color: 0x5c6b7a,
    roughness: 0.88,
    metalness: 0.05
  });
  const matMetal = new THREE.MeshStandardMaterial({
    color: 0xb0bec5,
    roughness: 0.28,
    metalness: 0.82
  });
  const matCrane = new THREE.MeshStandardMaterial({
    color: 0x3f6f52,
    roughness: 0.55,
    metalness: 0.25
  });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88
  });
  const matLifeRing = new THREE.MeshStandardMaterial({
    color: 0xd32f2f,
    roughness: 0.6
  });

  const L = 13.5;
  const W = 3.4;
  const hullH = 1.35;

  // —— Hull (tapered bow, flat stern) ——
  const hullGeo = new THREE.BoxGeometry(L, hullH, W, 36, 6, 14);
  const pos = hullGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const bowT = Math.max(0, x / (L * 0.5));
    if (x > 0.2) {
      const pinch = 1 - Math.pow(Math.min(1, bowT), 1.75) * 0.94;
      pos.setZ(i, z * pinch);
      if (y < 0) pos.setY(i, y * (1 - bowT * 0.25));
    }
    if (x < -L * 0.38) {
      pos.setZ(i, z * 0.96);
    }
  }
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, matHull);
  hull.position.y = hullH * 0.35;
  boat.add(hull);

  const waterline = new THREE.Mesh(
    new THREE.BoxGeometry(L * 0.98, 0.06, W * 1.02),
    matHullStripe
  );
  waterline.position.set(0, hullH * 0.62, 0);
  boat.add(waterline);

  // Stern chevron stripes (reference photo)
  [-0.35, 0.35].forEach((zOff, idx) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), matHullStripe);
    stripe.position.set(-L * 0.42 + idx * 0.15, hullH * 0.45, zOff * W * 0.55);
    stripe.rotation.y = zOff > 0 ? -0.55 : 0.55;
    stripe.rotation.x = 0.12;
    boat.add(stripe);
  });

  // —— Main deck ——
  const deck = new THREE.Mesh(new THREE.BoxGeometry(L * 0.88, 0.12, W * 0.92), matDeck);
  deck.position.set(-0.15, hullH * 0.72, 0);
  boat.add(deck);

  // —— Wheelhouse (white walls, red roof) ——
  const cabinX = 0.85;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.55, 2.5), matCabin);
  cabin.position.set(cabinX, hullH * 0.72 + 0.9, 0);
  boat.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.22, 2.75), matRoof);
  roof.position.set(cabinX, hullH * 0.72 + 1.72, 0);
  boat.add(roof);

  // Wheelhouse windows
  const winW = 0.55;
  const winH = 0.42;
  [
    [cabinX + 1.41, 0, 0],
    [cabinX, 0, 1.26],
    [cabinX, 0, -1.26]
  ].forEach(([x, , z]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), matGlass);
    w.position.set(x, hullH * 0.72 + 1.0, z);
    if (Math.abs(z) > 0.5) w.rotation.y = z > 0 ? -Math.PI / 2 : Math.PI / 2;
    else w.rotation.y = Math.PI / 2;
    boat.add(w);
  });

  // Life ring on cabin side
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 12, 24), matLifeRing);
  ring.position.set(cabinX - 0.2, hullH * 0.72 + 1.05, 1.35);
  ring.rotation.y = Math.PI / 2;
  boat.add(ring);

  // Radar / antenna cluster on roof
  const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 8), matMetal);
  mastBase.position.set(cabinX + 0.4, hullH * 0.72 + 1.95, 0);
  boat.add(mastBase);

  const radar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), matMetal);
  radar.position.set(cabinX + 0.4, hullH * 0.72 + 2.15, 0);
  boat.add(radar);

  [-0.25, 0.25].forEach((z) => {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), matMetal);
    ant.position.set(cabinX - 0.5, hullH * 0.72 + 2.35, z);
    boat.add(ant);
  });

  // —— Fore mast & rigging ——
  const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.6, 10), matMetal);
  foreMast.position.set(L * 0.36, hullH * 0.72 + 2.1, 0);
  boat.add(foreMast);

  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, W * 1.35, 6), matMetal);
  yard.rotation.z = Math.PI / 2;
  yard.position.set(L * 0.36, hullH * 0.72 + 3.35, 0);
  boat.add(yard);

  [-1, 1].forEach((side) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.8, 6), matMetal);
    cable.position.set(L * 0.2, hullH * 0.72 + 1.8, side * W * 0.48);
    cable.rotation.z = side * 0.35;
    cable.rotation.x = -0.25;
    boat.add(cable);
  });

  // Bow winch / capstan
  const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.35, 16), matMetal);
  winch.position.set(L * 0.38, hullH * 0.72 + 0.22, 0);
  boat.add(winch);

  // —— Aft deck crane (green arm) ——
  const craneBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.7), matMetal);
  craneBase.position.set(-L * 0.38, hullH * 0.72 + 0.35, 0);
  boat.add(craneBase);

  const craneArm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.22), matCrane);
  craneArm.position.set(-L * 0.28, hullH * 0.72 + 1.15, 0.15);
  craneArm.rotation.z = 0.65;
  craneArm.rotation.y = -0.2;
  boat.add(craneArm);

  const craneHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), matMetal);
  craneHead.position.set(-L * 0.18, hullH * 0.72 + 1.85, 0.35);
  boat.add(craneHead);

  // Net reel / drum on aft deck
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 20), matMetal);
  reel.rotation.z = Math.PI / 2;
  reel.position.set(-L * 0.32, hullH * 0.72 + 0.45, 0.55);
  boat.add(reel);

  // Storage bins on aft deck
  [-0.45, 0.45].forEach((z) => {
    const bin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7), matCabin);
    bin.position.set(-L * 0.22, hullH * 0.72 + 0.28, z);
    boat.add(bin);
  });

  // Side railings (hidden in helm camera — helpers/helmDeckRails.js)
  const railGroup = new THREE.Group();
  railGroup.name = 'BoatRailings';
  const rail = (len, x, z, ry = 0) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 6), matMetal);
    r.name = 'DeckRail';
    r.position.set(x, hullH * 0.72 + 0.55, z);
    r.rotation.x = Math.PI / 2;
    r.rotation.y = ry;
    railGroup.add(r);
  };
  rail(L * 0.75, 0, W * 0.48);
  rail(L * 0.75, 0, -W * 0.48);
  [-L * 0.35, 0, L * 0.35].forEach((x) => {
    rail(W * 0.9, x, 0, Math.PI / 2);
  });
  boat.add(railGroup);

  boat.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return boat;
}
