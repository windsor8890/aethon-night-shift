import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildGarage } from './f1/garage.js';
import { loadF175 } from './f1/f175Car.js';
import { mergeStaticMeshes } from './lib/merge.js';
import {
  backlitSignTexture, concreteTextures, hazardTexture, lightShaftTexture,
  shadowTexture, telemetryTexture, wordmarkTexture,
} from './lib/textures.js';
import { ShowcaseUI } from './ui.js';

const VIEWS = {
  full: { pos: [4.5, 1.65, 5.8], target: [0, 0.58, 0], fov: 38 },
  cutaway: { pos: [5.35, 1.3, 2.75], target: [0, 0.52, 0.12], fov: 40 },
  systems: { pos: [5.5, 1.55, 4.35], target: [0, 0.6, 0], fov: 40 },
  detail: { pos: [3.65, 1.1, 3.45], target: [0.46, 0.52, 1.08], fov: 36 },
};

const PIN_ANCHORS = {
  power: [0, 0.58, -0.9],
  battery: [0, 0.35, 0.12],
  radiator: [0.55, 0.46, 0.12],
  cockpit: [0, 0.6, 0.36],
};

async function boot() {
  const canvas = document.getElementById('stage');
  const ui = new ShowcaseUI({
    onMode: (mode) => setMode(mode, true),
    onReset: () => resetView(),
  });

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05090b);
  scene.fog = new THREE.FogExp2(0x101416, 0.0034);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.04, 200);
  camera.position.set(...VIEWS.full.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...VIEWS.full.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.15;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;

  function createStudioEnvironment() {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x020405);
    const room = new THREE.Mesh(new THREE.BoxGeometry(36, 16, 36), new THREE.MeshBasicMaterial({ color: 0x060b0d, side: THREE.BackSide }));
    room.position.y = 6;
    envScene.add(room);
    const panel = (w, h, pos, rot, color) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), side: THREE.DoubleSide }));
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      envScene.add(mesh);
    };
    panel(15, 0.55, [0, 8.3, -3.4], [Math.PI / 2, 0, 0], [2.2, 2.55, 2.65]);
    panel(12, 0.34, [0, 8.3, 1.8], [Math.PI / 2, 0, 0], [1.65, 1.9, 2.0]);
    panel(8, 0.25, [0, 8.28, 5.8], [Math.PI / 2, 0, 0], [2.4, 2.2, 1.75]);
    panel(0.45, 7.2, [-13, 3.8, 0], [0, Math.PI / 2, 0], [0.22, 1.25, 1.65]);
    panel(0.7, 6.6, [13, 3.5, 3.0], [0, -Math.PI / 2, 0], [0.95, 0.5, 0.34]);
    panel(4.5, 1.3, [0, 5.0, 12.5], [0, Math.PI, 0], [1.25, 1.08, 0.82]);
    panel(6, 2.3, [0, 7.9, 6.5], [Math.PI / 2, 0, 0], [0.38, 0.46, 0.5]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(envScene, 0.035, 0.1, 80);
    pmrem.dispose();
    return rt.texture;
  }
  scene.environment = createStudioEnvironment();
  scene.environmentIntensity = 0.9;

  const textures = {
    concrete: concreteTextures(),
    wordmark: wordmarkTexture({ text: 'AETHON', sub: 'MOTORSPORT / RACE SYSTEMS', width: 1024, height: 256 }),
    wordmarkSmall: wordmarkTexture({ text: 'AETHON', sub: 'RACE SYSTEMS', width: 1024, height: 256 }),
    backlitSign: backlitSignTexture(),
    telemetry: [telemetryTexture(0), telemetryTexture(1)],
    hazard: hazardTexture(),
    shadow: shadowTexture(),
    lightShaft: lightShaftTexture(),
  };
  const garage = buildGarage({ textures });
  garage.setDoorOpen(0);
  garage.door.userData.noMerge = true;
  mergeStaticMeshes(garage.group, { name: 'garage-static' });
  scene.add(garage.group);

  ui.setProgress(0.08);
  const car = await loadF175({
    url: './assets/ferrari-f1-75.glb',
    onProgress: (p) => ui.setProgress(0.08 + p * 0.88),
    onStage: (stage) => {
      if (stage === 'livery') ui.setStage('APPLYING 2022 F1-75 LIVERY');
      if (stage === 'assembled') ui.setStage('ASSEMBLY COMPLETE / READY');
    },
  });
  car.root.position.y += 0.004;
  scene.add(car.root);

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 4.6),
    new THREE.MeshBasicMaterial({ map: textures.shadow, transparent: true, opacity: 0.34, depthWrite: false, color: 0x000000, toneMapped: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.027;
  contact.renderOrder = 2;
  car.root.add(contact);

  // The garage has practical light bars; these large-format sources are the
  // showroom key, side fill and warm separation rim.
  const key = new THREE.DirectionalLight(0xffe5cb, 2.1);
  key.position.set(5.5, 4.4, 5.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8d7ef, 1.05);
  fill.position.set(-5.2, 2.8, 3.0);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffbd7d, 1.35);
  rim.position.set(-2.0, 3.7, -5.5);
  scene.add(rim);
  const frontFill = new THREE.PointLight(0xe8f4ff, 2.2, 6.5, 2);
  frontFill.position.set(3.4, 2.0, 4.2);
  scene.add(frontFill);
  const inspection = new THREE.PointLight(0xffdec0, 9.0, 5.2, 2);
  inspection.position.set(1.6, 1.15, 0.9);
  inspection.visible = false;
  scene.add(inspection);

  // A pair of thin inlaid rings gives the car a display-bay footprint without
  // turning the garage into a generic turntable.
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xb7874a, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.58, 2.596, 128), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.028;
  ring.renderOrder = 1;
  scene.add(ring);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xc22028, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.86, 2.872, 128), ringMat2);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.029;
  ring2.renderOrder = 1;
  scene.add(ring2);

  const pinPoints = Object.fromEntries(
    Object.entries(PIN_ANCHORS).map(([key, p]) => [key, new THREE.Vector3(...p)]),
  );

  let mode = 'full';
  let flying = null;

  function viewFor(name) {
    const base = VIEWS[name];
    if (innerWidth / innerHeight >= 0.82) return base;
    const mobile = {
      full: { pos: [2.8, 2.15, 7.85], target: [0, 0.58, 0.2], fov: 54 },
      cutaway: { pos: [4.35, 1.9, 6.6], target: [0, 0.54, 0.12], fov: 56 },
      systems: { pos: [4.4, 2.0, 6.5], target: [0, 0.62, 0], fov: 56 },
      detail: { pos: [4.3, 1.4, 4.7], target: [0.4, 0.54, 1.0], fov: 46 },
    };
    return mobile[name] || base;
  }

  function startFly(name, duration = 1.15) {
    const v = viewFor(name);
    flying = {
      t: 0,
      duration,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      toPos: new THREE.Vector3(...v.pos),
      toTarget: new THREE.Vector3(...v.target),
      toFov: v.fov,
    };
    controls.enabled = false;
  }

  function setMode(next, animate = true) {
    if (!VIEWS[next]) return;
    mode = next;
    if (window.__SHOWCASE__) window.__SHOWCASE__.mode = next;
    car.setClipping(next === 'cutaway' ? 'cutaway' : 'full');
    car.setGhost(next === 'systems');
    inspection.visible = next === 'cutaway' || next === 'systems';
    ui.setMode(next, false);
    if (animate) startFly(next);
    else {
      const v = viewFor(next);
      camera.position.set(...v.pos);
      controls.target.set(...v.target);
      camera.fov = v.fov;
      camera.updateProjectionMatrix();
      controls.update();
    }
  }

  function resetView() {
    startFly(mode, 0.9);
    ui.showToast('VIEW RESET');
  }

  renderer.domElement.addEventListener('pointerdown', () => {
    if (flying) {
      flying = null;
      controls.enabled = true;
    }
  });

  addEventListener('resize', () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (innerWidth / innerHeight < 0.82) {
      const v = viewFor(mode);
      camera.position.set(...v.pos);
      controls.target.set(...v.target);
      camera.fov = v.fov;
      camera.updateProjectionMatrix();
    }
  });

  setMode('full', false);
  ui.ready();
  window.__SHOWCASE__ = {
    setMode,
    resetView,
    ui,
    car,
    camera,
    scene,
    renderer,
    controls,
    THREE,
    mode: 'full',
  };
  window.__READY__ = true;

  let last = performance.now();
  let elapsed = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    garage.update(elapsed, dt);

    if (flying) {
      flying.t = Math.min(1, flying.t + dt / flying.duration);
      const e = 1 - Math.pow(1 - flying.t, 3);
      camera.position.lerpVectors(flying.fromPos, flying.toPos, e);
      controls.target.lerpVectors(flying.fromTarget, flying.toTarget, e);
      camera.fov = THREE.MathUtils.lerp(flying.fromFov, flying.toFov, e);
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      if (flying.t >= 1) {
        flying = null;
        controls.enabled = true;
        controls.update();
      }
    } else {
      controls.update();
    }

    ui.updatePins(pinPoints, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot().catch((err) => {
  console.error(err);
  const fallback = document.getElementById('fallback');
  if (fallback) fallback.hidden = false;
  const loader = document.getElementById('loaderPct');
  if (loader) loader.textContent = 'ERR';
});
