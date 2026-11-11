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
  uniform vec2 uResolution;
  uniform float uExposure;
  uniform float uBloom;
  uniform float uVignette;
  uniform float uGrain;
  uniform float uChroma;
  uniform float uTime;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uScan;

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

    vec3 bloom = texture2D(tBloomNear, uv).rgb * 0.62 + texture2D(tBloomFar, uv).rgb * 0.9;
    vec3 color = base + bloom * uBloom;

    // cool optical lift in the shadows, warm highlights
    color *= uExposure;
    color = acesFilm(color);

    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 shadowTint = vec3(0.90, 0.98, 1.06);
    vec3 highTint = vec3(1.055, 1.008, 0.944);
    vec3 tint = mix(shadowTint, highTint, smoothstep(0.04, 0.8, lum));
    color *= tint;
    color += vec3(0.004, 0.007, 0.009) * (1.0 - smoothstep(0.0, 0.4, lum));
    color = (color - 0.5) * uContrast + 0.5;
    color = clamp(color, 0.0, 1.0);

    vec3 grey = vec3(dot(color, vec3(0.2126, 0.7152, 0.0722)));
    color = mix(grey, color, uSaturation);

    float vig = smoothstep(0.99, 0.16, length(centered * vec2(1.04, 1.0)) * 1.42);
    color *= mix(1.0, vig, uVignette);

    // faint anamorphic blue flare on the brightest specular hit
    vec3 bright = max(base - 1.2, vec3(0.0));
    float flare = smoothstep(0.0, 0.9, bright.r + bright.g + bright.b);
    float streak = smoothstep(0.005, 0.0, abs(centered.y + 0.08)) * smoothstep(0.72, 0.0, abs(centered.x));
    color += vec3(0.035, 0.07, 0.08) * streak * uBloom;

    // barely perceptible HUD scan / lab vibe
    float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
    color -= uScan * 0.0075 * scanline * smoothstep(0.98, 0.0, length(centered));

    float grain = hash12(uv * uResolution + fract(uTime) * 137.0) - 0.5;
    color += grain * uGrain * (1.0 - abs(lum - 0.42) * 1.1);

    color = linearToSRGB(color);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class PostFX {
  constructor(renderer, { samples = 4 } = {}) {
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

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: brightFragment,
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: 1.6 }, uKnee: { value: 0.7 } },
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
        uResolution: { value: new THREE.Vector2(1, 1) },
        uExposure: { value: 0.82 },
        uBloom: { value: 0.3 },
        uVignette: { value: 0.9 },
        uGrain: { value: 0.027 },
        uChroma: { value: 0.005 },
        uTime: { value: 0 },
        uSaturation: { value: 1.04 },
        uContrast: { value: 1.055 },
        uScan: { value: 0.4 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.stats = null;
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
    this.compositeMat.uniforms.uResolution.value.set(w, h);
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  render(scene, camera, time) {
    const r = this.renderer;
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
    this.compositeMat.uniforms.uTime.value = time;
    this.quad.material = this.compositeMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCamera);
  }
}
