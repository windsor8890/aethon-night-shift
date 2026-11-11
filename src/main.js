import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadVehicle } from './f1/vehicle.js';
import { buildGarage } from './f1/garage.js';
import { buildTrack } from './f1/track.js';
import { PostFX } from './postfx.js';
import { mergeStaticMeshes } from './lib/merge.js';
import {
  backlitSignTexture, concreteTextures, hazardTexture, lightShaftTexture,
  shadowTexture, telemetryTexture, wordmarkTexture,
} from './lib/textures.js';
import { LaunchAudio } from './audio.js';
import { FilmUI } from './ui.js';
import { LaunchFilm, FILM_DURATION, CHAPTERS } from './film.js';
import { createSpeedEffects } from './effects.js';

let renderer;
let scene;
let camera;
let controls;
let garage;
let track;
let vehicle;
let postfx;
let audio;
let film;
let ui;
let effects;
let contactShadow;
let eyeLight;
let appState = 'loading';
let ready = false;
let elapsed = 0;
let lastTime = performance.now();
let landingTime = 0;

async function boot() {
  const isMobile = innerWidth < 760;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.35 : 1.55));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.autoClear = true;
  document.getElementById('stage').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05090b);
  scene.fog = new THREE.FogExp2(0x111417, 0.0032);

  camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.04, 900);
  camera.position.set(4.05, 1.52, 5.5);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 24;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.49;

  ui = new FilmUI({
    chapters: CHAPTERS,
    duration: FILM_DURATION,
    onPlay: () => startFilm(),
    onSkip: () => skipFilm(),
    onReplay: () => replayFilm(),
    onExplore: (where) => enterExplore(where),
    onGarage: () => returnGarage(),
    onSound: (on) => handleSound(on),
    onFullscreen: () => toggleFullscreen(),
  });
  ui.setLoading(0.025, 'INITIALISING RENDER STAGE');

  await yieldFrame();
  scene.environment = createStudioEnvironment();
  scene.environmentIntensity = 0.78;

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

  ui.setLoading(0.07, 'BUILDING LAUNCH BAY');
  await yieldFrame();
  garage = buildGarage({ textures });
  scene.add(garage.group);
  garage.door.userData.noMerge = true;
  mergeStaticMeshes(garage.group, { name: 'garage-static' });
  garage.setDoorOpen(0);

  ui.setLoading(0.12, 'BUILDING CIRCUIT EXTENSION');
  await yieldFrame();
  track = buildTrack();
  scene.add(track.group);
  track.setDaylight(0);
  track.setStartLights(false, 0);

  ui.setLoading(0.14, 'MOUNTING REAL F1 CHASSIS');
  await yieldFrame();

  vehicle = await loadVehicle({
    renderer,
    onProgress: (p) => {
      const msg = p < 0.28 ? 'STREAMING AERO PACKAGE'
        : p < 0.6 ? 'BUILDING CARBON SURFACES'
          : p < 0.86 ? 'ASSEMBLING POWER UNIT' : 'PREPARING LAUNCH BAY';
      ui.setLoading(0.14 + p * 0.77, msg);
    },
  });

  vehicle.root.position.set(0, -0.012, 0);
  scene.add(vehicle.root);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: textures.shadow,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    color: 0x000000,
    toneMapped: false,
  });
  contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.2), shadowMaterial);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.026;
  contactShadow.renderOrder = 2;
  vehicle.root.add(contactShadow);

  // layer 1 is used only by the car and feeds the selective-focus mask
  const enableMaskLayer = (root) => root.traverse((o) => { if (o.isMesh) o.layers.enable(1); });
  enableMaskLayer(vehicle.model);
  for (const wheel of vehicle.wheels) enableMaskLayer(wheel.spin);
  enableMaskLayer(vehicle.driver);

  ui.setLoading(0.94, 'WARMING LENS / PREPARING FILM');
  await yieldFrame();

  // A narrow viewer-side fill. It follows the film camera outside and gives
  // the bodywork a readable edge without flattening the dawn key.
  eyeLight = new THREE.SpotLight(0xcfe3ee, 0, 32, 0.3, 1.0, 1.25);
  eyeLight.castShadow = false;
  scene.add(eyeLight, eyeLight.target);

  postfx = new PostFX(renderer, { samples: isMobile ? 0 : 2 });
  postfx.compositeMat.uniforms.uExposure.value = 0.61;
  postfx.compositeMat.uniforms.uBloom.value = 0.31;
  postfx.compositeMat.uniforms.uGrain.value = 0.014;
  postfx.compositeMat.uniforms.uScan.value = 0.06;
  postfx.compositeMat.uniforms.uChroma.value = 0.0015;
  postfx.compositeMat.uniforms.uDof.value = 0.0035;
  postfx.compositeMat.uniforms.uStreak.value = 0.19;

  audio = new LaunchAudio();
  audio.setMuted(!ui.soundOn);
  effects = createSpeedEffects({ scene });
  film = new LaunchFilm({
    vehicle,
    garage,
    track,
    scene,
    camera,
    postfx,
    ui,
    audio,
    onFinish: () => finishFilm(),
    onSkip: () => finishFilm(),
  });

  resize();
  window.addEventListener('resize', resize);
  installKeyboard();
  installOuterPointerSecurity();

  landingTime = 0;
  setLandingScene();
  ui.setLoading(1, 'READY / AWAITING LAUNCH');
  ui.ready();
  await new Promise((r) => setTimeout(r, 320));
  ui.showLanding();
  appState = 'landing';
  ready = true;
  window.__READY__ = true;
  window.__APP__ = {
    THREE, scene, camera, renderer, controls, garage, track, vehicle, postfx, film, ui, audio,
    get state() { return appState; },
    startFilm, skipFilm, replayFilm, enterExplore, returnGarage,
    seekFilm,
    stats: () => postfx?.stats,
    setTimeScale: (s) => { film.timeScale = s; },
  };
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function yieldFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function createStudioEnvironment() {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x020405);
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(36, 16, 36),
    new THREE.MeshBasicMaterial({ color: 0x060b0d, side: THREE.BackSide }),
  );
  room.position.y = 6;
  envScene.add(room);
  const panel = (w, h, pos, rot, color) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      color: new THREE.Color(...color), side: THREE.DoubleSide,
    }));
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

function setLandingScene() {
  appState = 'landing';
  if (!vehicle) return;
  controls.enabled = false;
  vehicle.root.position.set(0, -0.012, 0);
  vehicle.root.rotation.set(0, 0, 0);
  for (const wheel of vehicle.wheels) {
    wheel.spin.rotation.x = 0;
    wheel.steer.rotation.y = 0;
  }
  garage.setDoorOpen(0);
  garage.reflector.visible = true;
  if (film?.baseLightValues) film.restoreLighting();
  track.setDaylight(0);
  track.setStartLights(false, 0);
  scene.fog.density = 0.0032;
  scene.fog.color.setHex(0x111417);
  if (postfx) {
    postfx.compositeMat.uniforms.uDof.value = 0.003;
    postfx.compositeMat.uniforms.uSpeedBlur.value = 0;
    postfx.compositeMat.uniforms.uExposure.value = 0.61;
    postfx.compositeMat.uniforms.uFlare.value = 0;
    postfx.compositeMat.uniforms.uShadowsWarm.value = 0.1;
    postfx.compositeMat.uniforms.uStreak.value = 0.19;
  }
  if (vehicle.rainLight) vehicle.rainLight.glow.material.opacity = 0.28;
  if (film?.brakeMat) film.brakeMat.emissiveIntensity = 0.12;
  if (film?.exhaustMat) film.exhaustMat.emissiveIntensity = 0.12;
  landingTime = 0;
  if (ui) {
    ui.showLanding();
    ui.showChapter(0, { popup: false });
  }
}

function startFilm() {
  if (!ready) return;
  if (appState === 'cinema') return;
  controls.enabled = false;
  audio?.setMuted(!ui.soundOn);
  appState = 'cinema';
  landingTime = 0;
  if (effects) effects.update({ carZ: 0, speed: 0, active: false, dt: 0.016, time: 0 });
  film.start();
  ui.setFilmTime(0);
}

function finishFilm() {
  if (appState === 'end') return;
  appState = 'end';
  controls.enabled = false;
  audio?.endFilm();
  ui.showEnd();
}

function skipFilm() {
  if (appState !== 'cinema') return;
  film.skip();
}

function replayFilm() {
  if (!ready) return;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  appState = 'cinema';
  controls.enabled = false;
  audio?.setMuted(!ui.soundOn);
  film.start();
  ui.setFilmTime(0);
}

function enterExplore(where) {
  if (!ready) return;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  film.stop();
  audio?.endFilm();
  appState = where === 'track' ? 'exploreTrack' : 'exploreGarage';
  controls.enabled = true;
  controls.enablePan = false;
  ui.showExplore();
  ui.toast(where === 'track' ? '自由环视 — 拖拽旋转 / 滚轮缩放' : '车库环视 — 拖拽旋转 / 滚轮缩放');
  if (where === 'track') {
    ui.showChapter(4, { popup: false });
    garage.setDoorOpen(1);
    garage.reflector.visible = false;
    track.setDaylight(1);
    track.setStartLights(true, 5);
    scene.fog.density = 0.00215;
    scene.fog.color.setHex(0x8f6c59);
    vehicle.root.position.set(0, -0.012, 50);
    vehicle.root.rotation.set(0, 0, 0);
    camera.position.set(5.8, 1.9, 44.8);
    camera.fov = 42;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0.55, 50);
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.update();
    if (postfx) {
      postfx.compositeMat.uniforms.uDof.value = 0.0028;
      postfx.compositeMat.uniforms.uExposure.value = 0.61;
      postfx.compositeMat.uniforms.uSpeedBlur.value = 0;
      postfx.compositeMat.uniforms.uShadowsWarm.value = 0.8;
      postfx.compositeMat.uniforms.uFlare.value = 0;
    }
    if (audio?.ctx) audio.enterIdle();
  } else {
    ui.showChapter(0, { popup: false });
    garage.setDoorOpen(0);
    garage.reflector.visible = true;
    track.setDaylight(0);
    track.setStartLights(false, 0);
    scene.fog.density = 0.0032;
    scene.fog.color.setHex(0x111417);
    vehicle.root.position.set(0, -0.012, 0);
    vehicle.root.rotation.set(0, 0, 0);
    if (film?.baseLightValues) film.restoreLighting();
    camera.position.set(4.75, 1.55, 5.05);
    camera.fov = 40;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0.58, 0.2);
    controls.minDistance = 2.2;
    controls.maxDistance = 17;
    controls.update();
    if (postfx) {
      postfx.compositeMat.uniforms.uDof.value = 0.0032;
      postfx.compositeMat.uniforms.uExposure.value = 0.61;
      postfx.compositeMat.uniforms.uSpeedBlur.value = 0;
      postfx.compositeMat.uniforms.uShadowsWarm.value = 0.12;
      postfx.compositeMat.uniforms.uFlare.value = 0;
    }
    if (audio?.ctx) audio.enterIdle();
  }
}

function returnGarage() {
  if (!ready) return;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  film.stop();
  audio?.endFilm();
  controls.enabled = false;
  setLandingScene();
  ui.toast('返回 AETHON 维修库');
}

function handleSound(on) {
  if (!on) {
    audio?.setMuted(true);
    return;
  }
  audio?.setMuted(false);
  if (!audio) return;
  audio.init().then(() => {
    if (appState === 'cinema') {
      audio.startFilm();
    } else if (appState === 'exploreTrack' || appState === 'exploreGarage') {
      audio.enterIdle();
    }
  }).catch(() => {
    ui.toggleSound(false);
    ui.toast('无法启动音频 / AUDIO UNAVAILABLE');
  });
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    ui.toast('当前浏览器阻止了全屏');
  }
}

function installKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'Escape') {
      if (document.getElementById('creditsModal').classList.contains('is-open')) return;
      if (appState === 'cinema') skipFilm();
      return;
    }
    if (e.code === 'Space' || e.key === 'Enter') {
      if (document.activeElement instanceof HTMLButtonElement) return;
      if (appState === 'landing') {
        e.preventDefault();
        startFilm();
      }
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'm') { ui.toggleSound(); return; }
    if (k === 'f') { toggleFullscreen(); return; }
    if (k === 'r' && (appState === 'end' || appState === 'exploreTrack' || appState === 'exploreGarage')) { replayFilm(); return; }
    if (k === 'g' && (appState === 'end' || appState === 'exploreTrack' || appState === 'exploreGarage')) { returnGarage(); }
  });
}

function installOuterPointerSecurity() {
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
}

function resize() {
  const mobile = innerWidth < 760;
  const narrow = innerWidth / innerHeight < 0.95;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.55));
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  postfx?.setSize(size.x, size.y);
  if (appState === 'landing') landingTime = 0;
  if (appState === 'exploreTrack' && narrow) {
    // a little breathing room in portrait free-look
    camera.fov = 46;
    camera.updateProjectionMatrix();
  }
}

function loop(now) {
  const raw = (now - lastTime) / 1000;
  const dt = Math.min(0.045, Math.max(0.001, raw));
  lastTime = now;
  elapsed += dt;
  if (!ready) {
    requestAnimationFrame(loop);
    return;
  }

  if (appState === 'landing') {
    landingTime += dt;
    film.landingCamera(elapsed);
    vehicle.root.position.set(0, -0.012, 0);
    vehicle.root.rotation.set(0, 0, 0);
    if (vehicle.rainLight) vehicle.rainLight.glow.material.opacity = 0.22 + Math.sin(elapsed * 7.3) * 0.06;
    if (postfx) {
      postfx.compositeMat.uniforms.uDof.value = 0.0035;
      postfx.compositeMat.uniforms.uSpeedBlur.value = 0;
      postfx.compositeMat.uniforms.uFlare.value = 0;
    }
    effects.update({ carZ: 0, speed: 0, active: false, dt, time: elapsed });
  } else if (appState === 'cinema') {
    film.update(dt);
    const active = film.currentShot >= 5 && film.carSpeed > 1.4 && camera.position.z > 8.9;
    effects.update({
      carZ: film.carZ,
      speed: film.carSpeed,
      active,
      dt,
      time: elapsed,
    });
    if (contactShadow) {
      const speed = film.carSpeed;
      contactShadow.material.opacity = 0.44 - Math.min(0.18, speed * 0.006);
    }
  } else if (appState === 'end') {
    effects.update({ carZ: film.carZ, speed: 0, active: false, dt, time: elapsed });
    if (contactShadow) contactShadow.material.opacity = 0.44;
  } else if (appState === 'exploreGarage') {
    controls.update();
    if (postfx) {
      postfx.compositeMat.uniforms.uDof.value = 0.0032;
      postfx.compositeMat.uniforms.uSpeedBlur.value = 0;
      postfx.compositeMat.uniforms.uExposure.value = 0.61;
      postfx.compositeMat.uniforms.uFlare.value = 0;
      postfx.compositeMat.uniforms.uShadowsWarm.value = 0.12;
    }
    if (vehicle.rainLight) vehicle.rainLight.glow.material.opacity = 0.22 + Math.sin(elapsed * 7.3) * 0.06;
    effects.update({ carZ: 0, speed: 0, active: false, dt, time: elapsed });
  } else if (appState === 'exploreTrack') {
    controls.update();
    if (eyeLight) {
      eyeLight.position.copy(camera.position);
      eyeLight.target.position.set(0, 0.55, 50);
      eyeLight.intensity = 28;
    }
    if (postfx) {
      postfx.compositeMat.uniforms.uDof.value = 0.0026;
      postfx.compositeMat.uniforms.uSpeedBlur.value = 0;
      postfx.compositeMat.uniforms.uExposure.value = 0.61;
      postfx.compositeMat.uniforms.uShadowsWarm.value = 0.8;
      postfx.compositeMat.uniforms.uFlare.value = 0;
    }
    if (vehicle.rainLight) vehicle.rainLight.glow.material.opacity = 0.32 + Math.sin(elapsed * 7.3) * 0.05;
    effects.update({ carZ: 34, speed: 0, active: false, dt, time: elapsed });
  }

  if (eyeLight) {
    if (appState === 'cinema' && film.time > 17.2 && film.carZ > 8.8) {
      eyeLight.position.copy(camera.position);
      eyeLight.target.position.set(0, 0.55, film.carZ);
      eyeLight.intensity = 24;
    } else if (appState !== 'exploreTrack') {
      eyeLight.intensity = 0;
    }
  }
  garage.update(elapsed, dt);
  track.update(elapsed, appState === 'cinema' ? film.carSpeed : 0);
  postfx.render(scene, camera, elapsed);
  requestAnimationFrame(loop);
}

function seekFilm(seconds) {
  if (!ready) return 0;
  audio?.setMuted(true);
  appState = 'cinema';
  controls.enabled = false;
  film.start();
  ui.setFilmTime(0);
  const step = 1 / 30;
  const target = Math.min(FILM_DURATION - 0.05, Math.max(0, seconds));
  let guard = 0;
  while (film.time < target && guard < 2000) {
    film.update(step);
    guard += 1;
  }
  film.playing = false;
  return film.time;
}

boot().catch((error) => {
  console.error(error);
  const msg = document.getElementById('loadMessage');
  if (msg) msg.textContent = 'LOAD FAILED / ' + (error?.message || 'UNKNOWN ERROR');
  const pct = document.getElementById('loadPercent');
  if (pct) pct.textContent = 'ERR';
});

