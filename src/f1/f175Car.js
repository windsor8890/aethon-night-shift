import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeStaticMeshes } from '../lib/merge.js';

const LENGTH = 5.6;
const WHEELBASE = 3.55;
const TRACK = 1.64;
const WHEEL_RADIUS = 0.37;
const AXLE_Z = WHEELBASE * 0.5;

function makePaint() {
  const mat = new THREE.MeshPhysicalMaterial({
    name: 'FerrariRosso',
    color: 0xb2141b,
    metalness: 0.3,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.055,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vF1World;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n  vF1World = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = 'varying vec3 vF1World;\n' + shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `{
        if (abs(vF1World.x) > 0.48) {
          float dF = length(vec2(vF1World.y - ${WHEEL_RADIUS.toFixed(3)}, vF1World.z - ${AXLE_Z.toFixed(3)}));
          float dR = length(vec2(vF1World.y - ${WHEEL_RADIUS.toFixed(3)}, vF1World.z + ${AXLE_Z.toFixed(3)}));
          if (dF < 0.48 || dR < 0.48) discard;
        }
      }
      #include <clipping_planes_fragment>`,
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (vF1World.y < 0.17) diffuseColor.rgb = vec3(0.018, 0.019, 0.020);
      if (vF1World.z < -2.12 && vF1World.y > 0.52) diffuseColor.rgb = vec3(0.026, 0.027, 0.028);
      if (vF1World.z > 2.18 && vF1World.y < 0.42) diffuseColor.rgb = vec3(0.024, 0.025, 0.026);`,
    );
  };
  mat.customProgramCacheKey = () => 'ferrari-wheel-mask-v1';
  return mat;
}

function makeWheelMaterials() {
  return {
    tyre: new THREE.MeshStandardMaterial({ name: 'PirelliTyre', color: 0x08090a, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide }),
    sidewall: new THREE.MeshStandardMaterial({ name: 'PirelliSidewall', color: 0x111214, roughness: 0.8, metalness: 0.02 }),
    rim: new THREE.MeshStandardMaterial({ name: 'WheelRim', color: 0x17191b, roughness: 0.28, metalness: 0.9, envMapIntensity: 1.2 }),
    cover: new THREE.MeshStandardMaterial({ name: 'WheelCover', color: 0x141618, roughness: 0.32, metalness: 0.8 }),
    ring: new THREE.MeshStandardMaterial({ name: 'PirelliRing', color: 0xd5bb46, roughness: 0.45, metalness: 0.25 }),
    brake: new THREE.MeshStandardMaterial({ name: 'BrakeDisc', color: 0x2b2622, roughness: 0.5, metalness: 0.7 }),
    caliper: new THREE.MeshStandardMaterial({ name: 'Caliper', color: 0xc51b1b, roughness: 0.36, metalness: 0.3 }),
  };
}

function makeWheel(side, front, mats) {
  const group = new THREE.Group();
  group.name = `wheel-${front ? 'front' : 'rear'}-${side > 0 ? 'right' : 'left'}`;
  group.position.set(side * TRACK * 0.5, WHEEL_RADIUS, (front ? 1 : -1) * AXLE_Z);
  group.userData.wheel = true;
  group.userData.base = group.position.clone();
  group.userData.offset = new THREE.Vector3(side * 0.95, 0.05, front ? 0.18 : -0.18);

  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.38, 64, 1, false), mats.tyre);
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  tyre.receiveShadow = true;
  group.add(tyre);

  const shoulder = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS * 0.94, 0.035, 10, 48), mats.sidewall);
  shoulder.rotation.y = Math.PI / 2;
  shoulder.position.x = 0.17;
  group.add(shoulder);
  const shoulder2 = shoulder.clone();
  shoulder2.position.x = -0.17;
  group.add(shoulder2);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS * 0.6, WHEEL_RADIUS * 0.6, 0.4, 40), mats.rim);
  rim.rotation.z = Math.PI / 2;
  group.add(rim);

  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, WHEEL_RADIUS * 0.47, 0.045), mats.rim);
    spoke.position.set(0.205, Math.cos(a) * 0.17, Math.sin(a) * 0.17);
    spoke.rotation.x = a;
    group.add(spoke);
  }

  const lip = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS * 0.63, 0.009, 8, 48), mats.rim);
  lip.rotation.y = Math.PI / 2;
  lip.position.x = 0.202;
  group.add(lip);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS * 0.61, 0.012, 8, 48), mats.ring);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = 0.215;
  group.add(ring);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.045, 20), mats.caliper);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = 0.218;
  group.add(hub);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS * 0.5, WHEEL_RADIUS * 0.5, 0.035, 32), mats.brake);
  disc.rotation.z = Math.PI / 2;
  disc.position.x = 0.02;
  group.add(disc);
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.19), mats.caliper);
  caliper.position.set(0.04, 0.18, 0);
  group.add(caliper);

  return group;
}

function makeInternals() {
  const group = new THREE.Group();
  group.name = 'f1-75-internals';
  const mat = {
    engine: new THREE.MeshStandardMaterial({ name: 'EngineAlloy', color: 0x33383b, metalness: 0.82, roughness: 0.38 }),
    cam: new THREE.MeshPhysicalMaterial({ name: 'CamCover', color: 0x8e1418, metalness: 0.4, roughness: 0.3, clearcoat: 0.8 }),
    silver: new THREE.MeshStandardMaterial({ name: 'MachinedAlloy', color: 0x8d918f, metalness: 0.9, roughness: 0.3 }),
    carbon: new THREE.MeshStandardMaterial({ name: 'InternalCarbon', color: 0x0d1011, metalness: 0.35, roughness: 0.55 }),
    hose: new THREE.MeshStandardMaterial({ name: 'OrangeHose', color: 0xc45b17, roughness: 0.55, metalness: 0.1 }),
    coolant: new THREE.MeshStandardMaterial({ name: 'CoolantHose', color: 0x8f1e1e, roughness: 0.6, metalness: 0.05 }),
    battery: new THREE.MeshStandardMaterial({ name: 'EnergyStore', color: 0x18282e, metalness: 0.5, roughness: 0.45 }),
    gold: new THREE.MeshStandardMaterial({ name: 'HeatShield', color: 0xb79352, metalness: 0.8, roughness: 0.34 }),
    seat: new THREE.MeshStandardMaterial({ name: 'Seat', color: 0x121212, roughness: 0.72, metalness: 0.02 }),
    belt: new THREE.MeshStandardMaterial({ name: 'Harness', color: 0x8e1717, roughness: 0.7 }),
    tyre: new THREE.MeshStandardMaterial({ name: 'InternalTyre', color: 0x08090a, roughness: 0.9 }),
  };
  const box = (w, h, d, x, y, z, m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const cyl = (r1, r2, h, x, y, z, m, axis = 'y') => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 20), m);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const tube = (points, radius, m) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, radius, 8, false), m);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  // 1.6 V6 turbo hybrid
  box(0.52, 0.3, 0.55, 0, 0.5, -0.88, mat.engine);
  box(0.19, 0.075, 0.5, -0.18, 0.69, -0.88, mat.cam);
  box(0.19, 0.075, 0.5, 0.18, 0.69, -0.88, mat.cam);
  cyl(0.13, 0.15, 0.4, 0, 0.8, -0.87, mat.silver, 'z');
  cyl(0.14, 0.14, 0.2, 0.28, 0.6, -1.32, mat.silver, 'z');
  cyl(0.2, 0.2, 0.05, 0.28, 0.6, -1.43, mat.gold, 'z');
  box(0.33, 0.12, 0.17, -0.24, 0.61, -1.2, mat.gold);
  box(0.33, 0.12, 0.17, 0.24, 0.61, -1.2, mat.gold);
  for (let i = 0; i < 3; i += 1) {
    tube([
      new THREE.Vector3(-0.14 + i * 0.14, 0.5, -0.65),
      new THREE.Vector3(-0.25 + i * 0.25, 0.56, -1.05),
      new THREE.Vector3(-0.3 + i * 0.3, 0.72, -1.37),
      new THREE.Vector3(-0.36 + i * 0.36, 0.52, -1.62),
    ], 0.018, mat.gold);
  }
  box(0.34, 0.26, 0.38, 0, 0.43, -1.72, mat.engine);
  box(0.16, 0.15, 0.22, 0, 0.3, -1.92, mat.carbon);
  cyl(0.045, 0.055, 0.22, -0.15, 0.32, -2.05, mat.gold, 'z');
  cyl(0.045, 0.055, 0.22, 0.05, 0.32, -2.05, mat.gold, 'z');

  // energy store and fuel cell
  box(0.42, 0.2, 0.32, 0, 0.28, 0.1, mat.battery);
  box(0.36, 0.04, 0.27, 0, 0.39, 0.1, mat.carbon);
  box(0.435, 0.05, 0.33, 0, 0.38, 0.1, mat.silver);
  box(0.435, 0.018, 0.33, 0, 0.186, 0.1, mat.silver);
  const hv = new THREE.MeshBasicMaterial({ name: 'HVGlow', color: 0xff7b2c, toneMapped: false });
  for (let i = 0; i < 5; i += 1) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.335, 0.012, 0.018), hv);
    strip.position.set(0, 0.392, -0.02 + i * 0.06);
    group.add(strip);
  }
  for (let i = 0; i < 4; i += 1) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.045), hv);
    cell.position.set(0.214, 0.27, -0.02 + i * 0.07);
    group.add(cell);
  }
  for (let i = 0; i < 5; i += 1) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.01), hv);
    cell.position.set(-0.15 + i * 0.075, 0.275, 0.266);
    group.add(cell);
  }
  const packLamp = new THREE.PointLight(0xff7a2a, 1.2, 0.7, 2);
  packLamp.position.set(0, 0.48, 0.12);
  group.add(packLamp);
  box(0.3, 0.28, 0.46, 0, 0.36, -0.36, mat.carbon);
  tube([
    new THREE.Vector3(0.15, 0.36, 0.3),
    new THREE.Vector3(0.33, 0.42, 0.1),
    new THREE.Vector3(0.23, 0.48, -0.22),
    new THREE.Vector3(0.14, 0.52, -0.5),
  ], 0.018, mat.hose);
  tube([
    new THREE.Vector3(-0.15, 0.36, 0.3),
    new THREE.Vector3(-0.34, 0.44, 0.05),
    new THREE.Vector3(-0.24, 0.52, -0.32),
  ], 0.018, mat.hose);

  // sidepod radiators
  for (const side of [-1, 1]) {
    box(0.075, 0.38, 0.54, side * 0.56, 0.47, 0.06, mat.carbon);
    box(0.02, 0.36, 0.5, side * 0.606, 0.47, 0.06, mat.silver);
    for (let i = 0; i < 5; i += 1) {
      box(0.09, 0.012, 0.47, side * 0.565, 0.34 + i * 0.065, 0.06, mat.silver);
    }
    tube([
      new THREE.Vector3(side * 0.54, 0.47, 0.32),
      new THREE.Vector3(side * 0.55, 0.48, 0.6),
      new THREE.Vector3(side * 0.4, 0.55, 0.8),
      new THREE.Vector3(side * 0.2, 0.6, 0.75),
    ], 0.021, mat.coolant);
  }

  // cockpit cell and carbon tub details
  box(0.38, 0.12, 0.56, 0, 0.33, 0.35, mat.carbon);
  box(0.36, 0.2, 0.5, 0, 0.44, 0.34, mat.seat);
  box(0.36, 0.4, 0.06, 0, 0.57, 0.1, mat.seat);
  box(0.3, 0.06, 0.42, 0, 0.31, 0.37, mat.seat);
  for (const side of [-1, 1]) {
    tube([
      new THREE.Vector3(side * 0.13, 0.62, 0.12),
      new THREE.Vector3(side * 0.1, 0.5, 0.42),
      new THREE.Vector3(side * 0.04, 0.38, 0.52),
    ], 0.018, mat.belt);
  }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.023, 10, 28), mat.carbon);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0, 0.69, 0.57);
  wheel.rotation.x = Math.PI / 2.35;
  group.add(wheel);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), mat.caliper ?? mat.gold);
  boss.rotation.x = Math.PI / 2;
  boss.position.set(0, 0.69, 0.57);
  group.add(boss);

  // floor/diffuser reference surface, kept under the shell
  const floorMat = new THREE.MeshStandardMaterial({ name: 'UndertrayCarbon', color: 0x090b0c, metalness: 0.4, roughness: 0.55 });
  box(1.72, 0.025, 3.8, 0, 0.065, -0.25, floorMat);
  for (let i = -2; i <= 2; i += 1) {
    box(0.02, 0.15, 0.5, i * 0.14, 0.11, -2.18, floorMat);
  }

  group.userData.materials = mat;
  return group;
}

export async function loadF175({ url = '/assets/ferrari-f1-75.glb', onProgress } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url, (e) => {
    if (e.total) onProgress?.(e.loaded / e.total);
  });
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  source.traverse((o) => {
    if (o.isCamera || o.isLight) o.visible = false;
  });

  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());
  const s = LENGTH / size.z;
  source.scale.setScalar(s);
  source.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(source);
  const center = box2.getCenter(new THREE.Vector3());
  source.position.x -= center.x;
  source.position.z -= center.z;
  source.position.y -= box2.min.y;
  source.updateMatrixWorld(true);

  const carRoot = new THREE.Group();
  carRoot.name = 'ferrari-f1-75';
  carRoot.add(source);

  const paint = makePaint();
  source.traverse((o) => {
    if (!o.isMesh) return;
    o.material = paint;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  // The mirrored GLB has a broken all-zero COLOR_0 stream; painting is done
  // with the replacement Rosso Corsa material above.
  mergeStaticMeshes(source, { name: 'f1-75-body' });

  const wheelMats = makeWheelMaterials();
  const wheels = [];
  for (const front of [true, false]) {
    for (const side of [-1, 1]) {
      const w = makeWheel(side, front, wheelMats);
      carRoot.add(w);
      wheels.push(w);
    }
  }

  // The mirrored GLB has a broken all-zero COLOR_0 stream and no texture.
  // The car is presented as a Rosso Corsa show car rather than faking a
  // factory livery that the file does not contain.
  const internals = makeInternals();
  carRoot.add(internals);

  const cockpitLamp = new THREE.PointLight(0xffd8b4, 5.0, 2.4, 2);
  cockpitLamp.position.set(0.1, 0.72, 0.32);
  carRoot.add(cockpitLamp);
  const engineLamp = new THREE.PointLight(0xffcda0, 6.2, 2.6, 2);
  engineLamp.position.set(0, 0.62, -0.95);
  carRoot.add(engineLamp);

  const allMaterials = new Set();
  carRoot.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m) { m.clipShadows = true; allMaterials.add(m); }
    }
  });
  const materialList = [...allMaterials];
  const bodyMaterials = [paint];

  const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.26);
  const halfPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.0);
  function setClipping(mode) {
    for (const m of materialList) { m.clippingPlanes = []; m.needsUpdate = true; }
    if (mode === 'cutaway') {
      for (const m of bodyMaterials) { m.clippingPlanes = [cutPlane]; m.needsUpdate = true; }
    } else if (mode === 'half') {
      for (const m of materialList) { m.clippingPlanes = [halfPlane]; m.needsUpdate = true; }
    }
  }

  function setGhost(on) {
    for (const m of bodyMaterials) {
      m.transparent = on;
      m.opacity = on ? 0.18 : 1;
      m.depthWrite = !on;
      m.needsUpdate = true;
    }
  }

  const sourceBase = source.position.clone();
  const wheelBase = wheels.map((w) => w.position.clone());
  let explosion = 0;
  function setExplosion(value) {
    explosion = THREE.MathUtils.clamp(value, 0, 1);
    const e = 1 - Math.pow(1 - explosion, 3);
    source.position.copy(sourceBase).add(new THREE.Vector3(0, 1.08 * e, 0));
    internals.position.set(0, 0.16 * e, -0.2 * e);
    wheels.forEach((w, i) => {
      const off = new THREE.Vector3(
        Math.sign(wheelBase[i].x) * 0.92 * e,
        0.06 * e,
        (wheelBase[i].z > 0 ? 1 : -1) * 0.2 * e,
      );
      w.position.copy(wheelBase[i]).add(off);
    });
    return explosion;
  }

  const bbox = new THREE.Box3().setFromObject(carRoot);
  return {
    root: carRoot,
    source,
    internals,
    bodyMaterial: paint,
    wheelMaterials: wheelMats,
    wheels,
    allMaterials: materialList,
    bodyMaterials,
    setClipping,
    setGhost,
    setExplosion,
    get explosion() { return explosion; },
    bbox,
    scale: s,
    wheelRadius: WHEEL_RADIUS,
  };
}
