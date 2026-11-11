import * as THREE from 'three';
import { mergeStaticMeshes } from '../lib/merge.js';

function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  return tex;
}

function makeAsphaltTexture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#1d1e21';
    ctx.fillRect(0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.96));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.9));
    }
    ctx.putImageData(image, 0, 0);
    // coarse aggregate and faint seams
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 0.4 + Math.random() * 1.1;
      ctx.fillStyle = Math.random() > 0.44 ? 'rgba(220,220,220,0.11)' : 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(5,6,7,0.32)';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 1 + Math.random() * 2.2;
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (Math.random() - 0.5) * 30;
        y += (Math.random() - 0.2) * 38;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // very faint broad tyre polish bands
    for (const x of [w * 0.26, w * 0.7]) {
      const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
      g.addColorStop(0, 'rgba(80,80,80,0)');
      g.addColorStop(0.5, 'rgba(80,80,80,0.09)');
      g.addColorStop(1, 'rgba(80,80,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 70, 0, 140, h);
    }
  }, { repeat: [3, 40] });
}

function makeConcreteTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6d706f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3800; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.055)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.strokeStyle = 'rgba(20,24,24,0.18)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= h; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, { repeat: [1, 6] });
}

function makeFenceTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(157,178,178,0.45)';
    ctx.lineWidth = 1.2;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(210,225,220,0.12)';
    for (let d = -h; d < w; d += 32) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + h, h);
      ctx.stroke();
    }
  }, { repeat: [2, 5] });
}

function makeCrowdTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#111315';
    ctx.fillRect(0, 0, w, h);
    const palettes = ['#b7aa97', '#63737a', '#9a5b4e', '#7f8d7a', '#c8c2b4', '#32383e', '#a56c42'];
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.globalAlpha = 0.22 + Math.random() * 0.55;
      ctx.fillStyle = palettes[(Math.random() * palettes.length) | 0];
      ctx.fillRect(x, y, 1.2 + Math.random() * 2.4, 1.2 + Math.random() * 3.2);
    }
    ctx.globalAlpha = 0.35;
    for (let x = 0; x < w; x += 128) {
      ctx.fillStyle = '#050607';
      ctx.fillRect(x, 0, 9, h);
    }
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, 3);
  }, { repeat: [4, 1] });
}

function makeWordmarkTexture(text, sub = '') {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f1eee6';
    ctx.font = '800 136px "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '4px';
    ctx.fillText(text, w / 2, h * 0.44);
    if (sub) {
      ctx.fillStyle = '#d3442a';
      ctx.font = '600 27px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sub, w / 2, h * 0.77);
    }
  });
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = normalize(world.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const skyFragment = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uSunDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSun;
  uniform float uHaze;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(7.2, 3.8);
      a *= 0.52;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, -0.08, 1.0);
    float horizon = smoothstep(-0.03, 0.24, h);
    vec3 col = mix(uHorizon, uTop, pow(horizon, 0.72));
    col = mix(col, uGround, smoothstep(0.03, -0.08, h));

    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    float sunDisc = smoothstep(0.99965, 0.99988, sd);
    float sunCore = pow(sd, 1200.0);
    float sunBloom = pow(sd, 16.0) * 0.55 + pow(sd, 4.0) * 0.18;
    col += uSun * (sunDisc * 5.5 + sunCore * 3.0 + sunBloom * 1.35);

    // thin, high cloud bands lit from below by the low sun
    vec2 p = vec2(atan(dir.z, dir.x) * 1.8, dir.y * 8.0);
    float cloud = fbm(p * 1.4 + vec2(1.4, 0.0));
    cloud = smoothstep(0.62, 0.82, cloud) * smoothstep(0.02, 0.26, h) * (1.0 - smoothstep(0.5, 0.82, h));
    vec3 cloudCol = mix(vec3(0.16, 0.10, 0.09), vec3(0.85, 0.44, 0.28), smoothstep(0.8, 0.1, h));
    col = mix(col, cloudCol, cloud * 0.48);

    // warm atmospheric haze band just above the horizon
    float haze = exp(-pow((h - 0.015) * 18.0, 2.0));
    col = mix(col, uHorizon * 1.18 + uSun * 0.06, haze * 0.32 * uHaze);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function makeSky() {
  const sunDir = new THREE.Vector3(0.06, 0.105, 0.992).normalize();
  const mat = new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    uniforms: {
      uSunDir: { value: sunDir },
      uTop: { value: new THREE.Color(0x050c1a) },
      uHorizon: { value: new THREE.Color(0xb86a43) },
      uGround: { value: new THREE.Color(0x141210) },
      uSun: { value: new THREE.Color(0xffc78d) },
      uHaze: { value: 1.15 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 48, 32), mat);
  sky.name = 'dawn-sky';
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  return { sky, sunDir };
}

function makeGlowTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,246,220,1)');
  g.addColorStop(0.08, 'rgba(255,222,170,0.96)');
  g.addColorStop(0.28, 'rgba(255,174,110,0.36)');
  g.addColorStop(0.6, 'rgba(255,126,72,0.09)');
  g.addColorStop(1, 'rgba(255,100,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addPitGarageFacade(staticRoot, mats, z, side) {
  // A receding row of dark garage bays at the edge of the straight.
  const innerX = side * 16.6;
  for (let i = 0; i < 5; i++) {
    const zz = z + i * 16;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(10, 5.2, 13), mats.stand);
    shell.position.set(innerX + side * 5, 2.6, zz);
    staticRoot.add(shell);
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6), mats.dark);
    opening.position.set(innerX - side * 0.015, 1.8, zz);
    opening.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    staticRoot.add(opening);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 0.08), mats.lamp);
    light.position.set(innerX - side * 0.025, 3.4, zz);
    light.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    staticRoot.add(light);
    const upperBand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 11.2), mats.strip);
    upperBand.position.set(innerX - side * 0.03, 4.45, zz);
    staticRoot.add(upperBand);
    for (let k = 0; k < 4; k++) {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.27), mats.lamp);
      window.position.set(innerX - side * 0.035, 4.8, zz - 4.2 + k * 2.8);
      window.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      staticRoot.add(window);
    }
  }
}

function addRidge(group, z, height, color, seed) {
  const shape = new THREE.Shape();
  const rng = (() => {
    let a = seed;
    return () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
  })();
  shape.moveTo(-300, -3);
  let x = -300;
  let y = 0;
  while (x < 300) {
    x += 18 + rng() * 30;
    y = Math.max(0, height * (0.3 + rng() * 0.7));
    if (Math.abs(x) < 110) y *= 0.55 + rng() * 0.6;
    shape.lineTo(Math.min(300, x), y);
  }
  shape.lineTo(300, -3);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    fog: true,
  }));
  mesh.position.z = z;
  mesh.renderOrder = -60;
  group.add(mesh);
}

export function buildTrack() {
  const group = new THREE.Group();
  group.name = 'dawn-circuit';

  const asphaltMap = makeAsphaltTexture();
  const concreteMap = makeConcreteTexture();
  const fenceMap = makeFenceTexture();
  const crowdMap = makeCrowdTexture();
  const wordmark = makeWordmarkTexture('AETHON', 'FORMULA / 2022');
  const startMark = makeWordmarkTexture('START  /  FINISH', 'AETHON CIRCUIT  ·  SECTOR 01');

  const mats = {
    asphalt: new THREE.MeshPhysicalMaterial({
      map: asphaltMap,
      color: 0x989796,
      roughness: 0.72,
      metalness: 0.04,
      clearcoat: 0.22,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.38,
    }),
    concrete: new THREE.MeshStandardMaterial({
      map: concreteMap,
      color: 0x777a76,
      roughness: 0.72,
      metalness: 0.04,
    }),
    barrier: new THREE.MeshPhysicalMaterial({
      color: 0xd9d8d0,
      roughness: 0.45,
      metalness: 0.12,
      clearcoat: 0.4,
      envMapIntensity: 0.6,
    }),
    red: new THREE.MeshStandardMaterial({ color: 0x9e2418, roughness: 0.5, metalness: 0.12 }),
    dark: new THREE.MeshPhysicalMaterial({
      color: 0x070b0d,
      roughness: 0.25,
      metalness: 0.7,
      clearcoat: 0.4,
      envMapIntensity: 0.9,
    }),
    metal: new THREE.MeshStandardMaterial({ color: 0x394345, roughness: 0.42, metalness: 0.8 }),
    stand: new THREE.MeshStandardMaterial({ color: 0x1c2428, roughness: 0.7, metalness: 0.25 }),
    white: new THREE.MeshPhysicalMaterial({
      color: 0xc9cbc2,
      roughness: 0.48,
      metalness: 0.06,
      clearcoat: 0.25,
      envMapIntensity: 0.5,
    }),
    line: new THREE.MeshStandardMaterial({
      color: 0xe1e1d5,
      roughness: 0.5,
      metalness: 0.02,
      emissive: 0x22221b,
      emissiveIntensity: 0.7,
    }),
    yellow: new THREE.MeshStandardMaterial({
      color: 0xd6a436,
      roughness: 0.5,
      metalness: 0.04,
      emissive: 0x362607,
      emissiveIntensity: 0.8,
    }),
    grass: new THREE.MeshStandardMaterial({
      color: 0x27342a,
      roughness: 0.95,
      metalness: 0,
    }),
    crowd: new THREE.MeshBasicMaterial({ map: crowdMap, side: THREE.DoubleSide, toneMapped: true }),
    fence: new THREE.MeshBasicMaterial({
      map: fenceMap,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: true,
    }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffe3b4, toneMapped: false }),
    strip: new THREE.MeshBasicMaterial({ color: 0xcde9e1, toneMapped: false }),
    redLamp: new THREE.MeshBasicMaterial({ color: 0xff2b1c, toneMapped: false }),
    wordmark: new THREE.MeshBasicMaterial({
      map: wordmark,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: true,
    }),
    startMark: new THREE.MeshBasicMaterial({
      map: startMark,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: true,
    }),
  };

  const staticRoot = new THREE.Group();
  group.add(staticRoot);

  // surrounding earth
  const earth = new THREE.Mesh(new THREE.PlaneGeometry(500, 620), mats.grass);
  earth.rotation.x = -Math.PI / 2;
  earth.position.set(0, -0.035, 210);
  earth.receiveShadow = true;
  staticRoot.add(earth);

  // main asphalt ribbon
  const road = new THREE.Mesh(new THREE.PlaneGeometry(20, 330), mats.asphalt);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.002, 173);
  road.receiveShadow = true;
  staticRoot.add(road);

  // pit apron / concrete threshold at the garage mouth
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), mats.concrete);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0.006, 14.2);
  apron.receiveShadow = true;
  staticRoot.add(apron);
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.035, 0.55), mats.metal);
  threshold.position.set(0, 0.014, 8.72);
  threshold.receiveShadow = true;
  staticRoot.add(threshold);

  const addGroundLine = (x, z, w, d, mat = mats.line) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012, z);
    staticRoot.add(m);
  };
  // track edge lines
  addGroundLine(-8.75, 173, 0.22, 320);
  addGroundLine(8.75, 173, 0.22, 320);
  addGroundLine(0, 33.5, 0.12, 48, mats.yellow);
  // pit-exit chevrons
  for (let i = 0; i < 5; i++) {
    addGroundLine(-5.7 + i * 2.8, 13.8, 1.9, 0.16, mats.line);
  }
  // grid slots
  for (let i = 0; i < 3; i++) {
    addGroundLine(0, 26 + i * 9, 8.2, 0.2, mats.line);
    addGroundLine(-4.1, 26 + i * 9, 0.16, 1.4, mats.line);
    addGroundLine(4.1, 26 + i * 9, 0.16, 1.4, mats.line);
  }

  // start/finish checkered band
  const checkCanvas = document.createElement('canvas');
  checkCanvas.width = 512;
  checkCanvas.height = 64;
  const cctx = checkCanvas.getContext('2d');
  cctx.fillStyle = '#111315';
  cctx.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 2 === 0) {
        cctx.fillStyle = '#eceadd';
        cctx.fillRect(i * 16, j * 16, 16, 16);
      }
    }
  }
  const checkTex = new THREE.CanvasTexture(checkCanvas);
  checkTex.colorSpace = THREE.SRGBColorSpace;
  const checkMat = new THREE.MeshStandardMaterial({
    map: checkTex,
    roughness: 0.5,
    metalness: 0.02,
    emissive: 0x161611,
    emissiveIntensity: 0.4,
  });
  const check = new THREE.Mesh(new THREE.PlaneGeometry(23, 2.8), checkMat);
  check.rotation.x = -Math.PI / 2;
  check.position.set(0, 0.014, 61.5);
  staticRoot.add(check);

  // continuous concrete barriers both sides
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.05, 314), mats.concrete);
    wall.position.set(s * 10.0, 0.525, 170);
    wall.castShadow = true;
    wall.receiveShadow = true;
    staticRoot.add(wall);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.085, 314), mats.barrier);
    top.position.set(s * 10.0, 1.09, 170);
    staticRoot.add(top);
    const redBand = new THREE.Mesh(new THREE.BoxGeometry(0.73, 0.12, 314), mats.red);
    redBand.position.set(s * 10.0, 0.64, 170);
    staticRoot.add(redBand);

    // catch-fence posts and the fabric itself
    for (let z = 12; z <= 320; z += 8) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 4.0, 0.11), mats.metal);
      post.position.set(s * 10.05, 2.9, z);
      staticRoot.add(post);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), mats.metal);
      brace.position.set(s * 9.9, 4.65, z);
      brace.rotation.z = s * 0.25;
      staticRoot.add(brace);
    }
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(314, 3.8), mats.fence);
    fence.rotation.y = Math.PI / 2;
    fence.position.set(s * 10.03, 2.95, 170);
    group.add(fence);

    // sponsor boards tied to the barrier
    for (let z = 16; z < 300; z += 24) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 9.5), mats.dark);
      board.position.set(s * 10.42, 1.64, z);
      staticRoot.add(board);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 0.38), mats.wordmark);
      mark.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      mark.position.set(s * 10.49, 1.64, z);
      group.add(mark);
    }

    // mixed compound tyre stacks against the barrier
    for (let z = 34; z < 280; z += 46) {
      for (let i = 0; i < 3; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.13, 6, 18), mats.dark);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(s * 10.55, 0.28 + i * 0.22, z);
        staticRoot.add(tire);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 4, 24), mats.red);
        band.rotation.x = Math.PI / 2;
        band.position.set(s * 10.55, 0.34 + i * 0.22, z);
        staticRoot.add(band);
      }
    }
  }

  // vertical support columns that read as pit-wall architecture
  for (const s of [-1, 1]) {
    for (let z = 20; z <= 250; z += 50) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 6.8, 0.55), mats.dark);
      col.position.set(s * 11.2, 3.4, z);
      staticRoot.add(col);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 5.8, 0.04), mats.strip);
      strip.position.set(s * 10.91, 3.7, z);
      staticRoot.add(strip);
    }
  }

  // overhead light towers, safe behind the barriers
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 9.5, 6);
  for (const s of [-1, 1]) {
    for (let z = 34; z <= 290; z += 42) {
      const pole = new THREE.Mesh(poleGeo, mats.metal);
      pole.position.set(s * 12.8, 4.75, z);
      staticRoot.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.13, 0.13), mats.metal);
      arm.position.set(s * 12.25, 9.35, z);
      staticRoot.add(arm);
      for (let k = 0; k < 3; k++) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.3), mats.lamp);
        lamp.position.set(s * (12.66 - k * 0.55), 9.25, z);
        staticRoot.add(lamp);
      }
    }
  }

  // main gantries: one at the start line, a lighter one far down the straight
  const buildGantry = (z, height, span, lightCount) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.75, height, 0.75), mats.dark);
      tower.position.set(s * (span / 2), height / 2, z);
      staticRoot.add(tower);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 1.7), mats.concrete);
      base.position.set(s * (span / 2), 0.22, z);
      staticRoot.add(base);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 1.2, 1.55, 1.1), mats.dark);
    beam.position.set(0, height - 0.6, z);
    staticRoot.add(beam);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(span * 0.78, 1.3), mats.startMark);
    banner.position.set(0, height - 0.66, z + 0.57);
    group.add(banner);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(span + 0.3, 0.06, 1.12), mats.red);
    stripe.position.set(0, height - 1.38, z);
    staticRoot.add(stripe);
    const lights = [];
    for (let i = 0; i < lightCount; i++) {
      const lm = mats.redLamp.clone();
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.14), lm);
      lamp.position.set((i - (lightCount - 1) / 2) * 0.72, height - 1.9, z + 0.58);
      group.add(lamp);
      lights.push(lm);
    }
    return lights;
  };
  const startLights = buildGantry(63, 8.2, 22, 5);
  buildGantry(194, 6.2, 25, 3);

  // grandstands beyond the fence, built as broad dark masses with crowds
  const buildStand = (z, s) => {
    const x = s * 27;
    for (let tier = 0; tier < 6; tier++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.8, 4.6), mats.stand);
      step.position.set(x + s * tier * 0.6, 0.4 + tier * 0.72, z + tier * 0.15);
      staticRoot.add(step);
    }
    const crowd = new THREE.Mesh(new THREE.PlaneGeometry(20, 4.3), mats.crowd);
    crowd.position.set(x - s * 1.2, 3.35, z);
    crowd.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    crowd.rotation.z = s > 0 ? -0.08 : 0.08;
    group.add(crowd);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.3, 12), mats.stand);
    roof.position.set(x + s * 2.3, 6.5, z);
    roof.rotation.z = s * 0.06;
    staticRoot.add(roof);
    for (const zz of [-5.4, 5.4]) {
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 0.3), mats.metal);
      mast.position.set(x + s * 2.8, 3.2, z + zz);
      staticRoot.add(mast);
    }
    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.16, 0.32), mats.lamp);
    lightStrip.position.set(x + s * 1.0, 5.9, z + 5.75);
    staticRoot.add(lightStrip);
  };
  buildStand(105, -1);
  buildStand(145, 1);
  buildStand(195, -1);
  buildStand(235, 1);

  // distant pit buildings and layered mountain silhouettes in the haze
  addPitGarageFacade(staticRoot, mats, 26, 1);
  addPitGarageFacade(staticRoot, mats, 42, -1);
  addRidge(group, 430, 26, 0x211b1f, 81);
  addRidge(group, 380, 14, 0x2e2224, 27);
  addRidge(group, 330, 8, 0x372a27, 11);

  // light flag poles with cloth planes near the first bend
  for (const s of [-1, 1]) {
    for (let z = 42; z <= 230; z += 47) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 6.2, 5), mats.metal);
      pole.position.set(s * 18.6, 3.1, z);
      staticRoot.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), mats.red);
      flag.position.set(s * 17.98, 5.55, z);
      flag.rotation.y = Math.PI / 2;
      group.add(flag);
    }
  }

  // merge all the static opaque architecture into a handful of draws
  mergeStaticMeshes(staticRoot, { name: 'circuit' });

  // sky, sun and atmosphere
  const { sky, sunDir } = makeSky();
  group.add(sky);

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffdfb0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    opacity: 0.9,
  }));
  sunSprite.scale.set(165, 165, 1);
  sunSprite.position.copy(sunDir).multiplyScalar(310);
  sunSprite.renderOrder = -90;
  group.add(sunSprite);

  // The visible sun sits ahead over the gantry; the key light is brought
  // around to the right so the camera side of the car is sculpted at dawn.
  const sun = new THREE.DirectionalLight(0xffc18a, 0.0);
  sun.position.set(90, 38, 50);
  sun.target.position.set(0, 0, 55);
  group.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0x87a5bd, 0x4b342b, 0.0);
  group.add(hemi);

  const horizonFill = new THREE.DirectionalLight(0x5e9eb8, 0.0);
  horizonFill.position.set(-40, 22, 80);
  horizonFill.target.position.set(0, 1, 0);
  group.add(horizonFill, horizonFill.target);

  // a soft camera-side fill keeps the shadow face of the car readable at dawn
  const carFill = new THREE.DirectionalLight(0xa8c4d4, 0.0);
  carFill.position.set(32, 18, 70);
  carFill.target.position.set(0, 0.6, 40);
  group.add(carFill, carFill.target);

  const track = {
    group,
    sky,
    sun,
    hemi,
    horizonFill,
    carFill,
    sunSprite,
    startLights,
    setDaylight(amount) {
      const t = THREE.MathUtils.clamp(amount, 0, 1);
      sun.intensity = t * 3.4;
      hemi.intensity = t * 1.18;
      horizonFill.intensity = t * 0.62;
      carFill.intensity = t * 0.3;
      sunSprite.material.opacity = 0.2 + t * 0.8;
      sunSprite.visible = t > 0.02;
    },
    setStartLights(on, count = 5) {
      for (let i = 0; i < startLights.length; i++) {
        startLights[i].color.set(i < count && on ? 0xff2a18 : 0x230603);
      }
    },
    update(elapsed, speed = 0) {
      // low amplitude flag flutter
      for (const child of group.children) {
        if (child.isMesh && child.geometry?.type === 'PlaneGeometry' && child.material === mats.red) {
          child.rotation.y = Math.PI / 2 + Math.sin(elapsed * 2.1 + child.position.z) * 0.08;
        }
      }
      sunSprite.material.rotation = Math.sin(elapsed * 0.04) * 0.03;
    },
  };
  track.setDaylight(0);
  return track;
}
