import * as THREE from 'three';
import {
  TAU,
  airfoilMesh,
  box,
  cylinderBetween,
  makeAnchor,
  meshOf,
  roundedBox,
  sidePlate,
  tube,
  wingGeometry,
} from '../lib/geo.js';

function smoothPlan(points, samples = 96) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.22,
  );
  const pts = curve.getPoints(samples);
  const shape = new THREE.Shape();
  pts.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.z) : shape.lineTo(p.x, p.z)));
  shape.closePath();
  return shape;
}

export function planPlate(points, thickness, mat, opts = {}) {
  const shape = smoothPlan(points);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: opts.bevel ?? 0.006,
    bevelThickness: opts.bevel ?? 0.006,
    curveSegments: 6,
  });
  geo.rotateX(Math.PI / 2);
  return meshOf(geo, mat, {
    position: [0, opts.y ?? 0.08, 0],
    name: opts.name,
  });
}

export function topRibbon(points, width, mat, { yOffset = 0.006, uv = false } = {}) {
  const verts = [];
  const idx = [];
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    const w = Array.isArray(width) ? width[Math.min(i, width.length - 1)] : width;
    verts.push(x - w / 2, y + yOffset, z);
    verts.push(x + w / 2, y + yOffset, z);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = meshOf(geo, mat, { name: 'livery-ribbon' });
  mesh.material = mat.clone();
  mesh.material.polygonOffset = true;
  mesh.material.polygonOffsetFactor = -1;
  mesh.material.polygonOffsetUnits = -1;
  mesh.material.side = THREE.DoubleSide;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function addDecalPlane(parent, texture, material, w, h, pos, rot = [0, 0, 0]) {
  const m = meshOf(new THREE.PlaneGeometry(w, h), material, {
    position: pos,
    rotation: rot,
    castShadow: false,
    receiveShadow: false,
  });
  m.renderOrder = 4;
  parent.add(m);
  return m;
}

/* ------------------------------------------------------------------ */
/* Front wing                                                          */
/* ------------------------------------------------------------------ */

export function buildFrontWing(mats, decals) {
  const g = new THREE.Group();
  g.name = 'front-wing';

  const elements = [
    { span: 1.98, chordRoot: 0.39, chordTip: 0.32, thickness: 0.075, camber: 0.032, angle: 0.08, y: 0.115, z: -2.6, rise: 0.05, sweep: 0.015 },
    { span: 1.89, chordRoot: 0.255, chordTip: 0.21, thickness: 0.085, camber: 0.035, angle: 0.19, y: 0.158, z: -2.5, rise: 0.075, sweep: 0.02 },
    { span: 1.78, chordRoot: 0.17, chordTip: 0.145, thickness: 0.09, camber: 0.04, angle: 0.3, y: 0.195, z: -2.43, rise: 0.095, sweep: 0.015 },
    { span: 1.65, chordRoot: 0.105, chordTip: 0.09, thickness: 0.085, camber: 0.035, angle: 0.42, y: 0.228, z: -2.36, rise: 0.11, sweep: 0.005 },
  ];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const m = airfoilMesh(
      {
        ...el,
        spanSegments: 32,
        foilSteps: 9,
        dihedral: el.rise,
      },
      mats.carbon,
    );
    g.add(m);
    // vermilion leading-edge stripe
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const s = (k / 10) * 2 - 1;
      const a = Math.abs(s);
      const y = el.y + a * a * el.rise + 0.002;
      const z = el.z + a * el.sweep + 0.004;
      pts.push([s * el.span * 0.5, y, z]);
    }
    g.add(tube(pts, 0.008, mats.accent, { segments: 30, radialSegments: 6 }));
  }

  // Endplates: compact carbon blades with a vermilion fence
  const endplateShape = [
    [-2.68, 0.07],
    [-2.58, 0.028],
    [-2.22, 0.045],
    [-2.12, 0.15],
    [-2.15, 0.29],
    [-2.28, 0.35],
    [-2.43, 0.31],
    [-2.58, 0.23],
    [-2.66, 0.14],
  ];
  for (const s of [-1, 1]) {
    const plate = sidePlate(endplateShape, 0.03, mats.carbonShell, { x: s * 0.985, bevel: 0.004 });
    g.add(plate);
    // vermilion outer fence / foot
    g.add(
      box(0.026, 0.055, 0.4, mats.accent, {
        position: [s * 0.988, 0.06, -2.38],
      }),
    );
    g.add(
      box(0.028, 0.2, 0.028, mats.accent, {
        position: [s * 1.001, 0.2, -2.17],
        rotation: [0.1, 0, 0],
      }),
    );
    addDecalPlane(
      g,
      decals.wordmarkSmall,
      decals.wordmarkSmall,
      0.31,
      0.078,
      [s * 1.002, 0.19, -2.37],
      [0, (s * Math.PI) / 2, 0],
    );
    // little canard
    const canard = airfoilMesh(
      {
        span: 0.135,
        chordRoot: 0.095,
        chordTip: 0.055,
        thickness: 0.12,
        camber: 0.03,
        angle: 0.22,
        y: 0.27,
        z: -2.45,
        rise: 0,
        dihedral: -0.012,
      },
      mats.paint,
    );
    canard.position.x = s * 0.905;
    g.add(canard);
  }

  // central mounting pylons
  for (const s of [-1, 1]) {
    g.add(
      roundedBox(0.055, 0.18, 0.24, 0.018, mats.carbon, {
        position: [s * 0.11, 0.2, -2.46],
        rotation: [0.16, 0, 0],
      }),
    );
    g.add(
      box(0.012, 0.03, 0.19, mats.accent, {
        position: [s * 0.14, 0.26, -2.46],
        rotation: [0.16, 0, 0],
      }),
    );
  }

  // small strakes under the nose
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      g.add(
        box(0.012, 0.06, 0.16, mats.carbon, {
          position: [s * (0.2 + i * 0.06), 0.11, -2.3 - i * 0.06],
          rotation: [0, 0.1 * s, 0],
        }),
      );
    }
  }

  return { group: g, anchor: makeAnchor('frontWing', 0, 0.22, -2.44) };
}

/* ------------------------------------------------------------------ */
/* Rear wing                                                           */
/* ------------------------------------------------------------------ */

export function buildRearWing(mats, decals) {
  const g = new THREE.Group();
  g.name = 'rear-wing';

  const main = airfoilMesh(
    {
      span: 1.08,
      chordRoot: 0.36,
      chordTip: 0.31,
      thickness: 0.11,
      camber: 0.045,
      angle: 0.2,
      y: 1.08,
      z: 2.07,
      rise: 0.025,
      dihedral: 0.025,
      spanSegments: 30,
    },
    mats.carbon,
  );
  g.add(main);

  const flap = airfoilMesh(
    {
      span: 1.02,
      chordRoot: 0.18,
      chordTip: 0.16,
      thickness: 0.105,
      camber: 0.05,
      angle: 0.38,
      y: 1.16,
      z: 2.19,
      rise: 0.018,
      dihedral: 0.02,
      spanSegments: 28,
    },
    mats.accent,
  );
  g.add(flap);

  // gurney lip on the flap
  for (const [span, y, z] of [
    [1.02, 1.23, 2.35],
    [1.08, 1.14, 2.24],
  ]) {
    g.add(
      box(span, 0.012, 0.015, mats.emissiveRed, {
        position: [0, y, z],
      }),
    );
  }

  // beam wing
  const beam = airfoilMesh(
    {
      span: 0.86,
      chordRoot: 0.2,
      chordTip: 0.16,
      thickness: 0.12,
      camber: 0.045,
      angle: 0.2,
      y: 0.65,
      z: 2.15,
      rise: 0.02,
      dihedral: 0.02,
      spanSegments: 24,
    },
    mats.carbon,
  );
  g.add(beam);

  const endplateShape = [
    [1.99, 0.7],
    [2.0, 1.2],
    [2.05, 1.33],
    [2.17, 1.36],
    [2.41, 1.29],
    [2.48, 1.17],
    [2.47, 0.88],
    [2.4, 0.68],
    [2.24, 0.64],
    [2.08, 0.66],
  ];
  // decorative lightening aperture in the rear wing endplates
  const hole = [];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    hole.push([2.285 + Math.cos(a) * 0.075, 1.055 + Math.sin(a) * 0.095]);
  }
  for (const s of [-1, 1]) {
    const plate = sidePlate(endplateShape, 0.035, mats.carbon, {
      x: s * 0.56,
      bevel: 0.005,
      holes: [hole],
    });
    g.add(plate);
    // red endplate cap
    g.add(
      box(0.038, 0.038, 0.4, mats.accent, {
        position: [s * 0.56, 1.31, 2.24],
      }),
    );
    // white main-plane end-section accent
    g.add(
      box(0.04, 0.11, 0.24, mats.paint, {
        position: [s * 0.56, 0.96, 2.17],
      }),
    );
    addDecalPlane(
      g,
      decals.wordmark,
      decals.wordmark,
      0.44,
      0.11,
      [s * 0.582, 1.04, 2.22],
      [0, (s * Math.PI) / 2, 0],
    );
  }

  // central swan-neck pylon, tying the wing into the crash structure
  const pylonShape = [
    [1.87, 0.5],
    [1.96, 0.52],
    [2.02, 0.95],
    [2.09, 1.1],
    [2.18, 1.09],
    [2.23, 0.98],
    [2.14, 0.74],
    [2.02, 0.58],
  ];
  const pylon = sidePlate(pylonShape, 0.085, mats.paint, { x: 0, bevel: 0.008 });
  g.add(pylon);
  g.add(
    box(0.075, 0.008, 0.46, mats.accent, {
      position: [0, 0.76, 2.04],
      rotation: [-0.62, 0, 0],
    }),
  );
  addDecalPlane(
    g,
    null,
    decals.wordmarkDark,
    0.2,
    0.05,
    [0.048, 0.86, 2.04],
    [0, Math.PI / 2, 0.3],
  );

  // DRS actuator pod
  g.add(
    roundedBox(0.16, 0.09, 0.16, 0.03, mats.matteBlack, {
      position: [0, 1.18, 2.26],
    }),
  );
  g.add(
    meshOf(new THREE.TorusGeometry(0.052, 0.009, 8, 24), mats.metal, {
      position: [0, 1.24, 2.27],
      rotation: [Math.PI / 2, 0, 0],
    }),
  );

  // rain light on the crash structure
  const light = new THREE.Group();
  light.position.set(0, 0.55, 2.43);
  light.add(
    roundedBox(0.085, 0.05, 0.035, 0.012, mats.matteBlack, {
      position: [0, 0, 0],
    }),
  );
  light.add(
    box(0.045, 0.018, 0.008, mats.rainLight, {
      position: [0, 0, 0.022],
    }),
  );
  g.add(light);

  return {
    group: g,
    anchor: makeAnchor('rearWing', 0, 1.18, 2.24),
    light,
  };
}

/* ------------------------------------------------------------------ */
/* Floor, diffuser and bargeboards                                     */
/* ------------------------------------------------------------------ */

export function buildFloor(mats) {
  const g = new THREE.Group();
  g.name = 'floor';

  const plan = [
    [-0.22, -2.0],
    [-0.46, -1.84],
    [-0.62, -1.58],
    [-0.75, -1.12],
    [-0.82, -0.45],
    [-0.84, 0.35],
    [-0.8, 1.35],
    [-0.69, 2.0],
    [-0.54, 2.36],
    [-0.24, 2.44],
    [0, 2.46],
    [0.24, 2.44],
    [0.54, 2.36],
    [0.69, 2.0],
    [0.8, 1.35],
    [0.84, 0.35],
    [0.82, -0.45],
    [0.75, -1.12],
    [0.62, -1.58],
    [0.46, -1.84],
    [0.22, -2.0],
    [0, -2.02],
  ];

  const floor = planPlate(plan, 0.028, mats.carbon, { y: 0.082, name: 'floor-plank' });
  g.add(floor);

  // central wooden skid plank
  g.add(
    roundedBox(0.27, 0.018, 3.2, 0.01, new THREE.MeshStandardMaterial({
      color: 0x8f7251,
      roughness: 0.72,
      metalness: 0.05,
    }), {
      position: [0, 0.04, 0.4],
    }),
  );
  for (const z of [-1.2, 0.0, 1.2, 2.2]) {
    g.add(
      roundedBox(0.18, 0.018, 0.18, 0.008, mats.gold, {
        position: [0, 0.026, z],
      }),
    );
  }

  // underbody venturi tunnels
  for (const s of [-1, 1]) {
    const roof = roundedBox(0.5, 0.02, 1.7, 0.014, mats.carbon, {
      position: [s * 0.43, 0.072, -0.35],
      rotation: [-0.03, s * 0.025, 0],
    });
    g.add(roof);
    for (let i = 0; i < 3; i++) {
      g.add(
        box(0.012, 0.07, 1.2, mats.carbon, {
          position: [s * (0.19 + i * 0.16), 0.05, -0.2],
          rotation: [0, 0, 0],
        }),
      );
    }
  }

  // sculpted floor edge fences / bargeboards
  for (const s of [-1, 1]) {
    const fenceShapes = [
      [
        [-1.72, 0.03],
        [-1.45, 0.02],
        [-0.95, 0.16],
        [-1.05, 0.24],
        [-1.35, 0.2],
        [-1.68, 0.12],
      ],
      [
        [-0.95, 0.03],
        [-0.55, 0.02],
        [-0.2, 0.15],
        [-0.3, 0.23],
        [-0.62, 0.18],
        [-0.96, 0.12],
      ],
    ];
    fenceShapes.forEach((shape, idx) => {
      const plate = sidePlate(shape, 0.012, mats.carbon, {
        x: s * (0.68 + idx * 0.1),
        bevel: 0.003,
      });
      g.add(plate);
      g.add(
        box(0.015, 0.1, 0.08, mats.accent, {
          position: [s * (0.68 + idx * 0.1), 0.17, -1.02 + idx * 0.5],
          rotation: [0.2, 0, 0],
        }),
      );
    });
    // edge wing
    g.add(
      roundedBox(0.11, 0.022, 1.15, 0.012, mats.carbonShell, {
        position: [s * 0.81, 0.115, 0.42],
        rotation: [0, 0, s * 0.1],
      }),
    );
    // small vertical turning vanes near the sidepod intake
    for (let i = 0; i < 3; i++) {
      g.add(
        box(0.009, 0.11, 0.22, mats.carbon, {
          position: [s * (0.64 + i * 0.045), 0.15, -1.1 + i * 0.07],
          rotation: [0, s * 0.2, 0.16],
        }),
      );
    }
  }

  // rear diffuser
  const diffuserRoof = roundedBox(1.52, 0.025, 0.8, 0.014, mats.carbon, {
    position: [0, 0.23, 2.12],
    rotation: [-0.34, 0, 0],
  });
  g.add(diffuserRoof);
  for (const s of [-1, 1]) {
    const wallShape = [
      [1.66, 0.03],
      [2.46, 0.04],
      [2.48, 0.36],
      [2.38, 0.4],
      [2.22, 0.31],
      [1.98, 0.18],
      [1.72, 0.09],
    ];
    const wall = sidePlate(wallShape, 0.025, mats.carbon, {
      x: s * 0.75,
      bevel: 0.004,
    });
    g.add(wall);
    for (let i = 0; i < 3; i++) {
      g.add(
        box(0.012, 0.16, 0.62, mats.carbon, {
          position: [s * (0.19 + i * 0.22), 0.18, 2.1],
          rotation: [-0.34, 0, 0],
        }),
      );
    }
    // strake highlight
    g.add(
      box(0.01, 0.02, 0.56, mats.accent, {
        position: [s * 0.63, 0.3, 2.18],
        rotation: [-0.34, 0, 0],
      }),
    );
  }
  // diffuser strake gurneys
  for (let i = 0; i < 5; i++) {
    g.add(
      box(0.012, 0.05, 0.12, mats.metal, {
        position: [-0.5 + i * 0.25, 0.36, 2.39],
        rotation: [-0.28, 0, 0],
      }),
    );
  }

  // floor access panels and bolts
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      g.add(
        meshOf(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 6), mats.metal, {
          position: [s * 0.4, 0.103, -0.8 + i * 0.4],
        }),
      );
    }
  }

  return {
    group: g,
    anchor: makeAnchor('floor', 0, 0.12, 0.4),
  };
}
