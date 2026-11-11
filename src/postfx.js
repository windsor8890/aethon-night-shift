import * as THREE from 'three';

const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const brightFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  uniform float uKnee;
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float w = smoothstep(uThreshold, uThreshold + uKnee, lum);
    gl_FragColor = vec4(c * w, 1.0);
  }
`;

const blurFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection;
  void main() {
    vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.227027;
    sum += texture2D(tDiffuse, vUv + uDirection * 1.3846).rgb * 0.316216;
    sum += texture2D(tDiffuse, vUv - uDirection * 1.3846).rgb * 0.316216;
    sum += texture2D(tDiffuse, vUv + uDirection * 3.2308).rgb * 0.070270;
    sum += texture2D(tDiffuse, vUv - uDirection * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const compositeFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tScene;
  uniform sampler2D tBloomNear;
  uniform sampler2D tBloomFar;
  uniform sampler2D tMask;
  uniform vec2 uResolution;
  uniform vec2 uFocus;
  uniform vec2 uSun;
  uniform float uExposure;
  uniform float uBloom;
  uniform float uVignette;
  uniform float uGrain;
  uniform float uChroma;
  uniform float uTime;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uScan;
  uniform float uDof;
  uniform float uSpeedBlur;
  uniform float uStreak;
  uniform float uFlare;
  uniform float uShadowsWarm;

  vec3 acesFilm(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  vec3 linearToSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0001)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    float r2 = dot(centered, centered);

    vec2 ca = centered * uChroma * r2;
    vec3 base;
    base.r = texture2D(tScene, uv + ca).r;
    base.g = texture2D(tScene, uv).g;
    base.b = texture2D(tScene, uv - ca).b;

    // Dilate the subject mask by a couple of pixels so the blurred car does
    // not fringe around its own silhouette.
    float m0 = texture2D(tMask, uv).r;
    float m1 = texture2D(tMask, uv + vec2(0.0032, 0.0)).r;
    float m2 = texture2D(tMask, uv - vec2(0.0032, 0.0)).r;
    float m3 = texture2D(tMask, uv + vec2(0.0, 0.0045)).r;
    float m4 = texture2D(tMask, uv - vec2(0.0, 0.0045)).r;
    float m5 = texture2D(tMask, uv + vec2(0.0026, 0.0036)).r;
    float m6 = texture2D(tMask, uv - vec2(0.0026, 0.0036)).r;
    float mask = max(m0, max(max(m1, m2), max(max(m3, m4), max(m5, m6))));
    mask = smoothstep(0.18, 0.58, mask);

    // Selective lens blur. The car renders into a small white mask target;
    // the background is defocused while the subject stays crisp. A radial
    // component adds speed streaking without smearing the car.
    if (uDof > 0.001 || uSpeedBlur > 0.001) {
      vec3 soft = vec3(0.0);
      float weight = 0.0;
      vec2 radialDir = uv - uFocus;
      radialDir.x *= uResolution.x / max(1.0, uResolution.y);
      float radialLen = length(radialDir);
      vec2 radial = radialLen > 0.0001 ? normalize(radialDir) : vec2(0.0);
      for (int i = 0; i < 10; i++) {
        float fi = float(i) + 0.5;
        float a = fi * 2.39996323;
        float r = sqrt(fi / 10.0);
        vec2 disc = vec2(cos(a) * 1.35, sin(a) * 0.8) * r * uDof;
        vec2 trail = radial * uSpeedBlur * (0.25 + fi / 10.0);
        float w = 0.55 + 0.45 * (1.0 - r);
        soft += texture2D(tScene, clamp(uv + disc + trail, vec2(0.001), vec2(0.999))).rgb * w;
        weight += w;
      }
      soft /= max(0.0001, weight);
      base = mix(soft, base, mask);
    }

    vec3 bloom = texture2D(tBloomNear, uv).rgb * 0.62 + texture2D(tBloomFar, uv).rgb * 0.9;

    // horizontal anamorphic tail from the brightest highlights
    vec3 streak = vec3(0.0);
    if (uStreak > 0.001) {
      float total = 0.0;
      for (int i = -5; i <= 5; i++) {
        float fi = float(i);
        float w = exp(-abs(fi) * 0.38);
        streak += texture2D(tBloomFar, uv + vec2(fi * 0.0075, 0.0)).rgb * w;
        total += w;
      }
      streak /= total;
    }

    vec3 color = base + bloom * uBloom + streak * uStreak * vec3(0.42, 0.65, 1.0);

    color *= uExposure;
    color = acesFilm(color);

    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 shadowTint = vec3(0.88, 0.975, 1.07);
    vec3 highTint = vec3(1.06, 1.02, 0.94);
    if (uShadowsWarm > 0.0) {
      shadowTint = mix(shadowTint, vec3(1.03, 0.94, 0.86), uShadowsWarm);
      highTint = mix(highTint, vec3(1.08, 0.985, 0.88), uShadowsWarm);
    }
    vec3 tint = mix(shadowTint, highTint, smoothstep(0.04, 0.8, lum));
    color *= tint;
    color += vec3(0.004, 0.007, 0.009) * (1.0 - smoothstep(0.0, 0.4, lum));
    color = (color - 0.5) * uContrast + 0.5;
    color = clamp(color, 0.0, 1.0);

    vec3 grey = vec3(dot(color, vec3(0.2126, 0.7152, 0.0722)));
    color = mix(grey, color, uSaturation);

    // sun flare: soft optical bloom and a few ghost rings along the axis
    if (uFlare > 0.001) {
      vec2 d = uv - uSun;
      d.x *= uResolution.x / max(1.0, uResolution.y);
      float dist = length(d);
      float glow = exp(-dist * 22.0) * 0.35 + exp(-dist * 7.0) * 0.05;
      float ring = smoothstep(0.018, 0.0, abs(dist - 0.23)) * 0.02;
      vec2 g1 = (uv - 0.5) * -0.75 + 0.5 - uSun;
      g1.x *= uResolution.x / max(1.0, uResolution.y);
      float ghost = smoothstep(0.035, 0.0, length(g1)) * 0.018;
      vec3 flareCol = vec3(1.0, 0.62, 0.32);
      color += flareCol * (glow * 0.55 + ring + ghost) * uFlare;
    }

    float vig = smoothstep(0.99, 0.16, length(centered * vec2(1.04, 1.0)) * 1.42);
    color *= mix(1.0, vig, uVignette);

    float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
    color -= uScan * 0.0075 * scanline * smoothstep(0.98, 0.0, length(centered));

    float grain = hash12(uv * uResolution + fract(uTime) * 137.0) - 0.5;
    color += grain * uGrain * (1.0 - abs(lum - 0.42) * 1.1);

    color = linearToSRGB(color);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class PostFX {
  constructor(renderer, { samples = 2 } = {}) {
    this.renderer = renderer;
    this.samples = samples;
    const rtOpts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, {
      ...rtOpts,
      depthBuffer: true,
      samples,
    });
    this.nearRT = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.nearBlurRT = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.farRT = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.farBlurRT = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.maskRT = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
    });

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.maskCameraLayers = 1;

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: brightFragment,
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: 1.35 }, uKnee: { value: 0.85 } },
      depthTest: false,
      depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: blurFragment,
      uniforms: { tDiffuse: { value: null }, uDirection: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    });
    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: compositeFragment,
      uniforms: {
        tScene: { value: null },
        tBloomNear: { value: null },
        tBloomFar: { value: null },
        tMask: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uFocus: { value: new THREE.Vector2(0.5, 0.5) },
        uSun: { value: new THREE.Vector2(0.5, 0.8) },
        uExposure: { value: 0.7 },
        uBloom: { value: 0.35 },
        uVignette: { value: 0.9 },
        uGrain: { value: 0.024 },
        uChroma: { value: 0.0035 },
        uTime: { value: 0 },
        uSaturation: { value: 1.02 },
        uContrast: { value: 1.03 },
        uScan: { value: 0.1 },
        uDof: { value: 0.0 },
        uSpeedBlur: { value: 0.0 },
        uStreak: { value: 0.12 },
        uFlare: { value: 0.0 },
        uShadowsWarm: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.stats = null;
    this.maskEnabled = true;
  }

  setSize(width, height) {
    const w = Math.max(2, Math.floor(width));
    const h = Math.max(2, Math.floor(height));
    this.width = w;
    this.height = h;
    this.sceneRT.setSize(w, h);
    const hw = Math.max(2, Math.floor(w / 2));
    const hh = Math.max(2, Math.floor(h / 2));
    this.nearRT.setSize(hw, hh);
    this.nearBlurRT.setSize(hw, hh);
    const qw = Math.max(2, Math.floor(w / 4));
    const qh = Math.max(2, Math.floor(h / 4));
    this.farRT.setSize(qw, qh);
    this.farBlurRT.setSize(qw, qh);
    this.maskRT.setSize(hw, hh);
    this.compositeMat.uniforms.uResolution.value.set(w, h);
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  renderMask(scene, camera) {
    const r = this.renderer;
    const oldBackground = scene.background;
    const oldOverride = scene.overrideMaterial;
    const oldFog = scene.fog;
    const oldAutoClear = r.autoClear;
    const oldClear = new THREE.Color();
    r.getClearColor(oldClear);
    const oldAlpha = r.getClearAlpha();
    const layers = camera.layers.mask;

    scene.background = null;
    scene.fog = null;
    scene.overrideMaterial = this.maskMaterial;
    camera.layers.set(this.maskCameraLayers);

    r.autoClear = false;
    r.setRenderTarget(this.maskRT);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(scene, camera);

    r.autoClear = oldAutoClear;
    r.setRenderTarget(null);
    r.setClearColor(oldClear, oldAlpha);
    scene.background = oldBackground;
    scene.overrideMaterial = oldOverride;
    scene.fog = oldFog;
    camera.layers.mask = layers;
  }

  render(scene, camera, time) {
    const r = this.renderer;
    if (this.maskEnabled) this.renderMask(scene, camera);

    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);
    this.stats = {
      calls: r.info.render.calls,
      triangles: r.info.render.triangles,
      textures: r.info.memory.textures,
      geometries: r.info.memory.geometries,
      programs: r.info.programs?.length ?? 0,
    };

    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    this.pass(this.brightMat, this.nearRT);

    this.blurMat.uniforms.tDiffuse.value = this.nearRT.texture;
    this.blurMat.uniforms.uDirection.value.set(1 / this.nearRT.width, 0);
    this.pass(this.blurMat, this.nearBlurRT);
    this.blurMat.uniforms.tDiffuse.value = this.nearBlurRT.texture;
    this.blurMat.uniforms.uDirection.value.set(0, 1 / this.nearRT.height);
    this.pass(this.blurMat, this.nearRT);

    // second, wider bloom lobe
    this.brightMat.uniforms.tDiffuse.value = this.nearRT.texture;
    this.pass(this.brightMat, this.farRT);
    this.blurMat.uniforms.tDiffuse.value = this.farRT.texture;
    this.blurMat.uniforms.uDirection.value.set(1.4 / this.farRT.width, 0);
    this.pass(this.blurMat, this.farBlurRT);
    this.blurMat.uniforms.tDiffuse.value = this.farBlurRT.texture;
    this.blurMat.uniforms.uDirection.value.set(0, 1.4 / this.farRT.height);
    this.pass(this.blurMat, this.farRT);

    this.compositeMat.uniforms.tScene.value = this.sceneRT.texture;
    this.compositeMat.uniforms.tBloomNear.value = this.nearRT.texture;
    this.compositeMat.uniforms.tBloomFar.value = this.farRT.texture;
    this.compositeMat.uniforms.tMask.value = this.maskRT.texture;
    this.compositeMat.uniforms.uTime.value = time;
    this.quad.material = this.compositeMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCamera);
  }
}
