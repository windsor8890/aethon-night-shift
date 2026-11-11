import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PostFX } from './postfx.js';
import { createMaterials } from './f1/materials.js';
import { createCar } from './f1/car.js';
import { buildGarage } from './f1/garage.js';
import {
  backlitSignTexture,
  carbonTextures,
  concreteTextures,
  hazardTexture,
  lightShaftTexture,
  numberTexture,
  shadowTexture,
  telemetryTexture,
  tyreSidewallTexture,
  wordmarkTexture,
} from './lib/textures.js';
import { clamp, easeInOutCubic, lerp } from './lib/geo.js';
import { mergeStaticMeshes } from './lib/merge.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const SHOT = new URLSearchParams(location.search).has('shot');

const dom = {
  canvas: $('#scene'),
  hud: $('#hud'),
  loader: $('#loader'),
  loadBar: $('#loadBar'),
  loadPct: $('#loadPct'),
  loadStatus: $('#loadStatus'),
  clock: $('#clock'),
  loaderClock: $('#loaderClock'),
  modeBtns: $$('.mode-btn'),
  explodeBtn: $('#explodeBtn'),
  explodeLabel: $('#explodeLabel'),
  explodeSub: $('#explodeSub'),
  explodePct: $('#explodePct'),
  explodeBar: $('#explodeBar'),
  panel: $('#infoPanel'),
  panelContent: $('#panelContent'),
  panelIndex: $('#panelIndex'),
  panelTag: $('#panelTag'),
  panelTitle: $('#panelTitle'),
  panelEn: $('#panelEn'),
  panelDesc: $('#panelDesc'),
  specs: $('#specs'),
  assemblyManifest: $('#assemblyManifest'),
  massValue: $('#massValue'),
  massFront: $('.mass-bar .front'),
  massRear: $('.mass-bar .rear'),
  viewCode: $('#viewCode'),
  hint: $('#hint'),
  labels: $('#labels'),
  leaderLayer: $('#leaderLayer'),
  soundBtn: $('#soundBtn'),
  helpBtn: $('#helpBtn'),
  fullBtn: $('#fullBtn'),
  helpModal: $('#helpModal'),
  helpClose: $('#helpClose'),
  toast: $('#toast'),
  error: $('#error'),
  errorText: $('#errorText'),
  hiddenNote: $('#hudHiddenNote'),
};

const MODE_DATA = {
  full: {
    index: '01 / 04',
    tag: 'COMPLETE STATE',
    title: '完整装配',
    en: 'COMPLETE ASSEMBLY',
    desc: '完整比赛装配。珍珠白碳纤维车身与朱红战纹覆盖混合动力单元，赛车正于 01 号维修库等待发车。',
    specs: [
      ['OVERALL LENGTH', '5,630', 'MM'],
      ['DRY WEIGHT', '798', 'KG'],
      ['POWER UNIT', '1,000', 'HP'],
      ['DOWNFORCE', '2,400', 'KG'],
    ],
    view: 'EXT / 01',
    frontMass: 44.8,
  },
  cutaway: {
    index: '02 / 04',
    tag: 'STARBOARD CUTAWAY',
    title: '工程剖视',
    en: 'ENGINEERING CUTAWAY',
    desc: '右舷车身沿纵向剖面开启。V6 涡轮混合动力单元、侧箱散热器与高压储能系统在碳纤维外壳下逐层显现。',
    specs: [
      ['CUT PLANE', 'X +0.08', 'M'],
      ['EXPOSED SYSTEMS', '08', 'UNIT'],
      ['COOLING CORES', '02', 'RAD'],
      ['BODY PANELS', '06', 'CUT'],
    ],
    view: 'CUT / 02',
    frontMass: 44.8,
  },
  half: {
    index: '03 / 04',
    tag: 'SAGITTAL SECTION',
    title: '半剖扫描',
    en: 'HALF SECTION',
    desc: '以 X = 0 中心矢状面剖开整台赛车。中置动力单元、驾驶舱单体壳与变速箱的纵向布局在截面中一览无余。',
    specs: [
      ['CUT PLANE', 'X 0.00', 'M'],
      ['SECTION', '100', '%'],
      ['MONOCOQUE', 'CFRP', 'T800'],
      ['POWER UNIT', '1.6 V6', 'TURBO'],
    ],
    view: 'SEC / 03',
    frontMass: 44.8,
  },
  exploded: {
    index: '04 / 04',
    tag: 'EXPLODED ASSEMBLY',
    title: '总成分解',
    en: 'EXPLODED ASSEMBLY',
    desc: '十二个主要总成沿装配轴线分离。前翼、鼻锥、动力单元、侧箱与尾翼悬浮于维修库中，展示赛车完整的工程层级。',
    specs: [
      ['ASSEMBLIES', '12', 'UNIT'],
      ['FASTENERS', '648', 'PCS'],
      ['EXPLODE AXIS', '18', 'VEC'],
      ['CLEARANCE', '+ 240', 'MM'],
    ],
    view: 'EXP / 04',
    frontMass: 44.8,
  },
};

const CAMERA_VIEWS = {
  full: { pos: [4.75, 2.52, -6.72], target: [0.24, 0.78, 0.25], fov: 38 },
  cutaway: { pos: [5.2, 2.45, -4.65], target: [0.2, 0.64, 0.27], fov: 35 },
  half: { pos: [5.1, 2.85, -4.55], target: [0.15, 0.62, 0.18], fov: 35 },
  exploded: { pos: [5.4, 4.3, -6.2], target: [0.9, 1.05, 0.2], fov: 50 },
};

const EXPLODE = {
  floor: { o: [0, -0.2, 0.2], r: [0, 0, 0], delay: 0.0 },
  frontWing: { o: [0, 0.35, -1.9], r: [0.02, 0.04, 0], delay: 0.04 },
  nose: { o: [0, 1.05, -1.35], r: [-0.09, 0, 0], delay: 0.1 },
  monocoque: { o: [0, 0.3, 0.15], r: [0, 0, 0], delay: 0.18 },
  sidepodL: { o: [-1.45, 0.12, 0.4], r: [0, 0.03, -0.06], delay: 0.24 },
  sidepodR: { o: [1.45, 0.12, 0.4], r: [0, -0.03, 0.06], delay: 0.24 },
  engineCover: { o: [0, 1.95, 0.1], r: [0.04, 0, 0], delay: 0.38 },
  powerUnit: { o: [0, 0.85, 0.45], r: [0, 0, 0], delay: 0.3 },
  gearbox: { o: [0, 0.3, 1.5], r: [0, 0, 0], delay: 0.34 },
  rearWing: { o: [0, 1.55, 1.9], r: [0.02, 0, 0], delay: 0.28 },
  frontSuspension: { o: [0, 0.22, -0.2], r: [0, 0, 0], delay: 0.13 },
  rearSuspension: { o: [0, 0.3, 0.65], r: [0, 0, 0], delay: 0.18 },
  frontLeft: { o: [-2.05, 0.35, 0.2], r: [0.05, 0, -0.06], delay: 0.14 },
  frontRight: { o: [2.05, 0.35, 0.2], r: [0.05, 0, 0.06], delay: 0.14 },
  rearLeft: { o: [-2.1, 0.4, 0.65], r: [0.04, 0, -0.05], delay: 0.16 },
  rearRight: { o: [2.1, 0.4, 0.65], r: [0.04, 0, 0.05], delay: 0.16 },
};

const LABEL_DEFS = [
  { id: 'wing', anchor: 'frontWing', modes: ['exploded'], idx: '01', zh: '前翼总成', en: 'FRONT WING / MULTI-ELEMENT', pin: [1125, 662], tone: 'warm' },
  { id: 'cockpit', anchor: 'cockpit', modes: ['cutaway', 'half', 'exploded'], idx: '02', zh: '驾驶舱单体壳', en: 'CFRP MONOCOQUE / COCKPIT', callout: { cutaway: 300, half: 295 }, pin: [635, 400], tone: 'cool' },
  { id: 'engine', anchor: 'engine', modes: ['cutaway', 'half', 'exploded'], idx: '03', zh: 'V6 混合动力单元', en: 'POWER UNIT / 1.6L V6 TURBO', callout: { cutaway: 390, half: 395 }, pin: [800, 315], tone: 'warm' },
  { id: 'radiator', anchor: 'radiatorR', modes: ['cutaway', 'exploded'], idx: '04', zh: '侧箱散热器', en: 'SIDEPOD / RADIATOR CORE', callout: { cutaway: 480 }, pin: [430, 545], tone: 'cool' },
  { id: 'gearbox', anchor: 'gearbox', modes: ['half', 'exploded'], idx: '05', zh: '八速变速箱', en: 'GEARBOX / REAR STRUCTURE', callout: { half: 500 }, pin: [505, 320], tone: 'warm' },
  { id: 'rearwing', anchor: 'rearWing', modes: ['exploded'], idx: '06', zh: '尾翼总成', en: 'REAR WING / DRS', pin: [440, 185], tone: 'warm' },
  { id: 'floor', anchor: 'floor', modes: ['exploded'], idx: '07', zh: '碳纤维底板', en: 'FLOOR / VENTURI TUNNELS', pin: [610, 620], tone: 'cool' },
  { id: 'nose', anchor: 'nose', modes: ['exploded'], idx: '08', zh: '鼻锥总成', en: 'NOSE / CRASH STRUCTURE', pin: [1115, 555], tone: 'warm' },
  { id: 'cover', anchor: 'engineCover', modes: ['exploded'], idx: '09', zh: '引擎盖', en: 'ENGINE COVER / AIRBOX', pin: [800, 205], tone: 'cool' },
];

const MANIFEST = [
  ['01', '前翼总成', 'FRONT WING / AERO'],
  ['02', '驾驶舱单体壳', 'MONOCOQUE / COCKPIT'],
  ['03', 'V6 混合动力单元', 'POWER UNIT / 1.6 L V6'],
  ['04', '侧箱散热器', 'SIDEPOD / RADIATOR'],
  ['05', '八速变速箱', 'GEARBOX / STRUCTURE'],
  ['06', '尾翼总成', 'REAR WING / DRS'],
  ['07', '碳纤维底板', 'FLOOR / DIFFUSER'],
  ['08', '鼻锥总成', 'NOSE / CRASH STRUCTURE'],
  ['09', '引擎盖', 'ENGINE COVER / AIRBOX'],
];

const state = {
  mode: 'full',
  previousMode: 'full',
  ready: false,
  introDone: false,
  uiHidden: false,
  soundOn: false,
  helpOpen: false,
  explode: 0,
  explodeTarget: 0,
  clipSkin: 2,
  clipAll: 2,
  targetClipSkin: 2,
  targetClipAll: 2,
  scanOpacity: 0,
  targetScanOpacity: 0,
  cameraTween: null,
  modeChangedAt: 0,
  elapsed: 0,
  interactions: 0,
  fps: 0,
  _perfTime: 0,
  _perfFrames: 0,
};

let renderer;
let scene;
let camera;
let controls;
let postfx;
let matBundle;
let car;
let garage;
let clipSkinPlane;
let clipAllPlane;
let envTexture;
let lastPct = -1;
let toastTimer = null;
let panelTimer = null;
let clockTimer = null;
let sound = null;

const anchors = [];
const labels = [];

const V = (arr) => new THREE.Vector3(...arr);

function setStatus(text) {
  if (dom.loadStatus) dom.loadStatus.textContent = text;
}

function setLoad(pct, status) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  if (dom.loadBar) dom.loadBar.style.width = `${p}%`;
  if (dom.loadPct) dom.loadPct.textContent = String(p).padStart(2, '0');
  if (status) setStatus(status);
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function showToast(text, duration = 1800) {
  if (!dom.toast) return;
  dom.toast.textContent = text;
  dom.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('is-visible'), duration);
}

function showError(err) {
  console.error(err);
  if (dom.loader) dom.loader.classList.add('is-done');
  if (dom.error) {
    dom.error.hidden = false;
    dom.errorText.textContent = String(err && err.message ? err.message : err);
  }
  setStatus('RENDER SYSTEM FAULT');
}

function updateClock() {
  const now = new Date();
  const text = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (dom.clock) dom.clock.textContent = text;
  if (dom.loaderClock) dom.loaderClock.textContent = text;
}

/* ------------------------------------------------------------------ */
/* Environment map                                                     */
/* ------------------------------------------------------------------ */

function createStudioEnvironment(rendererInstance) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x030607);

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(30, 14, 30),
    new THREE.MeshBasicMaterial({ color: 0x070c0e, side: THREE.BackSide }),
  );
  room.position.y = 5;
  envScene.add(room);

  const panel = (w, h, pos, rot, color) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color[0], color[1], color[2]),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    envScene.add(mesh);
    return mesh;
  };

  // long overhead softboxes
  panel(13, 4.8, [0, 6.8, 0], [Math.PI / 2, 0, 0], [1.25, 1.45, 1.5]);
  panel(10, 2.0, [0, 6.72, -5.2], [Math.PI / 2, 0, 0], [1.05, 1.25, 1.3]);
  panel(7, 1.4, [0, 6.72, 4.7], [Math.PI / 2, 0, 0], [1.0, 1.15, 1.2]);

  // cool vertical strips left, warm right
  panel(0.8, 7.5, [-10, 3.2, 0], [0, Math.PI / 2, 0], [0.32, 1.1, 1.4]);
  panel(0.5, 5.5, [-10, 2.7, 4.2], [0, Math.PI / 2, 0], [0.25, 0.85, 1.15]);
  panel(1.5, 6.0, [10, 3.1, 2.0], [0, -Math.PI / 2, 0], [1.5, 0.55, 0.25]);
  panel(2.4, 1.1, [7.2, 2.1, 9.2], [0, Math.PI, 0], [1.4, 0.36, 0.12]);
  panel(3.0, 1.5, [0, 4.2, 9.5], [0, Math.PI, 0], [0.9, 1.2, 1.3]);
  panel(4.3, 0.7, [0, 1.2, -11], [0, 0, 0], [0.7, 0.85, 0.9]);

  const pmrem = new THREE.PMREMGenerator(rendererInstance);
  const rt = pmrem.fromScene(envScene, 0.045, 0.1, 70);
  pmrem.dispose();
  envScene.traverse((o) => {
    o.geometry?.dispose?.();
    if (o.material) o.material.dispose?.();
  });
  return rt.texture;
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  try {
    updateClock();
    clockTimer = setInterval(updateClock, 10000);
    setLoad(5, 'INITIALISING OPTICAL RIG');
    await nextFrame();

    const viewport = {
      w: window.innerWidth,
      h: window.innerHeight,
    };

    renderer = new THREE.WebGLRenderer({
      canvas: dom.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(viewport.w, viewport.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // The key light and vehicle are static between interactions, so only
    // refresh the shadow map when the car actually moves or is sectioned.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.localClippingEnabled = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040809);
    scene.fog = new THREE.FogExp2(0x071011, 0.009);

    camera = new THREE.PerspectiveCamera(32, viewport.w / viewport.h, 0.08, 70);
    camera.position.set(7.8, 3.9, -10.6);
    camera.lookAt(0, 0.7, 0.2);

    controls = new OrbitControls(camera, dom.canvas);
    controls.target.set(0, 0.5, 0.1);
    controls.enableDamping = true;
    controls.dampingFactor = 0.058;
    controls.enablePan = false;
    const framing = viewportFraming();
    controls.minDistance = 3.5;
    controls.maxDistance = 8.5 * (1 + framing.narrow * 0.8);
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = 1.53;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.8;
    controls.enabled = false;
    controls.update();

    setLoad(13, 'MAPPING CARBON WEAVE');
    await nextFrame();

    const carbon = carbonTextures();
    const concrete = concreteTextures();

    setLoad(29, 'CASTING TYRE SIDEWALLS');
    await nextFrame();

    const tex = {
      carbon,
      concrete,
      tyreWall: tyreSidewallTexture(),
      wordmark: wordmarkTexture({ text: 'AETHON', sub: 'MOTORSPORT / RACE SYSTEMS', width: 1024, height: 256 }),
      wordmarkSmall: wordmarkTexture({ text: 'AETHON', sub: 'RACE SYSTEMS', width: 1024, height: 256 }),
      number: numberTexture('01'),
      hazard: hazardTexture(),
      telemetry: [telemetryTexture(0), telemetryTexture(1)],
      backlitSign: backlitSignTexture(),
      shadow: shadowTexture(),
      lightShaft: lightShaftTexture(),
    };

    setLoad(39, 'CALIBRATING LIGHT RIG');
    await nextFrame();

    envTexture = createStudioEnvironment(renderer);
    scene.environment = envTexture;
    scene.environmentIntensity = 0.72;

    setLoad(50, 'ASSEMBLING PIT GARAGE');
    await nextFrame();

    matBundle = createMaterials(tex);
    garage = buildGarage({ textures: tex });
    scene.add(garage.group);

    setLoad(66, 'BONDING CFRP MONOCOQUE');
    await nextFrame();

    car = createCar({ mats: matBundle, textures: tex });
    scene.add(car.root);

    // Consolidate static meshes per assembly. This keeps the edit-time scene
    // graph readable while cutting draw calls by an order of magnitude.
    let mergedCar = 0;
    for (const group of Object.values(car.assemblies)) {
      mergedCar += mergeStaticMeshes(group, { name: 'car-asm' });
    }
    const mergedGarage = mergeStaticMeshes(garage.group, { name: 'garage-static' });
    console.info(`[geometry] merged ${mergedCar} car batches, ${mergedGarage} garage batches`);

    setLoad(79, 'ROUTING HYBRID HARNESS');
    await nextFrame();

    // A plane facing the open (starboard) side. With the plane constant at 2
    // the whole car is visible; bringing it toward zero opens the section.
    clipSkinPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.0);
    clipAllPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.0);

    for (const material of car.allMaterials) {
      const isSkin = car.cutSkinMaterials.includes(material);
      material.clippingPlanes = isSkin ? [clipSkinPlane, clipAllPlane] : [clipAllPlane];
      material.clipShadows = true;
      material.needsUpdate = true;
    }
    for (const m of car.cutSkinMaterials) {
      m.side = THREE.DoubleSide;
      m.needsUpdate = true;
    }
    // Bodywork reads as a real moulded shell when opened.
    for (const m of [matBundle.paint, matBundle.accent, matBundle.accentDark, matBundle.carbonShell]) {
      m.side = THREE.DoubleSide;
      m.needsUpdate = true;
    }

    // Base transforms are used by the exploded-view animation.
    for (const group of Object.values(car.assemblies)) {
      group.userData.basePosition = group.position.clone();
      group.userData.baseRotation = group.rotation.clone();
    }

    // Faint assembly-axis guides make the exploded view read as a technical
    // diagram when parts are separated.
    const guideDefs = [
      ['floor', [0, 0.08, 0.4]],
      ['frontWing', [0, 0.2, -2.35]],
      ['nose', [0, 0.35, -1.6]],
      ['monocoque', [0, 0.5, -0.1]],
      ['sidepodL', [-0.5, 0.33, 0.3]],
      ['sidepodR', [0.5, 0.33, 0.3]],
      ['engineCover', [0, 0.7, 0.8]],
      ['powerUnit', [0, 0.45, 1.0]],
      ['gearbox', [0, 0.35, 1.8]],
      ['rearWing', [0, 1.1, 2.25]],
      ['frontSuspension', [0, 0.3, -1.4]],
      ['rearSuspension', [0, 0.3, 1.6]],
      ['frontLeft', [0, 0, 0]],
      ['frontRight', [0, 0, 0]],
      ['rearLeft', [0, 0, 0]],
      ['rearRight', [0, 0, 0]],
    ];
    const guidePositions = new Float32Array(guideDefs.length * 6);
    const guideGeo = new THREE.BufferGeometry();
    guideGeo.setAttribute('position', new THREE.BufferAttribute(guidePositions, 3));
    const guideMat = new THREE.LineBasicMaterial({
      color: 0x74e2d9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const guideLines = new THREE.LineSegments(guideGeo, guideMat);
    guideLines.frustumCulled = false;
    guideLines.renderOrder = 6;
    car.root.add(guideLines);
    car.guideLines = guideLines;
    car.guideDefs = guideDefs;
    car.guidePositions = guidePositions;

    // Wire label anchors.
    for (const def of LABEL_DEFS) {
      const anchor = car.anchors[def.anchor];
      if (!anchor) {
        console.warn('Missing label anchor:', def.anchor);
        continue;
      }
      const el = document.createElement('div');
      el.className = 'part-label';
      el.dataset.tone = def.tone || 'default';
      el.innerHTML = `<span class="label-index">${def.idx}</span><span class="label-copy"><strong>${def.zh}</strong><small>${def.en}</small></span>`;
      dom.labels.appendChild(el);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'leader-path');
      dom.leaderLayer.appendChild(path);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'leader-dot');
      dot.setAttribute('r', '2.4');
      dom.leaderLayer.appendChild(dot);

      labels.push({ def, anchor, el, path, dot, visible: false });
    }

    dom.assemblyManifest.innerHTML = MANIFEST.map(
      ([num, zh, en]) =>
        `<div class="assembly-row"><span class="as-num">${num}</span><span class="as-copy"><b>${zh}</b><small>${en}</small></span></div>`,
    ).join('');

    postfx = new PostFX(renderer, { samples: 2 });
    resize();

    setLoad(91, 'COMPILING SHADERS');
    await nextFrame();

    renderer.compile(scene, camera);
    setLoad(100, 'SYSTEM READY');
    await new Promise((resolve) => setTimeout(resolve, SHOT ? 80 : 520));

    setupEvents();
    updateModeUI(state.mode, true);
    window.__DEBUG__ = {
      THREE,
      scene,
      camera,
      controls,
      renderer,
      car,
      garage,
      postfx,
      mats: matBundle,
      state,
      clipSkinPlane,
      clipAllPlane,
      setMode,
      cameraViews: CAMERA_VIEWS,
      setCamera: (pos, target) => {
        camera.position.set(...pos);
        controls.target.set(...target);
        controls.update();
      },
      project: (v) => {
        const p = new THREE.Vector3(...v).project(camera);
        return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, z: p.z };
      },
    };

    document.body.classList.add('is-ready');
    dom.loader.classList.add('is-done');
    state.ready = true;

    const introTo = viewForMode('full');
    const introTarget = V(introTo.target);
    camera.fov = 28;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0.52, 0.08);
    startCameraTween({
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: 28,
      toPos: V(introTo.pos),
      toTarget: introTarget,
      toFov: introTo.fov,
      duration: SHOT ? 700 : 2500,
      onDone: null,
    });
    state.lastAspect = window.innerWidth / Math.max(1, window.innerHeight);
    setTimeout(
      () => {
        state.introDone = true;
        window.__READY__ = true;
        dom.hint?.classList.remove('is-hidden');
        showToast('INSPECTION PROTOCOL READY / 检视系统已上线', 2300);
      },
      SHOT ? 950 : 2750,
    );

    renderer.setAnimationLoop(render);
    // A first synchronous-ish frame keeps reflection and shader compiles out of the reveal.
    await nextFrame();
  } catch (err) {
    showError(err);
  }
}

function viewportFraming() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const narrow = clamp((1.5 - aspect) / 1.04, 0, 1);
  return {
    narrow,
    scale: 1 + narrow * 0.48,
    fovAdd: narrow * 12,
  };
}

function viewForMode(mode) {
  const base = CAMERA_VIEWS[mode];
  if (!base) return CAMERA_VIEWS.full;
  const { narrow, fovAdd } = viewportFraming();
  const extra = narrow * (mode === 'half' ? 0.32 : mode === 'cutaway' ? 0.18 : 0.02);
  const scale = 1 + narrow * 0.48 + extra;
  const target = [...base.target];
  const pos = base.pos.map((v, i) => target[i] + (v - target[i]) * scale);
  return { pos, target, fov: Math.min(62, base.fov + fovAdd) };
}

function startCameraTween({ fromPos, fromTarget, fromFov, toPos, toTarget, toFov, duration, onDone }) {
  state.cameraTween = {
    fromPos: fromPos.clone(),
    fromTarget: fromTarget.clone(),
    fromFov,
    toPos: toPos.clone(),
    toTarget: toTarget.clone(),
    toFov,
    start: performance.now(),
    duration,
    onDone,
  };
  controls.enabled = false;
}

function tweenToMode(mode, duration = 1300) {
  const view = viewForMode(mode);
  startCameraTween({
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    fromFov: camera.fov,
    toPos: V(view.pos),
    toTarget: V(view.target),
    toFov: view.fov,
    duration,
    onDone: null,
  });
}

/* ------------------------------------------------------------------ */
/* UI and modes                                                        */
/* ------------------------------------------------------------------ */

function updateModeUI(mode, immediate = false) {
  const data = MODE_DATA[mode];
  if (!data) return;

  dom.modeBtns.forEach((btn) => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  const exploded = mode === 'exploded';
  dom.explodeBtn.classList.toggle('is-active', exploded);
  dom.explodeBtn.setAttribute('aria-pressed', String(exploded));
  dom.explodeLabel.textContent = exploded ? '复原完整装配' : '一键爆炸拆解';
  dom.explodeSub.textContent = exploded ? 'RESTORE ASSEMBLY' : 'EXPLODE ASSEMBLY';
  dom.viewCode.textContent = data.view;
  dom.panel.classList.toggle('is-exploded', exploded);
  dom.assemblyManifest.hidden = !exploded;

  const apply = () => {
    dom.panelIndex.textContent = data.index;
    dom.panelTag.querySelector('span').textContent = data.tag;
    dom.panelTitle.textContent = data.title;
    dom.panelEn.textContent = data.en;
    dom.panelDesc.textContent = data.desc;
    dom.specs.innerHTML = data.specs
      .map(
        ([label, value, unit]) =>
          `<div><span>${label}</span><b>${value} <em>${unit}</em></b></div>`,
      )
      .join('');
    dom.massValue.textContent = `${data.frontMass.toFixed(1)} / ${(100 - data.frontMass).toFixed(1)}`;
    dom.massFront.style.width = `${data.frontMass}%`;
    dom.massRear.style.width = `${100 - data.frontMass}%`;
    dom.panelContent.classList.remove('is-updating');
  };

  if (immediate) {
    dom.panelContent.classList.remove('is-updating');
    clearTimeout(panelTimer);
    apply();
    return;
  }

  dom.panelContent.classList.add('is-updating');
  clearTimeout(panelTimer);
  panelTimer = setTimeout(apply, 190);
}

function setMode(mode, { silent = false } = {}) {
  if (!MODE_DATA[mode]) return;

  if (mode === 'exploded' && state.mode === 'exploded') {
    setMode(state.previousMode || 'full');
    return;
  }

  if (mode === 'exploded') {
    if (state.mode !== 'exploded') state.previousMode = state.mode;
  }

  if (state.mode === mode && state.ready && mode !== 'exploded') return;

  const isEnteringExploded = mode === 'exploded';
  state.mode = mode;
  state.modeChangedAt = performance.now();
  state.explodeTarget = isEnteringExploded ? 1 : 0;
  state.targetScanOpacity = mode === 'half' ? 0.95 : 0;

  if (mode === 'cutaway') {
    state.targetClipSkin = 0.08;
    state.targetClipAll = 2.0;
  } else if (mode === 'half') {
    state.targetClipSkin = 0.08;
    state.targetClipAll = 0.0;
  } else {
    state.targetClipSkin = 2.0;
    state.targetClipAll = 2.0;
  }

  tweenToMode(mode, state.ready ? (mode === 'exploded' ? 1650 : 1250) : 1000);
  updateModeUI(mode);

  const active = document.activeElement;
  if (active && (active.classList?.contains('mode-btn') || active.id === 'explodeBtn')) {
    active.blur();
  }

  if (!silent) {
    playUiClick(mode === 'exploded' ? 420 : 680);
  }
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

function updateLabels(now) {
  if (!labels.length) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isSmall = w < 880;
  const visibleMode = state.ready && !state.uiHidden && !state.helpOpen;
  const mode = state.mode;
  const age = now - state.modeChangedAt;

  for (const entry of labels) {
    const def = entry.def;
    const shouldShow =
      visibleMode &&
      def.modes.includes(mode) &&
      (mode !== 'exploded' || state.explode > 0.5) &&
      age > (mode === 'exploded' ? 750 : 550);

    const isPin = mode === 'exploded';
    entry.el.classList.toggle('is-pin', isPin);

    if (!shouldShow) {
      if (entry.visible) {
        entry.visible = false;
        entry.el.classList.remove('is-visible');
        entry.path.classList.remove('is-visible');
        entry.dot.classList.remove('is-visible');
      }
      continue;
    }

    const world = entry.anchor.getWorldPosition(new THREE.Vector3());
    const p = world.project(camera);
    if (p.z < -1 || p.z > 1) {
      entry.visible = false;
      entry.el.classList.remove('is-visible');
      entry.path.classList.remove('is-visible');
      entry.dot.classList.remove('is-visible');
      continue;
    }

    const ax = (p.x * 0.5 + 0.5) * w;
    const ay = (-p.y * 0.5 + 0.5) * h;

    const usedFixedCallout =
      !isSmall &&
      def.callout &&
      def.callout[mode] != null &&
      (mode === 'cutaway' || mode === 'half');
    let lx;
    let ly;
    if (isPin && def.pin) {
      lx = (def.pin[0] / 1440) * w;
      ly = (def.pin[1] / 900) * h;
    } else if (usedFixedCallout) {
      lx = Math.max(188, Math.min(255, w * 0.17));
      ly = def.callout[mode] * (h / 900);
    } else {
      lx = ax + (def.dx || -150) * (isSmall ? 0.56 : 1);
      ly = ay + (def.dy || 60) * (isSmall ? 0.65 : 1);
    }

    const leftBound = isSmall ? 34 : isPin ? 60 : 82;
    const rightBound = w - (isSmall ? 34 : isPin ? 56 : 84);
    const topBound = isSmall ? 80 : isPin ? 84 : 104;
    const bottomBound = h - (isSmall ? 84 : isPin ? 84 : 138);
    lx = clamp(lx, leftBound, rightBound);
    ly = clamp(ly, topBound, bottomBound);

    if (lx < 0 || lx > w || ly < 0 || ly > h) {
      entry.el.classList.remove('is-visible');
      entry.path.classList.remove('is-visible');
      entry.dot.classList.remove('is-visible');
      continue;
    }

    entry.el.style.left = `${lx.toFixed(1)}px`;
    entry.el.style.top = `${ly.toFixed(1)}px`;
    if (!entry.visible) {
      entry.visible = true;
      entry.el.classList.add('is-visible');
      entry.path.classList.add('is-visible');
      entry.dot.classList.add('is-visible');
    }

    const dir = lx < ax ? -1 : 1;
    const midX = ax + dir * Math.min(42, Math.abs(lx - ax) * 0.4);
    entry.path.setAttribute('d', `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${midX.toFixed(1)} ${ay.toFixed(1)} L ${lx.toFixed(1)} ${ly.toFixed(1)}`);
    entry.dot.setAttribute('cx', ax.toFixed(1));
    entry.dot.setAttribute('cy', ay.toFixed(1));
  }
}

function setLeaderViewport(w, h) {
  if (!dom.leaderLayer) return;
  dom.leaderLayer.setAttribute('viewBox', `0 0 ${w} ${h}`);
  dom.leaderLayer.setAttribute('width', String(w));
  dom.leaderLayer.setAttribute('height', String(h));
}

/* ------------------------------------------------------------------ */
/* Interaction and rendering                                           */
/* ------------------------------------------------------------------ */

function setupEvents() {
  dom.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  dom.explodeBtn.addEventListener('click', () => {
    if (state.mode === 'exploded') setMode(state.previousMode || 'full');
    else setMode('exploded');
  });

  dom.soundBtn.addEventListener('click', toggleSound);
  dom.fullBtn.addEventListener('click', toggleFullscreen);
  dom.helpBtn.addEventListener('click', openHelp);
  dom.helpClose.addEventListener('click', closeHelp);
  $$('[data-help-close]').forEach((el) => el.addEventListener('click', closeHelp));

  dom.canvas.addEventListener('pointerdown', () => {
    dom.hint?.classList.add('is-hidden');
    document.body.classList.add('is-dragging');
    state.interactions += 1;
  });
  window.addEventListener('pointerup', () => document.body.classList.remove('is-dragging'));
  window.addEventListener('pointercancel', () => document.body.classList.remove('is-dragging'));
  controls.addEventListener('start', () => {
    dom.hint?.classList.add('is-hidden');
  });
  window.addEventListener('blur', () => document.body.classList.remove('is-dragging'));

  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', resize);

  window.addEventListener('keydown', (ev) => {
    const key = ev.key.toLowerCase();
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;

    if (key === 'escape') {
      if (state.helpOpen) closeHelp();
      return;
    }
    if (key === '1') setMode('full');
    else if (key === '2') setMode('cutaway');
    else if (key === '3') setMode('half');
    else if (key === '4') setMode('exploded');
    else if (key === ' ' || key === 'spacebar') {
      ev.preventDefault();
      if (state.mode === 'exploded') setMode(state.previousMode || 'full');
      else setMode('exploded');
    } else if (key === 'r') {
      tweenToMode(state.mode, 900);
      playUiClick(560);
    } else if (key === 'h') {
      state.uiHidden = !state.uiHidden;
      document.body.classList.toggle('hud-off', state.uiHidden);
      if (!state.uiHidden) showToast('HUD RESTORED / 界面已恢复', 1300);
    } else if (key === 'm') {
      toggleSound();
    } else if (key === 'f') {
      toggleFullscreen();
    } else if (key === '?') {
      if (state.helpOpen) closeHelp();
      else openHelp();
    }
  });

  window.addEventListener('resize', () => {
    // Keep leader lines aligned immediately with the new viewport.
    setLeaderViewport(window.innerWidth, window.innerHeight);
  });

  dom.explodePct.addEventListener('transitionend', () => {});
}

function openHelp() {
  state.helpOpen = true;
  dom.helpModal.hidden = false;
  playUiClick(620);
}

function closeHelp() {
  state.helpOpen = false;
  dom.helpModal.hidden = true;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function resize() {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, true);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (postfx) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    postfx.setSize(size.x, size.y);
  }
  setLeaderViewport(w, h);

  if (controls) {
    const framing = viewportFraming();
    controls.maxDistance = 8.5 * (1 + framing.narrow * 0.8);
  }

  const aspect = w / Math.max(1, h);
  if (
    state.ready &&
    state.lastAspect &&
    Math.abs(aspect - state.lastAspect) > 0.12 &&
    !state.cameraTween
  ) {
    state.lastAspect = aspect;
    tweenToMode(state.mode, 550);
  } else {
    state.lastAspect = aspect;
  }
}

function updateClip(dt) {
  const lambda = 7.2;
  const previous = state.clipSkin + state.clipAll;
  state.clipSkin = THREE.MathUtils.damp(state.clipSkin, state.targetClipSkin, lambda, dt);
  state.clipAll = THREE.MathUtils.damp(state.clipAll, state.targetClipAll, lambda, dt);
  state.scanOpacity = THREE.MathUtils.damp(state.scanOpacity, state.targetScanOpacity, 2.2, dt);

  if (Math.abs(state.clipSkin - state.targetClipSkin) < 0.0015) state.clipSkin = state.targetClipSkin;
  if (Math.abs(state.clipAll - state.targetClipAll) < 0.0015) state.clipAll = state.targetClipAll;
  if (Math.abs(state.scanOpacity - state.targetScanOpacity) < 0.002) state.scanOpacity = state.targetScanOpacity;

  clipSkinPlane.constant = state.clipSkin;
  clipAllPlane.constant = state.clipAll;
  if (Math.abs(previous - (state.clipSkin + state.clipAll)) > 0.0004) {
    renderer.shadowMap.needsUpdate = true;
  }

  if (car) {
    car.scanMaterial.uniforms.uOpacity.value = state.scanOpacity;
    car.scanMaterial.uniforms.uTime.value = state.elapsed;
    car.sectionGroup.visible = state.scanOpacity > 0.012;
  }
}

function updateExplosion(dt) {
  if (!car) return;
  const target = state.explodeTarget;
  const previous = state.explode;
  const rate = target > state.explode ? 2.35 : 3.5;
  const t = 1 - Math.exp(-rate * dt);
  state.explode += (target - state.explode) * t;
  if (Math.abs(state.explode - target) < 0.0007) state.explode = target;

  const e = state.explode;
  if (Math.abs(e - previous) > 0.0002) renderer.shadowMap.needsUpdate = true;
  car.root.position.y = e * 0.28;

  for (const [key, group] of Object.entries(car.assemblies)) {
    const cfg = EXPLODE[key];
    if (!cfg) continue;
    const delay = Math.min(0.42, cfg.delay || 0);
    const local = clamp((e - delay) / (1 - delay), 0, 1);
    const eased = local * local * (3 - 2 * local);
    const base = group.userData.basePosition;
    const baseRot = group.userData.baseRotation;
    group.position.set(
      base.x + cfg.o[0] * eased,
      base.y + cfg.o[1] * eased,
      base.z + cfg.o[2] * eased,
    );
    group.rotation.set(
      baseRot.x + cfg.r[0] * eased,
      baseRot.y + cfg.r[1] * eased,
      baseRot.z + cfg.r[2] * eased,
    );
  }

  car.wheels.forEach((wheel) => {
    const cover = wheel.userData.cover;
    if (cover) {
      const side = wheel.userData.side;
      const local = clamp((e - 0.28) / 0.72, 0, 1);
      cover.position.x = side * 0.22 * local;
    }
  });

  if (car.guideLines) {
    const positions = car.guidePositions;
    car.guideDefs.forEach(([key, center], i) => {
      const group = car.assemblies[key];
      if (!group) return;
      const base = group.userData.basePosition;
      const p = center;
      const o = i * 6;
      positions[o] = base.x + p[0];
      positions[o + 1] = base.y + p[1];
      positions[o + 2] = base.z + p[2];
      positions[o + 3] = group.position.x + p[0];
      positions[o + 4] = group.position.y + p[1];
      positions[o + 5] = group.position.z + p[2];
    });
    car.guideLines.geometry.attributes.position.needsUpdate = true;
    car.guideLines.material.opacity = Math.max(0, (e - 0.02) * 0.22);
    car.guideLines.visible = e > 0.02;
  }

  const pct = Math.round(e * 100);
  if (pct !== lastPct) {
    lastPct = pct;
    dom.explodePct.innerHTML = `${String(pct).padStart(2, '0')}<span>%</span>`;
    dom.explodeBar.style.width = `${pct}%`;
  }
}

function updateCameraTween() {
  const tw = state.cameraTween;
  if (!tw) return;
  const now = performance.now();
  const raw = clamp((now - tw.start) / tw.duration, 0, 1);
  const t = easeInOutCubic(raw);
  camera.position.lerpVectors(tw.fromPos, tw.toPos, t);
  controls.target.lerpVectors(tw.fromTarget, tw.toTarget, t);
  camera.fov = lerp(tw.fromFov, tw.toFov, t);
  camera.updateProjectionMatrix();
  camera.lookAt(controls.target);
  if (raw >= 1) {
    state.cameraTween = null;
    controls.enabled = true;
    controls.update();
    tw.onDone?.();
  }
}

function render(now) {
  const rawDt = Math.max(0.0001, (now - (state._last || now)) / 1000);
  const dt = Math.min(0.05, rawDt);
  state._last = now;
  state.elapsed += dt;

  state._perfTime += Math.min(0.25, rawDt);
  state._perfFrames += 1;
  if (state._perfTime >= 0.5) {
    state.fps = Math.round(state._perfFrames / state._perfTime);
    state._perfTime = 0;
    state._perfFrames = 0;
  }

  updateCameraTween();
  if (!state.cameraTween) {
    controls.update();
  }
  updateClip(dt);
  updateExplosion(dt);
  garage?.update(state.elapsed, dt);
  updateLabels(now);

  postfx.render(scene, camera, state.elapsed);

  window.__DIAG__ = {
    fps: state.fps,
    calls: postfx.stats?.calls ?? 0,
    triangles: postfx.stats?.triangles ?? 0,
    mode: state.mode,
    explode: +state.explode.toFixed(3),
    clipSkin: +clipSkinPlane.constant.toFixed(3),
    clipAll: +clipAllPlane.constant.toFixed(3),
    labels: labels.filter((l) => l.visible).length,
    state: {
      ready: state.ready,
      clipSkinTarget: state.targetClipSkin,
      clipAllTarget: state.targetClipAll,
      explodeTarget: state.explodeTarget,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sound                                                               */
/* ------------------------------------------------------------------ */

function toggleSound() {
  if (!sound) {
    try {
      sound = createSound();
    } catch (err) {
      console.warn('Audio unavailable', err);
      return;
    }
  }
  state.soundOn = !state.soundOn;
  dom.soundBtn.classList.toggle('is-on', state.soundOn);
  dom.soundBtn.setAttribute('aria-label', state.soundOn ? '关闭环境音' : '开启环境音');
  if (sound.ctx.state === 'suspended') sound.ctx.resume();
  sound.master.gain.setTargetAtTime(state.soundOn ? 0.38 : 0.0, sound.ctx.currentTime, 0.4);
  if (state.soundOn) showToast('GARAGE AMBIENCE ON / 环境音已开启', 1600);
  else showToast('GARAGE AMBIENCE OFF / 环境音已关闭', 1300);
}

function createSound() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.985 + white * 0.015;
    data[i] = last * 3.6;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260;
  filter.Q.value = 0.6;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;
  noise.connect(filter).connect(noiseGain).connect(master);
  noise.start();

  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 180;
  droneFilter.Q.value = 0.8;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.055;
  droneFilter.connect(droneGain).connect(master);

  const oscA = ctx.createOscillator();
  oscA.type = 'sawtooth';
  oscA.frequency.value = 49.5;
  const oscB = ctx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.value = 98.7;
  const oscBGain = ctx.createGain();
  oscBGain.gain.value = 0.35;
  oscA.connect(droneFilter);
  oscB.connect(oscBGain).connect(droneFilter);
  oscA.start();
  oscB.start();

  const air = ctx.createGain();
  air.gain.value = 0.02;
  const airOsc = ctx.createOscillator();
  airOsc.type = 'sine';
  airOsc.frequency.value = 245;
  airOsc.connect(air).connect(master);
  airOsc.start();

  return { ctx, master, droneFilter, oscA, oscB, noiseGain, air };
}

function playUiClick(freq = 650) {
  if (!sound || !state.soundOn) return;
  const { ctx, master } = sound;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.6), t + 0.055);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.16);
}

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

setLeaderViewport(window.innerWidth, window.innerHeight);
boot();
