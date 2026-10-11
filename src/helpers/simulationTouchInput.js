/** Track independent fingers so releasing one control never releases another. */
export function createSimulationTouchInput({ press, release, changed = () => {} }) {
  const pointers = new Map();
  const codes = () => [...new Set(pointers.values())];
  return {
    press(pointerId, code) {
      if (pointers.has(pointerId)) return;
      const held = codes().includes(code);
      pointers.set(pointerId, code);
      if (!held) press(code);
      changed(codes());
    },
    release(pointerId) {
      const code = pointers.get(pointerId);
      if (!code) return;
      pointers.delete(pointerId);
      if (!codes().includes(code)) release(code);
      changed(codes());
    },
    reset() {
      const held = codes();
      pointers.clear();
      held.forEach(release);
      changed([]);
    },
  };
}
