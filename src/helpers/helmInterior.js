import * as THREE from 'three';

/** Trawler GLB meshes to keep visible in helm view. */
export const HELM_INTERIOR_NAME =
  /cabine|_cabine|floor\.|lamp|armoire|radio\.|misc_|persiennes|glass_glass|Solid 661|Solid 715|Solid 1078|lock3|bobonne|bridge|wheelhouse|cabin|interior|console|dashboard|helm|pilothouse/i;

/** Exterior / deck — hidden in helm view. */
export const HELM_EXTERIOR_NAME =
  /hull\.|hull main|bastingage|grue |roof\.|cabin ext|helice|anchor|chain|bouee|bouées|rope|caisse|bucket|poulie|mat\.002|barre ancre|projecteurs|antenne|enroul|maillon|tige ancre|chaine_poulie|Lofted|Extruded|Solid 585|Solid 612|Solid\.002|cable\.|coffre roof|rangement/i;

function helmMat(color, roughness, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * Procedural wheelhouse interior (boat +X forward, helm camera ~6.9, 5.35, 0).
 * @returns {THREE.Group}
 */
export function buildHelmInterior() {
  const matWall = helmMat(0x3d434b, 0.88);
  const matCeiling = helmMat(0x2c3036, 0.92, 0.02);
  const matConsole = helmMat(0x353b42, 0.86, 0.06);
  const matTrim = helmMat(0x1e2228, 0.55, 0.35);
  const matFloor = helmMat(0x4a4038, 0.92, 0.02);
  const interior = new THREE.Group();
  interior.name = 'HelmInterior';

  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 3.0), matFloor);
  floor.position.set(6.55, 4.02, 0);
  interior.add(floor);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.07, 3.0), matCeiling);
  ceiling.position.set(6.55, 5.82, 0);
  interior.add(ceiling);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.85, 3.0), matWall);
  backWall.position.set(5.55, 4.9, 0);
  interior.add(backWall);

  for (const z of [1.48, -1.48]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.85, 0.09), matWall);
    side.position.set(6.55, 4.9, z);
    interior.add(side);
  }

  const header = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.55), matTrim);
  header.position.set(7.18, 5.58, 0);
  interior.add(header);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 2.55), matTrim);
  sill.position.set(7.16, 4.62, 0);
  interior.add(sill);

  for (const z of [1.22, -1.22]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.05, 0.13), matTrim);
    pillar.position.set(7.14, 5.1, z);
    interior.add(pillar);
  }

  const dashTop = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 2.35), matConsole);
  dashTop.position.set(6.98, 4.52, 0);
  interior.add(dashTop);

  const dashFace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 2.35), matConsole);
  dashFace.position.set(6.92, 4.28, 0);
  interior.add(dashFace);

  for (const side of [-1, 1]) {
    const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.35), matTrim);
    armrest.position.set(6.35, 4.18, side * 0.85);
    interior.add(armrest);
  }

  const lightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.9), matTrim);
  lightPanel.position.set(6.6, 5.68, 0);
  interior.add(lightPanel);

  const light = new THREE.PointLight(0xfff0d8, 0.55, 4.5);
  light.position.set(6.7, 5.5, 0);
  interior.add(light);

  // Create integrated radar display screen (placeholder - will be textured with real radar canvas)
  const radarScreenGeo = new THREE.PlaneGeometry(0.6, 0.6);
  const radarScreenMat = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, 
    side: THREE.DoubleSide
  });
  const radarScreen = new THREE.Mesh(radarScreenGeo, radarScreenMat);
  radarScreen.name = 'RadarScreen'; // Important: tag for texture assignment
  radarScreen.position.set(6.9, 5.1, 0); // Center above dashboard
  radarScreen.rotation.x = Math.PI * 0.1; // Tilt slightly for visibility
  interior.add(radarScreen);

  interior.traverse((obj) => {
    if (obj.isMesh) {
      obj.receiveShadow = true;
      obj.castShadow = true;
    }
  });

  return interior;
}

/**
 * @param {THREE.Object3D | null} boatRoot
 * @param {THREE.Group | null} helmCockpitGroup
 * @param {boolean} helmView
 */
export function syncHelmInteriorVisibility(boatRoot, helmCockpitGroup, helmView, showBoatHull = false) {
  if (helmCockpitGroup) {
    // Open boats and merged models use their own exterior instead of the unrelated procedural cabin.
    helmCockpitGroup.visible = helmView && (!showBoatHull || helmCockpitGroup.userData.largeBridge === true);
  }

  if (!boatRoot) return;

  boatRoot.traverse((obj) => {
    if (!obj.isMesh) return;

    let underHelm = false;
    let node = obj;
    while (node) {
      if (node.name === 'HelmCockpit') {
        underHelm = true;
        break;
      }
      node = node.parent;
    }
    if (underHelm) return;

    const name = obj.name || '';

    if (helmView) {
      if (showBoatHull) {
        obj.visible = true;
        return;
      }
      if (HELM_EXTERIOR_NAME.test(name) || obj.userData.helmDeckRail) {
        obj.visible = false;
        return;
      }
      if (HELM_INTERIOR_NAME.test(name)) {
        obj.visible = true;
        return;
      }
      obj.visible = false;
    } else {
      obj.visible = true;
    }
  });
}

/**
 * @param {THREE.Object3D} root
 */
export function tagHelmInteriorMeshes(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = obj.name || '';
    if (HELM_INTERIOR_NAME.test(n)) {
      obj.userData.helmInterior = true;
    }
    if (HELM_EXTERIOR_NAME.test(n)) {
      obj.userData.helmExterior = true;
    }
  });
}

/**
 * Apply radar canvas as texture to the integrated radar screen
 * @param {THREE.Object3D | null} helmCockpitGroup 
 * @param {HTMLCanvasElement | null} radarCanvas 
 */
export function applyRadarTextureToScreen(helmCockpitGroup, radarCanvas) {
  if (!helmCockpitGroup || !radarCanvas) return;
  
  // Find the RadarScreen mesh
  let radarScreen = null;
  helmCockpitGroup.traverse((obj) => {
    if (obj.name === 'RadarScreen' && obj.isMesh) {
      radarScreen = obj;
    }
  });
  
  if (!radarScreen) {
    console.warn('[applyRadarTexture] RadarScreen mesh not found');
    return;
  }
  
  // Create canvas texture
  const texture = new THREE.CanvasTexture(radarCanvas);
  texture.needsUpdate = true;
  
  // Apply texture to radar screen material
  radarScreen.material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide
  });
  
  console.log('✅ Radar texture applied to integrated screen');
  
  // Return texture for updates
  return texture;
}
