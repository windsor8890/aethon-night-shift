import * as THREE from 'three';
import {
  TAU,
  DEG,
  box,
  cylinderBetween,
  meshOf,
  roundedBox,
  torusRing,
} from '../lib/geo.js';

function latheTyre(radius, width) {
  const rim = radius * 0.58;
  const profile = [
    [rim, -width / 2],
    [radius * 0.9, -width / 2],
    [radius * 0.985, -width / 2 + 0.014],
    [radius, -width / 2 + 0.048],
    [radius, width / 2 - 0.048],
    [radius * 0.985, width / 2 - 0.014],
    [radius * 0.9, width / 2],
    [rim, width / 2],
  ].map(([r, a]) => new THREE.Vector2(r, a));
  const geo = new THREE.LatheGeometry(profile, 72);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

function wheelCover(side, radius, width, mats) {
  const g = new THREE.Group();
  g.name = 'wheel-cover';
  const faceX = side * (width / 2 + 0.013);
  const discRadius = radius * 0.585;

  const disc = meshOf(new THREE.CircleGeometry(discRadius, 64), mats.carbonShell, {
    position: [faceX, 0, 0],
    rotation: [0, (side * Math.PI) / 2, 0],
  });
  disc.renderOrder = 2;
  g.add(disc);

  const lip = meshOf(new THREE.TorusGeometry(discRadius, 0.011, 8, 64), mats.carbonShell, {
    position: [faceX, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  });
  g.add(lip);

  const innerRing = meshOf(new THREE.TorusGeometry(discRadius * 0.72, 0.004, 6, 64), mats.redAnodized, {
    position: [faceX + side * 0.003, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  });
  g.add(innerRing);

  const outerRing = meshOf(new THREE.TorusGeometry(discRadius * 0.9, 0.0032, 6, 64), mats.metal, {
    position: [faceX + side * 0.003, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  });
  g.add(outerRing);

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.3;
    const vent = box(0.008, 0.062, 0.018, mats.glossBlack, {
      position: [
        faceX + side * 0.002,
        Math.cos(a) * discRadius * 0.52,
        Math.sin(a) * discRadius * 0.52,
      ],
      rotation: [a, 0, 0],
    });
    g.add(vent);
  }

  const hub = meshOf(new THREE.CylinderGeometry(0.042, 0.042, 0.035, 6), mats.redAnodized, {
    position: [faceX + side * 0.026, 0, 0],
    rotation: [0, 0, Math.PI / 2],
  });
  g.add(hub);

  const hubRing = torusRing(0.055, 0.007, mats.metal, {
    position: [faceX + side * 0.02, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  });
  g.add(hubRing);

  const nut = meshOf(new THREE.CylinderGeometry(0.019, 0.021, 0.045, 6), mats.gold, {
    position: [faceX + side * 0.052, 0, 0],
    rotation: [0, 0, Math.PI / 2],
  });
  g.add(nut);

  return g;
}

export function createWheel({ side, x, z, radius, width, mats, textures, isFront }) {
  const root = new THREE.Group();
  root.name = `wheel-${side > 0 ? 'right' : 'left'}-${isFront ? 'front' : 'rear'}`;
  root.position.set(x, radius, z);
  root.userData.kind = 'wheel';
  root.userData.side = side;

  const tire = meshOf(latheTyre(radius, width), mats.rubber, { name: 'tyre' });
  root.add(tire);

  for (let i = -1; i <= 1; i++) {
    const groove = meshOf(new THREE.TorusGeometry(radius + 0.001, 0.0026, 6, 90), mats.rubberTread, {
      position: [i * width * 0.24, 0, 0],
      rotation: [0, Math.PI / 2, 0],
    });
    root.add(groove);
  }

  // subtle shoulder rings
  for (const s of [-1, 1]) {
    const shoulder = meshOf(new THREE.TorusGeometry(radius * 0.94, 0.0045, 5, 80), mats.rubberTread, {
      position: [s * (width / 2 - 0.005), 0, 0],
      rotation: [0, Math.PI / 2, 0],
    });
    root.add(shoulder);
  }

  // carbon rim barrel
  const barrel = meshOf(
    new THREE.CylinderGeometry(radius * 0.585, radius * 0.585, width * 0.84, 48, 1, true),
    mats.darkMetal,
    { rotation: [0, 0, Math.PI / 2] },
  );
  root.add(barrel);

  const rimBed = meshOf(new THREE.TorusGeometry(radius * 0.57, 0.011, 6, 64), mats.metal, {
    position: [side * width * 0.4, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  });
  root.add(rimBed);

  // 10 spokes (revealed once the aero cover separates)
  const spokeGroup = new THREE.Group();
  spine: for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const holder = new THREE.Group();
    holder.rotation.x = a;
    const spoke = roundedBox(0.026, radius * 0.35, 0.048, 0.009, mats.darkMetal, {
      position: [side * width * 0.32, radius * 0.33, 0],
    });
    holder.add(spoke);
    spokeGroup.add(holder);
  }
  const hubBody = meshOf(new THREE.CylinderGeometry(0.058, 0.072, width * 0.33, 24), mats.darkMetal, {
    position: [side * width * 0.3, 0, 0],
    rotation: [0, 0, Math.PI / 2],
  });
  spokeGroup.add(hubBody);
  root.add(spokeGroup);

  // Sidewall print
  const ring = meshOf(
    new THREE.RingGeometry(radius * 0.605, radius * 0.895, 96, 1),
    mats.tyreDecal,
    {
      position: [side * (width / 2 + 0.003), 0, 0],
      rotation: [0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0],
    },
  );
  ring.renderOrder = 1;
  root.add(ring);

  const cover = wheelCover(side, radius, width, mats);
  cover.userData.baseX = cover.position.x;
  cover.userData.noMerge = true;
  root.add(cover);

  // tiny valve stem
  const valve = cylinderBetween(
    [side * (width / 2 - 0.01), radius * 0.7, 0],
    [side * (width / 2 + 0.025), radius * 0.72, 0],
    0.005,
    mats.metal,
    { radialSegments: 6 },
  );
  root.add(valve);

  root.userData.cover = cover;
  root.userData.spin = tire;
  root.userData.tire = tire;
  return root;
}

export function createBrakeAssembly({ side, x, z, radius, width, mats }) {
  const g = new THREE.Group();
  g.name = 'brake-assembly';
  g.position.set(x, radius, z);
  const inboardX = -side * (width * 0.16);

  const disc = meshOf(
    new THREE.CylinderGeometry(radius * 0.47, radius * 0.47, 0.022, 48),
    mats.brakeDisc,
    { position: [inboardX, 0, 0], rotation: [0, 0, Math.PI / 2] },
  );
  g.add(disc);

  const discInner = meshOf(
    new THREE.CylinderGeometry(radius * 0.29, radius * 0.29, 0.05, 36),
    mats.darkMetal,
    { position: [inboardX, 0, 0], rotation: [0, 0, Math.PI / 2] },
  );
  g.add(discInner);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const hole = meshOf(new THREE.CylinderGeometry(0.004, 0.004, 0.028, 6), mats.glossBlack, {
      position: [inboardX, Math.cos(a) * radius * 0.39, Math.sin(a) * radius * 0.39],
      rotation: [0, 0, Math.PI / 2],
    });
    g.add(hole);
  }

  const caliper = roundedBox(0.055, 0.16, 0.085, 0.022, mats.redAnodized, {
    position: [inboardX + side * 0.026, radius * 0.36, -radius * 0.16],
    rotation: [0.16, 0, 0.2],
  });
  g.add(caliper);
  const caliperLine = box(0.058, 0.008, 0.09, mats.emissiveRed, {
    position: [inboardX + side * 0.027, radius * 0.44, -radius * 0.15],
    rotation: [0.16, 0, 0.2],
  });
  g.add(caliperLine);

  // Carbon drum/duct around the inboard disc
  const drum = meshOf(
    new THREE.CylinderGeometry(radius * 0.56, radius * 0.52, 0.085, 48, 1, true),
    mats.carbon,
    { position: [inboardX, 0, 0], rotation: [0, 0, Math.PI / 2] },
  );
  drum.material.side = THREE.DoubleSide;
  g.add(drum);

  const duct = roundedBox(0.09, 0.13, 0.19, 0.03, mats.carbon, {
    position: [-side * width * 0.22, radius * 0.04, -radius * 0.2],
    rotation: [0.12, 0.2, 0.05],
  });
  g.add(duct);

  const upright = roundedBox(0.06, 0.27, 0.18, 0.025, mats.metal, {
    position: [inboardX, 0, 0],
  });
  g.add(upright);

  return g;
}

export function createWheelSet(mats, textures) {
  const wheels = [];
  const brakes = [];
  const fronts = [
    { side: 1, x: 0.86, z: -1.68, radius: 0.344, width: 0.37 },
    { side: -1, x: -0.86, z: -1.68, radius: 0.344, width: 0.37 },
  ];
  const rears = [
    { side: 1, x: 0.845, z: 1.62, radius: 0.365, width: 0.41 },
    { side: -1, x: -0.845, z: 1.62, radius: 0.365, width: 0.41 },
  ];
  const make = (cfg, isFront) => {
    const wheel = createWheel({ ...cfg, mats, textures, isFront });
    const brake = createBrakeAssembly({ ...cfg, mats });
    wheels.push(wheel);
    brakes.push(brake);
    return { wheel, brake, isFront, ...cfg };
  };
  const set = [
    make(fronts[0], true),
    make(fronts[1], true),
    make(rears[0], false),
    make(rears[1], false),
  ];
  return { wheels: set, brakeGroups: brakes };
}
