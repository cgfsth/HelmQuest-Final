const GRAPHICS = {
  low: { pixelRatio: 1, bloom: false, smaa: false },
  medium: { pixelRatio: 1.25, bloom: false, smaa: true },
  high: { pixelRatio: 1.5, bloom: true, smaa: true },
  ultra: { pixelRatio: 2, bloom: true, smaa: true },
};

export function getRenderQuality(quality, devicePixelRatio = 1) {
  const profile = GRAPHICS[quality] || GRAPHICS.medium;
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return { ...profile, pixelRatio: Math.min(ratio, profile.pixelRatio) };
}

export function getShadowMapSize(quality) {
  return { off: 0, low: 512, medium: 1024, high: 2048 }[quality] ?? 512;
}

/** Menus need no physics; stop rendering opaque screens and cap animated backdrops. */
export function shouldRenderScene(screen, hidden, now, lastFrame) {
  if (hidden) return false;
  if (screen === 'simulation') return true;
  if (screen !== 'landing' && screen !== 'play-options') return false;
  return !lastFrame || now - lastFrame >= 1000 / 30 - 1;
}
