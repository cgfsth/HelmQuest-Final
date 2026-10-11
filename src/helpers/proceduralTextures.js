import * as THREE from 'three';

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, ux),
    THREE.MathUtils.lerp(c, d, ux),
    uy
  );
}

function fbm(x, y, octaves = 4) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeNormalFromHeight(ctx, width, height, scale = 2.5) {
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const hL = src.data[((y * width + ((x - 1 + width) % width)) * 4)];
      const hR = src.data[((y * width + ((x + 1) % width)) * 4)];
      const hD = src.data[((((y - 1 + height) % height) * width + x) * 4)];
      const hU = src.data[((((y + 1) % height) * width + x) * 4)];
      const dx = (hR - hL) / 255;
      const dy = (hU - hD) / 255;
      const nx = -dx * scale;
      const ny = -dy * scale;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      out.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

const PALETTES = {
  sand: { base: [210, 188, 140], accent: [230, 210, 165] },
  grass: { base: [72, 128, 52], accent: [96, 152, 64] },
  forest: { base: [34, 78, 38], accent: [48, 96, 44] },
  rock: { base: [110, 104, 96], accent: [140, 132, 120] },
  mountain: { base: [150, 146, 138], accent: [185, 180, 172] },
};

function paintLayer(ctx, width, height, palette, noiseScale, contrast = 1) {
  const img = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = fbm(x * noiseScale, y * noiseScale, 5);
      const t = THREE.MathUtils.clamp((n - 0.35) * contrast + 0.5, 0, 1);
      const r = THREE.MathUtils.lerp(palette.base[0], palette.accent[0], t);
      const g = THREE.MathUtils.lerp(palette.base[1], palette.accent[1], t);
      const b = THREE.MathUtils.lerp(palette.base[2], palette.accent[2], t);
      const i = (y * width + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function createLayerTexture(type, size = 256) {
  const palette = PALETTES[type];
  const map = canvasTexture(size, size, (ctx, w, h) => {
    paintLayer(ctx, w, h, palette, type === 'sand' ? 0.08 : 0.05, type === 'rock' ? 1.4 : 1);
  });
  map.repeat.set(8, 8);

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nctx = normalCanvas.getContext('2d');
  nctx.drawImage(map.image, 0, 0);
  makeNormalFromHeight(nctx, size, size, type === 'rock' ? 4 : 2.2);
  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.colorSpace = THREE.NoColorSpace;

  return { map, normalMap };
}

/** Tileable terrain surface textures + normal maps. */
export function createTerrainTextureSet() {
  return {
    sand: createLayerTexture('sand'),
    grass: createLayerTexture('grass'),
    forest: createLayerTexture('forest'),
    rock: createLayerTexture('rock'),
    mountain: createLayerTexture('mountain'),
  };
}

/** Procedural water normal map when waternormals.jpg is unavailable. */
export function createWaterNormalTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = fbm(x * 0.02, y * 0.02, 4);
      const n2 = fbm(x * 0.06 + 40, y * 0.06, 3);
      const h = n1 * 0.65 + n2 * 0.35;
      const dx = fbm(x * 0.02 + 0.5, y * 0.02, 4) - fbm(x * 0.02 - 0.5, y * 0.02, 4);
      const dy = fbm(x * 0.02, y * 0.02 + 0.5, 4) - fbm(x * 0.02, y * 0.02 - 0.5, 4);
      const nx = -dx * 3;
      const ny = -dy * 3;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/** Detail normal map derived from heightmap luminance. */
export function createTerrainDetailNormal(heightmapImage, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(heightmapImage, 0, 0, size, size);
  makeNormalFromHeight(ctx, size, size, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
