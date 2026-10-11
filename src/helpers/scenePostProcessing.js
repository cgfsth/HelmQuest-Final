import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.08 },
    contrast: { value: 1.05 },
    brightness: { value: 0.02 },
    tint: { value: new THREE.Vector3(1.0, 0.98, 0.95) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    uniform vec3 tint;
    varying vec2 vUv;

    vec3 adjustSaturation(vec3 color, float sat) {
      float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(l), color, sat);
    }

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 color = tex.rgb * tint;
      color = adjustSaturation(color, saturation);
      color = (color - 0.5) * contrast + 0.5 + brightness;
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), tex.a);
    }
  `,
};

/**
 * Post-processing: render → subtle bloom → color grade → SMAA.
 */
export function createScenePostProcessing(renderer, scene, camera) {
  if (!renderer || !scene || !camera) {
    throw new Error('Post-processing requires renderer, scene, and camera');
  }

  const size = new THREE.Vector2();
  renderer.getSize(size);

  const composer = new EffectComposer(renderer);
  composer.setSize(size.x, size.y);
  composer.setPixelRatio(renderer.getPixelRatio());

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.1,
    0.4,
    0.992
  );
  composer.addPass(bloomPass);

  const gradePass = new ShaderPass(ColorGradeShader);
  composer.addPass(gradePass);

  let smaaPass = null;
  try {
    smaaPass = new SMAAPass(
      size.x * renderer.getPixelRatio(),
      size.y * renderer.getPixelRatio()
    );
    composer.addPass(smaaPass);
  } catch (err) {
    console.warn('[postprocessing] SMAA unavailable, continuing without it:', err);
  }

  const defaultGrade = {
    saturation: gradePass.uniforms.saturation.value,
    contrast: gradePass.uniforms.contrast.value,
    brightness: gradePass.uniforms.brightness.value,
    tint: gradePass.uniforms.tint.value.clone(),
  };

  return {
    composer,
    renderPass,
    bloomPass,
    gradePass,
    smaaPass,
    defaultGrade,
    setColorGrade({ saturation, contrast, brightness, tint } = {}) {
      if (saturation != null) gradePass.uniforms.saturation.value = saturation;
      if (contrast != null) gradePass.uniforms.contrast.value = contrast;
      if (brightness != null) gradePass.uniforms.brightness.value = brightness;
      if (tint != null) gradePass.uniforms.tint.value.set(tint[0], tint[1], tint[2]);
    },
    resetColorGrade() {
      gradePass.uniforms.saturation.value = defaultGrade.saturation;
      gradePass.uniforms.contrast.value = defaultGrade.contrast;
      gradePass.uniforms.brightness.value = defaultGrade.brightness;
      gradePass.uniforms.tint.value.copy(defaultGrade.tint);
    },
    render() {
      if (!composer?.render) return;
      composer.render();
    },
    setCamera(cam) {
      if (renderPass && cam) renderPass.camera = cam;
    },
    resize(width, height) {
      if (!composer) return;
      composer.setSize(width, height);
      composer.setPixelRatio(renderer.getPixelRatio());
      bloomPass.resolution.set(width, height);
      smaaPass?.setSize?.(
        width * renderer.getPixelRatio(),
        height * renderer.getPixelRatio()
      );
    },
    dispose() {
      composer?.dispose?.();
    },
  };
}
