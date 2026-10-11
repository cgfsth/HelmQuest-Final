/** Mesh / group names hidden in helm camera (bow deck rails, bulwarks, etc.). */
const HELM_HIDDEN_NAME = /bastingage|bulwark|handrail|BoatRailings|BoatLadder|guardrail|lifeline|stanchion|(^|_)rail(ing)?($|[_\s.])/i;

/**
 * Hide bow deck rails & bulwarks in helm view; show them in chase/orbit.
 * @param {THREE.Object3D | null} boatRoot
 * @param {boolean} helmView
 */
export function syncHelmDeckRailsVisibility(boatRoot, helmView) {
  if (!boatRoot) return;

  boatRoot.traverse((obj) => {
    if (!obj.isMesh && !obj.isGroup) return;
    const name = obj.name || '';
    if (obj.userData.helmDeckRail || HELM_HIDDEN_NAME.test(name)) {
      obj.visible = !helmView;
    }
  });
}

/**
 * Tag trawler / GLB rail meshes after load (French mesh names, etc.).
 * @param {THREE.Object3D} root
 */
export function tagHelmDeckRailMeshes(root) {
  root.traverse((obj) => {
    const n = (obj.name || '').toLowerCase();
    if (/bastingage|bulwark|handrail|guardrail|lifeline|stanchion/.test(n)) {
      obj.userData.helmDeckRail = true;
    }
  });

  root.traverse((obj) => {
    if (obj.userData.helmDeckRail) {
      obj.visible = true;
    }
  });
}
