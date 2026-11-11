import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeStaticMeshes } from '../lib/merge.js';

const WHEEL_GROUPS = {
  fr: ['fr_tyre', 'fr_wheel_cover', 'fr_wheel', 'fr_brake_cylinder'],
  fl: ['fl_tyre', 'fl_wheel_cover', 'fl_wheel', 'fl_brake_cylinder'],
  rr: ['rr_tyre', 'rr_wheel_cover', 'rr_wheel', 'rr_brake_cylinder'],
  rl: ['rl_tyre', 'rl_wheel_cover', 'rl_wheel', 'rl_brake_cylinder'],
};

function upgradeMaterials(root, renderer) {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const cache = new Map();

  const make = (source) => {
    if (!source) return source;
    if (cache.has(source.uuid)) return cache.get(source.uuid);
    const name = source.name || 'generic';
    let mat;
    const map = source.map || null;
    if (map) {
      map.anisotropy = maxAniso;
      map.needsUpdate = true;
    }
    switch (name) {
      case 'Livery':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'Livery',
          map,
          color: 0xc6c3bc,
          metalness: 0.09,
          roughness: 0.41,
          clearcoat: 0.4,
          clearcoatRoughness: 0.16,
          envMapIntensity: 0.75,
          side: THREE.DoubleSide,
        });
        break;
      case 'carbon':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'carbon',
          map,
          bumpMap: map,
          bumpScale: 0.0018,
          color: 0x9a9a9a,
          metalness: 0.3,
          roughness: 0.33,
          clearcoat: 0.8,
          clearcoatRoughness: 0.18,
          envMapIntensity: 1.2,
          side: THREE.DoubleSide,
        });
        break;
      case 'chrome':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'chrome',
          map,
          color: 0xffffff,
          metalness: 1,
          roughness: 0.13,
          clearcoat: 0.4,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.8,
          side: THREE.DoubleSide,
        });
        break;
      case 'tyres':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'tyres',
          map,
          bumpMap: map,
          bumpScale: 0.0008,
          color: 0x3a3a3a,
          metalness: 0,
          roughness: 0.92,
          clearcoat: 0.02,
          clearcoatRoughness: 0.9,
          envMapIntensity: 0.08,
          side: THREE.DoubleSide,
        });
        break;
      case 'rims':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'rims',
          map,
          color: 0xd8d8d8,
          metalness: 0.9,
          roughness: 0.24,
          clearcoat: 0.5,
          envMapIntensity: 1.5,
          side: THREE.DoubleSide,
        });
        break;
      case 'brake':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'brake',
          map,
          color: 0x7b7b7b,
          metalness: 0.65,
          roughness: 0.52,
          clearcoat: 0.1,
          envMapIntensity: 0.8,
          emissive: 0x2a0801,
          emissiveIntensity: 0.18,
          side: THREE.DoubleSide,
        });
        break;
      case 'exhaust':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'exhaust',
          map,
          color: 0xcaa16e,
          metalness: 0.95,
          roughness: 0.3,
          clearcoat: 0.3,
          envMapIntensity: 1.3,
          emissive: 0xff3d0a,
          emissiveIntensity: 0.16,
          side: THREE.DoubleSide,
        });
        break;
      case 'mirror':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'mirror',
          color: 0xe7eef0,
          metalness: 1,
          roughness: 0.035,
          envMapIntensity: 2.2,
          side: THREE.DoubleSide,
        });
        break;
      case 'Glass':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'Glass',
          color: 0x10181a,
          metalness: 0.1,
          roughness: 0.04,
          transmission: 0.35,
          transparent: true,
          opacity: 0.55,
          ior: 1.5,
          envMapIntensity: 1.8,
          side: THREE.DoubleSide,
        });
        break;
      case 'Steer':
        mat = new THREE.MeshPhysicalMaterial({
          name: 'Steer',
          map,
          color: 0xffffff,
          metalness: 0.12,
          roughness: 0.5,
          clearcoat: 0.25,
          envMapIntensity: 1,
          side: THREE.DoubleSide,
        });
        break;
      default:
        mat = new THREE.MeshPhysicalMaterial({
          name,
          map,
          color: 0xffffff,
          metalness: 0.35,
          roughness: 0.42,
          clearcoat: 0.2,
          clearcoatRoughness: 0.4,
          envMapIntensity: 1.05,
          side: THREE.DoubleSide,
        });
    }
    cache.set(source.uuid, mat);
    return mat;
  };

  root.traverse((o) => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material = o.material.map(make);
    else o.material = make(o.material);
  });
  return cache;
}

function collectWheelMeshes(root) {
  const groups = { fr: [], fl: [], rr: [], rl: [] };
  root.traverse((o) => {
    if (!o.isMesh || !o.name) return;
    const n = o.name.toLowerCase();
    for (const [key, prefixes] of Object.entries(WHEEL_GROUPS)) {
      if (prefixes.some((p) => n.startsWith(p))) {
        groups[key].push(o);
        break;
      }
    }
  });
  return groups;
}

function setupWheels(model, carRoot) {
  const groups = collectWheelMeshes(model);
  const wheels = [];

  for (const [key, meshes] of Object.entries(groups)) {
    if (!meshes.length) continue;
    const box = new THREE.Box3();
    for (const mesh of meshes) box.expandByObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const front = center.z > 0;
    const side = key.endsWith('r') ? 1 : -1;

    const steer = new THREE.Group();
    steer.name = `wheel-steer-${key}`;
    steer.position.copy(center);
    carRoot.add(steer);

    const spin = new THREE.Group();
    spin.name = `wheel-spin-${key}`;
    steer.add(spin);

    for (const mesh of meshes) {
      spin.attach(mesh);
    }

    wheels.push({
      key,
      front,
      side,
      steer,
      spin,
      radius: Math.max(0.2, size.y / 2),
      center,
    });
  }
  return wheels;
}

function makeDriver(carRoot, model) {
  const seatNode = model.getObjectByName('seat_Object033_Retopo001') || model.getObjectByName('seat_Object033_Retopo.001');
  const wheelNode = model.getObjectByName('steering_wheel_default001_1') || model.getObjectByName('steering_wheel_default.001');
  const seatBox = seatNode ? new THREE.Box3().setFromObject(seatNode) : null;
  const wheelBox = wheelNode ? new THREE.Box3().setFromObject(wheelNode) : null;
  const seatCenter = seatBox ? seatBox.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 0.42, -0.2);
  const wheelCenter = wheelBox ? wheelBox.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 0.44, 0.05);

  const driver = new THREE.Group();
  driver.name = 'driver';
  const suit = new THREE.MeshPhysicalMaterial({
    color: 0x101416,
    roughness: 0.78,
    metalness: 0.06,
    sheen: 0.35,
    sheenColor: new THREE.Color(0x5d1b14),
  });
  const glove = new THREE.MeshPhysicalMaterial({
    color: 0x1a1b1c,
    roughness: 0.7,
  });
  const helmetWhite = new THREE.MeshPhysicalMaterial({
    color: 0xf3eee4,
    metalness: 0.22,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.3,
  });
  const helmetRed = new THREE.MeshPhysicalMaterial({
    color: 0xa51f16,
    metalness: 0.2,
    roughness: 0.3,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.1,
  });
  const visor = new THREE.MeshPhysicalMaterial({
    color: 0x081012,
    metalness: 0.8,
    roughness: 0.04,
    clearcoat: 1,
    envMapIntensity: 2,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 8, 16), suit);
  torso.position.set(seatCenter.x, seatCenter.y + 0.08, seatCenter.z - 0.02);
  torso.rotation.x = 0.18;
  torso.scale.set(1, 1, 0.65);
  torso.castShadow = true;
  driver.add(torso);

  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.033, 0.22, 6, 10), suit);
    arm.position.set(
      seatCenter.x + s * 0.13,
      seatCenter.y + 0.06,
      seatCenter.z + (wheelCenter.z - seatCenter.z) * 0.42,
    );
    arm.rotation.set(-0.7, 0, -s * 0.28);
    arm.castShadow = true;
    driver.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), glove);
    hand.position.set(
      seatCenter.x + s * 0.16,
      seatCenter.y + 0.02,
      seatCenter.z + (wheelCenter.z - seatCenter.z) * 0.75,
    );
    driver.add(hand);
  }

  const helmet = new THREE.Group();
  helmet.position.set(
    seatCenter.x,
    seatCenter.y + 0.25,
    seatCenter.z - 0.035,
  );
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.108, 24, 16), helmetRed);
  shell.scale.set(0.94, 1, 1.03);
  shell.castShadow = true;
  helmet.add(shell);

  const stripe = new THREE.Mesh(
    new THREE.SphereGeometry(0.109, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.14),
    helmetWhite,
  );
  stripe.rotation.z = 0.18;
  helmet.add(stripe);

  const visorBand = new THREE.Mesh(new THREE.SphereGeometry(0.102, 24, 10, -0.85, 1.7, 1.1, 0.55), visor);
  visorBand.rotation.y = Math.PI;
  visorBand.scale.set(1, 0.55, 1);
  visorBand.position.set(0, -0.01, 0.02);
  helmet.add(visorBand);

  driver.add(helmet);
  carRoot.add(driver);
  return driver;
}

function makeRainLight(carRoot, model) {
  const node = model.getObjectByName('rear_lights_g_light_rain');
  if (!node) return null;
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xff2a18, toneMapped: false });
  node.traverse((o) => {
    if (o.isMesh) o.material = lightMat;
  });
  const box = new THREE.Box3().setFromObject(node);
  const center = box.getCenter(new THREE.Vector3());
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0xff2e1a,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.position.copy(center);
  glow.scale.setScalar(0.13);
  carRoot.add(glow);
  return { node, glow, material: lightMat };
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function loadVehicle({ onProgress, renderer } = {}) {
  const loader = new GLTFLoader();
  const url = new URL('assets/f1-2022.glb', document.baseURI).href;
  const gltf = await loader.loadAsync(url, (event) => {
    if (onProgress && event.total) onProgress(event.loaded / event.total, event);
  });

  const model = gltf.scene;
  model.updateMatrixWorld(true);

  // Remove the baked-in Blender light, camera and creator credit plate.
  const remove = [];
  model.traverse((o) => {
    if (o.isLight || o.isCamera) remove.push(o);
    if (o.isMesh && /creator[_\s-]?text/i.test(o.name)) remove.push(o);
  });
  remove.forEach((o) => o.parent?.remove(o));

  const rawBox = new THREE.Box3().setFromObject(model);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const scale = 5.6 / rawSize.z;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= scaledBox.min.y;
  model.position.y += 0.005;
  model.updateMatrixWorld(true);

  const carRoot = new THREE.Group();
  carRoot.name = 'aethon-f1-2022';
  carRoot.add(model);

  const materials = upgradeMaterials(carRoot, renderer);
  carRoot.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
  });

  const wheels = setupWheels(model, carRoot);
  const driver = makeDriver(carRoot, model);
  const rainLight = makeRainLight(carRoot, model);

  // The supplied model arrives as 100+ individual trim pieces. Once the
  // rotating wheel assemblies have been reparented, the remaining bodywork is
  // rigid, so collapse it by material: identical silhouette, a fraction of
  // the draw calls, and much cheaper reflection/shadow passes.
  mergeStaticMeshes(model, { name: 'f1-body' });

  // A few extra internal spotlights make the cockpit read at night.
  const cockpitLight = new THREE.PointLight(0xffd6b0, 0.35, 1.2, 2);
  cockpitLight.position.set(0, 0.7, -0.1);
  carRoot.add(cockpitLight);

  const bodyBox = new THREE.Box3().setFromObject(carRoot);
  const size = bodyBox.getSize(new THREE.Vector3());

  return {
    root: carRoot,
    model,
    wheels,
    driver,
    rainLight,
    cockpitLight,
    materials,
    size,
    bbox: bodyBox,
    scale,
    lengthMeters: 5.6,
  };
}
