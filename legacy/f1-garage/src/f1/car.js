import * as THREE from 'three';
import {
  TAU,
  box,
  cylinderBetween,
  loftShell,
  makeAnchor,
  meshOf,
  roundedBox,
  sidePlate,
  tube,
} from '../lib/geo.js';
import { buildFrontWing, buildRearWing, buildFloor, addDecalPlane, topRibbon } from './aero.js';
import { buildCockpit, buildPowerUnit, buildRadiator } from './internals.js';
import { createWheelSet } from './wheels.js';

/* ------------------------------------------------------------------ */
/* Bodywork                                                            */
/* ------------------------------------------------------------------ */

function buildNose(mats, decals) {
  const g = new THREE.Group();
  g.name = 'nose';

  const shell = loftShell(
    [
      { z: -2.57, halfWidth: 0.045, top: 0.265, bottom: 0.17, exp: 2.05, topPinch: 0.12 },
      { z: -2.48, halfWidth: 0.068, top: 0.292, bottom: 0.16, exp: 2.2, topPinch: 0.12 },
      { z: -2.25, halfWidth: 0.1, top: 0.335, bottom: 0.15, exp: 2.3, topPinch: 0.12 },
      { z: -1.95, halfWidth: 0.13, top: 0.382, bottom: 0.14, exp: 2.35, topPinch: 0.15 },
      { z: -1.6, halfWidth: 0.175, top: 0.43, bottom: 0.13, exp: 2.45, topPinch: 0.18 },
      { z: -1.2, halfWidth: 0.245, top: 0.49, bottom: 0.12, exp: 2.55, topPinch: 0.2 },
      { z: -0.88, halfWidth: 0.3, top: 0.535, bottom: 0.12, exp: 2.7, topPinch: 0.22 },
      { z: -0.62, halfWidth: 0.34, top: 0.57, bottom: 0.12, exp: 2.85, topPinch: 0.24 },
      { z: -0.44, halfWidth: 0.37, top: 0.59, bottom: 0.12, exp: 2.9, topPinch: 0.25 },
    ],
    { radial: 36 },
  );
  g.add(meshOf(shell, mats.paint, { name: 'nose-shell' }));

  // centre vermilion flash
  const stripePoints = [
    [0, 0.267, -2.56],
    [0, 0.295, -2.44],
    [0, 0.34, -2.2],
    [0, 0.385, -1.92],
    [0, 0.432, -1.58],
    [0, 0.49, -1.18],
    [0, 0.536, -0.87],
    [0, 0.572, -0.6],
    [0, 0.594, -0.44],
  ];
  const stripeWidths = [0.022, 0.04, 0.085, 0.14, 0.19, 0.21, 0.2, 0.18, 0.16];
  g.add(topRibbon(stripePoints, stripeWidths.map((w) => w + 0.016), mats.carbon, { yOffset: 0.003 }));
  g.add(topRibbon(stripePoints, stripeWidths, mats.accent, { yOffset: 0.0055 }));
  g.add(
    addDecalPlane(
      g,
      null,
      decals.number,
      0.17,
      0.17,
      [0, 0.47, -1.52],
      [-Math.PI / 2, 0, Math.PI],
    ),
  );
  addDecalPlane(
    g,
    null,
    decals.wordmarkDark,
    0.25,
    0.06,
    [0, 0.557, -0.78],
    [-Math.PI / 2, 0, Math.PI],
  );

  // dark shut-lines running the length of the nose
  for (const s of [-1, 1]) {
    g.add(
      tube(
        [
          [s * 0.048, 0.305, -2.34],
          [s * 0.09, 0.352, -2.0],
          [s * 0.15, 0.405, -1.6],
          [s * 0.23, 0.464, -1.2],
          [s * 0.3, 0.51, -0.86],
          [s * 0.335, 0.548, -0.6],
          [s * 0.36, 0.566, -0.46],
        ],
        0.0038,
        mats.matteBlack,
        { segments: 30, radialSegments: 5 },
      ),
    );
    addDecalPlane(
      g,
      null,
      decals.numberDark,
      0.13,
      0.13,
      [s * 0.345, 0.42, -0.95],
      [0, (s * Math.PI) / 2, 0],
    );
  }

  // side vents
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      g.add(
        box(0.014, 0.045, 0.075, mats.matteBlack, {
          position: [s * (0.12 + i * 0.002), 0.33 + i * 0.045, -1.35 + i * 0.08],
          rotation: [0.15, s * 0.28, 0],
        }),
      );
    }
  }

  // pitot tube & nose cameras
  g.add(
    cylinderBetween([0, 0.245, -2.56], [0, 0.235, -2.91], 0.006, mats.metal, {
      radialSegments: 6,
    }),
  );
  g.add(
    roundedBox(0.12, 0.04, 0.16, 0.018, mats.carbon, {
      position: [0, 0.338, -2.13],
    }),
  );
  for (const s of [-1, 1]) {
    g.add(
      meshOf(new THREE.SphereGeometry(0.018, 12, 8), mats.glass, {
        position: [s * 0.055, 0.342, -2.2],
        scale: [1, 1, 1.4],
      }),
    );
  }

  return {
    group: g,
    anchor: makeAnchor('nose', 0, 0.4, -1.75),
  };
}

function buildMonocoque(mats, decals) {
  const g = new THREE.Group();
  g.name = 'monocoque';

  // forward tub
  const tub = loftShell(
    [
      { z: -1.25, halfWidth: 0.3, top: 0.445, bottom: 0.1, exp: 3.3, topPinch: 0.18 },
      { z: -1.0, halfWidth: 0.34, top: 0.475, bottom: 0.1, exp: 3.2, topPinch: 0.16 },
      { z: -0.72, halfWidth: 0.39, top: 0.52, bottom: 0.1, exp: 3.0, topPinch: 0.14 },
      { z: -0.49, halfWidth: 0.42, top: 0.565, bottom: 0.1, exp: 3.0, topPinch: 0.12 },
      { z: -0.36, halfWidth: 0.43, top: 0.59, bottom: 0.12, exp: 3.0, topPinch: 0.12 },
    ],
    { radial: 38 },
  );
  g.add(meshOf(tub, mats.paint, { name: 'front-tub' }));

  // cockpit shoulders
  for (const s of [-1, 1]) {
    const shoulder = loftShell(
      [
        { z: -0.53, halfWidth: 0.13, top: 0.545, bottom: 0.27, exp: 2.4, offsetX: s * 0.29, topPinch: 0.15 },
        { z: -0.28, halfWidth: 0.18, top: 0.575, bottom: 0.245, exp: 2.45, offsetX: s * 0.33, topPinch: 0.12 },
        { z: 0.04, halfWidth: 0.2, top: 0.57, bottom: 0.235, exp: 2.5, offsetX: s * 0.34, topPinch: 0.12 },
        { z: 0.29, halfWidth: 0.185, top: 0.55, bottom: 0.24, exp: 2.6, offsetX: s * 0.315, topPinch: 0.12 },
        { z: 0.47, halfWidth: 0.14, top: 0.53, bottom: 0.25, exp: 2.8, offsetX: s * 0.27, topPinch: 0.1 },
      ],
      { radial: 28 },
    );
    g.add(meshOf(shoulder, mats.paint, { name: 'cockpit-shoulder' }));
    // livery pinstripe following the shoulder
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const z = -0.48 + (i / 8) * 0.92;
      const y = 0.54 - Math.pow(i / 8, 1.7) * 0.03;
      pts.push([s * (0.405 - Math.abs(i / 8 - 0.35) * 0.06), y, z]);
    }
    g.add(tube(pts, 0.006, mats.accent, { segments: 24, radialSegments: 6 }));
    // tiny side number
    addDecalPlane(
      g,
      null,
      decals.number,
      0.17,
      0.17,
      [s * 0.497, 0.43, -0.13],
      [0, (s * Math.PI) / 2, 0],
    );
  }

  // side impact panels exposed in half-section
  for (const s of [-1, 1]) {
    g.add(
      roundedBox(0.08, 0.24, 0.88, 0.028, mats.carbon, {
        position: [s * 0.43, 0.3, -0.02],
      }),
    );
  }

  // cockpit opening rim
  const rimPts = [
    [0, 0.612, 0.43],
    [0.23, 0.607, 0.37],
    [0.365, 0.602, 0.19],
    [0.4, 0.598, -0.05],
    [0.365, 0.603, -0.25],
    [0.23, 0.617, -0.39],
    [0, 0.628, -0.435],
    [-0.23, 0.617, -0.39],
    [-0.365, 0.603, -0.25],
    [-0.4, 0.598, -0.05],
    [-0.365, 0.602, 0.19],
    [-0.23, 0.607, 0.37],
  ];
  const rimCurve = new THREE.CatmullRomCurve3(
    rimPts.map((p) => new THREE.Vector3(...p)),
    true,
    'catmullrom',
    0.3,
  );
  g.add(
    meshOf(
      new THREE.TubeGeometry(rimCurve, 120, 0.028, 10, true),
      mats.carbonShell,
      { name: 'cockpit-rim' },
    ),
  );
  const rimAccentPts = rimPts.map(([x, y, z]) => [x, y + 0.031, z]);
  const rimAccentCurve = new THREE.CatmullRomCurve3(
    rimAccentPts.map((p) => new THREE.Vector3(...p)),
    true,
    'catmullrom',
    0.3,
  );
  g.add(
    meshOf(new THREE.TubeGeometry(rimAccentCurve, 120, 0.004, 6, true), mats.accent),
  );
  const innerPts = rimPts.map(([x, y, z]) => [x * 0.9, y - 0.022, z * 0.94 + 0.01]);
  const innerCurve = new THREE.CatmullRomCurve3(
    innerPts.map((p) => new THREE.Vector3(...p)),
    true,
    'catmullrom',
    0.3,
  );
  g.add(
    meshOf(new THREE.TubeGeometry(innerCurve, 110, 0.022, 8, true), mats.matteBlack),
  );

  // cockpit internals
  const cockpit = buildCockpit(mats);
  g.add(cockpit.group);

  // front bulkhead visible through the cut
  g.add(
    roundedBox(0.48, 0.23, 0.16, 0.04, mats.carbon, {
      position: [0, 0.38, -0.47],
      rotation: [0.1, 0, 0],
    }),
  );

  // rain-light style side markers
  for (const s of [-1, 1]) {
    g.add(
      box(0.006, 0.013, 0.035, mats.emissiveTeal, {
        position: [s * 0.435, 0.53, -0.34],
      }),
    );
  }

  return {
    group: g,
    cockpit,
    anchor: makeAnchor('monocoque', 0.3, 0.58, -0.15),
  };
}

function buildSidepod(mats, decals, side) {
  const skin = new THREE.Group();
  skin.name = 'sidepod-skin';
  const internals = new THREE.Group();
  internals.name = 'sidepod-internals';
  const g = new THREE.Group();
  g.name = `sidepod-${side > 0 ? 'right' : 'left'}`;
  g.add(skin, internals);

  const sections = [
    { z: -0.63, halfWidth: 0.2, top: 0.475, bottom: 0.235, exp: 2.4, offsetX: side * 0.4, topPinch: 0.16 },
    { z: -0.5, halfWidth: 0.3, top: 0.525, bottom: 0.19, exp: 2.5, offsetX: side * 0.45, topPinch: 0.18 },
    { z: -0.18, halfWidth: 0.33, top: 0.515, bottom: 0.16, exp: 2.7, offsetX: side * 0.48, topPinch: 0.2 },
    { z: 0.18, halfWidth: 0.32, top: 0.49, bottom: 0.15, exp: 2.8, offsetX: side * 0.47, topPinch: 0.22 },
    { z: 0.56, halfWidth: 0.285, top: 0.44, bottom: 0.15, exp: 2.9, offsetX: side * 0.43, topPinch: 0.24 },
    { z: 0.9, halfWidth: 0.23, top: 0.38, bottom: 0.16, exp: 3.0, offsetX: side * 0.38, topPinch: 0.26 },
    { z: 1.18, halfWidth: 0.15, top: 0.31, bottom: 0.17, exp: 3.1, offsetX: side * 0.31, topPinch: 0.25 },
    { z: 1.4, halfWidth: 0.085, top: 0.265, bottom: 0.18, exp: 3.0, offsetX: side * 0.26, topPinch: 0.2 },
  ];
  const shell = loftShell(sections, { radial: 32 });
  skin.add(meshOf(shell, mats.paint, { name: 'sidepod-shell' }));

  // inlet mouth
  const inlet = new THREE.Group();
  inlet.position.set(side * 0.52, 0.38, -0.66);
  const mouth = roundedBox(0.315, 0.205, 0.055, 0.07, mats.glossBlack, {
    position: [0, 0, 0],
  });
  inlet.add(mouth);
  const innerMouth = roundedBox(0.26, 0.15, 0.055, 0.055, mats.matteBlack, {
    position: [0, 0, -0.035],
  });
  inlet.add(innerMouth);
  for (let i = 0; i < 3; i++) {
    inlet.add(
      box(0.27, 0.008, 0.026, i % 2 ? mats.metal : mats.carbon, {
        position: [0, -0.06 + i * 0.058, -0.068],
      }),
    );
  }
  inlet.add(
    box(0.3, 0.013, 0.022, mats.accent, {
      position: [0, 0.108, -0.068],
    }),
  );
  for (const s of [-1, 1]) {
    inlet.add(
      box(0.013, 0.19, 0.022, mats.accent, {
        position: [s * 0.153, 0.0, -0.066],
      }),
    );
  }
  skin.add(inlet);

  // top louvres
  for (let i = 0; i < 5; i++) {
    const z = 0.55 + i * 0.085;
    const y = 0.445 - i * 0.018;
    skin.add(
      box(0.17, 0.01, 0.042, mats.matteBlack, {
        position: [side * (0.52 - i * 0.022), y, z],
        rotation: [0.08, 0, side * 0.12],
      }),
    );
    skin.add(
      box(0.18, 0.004, 0.008, mats.metal, {
        position: [side * (0.52 - i * 0.022), y + 0.008, z + 0.02],
        rotation: [0.08, 0, side * 0.12],
      }),
    );
  }

  // shoulder pinstripe
  const stripePts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const z = -0.45 + t * 1.8;
    const x = side * (0.63 - t * 0.28);
    const y = 0.515 - Math.pow(t, 1.4) * 0.205;
    stripePts.push([x, y, z]);
  }
  skin.add(tube(stripePts, 0.0075, mats.accent, { segments: 32, radialSegments: 6 }));

  // sidepod radiator intake — a dark scooped panel with louvres
  const ventShape = [
    [-0.3, 0.24],
    [-0.24, 0.445],
    [-0.03, 0.472],
    [0.18, 0.425],
    [0.2, 0.29],
    [0.06, 0.23],
  ];
  const ventRim = sidePlate(ventShape, 0.02, mats.carbon, {
    x: side * 0.796,
    bevel: 0.004,
  });
  skin.add(ventRim);
  const ventShapeInner = ventShape.map(([z, y]) => [z * 0.92 - 0.005, y * 0.94 + 0.022]);
  const ventInner = sidePlate(ventShapeInner, 0.012, mats.glossBlack, {
    x: side * 0.806,
    bevel: 0.002,
  });
  skin.add(ventInner);
  for (let i = 0; i < 4; i++) {
    skin.add(
      box(0.008, 0.009, 0.39, i % 2 ? mats.metal : mats.darkMetal, {
        position: [side * 0.815, 0.275 + i * 0.043, -0.035],
        rotation: [0.05, 0, 0],
      }),
    );
  }
  // vent outline + small number
  skin.add(
    tube(
      [
        [side * 0.81, 0.24, -0.28],
        [side * 0.815, 0.44, -0.22],
        [side * 0.81, 0.45, 0.02],
        [side * 0.81, 0.27, 0.185],
      ],
      0.005,
      mats.accent,
      { segments: 20, radialSegments: 5 },
    ),
  );
  addDecalPlane(
    skin,
    null,
    decals.numberDark,
    0.25,
    0.25,
    [side * 0.755, 0.385, 0.5],
    [0, (side * Math.PI) / 2, 0],
  );
  // carbon lower rocker and a vermilion speed rail
  for (const dz of [-0.12, 0.18, 0.48, 0.78]) {
    const x = side * (0.78 - Math.max(0, dz) * 0.08);
    skin.add(
      roundedBox(0.05, 0.1, 0.32, 0.014, mats.carbon, {
        position: [x, 0.225, dz],
        rotation: [0, 0, side * 0.06],
      }),
    );
  }
  skin.add(
    tube(
      [
        [side * 0.73, 0.23, -0.36],
        [side * 0.8, 0.224, 0.0],
        [side * 0.76, 0.226, 0.46],
        [side * 0.61, 0.24, 0.9],
        [side * 0.45, 0.25, 1.12],
      ],
      0.014,
      mats.accent,
      { segments: 26, radialSegments: 6 },
    ),
  );

  // rear cooling exit mesh
  skin.add(
    roundedBox(0.14, 0.18, 0.06, 0.025, mats.matteBlack, {
      position: [side * 0.33, 0.33, 1.19],
      rotation: [-0.14, side * 0.08, side * 0.1],
    }),
  );

  // radiator, ducting, and suspension-side ancillaries
  const radiator = buildRadiator(mats, side);
  internals.add(radiator.group);
  // side impact structure visible through the cut
  internals.add(
    roundedBox(0.1, 0.17, 0.82, 0.03, mats.carbon, {
      position: [side * 0.31, 0.26, 0.04],
      rotation: [0, 0, side * 0.08],
    }),
  );
  internals.add(
    tube(
      [
        [side * 0.3, 0.32, 0.42],
        [side * 0.22, 0.27, 0.62],
        [side * 0.2, 0.24, 0.85],
      ],
      0.022,
      mats.blueAnodized,
      { segments: 24, radialSegments: 7 },
    ),
  );

  return { group: g, skin, internals, radiator, anchor: radiator.anchor };
}

function buildEngineCover(mats, decals) {
  const skin = new THREE.Group();
  skin.name = 'engine-cover-skin';
  const internals = new THREE.Group();
  internals.name = 'engine-cover-internals';
  const g = new THREE.Group();
  g.name = 'engine-cover';
  g.add(skin, internals);

  const shell = loftShell(
    [
      { z: 0.3, halfWidth: 0.18, top: 0.66, bottom: 0.36, exp: 2.4, topPinch: 0.25 },
      { z: 0.4, halfWidth: 0.225, top: 0.88, bottom: 0.31, exp: 2.4, topPinch: 0.3 },
      { z: 0.52, halfWidth: 0.205, top: 0.965, bottom: 0.29, exp: 2.35, topPinch: 0.32 },
      { z: 0.68, halfWidth: 0.195, top: 0.92, bottom: 0.27, exp: 2.45, topPinch: 0.32 },
      { z: 0.88, halfWidth: 0.2, top: 0.78, bottom: 0.25, exp: 2.6, topPinch: 0.32 },
      { z: 1.1, halfWidth: 0.19, top: 0.64, bottom: 0.23, exp: 2.7, topPinch: 0.34 },
      { z: 1.32, halfWidth: 0.16, top: 0.53, bottom: 0.22, exp: 2.8, topPinch: 0.32 },
      { z: 1.52, halfWidth: 0.12, top: 0.44, bottom: 0.205, exp: 2.9, topPinch: 0.3 },
      { z: 1.7, halfWidth: 0.072, top: 0.36, bottom: 0.2, exp: 2.8, topPinch: 0.26 },
    ],
    { radial: 34 },
  );
  skin.add(meshOf(shell, mats.paint, { name: 'engine-cover-shell' }));

  // airbox intake — a deep, visible mouth above the driver's head
  const intake = new THREE.Group();
  intake.position.set(0, 0.865, 0.35);
  intake.rotation.x = -0.2;
  intake.add(
    roundedBox(0.325, 0.245, 0.14, 0.085, mats.glossBlack, {
      position: [0, 0, 0],
    }),
  );
  intake.add(
    roundedBox(0.28, 0.18, 0.075, 0.07, mats.matteBlack, {
      position: [0, -0.01, -0.085],
    }),
  );
  // visible inner throat
  intake.add(
    roundedBox(0.225, 0.115, 0.06, 0.05, mats.carbon, {
      position: [0, -0.02, -0.055],
    }),
  );
  // vermilion lip
  for (const s of [-1, 1]) {
    intake.add(
      box(0.022, 0.22, 0.025, mats.accent, {
        position: [s * 0.157, 0, -0.075],
        rotation: [0, 0, s * 0.08],
      }),
    );
  }
  intake.add(
    box(0.33, 0.02, 0.025, mats.accent, {
      position: [0, 0.117, -0.075],
      rotation: [-0.05, 0, 0],
    }),
  );
  intake.add(
    meshOf(new THREE.TorusGeometry(0.13, 0.011, 8, 40), mats.accent, {
      position: [0, -0.008, -0.108],
      scale: [1.15, 0.72, 1],
    }),
  );
  // carbon neck blends the mouth into the white engine cover
  skin.add(
    roundedBox(0.3, 0.34, 0.32, 0.09, mats.carbon, {
      position: [0, 0.78, 0.43],
      rotation: [0.17, 0, 0],
    }),
  );
  skin.add(intake);

  // centre stripe over the airbox and engine cover
  const stripePts = [
    [0, 0.958, 0.55],
    [0, 0.976, 0.62],
    [0, 0.948, 0.72],
    [0, 0.81, 0.9],
    [0, 0.68, 1.08],
    [0, 0.585, 1.27],
    [0, 0.49, 1.46],
    [0, 0.415, 1.62],
    [0, 0.37, 1.69],
  ];
  skin.add(topRibbon(stripePts, 0.068, mats.accent));
  skin.add(
    topRibbon(
      stripePts.map(([x, y, z]) => [x + 0.06, y - 0.002, z]),
      0.013,
      mats.paint,
    ),
  );

  // shark fin
  const finShape = [
    [0.82, 0.79],
    [1.6, 0.44],
    [1.72, 0.36],
    [1.66, 0.335],
    [1.32, 0.49],
    [0.86, 0.72],
  ];
  const fin = sidePlate(finShape, 0.018, mats.carbon, { x: 0, bevel: 0.004 });
  skin.add(fin);
  skin.add(
    box(0.02, 0.02, 0.7, mats.accent, {
      position: [0, 0.6, 1.15],
      rotation: [-0.35, 0, 0],
    }),
  );

  // louvres / cooling gills
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      skin.add(
        box(0.105, 0.008, 0.036, mats.matteBlack, {
          position: [s * (0.18 - i * 0.008), 0.54 - i * 0.04, 1.04 + i * 0.085],
          rotation: [0.06, 0, s * 0.35],
        }),
      );
    }
  }

  // small decals
  addDecalPlane(
    skin,
    null,
    decals.wordmarkDark,
    0.5,
    0.11,
    [0.16, 0.65, 1.05],
    [-0.08, -1.0, 0.04],
  );
  addDecalPlane(
    skin,
    null,
    decals.wordmarkDark,
    0.36,
    0.08,
    [-0.195, 0.66, 1.02],
    [-0.08, 1.0, -0.04],
  );
  // AETHON graphic on the shark fin
  for (const s of [-1, 1]) {
    addDecalPlane(
      skin,
      null,
      decals.wordmarkSmall,
      0.28,
      0.06,
      [s * 0.011, 0.58, 1.17],
      [0, (s * Math.PI) / 2, Math.PI * 0.22],
    );
  }

  // T-cam
  const tcam = new THREE.Group();
  tcam.position.set(0, 0.988, 0.52);
  tcam.add(roundedBox(0.17, 0.04, 0.075, 0.018, mats.matteBlack, { position: [0, 0, 0] }));
  for (const s of [-1, 1]) {
    tcam.add(
      meshOf(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 14), mats.glass, {
        position: [s * 0.055, 0, 0.042],
        rotation: [Math.PI / 2, 0, 0],
      }),
    );
  }
  skin.add(tcam);

  // filler cap
  skin.add(
    meshOf(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), mats.metal, {
      position: [0.18, 0.68, 0.87],
      rotation: [0.1, 0.3, 0.36],
    }),
  );

  // inner liner / bodywork underside (also cut with the shell)
  skin.add(
    roundedBox(0.3, 0.05, 0.7, 0.02, mats.carbon, {
      position: [0, 0.34, 0.72],
      rotation: [0.02, 0, 0],
    }),
  );

  // rear cooling chimney internals
  internals.add(
    roundedBox(0.18, 0.12, 0.24, 0.025, mats.carbon, {
      position: [0, 0.44, 1.17],
      rotation: [-0.2, 0, 0],
    }),
  );
  internals.add(
    tube(
      [
        [0.04, 0.36, 1.1],
        [0.13, 0.38, 1.18],
        [0.19, 0.34, 1.25],
      ],
      0.024,
      mats.blueAnodized,
      { segments: 18, radialSegments: 7 },
    ),
  );

  return {
    group: g,
    skin,
    internals,
    anchor: makeAnchor('engineCover', 0, 0.8, 0.8),
  };
}

function buildNoseToTub(mats) {
  const g = new THREE.Group();
  // black floor-side skirts / chassis edges under the nose
  for (const s of [-1, 1]) {
    g.add(
      box(0.025, 0.16, 1.1, mats.carbon, {
        position: [s * 0.36, 0.2, -0.86],
        rotation: [0, s * 0.02, 0],
      }),
    );
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Suspension                                                          */
/* ------------------------------------------------------------------ */

function buildSuspension(mats, isFront, brakes) {
  const g = new THREE.Group();
  g.name = isFront ? 'front-suspension' : 'rear-suspension';
  const zAxle = isFront ? -1.68 : 1.62;
  const xUpright = isFront ? 0.775 : 0.76;
  const zChassis = isFront ? -1.02 : 1.48;
  const zChassisRear = isFront ? -0.82 : 1.35;
  const yUpper = isFront ? 0.455 : 0.5;
  const yLower = isFront ? 0.225 : 0.24;

  for (const s of [-1, 1]) {
    const x = s * xUpright;
    // upright
    const upright = roundedBox(0.065, 0.29, 0.17, 0.025, mats.metal, {
      position: [x, 0.355, zAxle],
    });
    g.add(upright);
    // brake internals attach to the upright
    const brake = brakes.find((b) => b.userData && b.userData.side === s && b.userData.isFront === isFront);
    if (brake) g.add(brake);

    const upperF = [s * 0.155, yUpper, zChassis];
    const upperR = [s * 0.155, yUpper - 0.01, zChassisRear];
    const upperKnuckle = [x - s * 0.02, yUpper - 0.01, zAxle];
    const lowerF = [s * 0.205, yLower, zChassis];
    const lowerR = [s * 0.205, yLower - 0.01, zChassisRear];
    const lowerKnuckle = [x - s * 0.022, yLower, zAxle];

    for (const p of [upperF, upperR]) {
      g.add(
        tube([p, [s * ((p[0] + upperKnuckle[0]) / 2), (p[1] + upperKnuckle[1]) / 2 + 0.02, (p[2] + zAxle) / 2], upperKnuckle], 0.016, mats.carbon, {
          segments: 14,
          radialSegments: 7,
        }),
      );
    }
    for (const p of [lowerF, lowerR]) {
      g.add(
        tube([p, [s * ((p[0] + lowerKnuckle[0]) / 2), (p[1] + lowerKnuckle[1]) / 2 - 0.015, (p[2] + zAxle) / 2], lowerKnuckle], 0.019, mats.carbon, {
          segments: 14,
          radialSegments: 7,
        }),
      );
    }

    // push/pull rod
    if (isFront) {
      g.add(
        tube(
          [
            [x - s * 0.03, 0.24, zAxle],
            [s * 0.38, 0.41, -1.35],
            [s * 0.23, 0.535, zChassis],
          ],
          0.015,
          mats.carbon,
          { segments: 18, radialSegments: 7 },
        ),
      );
    } else {
      g.add(
        tube(
          [
            [x - s * 0.03, 0.46, zAxle],
            [s * 0.36, 0.44, 1.52],
            [s * 0.17, 0.44, 1.4],
          ],
          0.015,
          mats.carbon,
          { segments: 18, radialSegments: 7 },
        ),
      );
      // driveshaft
      g.add(
        cylinderBetween(
          [s * 0.13, 0.355, zAxle],
          [x - s * 0.03, 0.355, zAxle],
          0.028,
          mats.darkMetal,
          { radialSegments: 12 },
        ),
      );
      g.add(
        meshOf(new THREE.CylinderGeometry(0.055, 0.055, 0.075, 18), mats.matteBlack, {
          position: [s * 0.2, 0.355, zAxle],
          rotation: [0, 0, Math.PI / 2],
        }),
      );
      g.add(
        meshOf(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 18), mats.matteBlack, {
          position: [x - s * 0.075, 0.355, zAxle],
          rotation: [0, 0, Math.PI / 2],
        }),
      );
    }

    // track rod / toe link
    g.add(
      tube(
        [
          [s * 0.32, 0.38, isFront ? -1.18 : 1.36],
          [x - s * 0.045, 0.34, zAxle],
        ],
        0.011,
        mats.metal,
        { segments: 10, radialSegments: 6 },
      ),
    );

    // small aero fairing on the lower wishbone
    g.add(
      roundedBox(0.075, 0.028, 0.24, 0.012, mats.carbonShell, {
        position: [s * 0.5, yLower + 0.01, zAxle - 0.03],
        rotation: [0, 0, s * 0.08],
      }),
    );

    // brake duct vane
    g.add(
      sidePlate(
        [
          [zAxle - 0.2, 0.11],
          [zAxle + 0.16, 0.11],
          [zAxle + 0.1, 0.29],
          [zAxle - 0.14, 0.27],
        ],
        0.012,
        mats.carbon,
        { x: s * 0.69, bevel: 0.003 },
      ),
    );
  }

  return {
    group: g,
    anchor: makeAnchor(isFront ? 'frontSuspension' : 'rearSuspension', 0.56, 0.25, isFront ? -1.45 : 1.5),
  };
}

/* ------------------------------------------------------------------ */
/* Gearbox / rear structure                                            */
/* ------------------------------------------------------------------ */

function buildGearbox(mats, decals) {
  const g = new THREE.Group();
  g.name = 'gearbox';

  const casing = loftShell(
    [
      { z: 1.36, halfWidth: 0.19, top: 0.52, bottom: 0.23, exp: 2.8, topPinch: 0.2 },
      { z: 1.48, halfWidth: 0.17, top: 0.48, bottom: 0.22, exp: 2.8, topPinch: 0.18 },
      { z: 1.68, halfWidth: 0.14, top: 0.4, bottom: 0.21, exp: 2.9, topPinch: 0.16 },
      { z: 1.9, halfWidth: 0.105, top: 0.34, bottom: 0.21, exp: 3.0, topPinch: 0.12 },
      { z: 2.08, halfWidth: 0.07, top: 0.3, bottom: 0.22, exp: 3.0, topPinch: 0.1 },
    ],
    { radial: 28 },
  );
  g.add(meshOf(casing, mats.carbon, { name: 'gearbox-case' }));

  // side casing plates
  for (const s of [-1, 1]) {
    g.add(
      sidePlate(
        [
          [1.38, 0.24],
          [1.78, 0.22],
          [2.02, 0.23],
          [1.96, 0.35],
          [1.58, 0.42],
          [1.4, 0.4],
        ],
        0.018,
        mats.metal,
        { x: s * 0.165, bevel: 0.004 },
      ),
    );
  }

  // cooling ribs
  for (let i = 0; i < 5; i++) {
    g.add(
      box(0.18, 0.01, 0.03, mats.darkMetal, {
        position: [0, 0.465 - i * 0.02, 1.55 + i * 0.075],
        rotation: [-0.14, 0, 0],
      }),
    );
  }

  // differential / rear axle
  g.add(
    roundedBox(0.38, 0.22, 0.24, 0.055, mats.darkMetal, {
      position: [0, 0.36, 1.58],
    }),
  );
  g.add(
    meshOf(new THREE.CylinderGeometry(0.085, 0.085, 0.46, 24), mats.metal, {
      position: [0, 0.36, 1.58],
      rotation: [0, 0, Math.PI / 2],
    }),
  );

  // rear crash structure
  const crash = meshOf(new THREE.CylinderGeometry(0.075, 0.055, 0.34, 16), mats.carbon, {
    position: [0, 0.45, 2.23],
    rotation: [Math.PI / 2, 0, 0],
  });
  g.add(crash);
  g.add(
    meshOf(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 16), mats.metal, {
      position: [0, 0.45, 2.16],
      rotation: [Math.PI / 2, 0, 0],
    }),
  );

  // rain light
  g.add(
    roundedBox(0.09, 0.055, 0.03, 0.012, mats.matteBlack, {
      position: [0, 0.51, 2.4],
    }),
  );
  g.add(
    box(0.048, 0.018, 0.008, mats.rainLight, {
      position: [0, 0.51, 2.418],
    }),
  );
  // small pylon above the gearbox for the rear wing support
  g.add(
    roundedBox(0.05, 0.25, 0.12, 0.018, mats.carbon, {
      position: [0, 0.53, 1.94],
    }),
  );

  // gearbox livery tag
  addDecalPlane(
    g,
    null,
    decals.wordmarkSmall,
    0.27,
    0.06,
    [0.16, 0.33, 1.6],
    [0, Math.PI / 2, 0],
  );
  addDecalPlane(
    g,
    null,
    decals.wordmarkSmall,
    0.27,
    0.06,
    [-0.16, 0.33, 1.6],
    [0, -Math.PI / 2, 0],
  );

  return {
    group: g,
    anchor: makeAnchor('gearbox', 0, 0.4, 1.75),
  };
}

/* ------------------------------------------------------------------ */
/* Clipping helpers                                                    */
/* ------------------------------------------------------------------ */

function isolateCutSkin(group, registry) {
  const cache = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    let mat = o.material;
    if (Array.isArray(mat)) {
      mat = mat.map((m) => cloneMat(m));
    } else {
      mat = cloneMat(mat);
    }
    o.material = mat;
  });

  function cloneMat(m) {
    if (!cache.has(m)) {
      const c = m.clone();
      c.userData.cutSkin = true;
      cache.set(m, c);
      registry.push(c);
    }
    return cache.get(m);
  }
}

/* ------------------------------------------------------------------ */
/* Root builder                                                        */
/* ------------------------------------------------------------------ */

export function createCar({ mats, textures }) {
  const root = new THREE.Group();
  root.name = 'aethon-ar24';

  const cutSkinMaterials = [];
  const assemblies = {};
  const anchors = {};

  const floor = buildFloor(mats);
  assemblies.floor = floor.group;
  root.add(floor.group);
  anchors.floor = floor.anchor;
  floor.group.add(floor.anchor);

  const frontWing = buildFrontWing(mats, mats.decals);
  assemblies.frontWing = frontWing.group;
  root.add(frontWing.group);
  anchors.frontWing = frontWing.anchor;
  frontWing.group.add(frontWing.anchor);

  const nose = buildNose(mats, mats.decals);
  assemblies.nose = nose.group;
  root.add(nose.group);
  anchors.nose = nose.anchor;
  nose.group.add(nose.anchor);

  const monocoque = buildMonocoque(mats, mats.decals);
  assemblies.monocoque = monocoque.group;
  root.add(monocoque.group);
  root.add(buildNoseToTub(mats));
  anchors.monocoque = monocoque.anchor;
  anchors.cockpit = monocoque.cockpit.anchors.cockpit;
  monocoque.group.add(monocoque.anchor, monocoque.cockpit.anchors.cockpit, monocoque.cockpit.anchors.driver);

  const sidepodL = buildSidepod(mats, mats.decals, -1);
  const sidepodR = buildSidepod(mats, mats.decals, 1);
  assemblies.sidepodL = sidepodL.group;
  assemblies.sidepodR = sidepodR.group;
  root.add(sidepodL.group, sidepodR.group);
  anchors.radiatorL = sidepodL.anchor;
  anchors.radiatorR = sidepodR.anchor;
  sidepodL.group.add(sidepodL.anchor);
  sidepodR.group.add(sidepodR.anchor);
  isolateCutSkin(sidepodL.skin, cutSkinMaterials);
  isolateCutSkin(sidepodR.skin, cutSkinMaterials);

  const engineCover = buildEngineCover(mats, mats.decals);
  assemblies.engineCover = engineCover.group;
  root.add(engineCover.group);
  anchors.engineCover = engineCover.anchor;
  engineCover.group.add(engineCover.anchor);
  isolateCutSkin(engineCover.skin, cutSkinMaterials);

  const powerUnit = buildPowerUnit(mats);
  assemblies.powerUnit = powerUnit.group;
  root.add(powerUnit.group);
  Object.assign(anchors, powerUnit.anchors);
  powerUnit.group.add(...Object.values(powerUnit.anchors));

  const gearbox = buildGearbox(mats, mats.decals);
  assemblies.gearbox = gearbox.group;
  root.add(gearbox.group);
  anchors.gearbox = gearbox.anchor;
  gearbox.group.add(gearbox.anchor);

  const rearWing = buildRearWing(mats, mats.decals);
  assemblies.rearWing = rearWing.group;
  root.add(rearWing.group);
  anchors.rearWing = rearWing.anchor;
  rearWing.group.add(rearWing.anchor);

  const wheelSet = createWheelSet(mats, textures);
  const wheelAssemblyNames = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'];
  wheelSet.wheels.forEach((entry, i) => {
    const key = wheelAssemblyNames[i];
    assemblies[key] = entry.wheel;
    entry.wheel.userData.isFront = entry.isFront;
    entry.wheel.add(
      makeAnchor(key, entry.side * 0.25, 0.02, 0),
    );
    anchors[key] = entry.wheel.children.find((c) => c.name === key);
    root.add(entry.wheel);
    entry.brake.userData.side = entry.side;
    entry.brake.userData.isFront = entry.isFront;
  });

  const frontSusp = buildSuspension(mats, true, wheelSet.brakeGroups);
  const rearSusp = buildSuspension(mats, false, wheelSet.brakeGroups);
  assemblies.frontSuspension = frontSusp.group;
  assemblies.rearSuspension = rearSusp.group;
  root.add(frontSusp.group, rearSusp.group);
  anchors.frontSuspension = frontSusp.anchor;
  anchors.rearSuspension = rearSusp.anchor;
  frontSusp.group.add(frontSusp.anchor);
  rearSusp.group.add(rearSusp.anchor);

  // suspension anchor labels for the wheel views
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // All unique car materials — used by the full-section clipping mode.
  const allMaterials = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach((m) => m && allMaterials.add(m));
  });

  // A shaped section veil shown in half-section. The contour follows the
  // centreline body profile, so the cut reads as a section rather than a
  // floating rectangular HUD plane. Not affected by the car clipping planes.
  const sectionProfile = [
    [0.0, 0.17, -2.57],
    [0.0, 0.25, -2.47],
    [0.0, 0.32, -2.22],
    [0.0, 0.4, -1.82],
    [0.0, 0.48, -1.32],
    [0.0, 0.56, -0.9],
    [0.0, 0.62, -0.52],
    [0.0, 0.6, -0.35],
    [0.0, 0.52, -0.22],
    [0.0, 0.44, -0.05],
    [0.0, 0.45, 0.12],
    [0.0, 0.55, 0.28],
    [0.0, 0.64, 0.43],
    [0.0, 0.76, 0.5],
    [0.0, 0.94, 0.55],
    [0.0, 0.94, 0.69],
    [0.0, 0.82, 0.9],
    [0.0, 0.66, 1.08],
    [0.0, 0.54, 1.3],
    [0.0, 0.44, 1.55],
    [0.0, 0.37, 1.73],
    [0.0, 0.34, 1.88],
    [0.0, 0.46, 1.98],
    [0.0, 0.51, 2.16],
    [0.0, 0.45, 2.32],
    [0.0, 0.12, 2.4],
    [0.0, 0.045, 2.1],
    [0.0, 0.04, 0.0],
    [0.0, 0.045, -1.9],
    [0.0, 0.12, -2.38],
  ];
  const sectionShape = new THREE.Shape();
  sectionProfile.forEach(([x, y, z], i) => {
    if (i === 0) sectionShape.moveTo(z, y);
    else sectionShape.lineTo(z, y);
  });
  sectionShape.closePath();
  const sectionGeo = new THREE.ShapeGeometry(sectionShape, 12);
  sectionGeo.rotateY(-Math.PI / 2);

  const scanMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(0x75e3db) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPos;
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      float line(float x, float w) {
        return smoothstep(w, 0.0, abs(fract(x + 0.5) - 0.5));
      }
      void main() {
        float grid = (line(vPos.y * 42.0, 0.04) + line(vPos.z * 8.0, 0.03)) * 0.16;
        float scan = smoothstep(0.06, 0.0, abs(fract(vPos.y * 1.4 - uTime * 0.09) - 0.5));
        float edge = smoothstep(0.0, 0.02, vPos.y) * smoothstep(1.0, 0.9, vPos.y);
        float a = (grid + scan * 0.22 + 0.012) * edge * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const sectionFill = new THREE.Mesh(sectionGeo, scanMaterial);
  sectionFill.position.x = 0.004;
  sectionFill.renderOrder = 8;
  const sectionGroup = new THREE.Group();
  sectionGroup.add(sectionFill);

  const contourPoints = sectionProfile.map(([x, y, z]) => new THREE.Vector3(0.006, y, z));
  const contourCurve = new THREE.CatmullRomCurve3(contourPoints, false, 'catmullrom', 0.3);
  const contourGeo = new THREE.TubeGeometry(contourCurve, 180, 0.0055, 6, false);
  const contourMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.7, 2.4, 2.2),
    toneMapped: false,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const contour = new THREE.Mesh(contourGeo, contourMat);
  contour.renderOrder = 9;
  sectionGroup.add(contour);

  // short luminous measurement ticks at the cut line
  for (let i = 0; i < 6; i++) {
    const z = -1.8 + i * 0.8;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.002, 0.004, 0.16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.3, 1.4, 1.35),
        toneMapped: false,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    tick.position.set(0.007, 0.042, z);
    sectionGroup.add(tick);
  }

  sectionGroup.visible = false;
  sectionGroup.position.x = 0.002;
  root.add(sectionGroup);

  return {
    root,
    assemblies,
    anchors,
    cutSkinMaterials,
    allMaterials: [...allMaterials],
    sectionGroup,
    scanMaterial,
    wheels: wheelSet.wheels.map((entry) => entry.wheel),
    details: {
      cockpit: monocoque.cockpit,
    },
  };
}
