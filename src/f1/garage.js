import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {
  TAU,
  box,
  cylinderBetween,
  makeAnchor,
  meshOf,
  mulberry32,
  roundedBox,
  tube,
} from '../lib/geo.js';

const _v = new THREE.Vector3();

function standard(color, roughness = 0.6, metalness = 0.2) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function physical(opts) {
  return new THREE.MeshPhysicalMaterial(opts);
}

function hdr(r, g, b) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(r, g, b),
    toneMapped: false,
  });
}

function screenPlane(texture, w, h) {
  return meshOf(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: true,
    transparent: false,
    side: THREE.DoubleSide,
  }), { castShadow: false, receiveShadow: false });
}

function addContactShadow(group, texture, x, z, w, d, opacity = 0.6, y = 0.007) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: texture,
      color: 0x000000,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.renderOrder = 2;
  group.add(m);
  return m;
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

function tyreGeometry(radius = 0.37, width = 0.32) {
  const rim = radius * 0.58;
  const pts = [
    [rim, -width / 2],
    [radius * 0.9, -width / 2],
    [radius * 0.985, -width / 2 + 0.014],
    [radius, -width / 2 + 0.05],
    [radius, width / 2 - 0.05],
    [radius * 0.985, width / 2 - 0.014],
    [radius * 0.9, width / 2],
    [rim, width / 2],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 44);
}

function buildTyreStack(gt, x, z, count = 4, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const tireGeo = tyreGeometry(0.37, 0.31);
  for (let i = 0; i < count; i++) {
    const tire = meshOf(tireGeo, gt.rubber, {
      position: [0, 0.16 + i * 0.295, 0],
      rotation: [0, i * 0.22, 0],
      castShadow: false,
    });
    g.add(tire);
    const band = meshOf(new THREE.TorusGeometry(0.37, 0.008, 6, 48), i % 2 ? gt.tyreWhite : gt.tyreRed, {
      position: [0, 0.16 + i * 0.295, 0],
      rotation: [Math.PI / 2, 0, 0],
      castShadow: false,
    });
    g.add(band);
    g.add(
      meshOf(new THREE.TorusGeometry(0.24, 0.004, 5, 40), gt.tyreYellow, {
        position: [0, 0.315 + i * 0.295, 0],
        rotation: [Math.PI / 2, 0, 0],
        castShadow: false,
      }),
    );
  }
  // protective tyre blanket on the top
  const blanket = roundedBox(0.78, 0.08, 0.78, 0.08, gt.blanket, {
    position: [0, 0.16 + count * 0.295 + 0.015, 0],
    rotation: [0, 0.3, 0],
    castShadow: false,
  });
  g.add(blanket);
  g.add(
    box(0.04, 0.002, 0.74, gt.tyreRed, {
      position: [0, 0.16 + count * 0.295 + 0.06, 0],
      rotation: [0, 0.3, 0],
    }),
  );
  return g;
}

function buildToolChest(gt, decalMat) {
  const g = new THREE.Group();
  const w = 0.98;
  const h = 1.04;
  const d = 0.62;
  const body = new THREE.MeshPhysicalMaterial({
    color: 0x6b1410,
    roughness: 0.32,
    metalness: 0.65,
    clearcoat: 0.7,
    clearcoatRoughness: 0.14,
  });
  g.add(roundedBox(w, h, d, 0.055, body, { position: [0, h / 2 + 0.09, 0] }));
  g.add(roundedBox(w + 0.03, 0.06, d + 0.03, 0.02, gt.darkMetal, { position: [0, h + 0.12, 0] }));
  g.add(roundedBox(w - 0.03, 0.04, d - 0.02, 0.012, gt.rubber, { position: [0, h + 0.155, 0] }));

  const drawers = 6;
  for (let i = 0; i < drawers; i++) {
    const y = 0.18 + i * 0.135;
    g.add(
      roundedBox(w - 0.06, 0.118, 0.015, 0.008, gt.cabinetBlack, {
        position: [0, y, d / 2 + 0.008],
      }),
    );
    g.add(
      box(0.36, 0.012, 0.022, gt.gold, {
        position: [0, y + 0.035, d / 2 + 0.022],
      }),
    );
    g.add(
      box(0.1, 0.006, 0.008, gt.gold, {
        position: [0, y - 0.02, d / 2 + 0.022],
      }),
    );
  }
  // casters
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        meshOf(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14), gt.rubber, {
          position: [sx * (w / 2 - 0.09), 0.055, sz * (d / 2 - 0.08)],
          rotation: [0, 0, Math.PI / 2],
        }),
      );
    }
  }
  // handles
  for (const s of [-1, 1]) {
    g.add(
      tube(
        [
          [s * (w / 2 + 0.01), 0.75, -0.15],
          [s * (w / 2 + 0.08), 0.76, 0],
          [s * (w / 2 + 0.01), 0.77, 0.15],
        ],
        0.018,
        gt.darkMetal,
        { segments: 12, radialSegments: 7 },
      ),
    );
  }
  const decal = meshOf(new THREE.PlaneGeometry(0.58, 0.11), decalMat, {
    position: [0, 0.98, d / 2 + 0.024],
    castShadow: false,
  });
  g.add(decal);
  // a laptop on top
  const laptop = new THREE.Group();
  laptop.position.set(0.1, h + 0.18, 0.02);
  laptop.rotation.y = -0.3;
  laptop.add(roundedBox(0.34, 0.018, 0.24, 0.01, gt.cabinetBlack, { position: [0, 0, 0] }));
  laptop.add(roundedBox(0.07, 0.002, 0.07, 0.008, gt.darkMetal, { position: [0, 0.011, 0.04] }));
  const screenLaptop = new THREE.Group();
  screenLaptop.position.set(0, 0.01, -0.12);
  screenLaptop.rotation.x = -0.34;
  screenLaptop.add(roundedBox(0.34, 0.22, 0.012, 0.012, gt.cabinetBlack, { position: [0, 0.11, 0] }));
  screenLaptop.add(
    meshOf(new THREE.PlaneGeometry(0.3, 0.18), gt.screenGreen, {
      position: [0, 0.11, 0.007],
      rotation: [0, Math.PI, 0],
      castShadow: false,
    }),
  );
  laptop.add(screenLaptop);
  g.add(laptop);
  return g;
}

function buildWorkbench(gt, decalMat, textures) {
  const g = new THREE.Group();

  // cabinet base
  g.add(roundedBox(3.7, 0.82, 0.72, 0.035, gt.cabinetBlack, { position: [0, 0.43, 0] }));
  for (let i = 0; i < 3; i++) {
    g.add(
      roundedBox(1.08, 0.68, 0.018, 0.008, gt.darkPanel, {
        position: [-1.17 + i * 1.17, 0.44, 0.37],
      }),
    );
    g.add(box(0.36, 0.012, 0.02, gt.gold, { position: [-1.17 + i * 1.17, 0.65, 0.387] }));
  }
  // counter top
  g.add(roundedBox(3.95, 0.075, 0.86, 0.022, gt.counter, { position: [0, 0.91, 0.02] }));
  // drawers / pegboard wall
  g.add(roundedBox(3.9, 1.65, 0.06, 0.02, gt.cabinetBlack, { position: [0, 1.87, -0.36] }));
  for (let i = 0; i < 5; i++) {
    g.add(box(0.02, 1.5, 0.005, gt.darkPanel, { position: [-1.55 + i * 0.78, 1.85, -0.325] }));
  }

  // tools on pegboard
  for (let i = 0; i < 8; i++) {
    const x = -1.55 + i * 0.44;
    g.add(box(0.022, 0.26 + (i % 3) * 0.08, 0.016, gt.metal, { position: [x, 2.05, -0.31] }));
    g.add(box(0.08, 0.025, 0.022, gt.metal, { position: [x, 2.2 + (i % 3) * 0.04, -0.3] }));
  }

  // monitor on an arm
  const monitor = new THREE.Group();
  monitor.position.set(0.62, 1.22, -0.02);
  monitor.rotation.y = -0.14;
  const frame = roundedBox(1.05, 0.6, 0.055, 0.022, gt.cabinetBlack, { position: [0, 0.28, 0] });
  monitor.add(frame);
  const screen = screenPlane(textures.telemetry[0], 0.99, 0.54);
  screen.position.set(0, 0.28, -0.031);
  screen.rotation.y = Math.PI;
  monitor.add(screen);
  // screen sheen
  monitor.add(
    meshOf(
      new THREE.PlaneGeometry(0.99, 0.54),
      new THREE.MeshBasicMaterial({
        color: 0xaadbd8,
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      { position: [0, 0.28, -0.037], rotation: [0, Math.PI, 0], castShadow: false, receiveShadow: false },
    ),
  );
  monitor.add(
    meshOf(new THREE.CylinderGeometry(0.026, 0.026, 0.38, 10), gt.metal, {
      position: [0, -0.02, -0.02],
      rotation: [0.3, 0, 0],
    }),
  );
  monitor.add(roundedBox(0.28, 0.02, 0.18, 0.012, gt.metal, { position: [0, -0.2, 0.07] }));
  g.add(monitor);

  // keyboard
  g.add(
    roundedBox(0.44, 0.018, 0.15, 0.008, gt.rubber, {
      position: [0.48, 0.96, 0.25],
      rotation: [0, -0.12, 0],
    }),
  );
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      g.add(
        box(0.031, 0.008, 0.02, gt.darkPanel, {
          position: [0.29 + c * 0.038, 0.971, 0.21 + r * 0.025],
          rotation: [0, -0.12, 0],
        }),
      );
    }
  }

  // a little coffee cup & notebook
  g.add(
    meshOf(new THREE.CylinderGeometry(0.045, 0.038, 0.09, 18), gt.gold, {
      position: [1.43, 1.0, 0.23],
    }),
  );
  g.add(
    box(0.22, 0.012, 0.32, gt.paper, {
      position: [1.1, 0.958, 0.29],
      rotation: [0, 0.2, 0],
    }),
  );
  // cabinet drawers below
  g.add(box(1.0, 0.86, 0.01, gt.darkPanel, { position: [-0.95, 0.43, 0.4] }));
  g.add(box(1.0, 0.86, 0.01, gt.darkPanel, { position: [1.2, 0.43, 0.4] }));
  const tag = meshOf(new THREE.PlaneGeometry(0.82, 0.16), decalMat, {
    position: [0, 0.67, 0.402],
    castShadow: false,
  });
  g.add(tag);

  return g;
}

function buildPitBoard(gt, textures, decalMat) {
  const g = new THREE.Group();
  g.add(roundedBox(0.08, 1.7, 0.08, 0.02, gt.darkMetal, { position: [-0.7, 0.85, 0] }));
  g.add(roundedBox(0.08, 1.7, 0.08, 0.02, gt.darkMetal, { position: [0.7, 0.85, 0] }));
  g.add(roundedBox(1.65, 0.055, 0.08, 0.014, gt.darkMetal, { position: [0, 1.7, 0] }));
  const board = roundedBox(1.7, 1.0, 0.08, 0.035, gt.counter, { position: [0, 1.23, 0] });
  g.add(board);
  g.add(box(1.76, 0.016, 0.02, gt.lightCool, { position: [0, 1.76, 0.01] }));
  g.add(box(1.76, 0.01, 0.02, gt.lightRed, { position: [0, 0.72, 0.01] }));
  const screen = screenPlane(textures.telemetry[1], 1.54, 0.84);
  screen.position.set(0, 1.23, -0.046);
  screen.rotation.y = Math.PI;
  g.add(screen);
  const header = meshOf(new THREE.PlaneGeometry(0.54, 0.09), decalMat, {
    position: [0, 0.9, -0.049],
    rotation: [0, Math.PI, 0],
    castShadow: false,
  });
  g.add(header);
  // wheels
  for (const s of [-1, 1]) {
    g.add(
      meshOf(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 18), gt.rubber, {
        position: [s * 0.7, 0.1, 0],
        rotation: [0, 0, Math.PI / 2],
      }),
    );
  }
  return g;
}

function buildWallRack(gt) {
  const g = new THREE.Group();
  const tireGeo = tyreGeometry(0.35, 0.3);

  for (let level = 0; level < 3; level++) {
    const y = 0.7 + level * 0.62;
    g.add(box(0.92, 0.045, 3.45, gt.darkMetal, { position: [0, y, 0] }));
    for (let j = 0; j < 4; j++) {
      const z = -1.25 + j * 0.82;
      const tire = meshOf(tireGeo, gt.rubber, {
        position: [0.05, y + 0.19, z],
        rotation: [0, j * 0.4, 0],
        castShadow: false,
      });
      g.add(tire);
      g.add(
        meshOf(new THREE.TorusGeometry(0.35, 0.006, 5, 36), j % 2 ? gt.tyreRed : gt.tyreYellow, {
          position: [0.05, y + 0.19, z],
          rotation: [Math.PI / 2, 0, 0],
        }),
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(0.055, 2.75, 0.055, gt.darkMetal, { position: [sx * 0.47, 1.38, sz * 1.7] }));
    }
  }
  // diagonal brace
  g.add(
    tube(
      [
        [-0.47, 0.2, -1.7],
        [-0.47, 2.6, 1.7],
      ],
      0.018,
      gt.darkMetal,
      { segments: 2, radialSegments: 6 },
    ),
  );
  return g;
}

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

export function buildGarage({ textures }) {
  RectAreaLightUniformsLib.init();
  const group = new THREE.Group();
  group.name = 'pit-garage';

  const gt = {
    wall: standard(0x101518, 0.83, 0.08),
    wallPanel: standard(0x171d20, 0.72, 0.18),
    darkPanel: standard(0x090d0f, 0.65, 0.2),
    cabinetBlack: standard(0x0b0d0e, 0.5, 0.35),
    counter: standard(0x262b2d, 0.42, 0.4),
    darkMetal: standard(0x3b4144, 0.45, 0.85),
    metal: new THREE.MeshPhysicalMaterial({
      color: 0x8a9093,
      roughness: 0.26,
      metalness: 1,
      envMapIntensity: 0.9,
    }),
    gold: standard(0xc49552, 0.3, 0.9),
    rubber: standard(0x111313, 0.9, 0.02),
    blanket: standard(0x15181a, 0.72, 0.08),
    tyreRed: standard(0x8d1a12, 0.7, 0.05),
    tyreWhite: standard(0xb9b0a0, 0.8, 0.03),
    tyreYellow: standard(0xa48b4a, 0.7, 0.1),
    paper: standard(0xd6cec0, 0.7, 0.02),
    screenGreen: new THREE.MeshBasicMaterial({ color: 0x9ce8d7, toneMapped: false }),
    lightWarm: hdr(3.8, 3.35, 2.9),
    lightCool: hdr(2.6, 3.7, 4.0),
    lightRed: hdr(4.4, 0.4, 0.2),
    haze: new THREE.MeshBasicMaterial({
      map: textures.lightShaft,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      color: 0xbfe4e0,
      toneMapped: false,
    }),
    screen: null,
  };

  const decalMat = new THREE.MeshBasicMaterial({
    map: textures.wordmark,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
  const decalSmall = new THREE.MeshBasicMaterial({
    map: textures.wordmarkSmall,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
  });

  /* ---------- floor and reflection ---------- */
  const reflector = new Reflector(new THREE.PlaneGeometry(22, 19.8), {
    clipBias: 0.004,
    textureWidth: 768,
    textureHeight: 768,
    color: 0x565d60,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0.002, -1.1);
  reflector.userData.noMerge = true;
  group.add(reflector);
  // keep the expensive mirror pass at half rate
  const originalReflect = reflector.onBeforeRender;
  let reflectFrame = 0;
  reflector.onBeforeRender = function (...args) {
    reflectFrame += 1;
    if (reflectFrame === 1 || reflectFrame % 2 === 0) {
      originalReflect.apply(this, args);
    }
  };

  const floorMat = physical({
    map: textures.concrete.map,
    roughnessMap: textures.concrete.roughnessMap,
    normalMap: textures.concrete.normalMap,
    normalScale: new THREE.Vector2(0.2, 0.2),
    color: 0xa6acab,
    roughness: 0.8,
    metalness: 0.08,
    clearcoat: 0.06,
    clearcoatRoughness: 0.7,
    transparent: true,
    opacity: 0.8,
    envMapIntensity: 0.25,
    depthWrite: false,
  });
  const floor = meshOf(new THREE.PlaneGeometry(22, 19.8), floorMat, {
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0.004, -1.1],
    castShadow: false,
    receiveShadow: true,
    renderOrder: 1,
  });
  group.add(floor);

  // bay outline
  const paintWhite = new THREE.MeshStandardMaterial({
    color: 0xbab5a8,
    roughness: 0.6,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const paintRed = new THREE.MeshStandardMaterial({
    color: 0xd22b17,
    roughness: 0.5,
    metalness: 0.08,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const lineY = 0.011;
  const line = (x, z, w, d, mat) => {
    const m = meshOf(new THREE.PlaneGeometry(w, d), mat, {
      rotation: [-Math.PI / 2, 0, 0],
      position: [x, lineY, z],
      castShadow: false,
      receiveShadow: false,
      renderOrder: 3,
    });
    group.add(m);
  };
  const bay = { x: 4.4, z0: -4.4, z1: 5.0 };
  line(0, bay.z0, bay.x * 2, 0.035, paintWhite);
  line(0, bay.z1, bay.x * 2, 0.035, paintWhite);
  line(-bay.x, (bay.z0 + bay.z1) / 2, 0.035, bay.z1 - bay.z0, paintWhite);
  line(bay.x, (bay.z0 + bay.z1) / 2, 0.035, bay.z1 - bay.z0, paintWhite);
  // corner brackets
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * bay.x;
      const z = sz === -1 ? bay.z0 : bay.z1;
      line(x, z + sz * 0.35, 0.025, 0.7, paintRed);
      line(x - sx * 0.35, z, 0.7, 0.025, paintRed);
    }
  }
  // dashed centre references
  for (let i = 0; i < 11; i++) {
    line(-3.7, -3.9 + i * 0.82, 0.3, 0.014, paintWhite);
    line(3.7, -3.9 + i * 0.82, 0.3, 0.014, paintWhite);
  }

  // tyre position mats
  for (const [x, z] of [
    [-0.835, -1.68],
    [0.835, -1.68],
    [-0.82, 1.62],
    [0.82, 1.62],
  ]) {
    const pad = roundedBox(0.68, 0.018, 0.98, 0.04, gt.blanket, {
      position: [x, 0.012, z],
      castShadow: false,
      receiveShadow: true,
    });
    group.add(pad);
    group.add(
      box(0.5, 0.002, 0.012, gt.tyreRed, {
        position: [x, 0.023, z + 0.43],
        rotation: [0, 0, 0],
      }),
    );
  }

  // hazard strip at the pit exit side
  const hazardMat = new THREE.MeshBasicMaterial({
    map: textures.hazard,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  for (const s of [-1, 1]) {
    const strip = meshOf(new THREE.PlaneGeometry(0.34, 3.2), hazardMat, {
      rotation: [-Math.PI / 2, 0, Math.PI / 2],
      position: [s * 5.2, 0.012, -3.0],
      castShadow: false,
      receiveShadow: false,
      renderOrder: 3,
    });
    group.add(strip);
  }

  /* ---------- shell of the garage ---------- */
  const doorHalf = 4.55;
  const doorHeight = 4.45;

  // side piers and header leave a real portal for the car to leave through
  const pierW = 10.85 - doorHalf;
  for (const s of [-1, 1]) {
    group.add(
      box(pierW, 6.6, 0.35, gt.wall, {
        position: [s * (doorHalf + pierW / 2), 3.3, 8.95],
        castShadow: false,
        receiveShadow: true,
      }),
    );
  }
  group.add(
    box(doorHalf * 2, 6.6 - doorHeight, 0.35, gt.wall, {
      position: [0, doorHeight + (6.6 - doorHeight) / 2, 8.95],
      castShadow: false,
      receiveShadow: true,
    }),
  );

  const ceil = box(22, 0.3, 19.2, standard(0x0b1012, 0.9, 0.05), {
    position: [0, 6.45, 0.2],
    castShadow: false,
    receiveShadow: false,
  });
  group.add(ceil);

  for (const s of [-1, 1]) {
    group.add(
      box(0.35, 6.6, 19.0, gt.wall, {
        position: [s * 10.85, 3.3, 0.0],
        castShadow: false,
        receiveShadow: true,
      }),
    );
  }

  // wall panelling only on the solid piers
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      group.add(
        box(0.016, 6.15, 0.12, gt.wallPanel, {
          position: [s * (5.35 + i * 1.5), 3.15, 8.76],
          castShadow: false,
        }),
      );
    }
    for (let i = 0; i < 6; i++) {
      group.add(
        box(0.12, 6.15, 0.016, gt.wallPanel, {
          position: [s * 10.66, 3.15, -6.5 + i * 2.8],
          castShadow: false,
        }),
      );
    }
  }

  // vertical threshold band on the side piers
  for (const s of [-1, 1]) {
    group.add(box(0.16, 6.15, 0.05, gt.darkMetal, { position: [s * 4.64, 3.1, 8.74], castShadow: false }));
    group.add(box(0.035, 4.25, 0.06, gt.tyreRed, { position: [s * 4.7, 2.12, 8.72], castShadow: false }));
  }
  group.add(box(9.4, 0.06, 0.06, gt.tyreRed, { position: [0, 4.48, 8.72], castShadow: false }));

  // heavy dark fascia above the portal; carries the backlit AETHON sign
  group.add(box(9.7, 1.92, 0.8, gt.cabinetBlack, {
    position: [0, 5.42, 8.62],
    castShadow: false,
    receiveShadow: true,
  }));
  group.add(box(9.42, 0.035, 0.04, gt.lightCool, { position: [0, 4.51, 8.2], castShadow: false }));
  group.add(box(9.42, 0.02, 0.04, gt.lightRed, { position: [0, 6.36, 8.2], castShadow: false }));

  // team backlit sign, now above the launch door
  const signGroup = new THREE.Group();
  signGroup.position.set(0, 5.24, 8.17);
  signGroup.scale.setScalar(0.7);
  signGroup.add(roundedBox(7.95, 1.96, 0.16, 0.05, gt.cabinetBlack, { position: [0, 0, -0.02] }));
  signGroup.add(
    meshOf(new THREE.PlaneGeometry(7.72, 1.74), new THREE.MeshBasicMaterial({
      map: textures.backlitSign,
      toneMapped: true,
      side: THREE.DoubleSide,
    }), { position: [0, 0, -0.12], rotation: [0, Math.PI, 0], castShadow: false, receiveShadow: false }),
  );
  signGroup.add(box(7.8, 0.022, 0.025, gt.lightCool, { position: [0, 1.02, -0.13] }));
  signGroup.add(box(7.8, 0.012, 0.02, gt.lightRed, { position: [0, -0.99, -0.13] }));
  group.add(signGroup);

  // close the working end of the bay with a storage wall, so low front
  // three-quarters have a considered backdrop instead of an empty void
  group.add(box(22, 6.6, 0.35, gt.wall, {
    position: [0, 3.3, -9.7],
    castShadow: false,
    receiveShadow: true,
  }));
  for (let i = -6; i <= 6; i++) {
    group.add(box(0.016, 6.15, 0.12, gt.wallPanel, {
      position: [i * 1.6, 3.15, -9.5],
      castShadow: false,
    }));
  }
  const frontMark = meshOf(new THREE.PlaneGeometry(7.4, 1.85), new THREE.MeshBasicMaterial({
    map: textures.wordmark,
    transparent: true,
    opacity: 0.09,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: true,
  }), {
    position: [0, 3.5, -9.46],
    castShadow: false,
    receiveShadow: false,
  });
  group.add(frontMark);
  for (const s of [-1, 1]) {
    group.add(box(0.026, 3.0, 0.035, s > 0 ? gt.lightRed : gt.lightCool, {
      position: [s * 7.5, 2.8, -9.48],
      castShadow: false,
    }));
  }
  // strategy screen and front-wall bench give the frontal compositions depth
  const frontScreen = new THREE.Group();
  frontScreen.position.set(-4.55, 2.45, -9.43);
  frontScreen.add(roundedBox(4.75, 1.68, 0.12, 0.025, gt.cabinetBlack, { position: [0, 0, 0] }));
  frontScreen.add(meshOf(new THREE.PlaneGeometry(4.5, 1.46), new THREE.MeshBasicMaterial({
    map: textures.telemetry[0],
    toneMapped: true,
    side: THREE.DoubleSide,
  }), { position: [0, 0, 0.071] }));
  frontScreen.add(box(4.55, 0.02, 0.025, gt.lightCool, { position: [0, 0.75, 0.08] }));
  group.add(frontScreen);
  const screenWash = new THREE.PointLight(0x6fd6cf, 4.5, 4.2, 1.7);
  screenWash.position.set(-4.55, 2.45, -8.8);
  group.add(screenWash);
  const frontBench = new THREE.Group();
  frontBench.position.set(6.55, 0, -8.45);
  frontBench.rotation.y = Math.PI;
  frontBench.add(roundedBox(3.0, 0.16, 0.85, 0.03, gt.cabinetBlack, { position: [0, 0.92, 0] }));
  frontBench.add(roundedBox(0.55, 0.82, 0.6, 0.02, gt.cabinetBlack, { position: [-1.0, 0.46, 0] }));
  frontBench.add(roundedBox(0.55, 0.82, 0.6, 0.02, gt.cabinetBlack, { position: [1.0, 0.46, 0] }));
  frontBench.add(box(2.45, 0.02, 0.04, gt.lightCool, { position: [0, 1.52, 0.25] }));
  group.add(frontBench);
  addContactShadow(group, textures.shadow, 6.55, -8.4, 3.4, 2.0, 0.4, 0.009);
  const stackD = buildTyreStack(gt, -7.45, -7.2, 3, -0.3);
  group.add(stackD);
  addContactShadow(group, textures.shadow, -7.45, -7.2, 1.7, 1.7, 0.5, 0.009);
  // status monitors on the piers flanking the launch door
  for (const s of [-1, 1]) {
    const monitor = new THREE.Group();
    monitor.position.set(s * 6.15, 2.14, 8.47);
    monitor.rotation.y = Math.PI;
    monitor.add(roundedBox(1.22, 0.76, 0.1, 0.02, gt.cabinetBlack, { position: [0, 0, 0] }));
    monitor.add(meshOf(new THREE.PlaneGeometry(1.08, 0.62), new THREE.MeshBasicMaterial({
      map: textures.telemetry[s > 0 ? 1 : 0],
      toneMapped: true,
      side: THREE.DoubleSide,
    }), { position: [0, 0, 0.058], rotation: [0, Math.PI, 0] }));
    group.add(monitor);
    const glow = new THREE.PointLight(0x6ed3c8, 2.2, 2.4, 1.8);
    glow.position.set(s * 6.15, 2.1, 8.0);
    group.add(glow);
  }

  // portal frame and jambs
  for (const s of [-1, 1]) {
    group.add(box(0.14, doorHeight, 0.38, gt.darkMetal, {
      position: [s * (doorHalf + 0.07), doorHeight / 2, 8.78],
      castShadow: false,
    }));
    group.add(box(0.025, doorHeight - 0.28, 0.02, gt.lightWarm, {
      position: [s * (doorHalf - 0.01), doorHeight / 2, 8.57],
      castShadow: false,
    }));
    // roller guides
    group.add(box(0.06, 5.2, 0.08, gt.metal, {
      position: [s * (doorHalf - 0.18), 2.6, 8.63],
      castShadow: false,
    }));
  }
  group.add(box(doorHalf * 2 + 0.2, 0.18, 0.42, gt.darkMetal, {
    position: [0, doorHeight, 8.8],
    castShadow: false,
  }));
  group.add(box(9.14, 0.028, 0.34, gt.darkMetal, {
    position: [0, 0.02, 8.77],
    castShadow: false,
  }));

  // insulative strip door: horizontal slats in a lifting group
  const door = new THREE.Group();
  door.name = 'launch-door';
  const slats = 12;
  const slatH = doorHeight / slats;
  const doorMat = new THREE.MeshPhysicalMaterial({
    color: 0x101619,
    roughness: 0.3,
    metalness: 0.72,
    clearcoat: 0.5,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.7,
  });
  for (let i = 0; i < slats; i++) {
    const slat = box(doorHalf * 2 - 0.12, slatH - 0.013, 0.075, doorMat, {
      position: [0, slatH * (i + 0.5), 0],
      castShadow: false,
      receiveShadow: true,
    });
    door.add(slat);
  }
  door.position.set(0, 0, 8.8);
  const doorBrand = meshOf(new THREE.PlaneGeometry(3.8, 0.95), new THREE.MeshBasicMaterial({
    map: textures.wordmark,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
  }), {
    position: [0, 2.46, -0.046],
    rotation: [0, Math.PI, 0],
    castShadow: false,
    receiveShadow: false,
  });
  door.add(doorBrand);
  const doorStripe = box(doorHalf * 2 - 0.4, 0.03, 0.012, gt.tyreRed, {
    position: [0, 1.55, -0.045],
    castShadow: false,
  });
  door.add(doorStripe);
  const doorBottom = box(doorHalf * 2 - 0.1, 0.17, 0.1, gt.rubber, {
    position: [0, 0.085, 0],
    castShadow: false,
  });
  door.add(doorBottom);
  group.add(door);
  // warm line of daylight under the closed door
  const doorLeak = box(doorHalf * 2 - 0.35, 0.012, 0.02, new THREE.MeshBasicMaterial({
    color: 0xffd1a0,
    toneMapped: false,
    transparent: true,
    opacity: 0.5,
  }), { position: [0, 0.012, 8.71], castShadow: false });
  group.add(doorLeak);

  // wall cabinets and drawers under the sign
  for (const s of [-1, 1]) {
    const c = roundedBox(3.2, 0.9, 0.48, 0.03, gt.cabinetBlack, {
      position: [s * 6.35, 0.8, 8.55],
      castShadow: false,
    });
    group.add(c);
    for (let i = 0; i < 3; i++) {
      group.add(
        box(0.8, 0.014, 0.02, gt.gold, { position: [s * 7.05 - i * 0.9, 0.9, 8.29] }),
      );
    }
  }
  // tall lit tool wall left of the sign
  const toolWall = roundedBox(3.2, 2.1, 0.09, 0.02, gt.cabinetBlack, {
    position: [-8.9, 2.2, 8.64],
    castShadow: false,
  });
  group.add(toolWall);
  for (let i = 0; i < 8; i++) {
    group.add(
      box(0.035, 0.62 + (i % 3) * 0.16, 0.035, gt.metal, {
        position: [-10.1 + i * 0.34, 2.25, 8.57],
      }),
    );
  }
  group.add(box(3.0, 0.018, 0.03, gt.lightCool, { position: [-8.9, 3.3, 8.56] }));

  // vertical light strips on the side walls
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = -5.4 + i * 3.6;
      group.add(
        box(0.025, 2.5, 0.035, i % 2 ? gt.lightRed : gt.lightCool, {
          position: [s * 10.62, 3.45, z],
          castShadow: false,
        }),
      );
      group.add(
        box(0.05, 0.06, 2.4, gt.darkMetal, {
          position: [s * 10.65, 2.18, z],
          castShadow: false,
        }),
      );
    }
  }

  /* ---------- ceiling truss & fixtures ---------- */
  const trussMat = standard(0x2e3436, 0.5, 0.8);
  for (const z of [-1.7, 2.5]) {
    for (const y of [5.72, 6.05]) {
      group.add(box(19.5, 0.07, 0.07, trussMat, { position: [0, y, z], castShadow: false }));
    }
    for (let x = -9; x <= 9; x += 1.5) {
      group.add(box(0.035, 0.36, 0.035, trussMat, { position: [x, 5.88, z], castShadow: false }));
      const diag = cylinderBetween(
        [x, 5.73, z],
        [x + 1.5, 6.03, z],
        0.014,
        trussMat,
        { radialSegments: 5 },
      );
      diag.castShadow = false;
      group.add(diag);
    }
  }
  // cross braces between trusses
  for (const x of [-7.5, -2.5, 2.5, 7.5]) {
    for (const z of [-4.8, -1.7, 2.5, 5.9]) {
      group.add(box(0.04, 0.04, 7.4, trussMat, { position: [x, 5.9, z + 0.0], castShadow: false }));
    }
  }

  const lightLights = [];
  const makeLightBar = (z, width, intensity, x = 0, withLight = true) => {
    const fixture = new THREE.Group();
    fixture.position.set(x, 5.25, z);
    const housing = roundedBox(width, 0.16, 0.34, 0.04, gt.cabinetBlack, { position: [0, 0, 0] });
    fixture.add(housing);
    fixture.add(roundedBox(width - 0.18, 0.035, 0.2, 0.012, gt.darkMetal, { position: [0, 0.055, 0] }));
    const diffuser = box(width - 0.4, 0.018, 0.16, gt.lightCool, { position: [0, -0.09, 0] });
    fixture.add(diffuser);
    fixture.add(box(width - 0.44, 0.003, 0.16, gt.lightWarm, { position: [0, -0.105, 0] }));
    for (const s of [-1, 1]) {
      fixture.add(box(0.02, 0.04, 0.3, gt.lightRed, { position: [s * (width / 2 - 0.1), -0.095, 0] }));
    }
    // suspension cables
    for (const s of [-1, 1]) {
      fixture.add(
        tube(
          [
            [s * (width / 2 - 0.4), 0.08, 0],
            [s * (width / 2 - 0.6), 0.55, 0],
            [s * (width / 2 - 0.8), 0.92, 0],
          ],
          0.012,
          gt.darkMetal,
          { segments: 10, radialSegments: 5 },
        ),
      );
    }
    group.add(fixture);

    if (withLight) {
      const area = new THREE.RectAreaLight(0xdff4ef, intensity, width - 0.4, 0.3);
      area.position.set(x, 5.13, z);
      area.lookAt(x, 0, z + 0.04);
      group.add(area);
      lightLights.push(area);
    }

    // a soft volumetric plane under the fixture
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.8, 4.7), gt.haze);
    shaft.position.set(x, 2.9, z);
    shaft.rotation.y = 0;
    shaft.renderOrder = 5;
    group.add(shaft);
    const shaft2 = shaft.clone();
    shaft2.rotation.y = Math.PI / 2;
    shaft2.scale.x = 0.42;
    group.add(shaft2);
  };
  makeLightBar(-1.6, 9.6, 1.05, 0, true);
  makeLightBar(2.45, 7.2, 0.62, 0, true);
  makeLightBar(5.8, 5.0, 0.42, 0, false);
  makeLightBar(-4.6, 4.2, 0.5, 0, false);

  // narrow side accent fixtures
  for (const s of [-1, 1]) {
    const strip = box(0.16, 0.09, 10.4, gt.lightCool, {
      position: [s * 8.05, 5.7, 0.4],
      castShadow: false,
    });
    group.add(strip);
  }

  // hanging cables
  for (let i = 0; i < 6; i++) {
    const x = -7 + i * 2.8;
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      pts.push([x + Math.sin(t * 5 + i) * 0.25, 6.1 - t * 0.7 - Math.sin(t * Math.PI) * 0.4, 6.3 - t * 1.1]);
    }
    const cable = tube(pts, 0.01, gt.rubber, { segments: 14, radialSegments: 5 });
    cable.castShadow = false;
    group.add(cable);
  }

  /* ---------- side dressing ---------- */
  // left wall: tyre rack (rotated to face into the room)
  const rack = buildWallRack(gt);
  rack.position.set(-9.35, 0, 4.15);
  rack.rotation.y = Math.PI / 2;
  group.add(rack);
  addContactShadow(group, textures.shadow, -8.85, 4.15, 3.3, 5.2, 0.45, 0.009);

  // right wall: rolling tool chest
  const chest = buildToolChest(gt, decalSmall);
  chest.position.set(7.55, 0, 4.0);
  chest.rotation.y = -0.42;
  group.add(chest);
  addContactShadow(group, textures.shadow, 7.55, 4.0, 2.2, 1.8, 0.6, 0.009);

  // workbench at the back right
  const bench = buildWorkbench(gt, decalSmall, textures);
  bench.position.set(5.65, 0, 7.65);
  bench.rotation.y = -0.06;
  group.add(bench);
  addContactShadow(group, textures.shadow, 5.65, 7.0, 5.2, 2.4, 0.45, 0.009);

  // spare slick stack kept clear of the launch lane
  const stackC = buildTyreStack(gt, -6.35, 3.1, 3, 0.7);
  group.add(stackC);
  addContactShadow(group, textures.shadow, -6.35, 3.1, 1.7, 1.7, 0.5, 0.009);

  // low rolling cart beside it
  const spareCart = new THREE.Group();
  spareCart.position.set(6.65, 0, 6.0);
  spareCart.rotation.y = 0.5;
  spareCart.add(roundedBox(1.1, 0.075, 0.68, 0.03, gt.cabinetBlack, { position: [0, 0.42, 0] }));
  for (const [x, z] of [
    [-0.43, -0.24],
    [0.43, -0.24],
    [-0.43, 0.24],
    [0.43, 0.24],
  ]) {
    spareCart.add(
      meshOf(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), gt.rubber, {
        position: [x, 0.09, z],
        rotation: [0, 0, Math.PI / 2],
      }),
    );
  }
  spareCart.add(roundedBox(0.35, 0.06, 0.24, 0.015, gt.darkMetal, { position: [-0.22, 0.49, 0] }));
  spareCart.add(
    tube(
      [
        [0.42, 0.44, -0.28],
        [0.42, 0.7, -0.28],
        [0.42, 0.7, 0.28],
        [0.42, 0.44, 0.28],
      ],
      0.018,
      gt.metal,
      { segments: 12, radialSegments: 6 },
    ),
  );
  group.add(spareCart);
  addContactShadow(group, textures.shadow, 6.65, 6.0, 1.6, 1.3, 0.4, 0.009);

  // tyre stacks
  const stackA = buildTyreStack(gt, -7.3, -3.4, 4, 0.3);
  group.add(stackA);
  addContactShadow(group, textures.shadow, -7.3, -3.4, 1.8, 1.8, 0.65);
  const stackB = buildTyreStack(gt, 8.25, 0.0, 3, -0.25);
  group.add(stackB);
  addContactShadow(group, textures.shadow, 8.25, 0.0, 1.7, 1.7, 0.55);

  // floor equipment: low carbon cart with a spare endplate
  const cart = new THREE.Group();
  cart.position.set(-7.9, 0, 1.4);
  cart.rotation.y = 0.45;
  cart.add(roundedBox(1.25, 0.08, 0.72, 0.025, gt.cabinetBlack, { position: [0, 0.45, 0] }));
  for (const [x, z] of [
    [-0.5, -0.26],
    [0.5, -0.26],
    [-0.5, 0.26],
    [0.5, 0.26],
  ]) {
    cart.add(
      meshOf(new THREE.CylinderGeometry(0.08, 0.08, 0.035, 14), gt.rubber, {
        position: [x, 0.09, z],
        rotation: [0, 0, Math.PI / 2],
      }),
    );
  }
  cart.add(box(0.03, 0.05, 0.6, gt.lightRed, { position: [0.63, 0.51, 0] }));
  cart.add(box(0.03, 0.27, 0.04, gt.darkMetal, { position: [0.6, 0.47, 0.3] }));
  cart.add(box(0.03, 0.27, 0.04, gt.darkMetal, { position: [0.6, 0.47, -0.3] }));
  // spare sidepod panel leaning upright
  const spare = sidePlateSimple(
    [
      [-0.36, 0],
      [0.32, 0],
      [0.26, 0.58],
      [-0.18, 0.66],
      [-0.4, 0.45],
    ],
    0.035,
    gt.rubber,
  );
  spare.position.set(0.02, 0.51, -0.06);
  spare.rotation.set(0, 0.2, -1.05);
  cart.add(spare);
  group.add(cart);
  addContactShadow(group, textures.shadow, -7.9, 1.4, 2.0, 1.6, 0.45);

  // small floor tool & coiled pneumatic hose
  const hosePts = [];
  for (let i = 0; i <= 42; i++) {
    const t = i / 42;
    const a = t * TAU * 2.3;
    const r = 0.48 - t * 0.09;
    hosePts.push([-4.9 + Math.cos(a) * r, 0.025 + Math.sin(a) * 0.004, 2.7 + Math.sin(a) * r]);
  }
  const hose = tube(hosePts, 0.011, gt.rubber, { segments: 90, radialSegments: 5 });
  hose.castShadow = false;
  group.add(hose);
  const gun = new THREE.Group();
  gun.position.set(-4.8, 0.09, 2.7);
  gun.rotation.y = 0.8;
  gun.add(roundedBox(0.11, 0.16, 0.2, 0.03, gt.darkMetal, { position: [0, 0, 0] }));
  gun.add(meshOf(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 10), gt.metal, {
    position: [0.06, 0.05, 0.0],
    rotation: [0, 0, Math.PI / 2],
  }));
  gun.add(meshOf(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 12), gt.tyreRed, {
    position: [-0.06, -0.04, 0.02],
    rotation: [0, 0, Math.PI / 2],
  }));
  group.add(gun);

  // fire extinguisher against the left wall
  const extinguisher = new THREE.Group();
  extinguisher.position.set(-9.85, 0.15, -2.2);
  extinguisher.add(
    meshOf(new THREE.CylinderGeometry(0.11, 0.12, 0.7, 20), new THREE.MeshPhysicalMaterial({
      color: 0x9d1813,
      roughness: 0.32,
      metalness: 0.35,
      clearcoat: 0.6,
    }), { position: [0, 0.45, 0] }),
  );
  extinguisher.add(
    meshOf(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 20), gt.darkMetal, { position: [0, 0.82, 0] }),
  );
  extinguisher.add(
    tube(
      [
        [0, 0.84, 0],
        [0.0, 1.02, 0.0],
        [0.06, 1.08, 0.05],
        [-0.02, 0.76, 0.1],
      ],
      0.018,
      gt.darkMetal,
      { segments: 18, radialSegments: 5 },
    ),
  );
  group.add(extinguisher);

  // large hanging banners above the rack & chest
  for (const s of [-1, 1]) {
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 4.0),
      new THREE.MeshBasicMaterial({
        map: textures.wordmark,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: true,
      }),
    );
    banner.position.set(s * 10.6, 3.4, 1.0);
    banner.rotation.y = -s * Math.PI / 2;
    group.add(banner);
  }

  /* ---------- lighting ---------- */
  const hemi = new THREE.HemisphereLight(0x87a8ac, 0x0a0d0e, 0.72);
  group.add(hemi);

  const key = new THREE.SpotLight(0xfff9f0, 78, 18, 0.56, 0.88, 1.32);
  key.position.set(2.8, 5.25, -2.2);
  key.target.position.set(0, 0.3, 0.1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  group.add(key, key.target);

  const key2 = new THREE.SpotLight(0xe7f7f2, 34, 16, 0.66, 0.9, 1.3);
  key2.position.set(-3.6, 4.9, 1.2);
  key2.target.position.set(0, 0.35, 0.4);
  key2.castShadow = false;
  group.add(key2, key2.target);

  const rimRed = new THREE.SpotLight(0xff5b3f, 27, 13, 0.58, 0.92, 1.7);
  rimRed.position.set(4.8, 2.5, 5.0);
  rimRed.target.position.set(0, 0.55, 0.3);
  group.add(rimRed, rimRed.target);

  const rimCool = new THREE.PointLight(0x73d6d1, 17, 9, 1.8);
  rimCool.position.set(-5.0, 2.1, -2.8);
  group.add(rimCool);

  const rimCoolFront = new THREE.SpotLight(0x95e3de, 48, 11, 0.48, 0.95, 1.4);
  rimCoolFront.position.set(-4.2, 1.35, -3.2);
  rimCoolFront.target.position.set(0, 0.55, 0.15);
  group.add(rimCoolFront, rimCoolFront.target);

  const warmKicker = new THREE.SpotLight(0xff8c5a, 6, 9, 0.5, 0.95, 1.5);
  warmKicker.position.set(4.2, 0.95, 3.2);
  warmKicker.target.position.set(0, 0.5, 0.5);
  group.add(warmKicker, warmKicker.target);

  const frontKey = new THREE.SpotLight(0xe9f5ff, 32, 12, 0.52, 0.92, 1.2);
  frontKey.position.set(1.5, 4.0, 4.5);
  frontKey.target.position.set(0, 0.42, 0.15);
  group.add(frontKey, frontKey.target);

  const frontCool = new THREE.SpotLight(0xcfe8f5, 23, 11, 0.52, 0.94, 1.25);
  frontCool.position.set(-3.4, 2.3, 4.0);
  frontCool.target.position.set(0, 0.45, 0.1);
  group.add(frontCool, frontCool.target);

  const rearGlow = new THREE.PointLight(0xff3c20, 5.5, 8, 1.8);
  rearGlow.position.set(0, 1.1, 5.4);
  group.add(rearGlow);

  const signGlow = new THREE.PointLight(0x8ce4dc, 28, 10, 1.5);
  signGlow.position.set(0, 4.7, 7.25);
  group.add(signGlow);

  const stackLight = new THREE.PointLight(0xffc996, 7, 4.0, 1.8);
  stackLight.position.set(-6.35, 2.1, 3.1);
  group.add(stackLight);

  // warm spill that grows as the launch door opens
  const doorSpill = new THREE.PointLight(0xffb46a, 0.0, 20, 1.5);
  doorSpill.position.set(0, 2.2, 10.4);
  group.add(doorSpill);
  const doorSpillWide = new THREE.SpotLight(0xffc287, 0.0, 26, 0.7, 0.65, 1.2);
  doorSpillWide.position.set(0, 4.9, 12.5);
  doorSpillWide.target.position.set(0, 0.2, 2.0);
  group.add(doorSpillWide, doorSpillWide.target);

  /* ---------- contact shadow under the car ---------- */
  addContactShadow(group, textures.shadow, 0, 0.05, 6.8, 3.7, 0.7, 0.008);
  addContactShadow(group, textures.shadow, 0, 1.2, 4.4, 2.6, 0.36, 0.009);

  /* ---------- atmospheric dust ---------- */
  const rng = mulberry32(123456);
  const dustCount = 520;
  const positions = new Float32Array(dustCount * 3);
  const seeds = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    positions[i * 3] = (rng() - 0.5) * 16;
    positions[i * 3 + 1] = 0.25 + rng() * 5.0;
    positions[i * 3 + 2] = (rng() - 0.5) * 13 + 1;
    seeds[i * 3] = rng() * TAU;
    seeds[i * 3 + 1] = 0.4 + rng() * 1.3;
    seeds[i * 3 + 2] = rng() * TAU;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xd7eeea,
    size: 0.012,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  const shafts = [];
  group.traverse((o) => {
    if (o.isMesh && o.material === gt.haze) shafts.push(o);
  });

  return {
    group,
    reflector,
    door,
    doorLeak,
    doorHalf,
    doorHeight,
    setDoorOpen(amount) {
      const t = THREE.MathUtils.clamp(amount, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      door.position.y = eased * (doorHeight + 0.06);
      door.visible = eased < 0.995;
      doorLeak.material.opacity = 0.5 * (1 - eased);
      doorLeak.visible = eased < 0.98;
      doorSpill.intensity = 2.0 + eased * 14;
      doorSpillWide.intensity = eased * 48;
    },
    update(elapsed, dt) {
      for (let i = 0; i < dustCount; i++) {
        const sx = seeds[i * 3];
        const speed = seeds[i * 3 + 1];
        const sz = seeds[i * 3 + 2];
        positions[i * 3 + 1] += dt * 0.017 * speed;
        positions[i * 3] += Math.sin(elapsed * 0.11 + sx) * dt * 0.012;
        positions[i * 3 + 2] += Math.cos(elapsed * 0.09 + sz) * dt * 0.008;
        if (positions[i * 3 + 1] > 5.3) {
          positions[i * 3 + 1] = 0.2;
          positions[i * 3] = (rng() - 0.5) * 16;
          positions[i * 3 + 2] = (rng() - 0.5) * 13 + 1;
        }
      }
      dustGeo.attributes.position.needsUpdate = true;
      gt.haze.opacity = 0.038 + Math.sin(elapsed * 0.17) * 0.007;
      if (rimCool) rimCool.intensity = 16 + Math.sin(elapsed * 0.6) * 2.5;
    },
    lights: { key, key2, rimRed, rimCool, rimCoolFront, warmKicker, frontKey, frontCool, signGlow, doorSpill, doorSpillWide, area: lightLights },
  };
}

/* simple helper for the spare panel shape */
function sidePlateSimple(points, thickness, material) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 2,
  });
  geo.rotateY(Math.PI / 2);
  return new THREE.Mesh(geo, material);
}
