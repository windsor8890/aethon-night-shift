import * as THREE from 'three';
import {
  TAU,
  box,
  cylinderBetween,
  makeAnchor,
  meshOf,
  roundedBox,
  tube,
} from '../lib/geo.js';

function addBolt(mats, parent, pos, r = 0.007) {
  parent.add(
    meshOf(new THREE.CylinderGeometry(r, r, 0.008, 6), mats.metal, {
      position: pos,
      rotation: [Math.PI / 2, 0, 0],
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Cockpit, driver, halo, mirrors                                      */
/* ------------------------------------------------------------------ */

export function buildCockpit(mats) {
  const g = new THREE.Group();
  g.name = 'cockpit';

  // carbon footwell and floor
  g.add(
    roundedBox(0.5, 0.05, 0.82, 0.03, mats.interior, {
      position: [0, 0.295, -0.04],
    }),
  );
  g.add(
    roundedBox(0.46, 0.17, 0.44, 0.04, mats.interior, {
      position: [0, 0.37, 0.16],
      rotation: [0.08, 0, 0],
    }),
  );

  // inner side walls, sloped around the driver
  for (const s of [-1, 1]) {
    g.add(
      roundedBox(0.075, 0.26, 0.88, 0.035, mats.interior, {
        position: [s * 0.275, 0.44, -0.03],
        rotation: [0, 0, s * 0.13],
      }),
    );
    g.add(
      roundedBox(0.17, 0.055, 0.72, 0.025, mats.seat, {
        position: [s * 0.27, 0.555, 0.02],
        rotation: [0, 0, s * 0.2],
      }),
    );
    // padded headrest wing
    g.add(
      roundedBox(0.11, 0.2, 0.22, 0.045, mats.seat, {
        position: [s * 0.255, 0.565, 0.27],
        rotation: [0.12, s * 0.18, s * 0.1],
      }),
    );
  }

  // dashboard / front bulkhead
  g.add(
    roundedBox(0.48, 0.12, 0.18, 0.035, mats.interior, {
      position: [0, 0.48, -0.42],
      rotation: [0.1, 0, 0],
    }),
  );
  g.add(
    roundedBox(0.51, 0.035, 0.22, 0.012, mats.carbon, {
      position: [0, 0.55, -0.4],
      rotation: [0.16, 0, 0],
    }),
  );

  // seat shell
  g.add(
    roundedBox(0.34, 0.06, 0.44, 0.04, mats.seat, {
      position: [0, 0.36, -0.03],
      rotation: [-0.03, 0, 0],
    }),
  );
  g.add(
    roundedBox(0.34, 0.44, 0.075, 0.04, mats.seat, {
      position: [0, 0.5, 0.235],
      rotation: [-0.23, 0, 0],
    }),
  );
  for (const s of [-1, 1]) {
    g.add(
      roundedBox(0.06, 0.36, 0.2, 0.03, mats.seat, {
        position: [s * 0.155, 0.47, 0.12],
        rotation: [0.05, 0, s * 0.12],
      }),
    );
  }

  // six-point harness
  for (const s of [-1, 1]) {
    g.add(
      box(0.045, 0.36, 0.008, mats.belt, {
        position: [s * 0.105, 0.53, 0.075],
        rotation: [-0.32, 0, s * 0.15],
      }),
    );
    g.add(
      box(0.045, 0.2, 0.008, mats.belt, {
        position: [s * 0.1, 0.43, -0.08],
        rotation: [-0.75, 0, s * 0.02],
      }),
    );
  }
  g.add(
    roundedBox(0.08, 0.04, 0.03, 0.012, mats.metal, {
      position: [0, 0.42, -0.16],
    }),
  );

  // driver: race suit, shoulders, arms, helmet
  const driver = new THREE.Group();
  driver.position.set(0, 0.4, 0.06);
  const suit = new THREE.MeshPhysicalMaterial({
    name: 'race-suit',
    color: 0x181b1c,
    roughness: 0.78,
    metalness: 0.05,
  });
  driver.add(
    roundedBox(0.3, 0.16, 0.23, 0.075, suit, {
      position: [0, 0.02, 0.04],
    }),
  );
  for (const s of [-1, 1]) {
    driver.add(
      roundedBox(0.09, 0.1, 0.22, 0.04, suit, {
        position: [s * 0.16, 0.0, -0.04],
        rotation: [0.22, 0, s * 0.08],
      }),
    );
    driver.add(
      roundedBox(0.065, 0.24, 0.07, 0.028, suit, {
        position: [s * 0.19, 0.045, -0.2],
        rotation: [0.9, 0, s * 0.1],
      }),
    );
  }
  // HANS
  driver.add(
    roundedBox(0.27, 0.055, 0.11, 0.03, mats.carbon, {
      position: [0, 0.055, 0.15],
      rotation: [0.22, 0, 0],
    }),
  );

  const helmet = new THREE.Group();
  helmet.position.set(0, 0.145, -0.045);
  helmet.rotation.x = -0.06;
  const shell = meshOf(new THREE.SphereGeometry(0.108, 32, 20), mats.helmetRed, {
    scale: [0.92, 0.98, 1.04],
  });
  helmet.add(shell);
  const stripe = meshOf(new THREE.SphereGeometry(0.1095, 32, 10, 0, TAU, 0, Math.PI * 0.2), mats.helmetWhite, {
    scale: [0.93, 1.0, 1.05],
    rotation: [0, 0, 0.18],
  });
  stripe.position.z = -0.006;
  helmet.add(stripe);
  // visor band
  const visor = roundedBox(0.162, 0.038, 0.062, 0.018, mats.glass, {
    position: [0, 0.005, -0.086],
    rotation: [-0.08, 0, 0],
  });
  helmet.add(visor);
  helmet.add(
    box(0.12, 0.007, 0.004, mats.accent, {
      position: [0, 0.045, -0.08],
      rotation: [-0.06, 0, 0],
    }),
  );
  driver.add(helmet);
  g.add(driver);

  // steering wheel
  const wheel = new THREE.Group();
  wheel.position.set(0, 0.475, -0.285);
  wheel.rotation.x = -0.43;
  const wheelBase = roundedBox(0.23, 0.115, 0.036, 0.027, mats.carbon, {
    position: [0, 0, 0],
  });
  wheel.add(wheelBase);
  const screen = meshOf(new THREE.PlaneGeometry(0.085, 0.042), mats.screen, {
    position: [0, 0.006, 0.0195],
  });
  wheel.add(screen);
  const screenHousing = roundedBox(0.1, 0.055, 0.006, 0.008, mats.screenDark, {
    position: [0, 0.006, 0.017],
  });
  wheel.add(screenHousing);
  wheel.add(screen);
  screen.position.z = 0.0215;
  for (const s of [-1, 1]) {
    const grip = roundedBox(0.055, 0.145, 0.06, 0.026, mats.matteBlack, {
      position: [s * 0.145, -0.04, 0],
      rotation: [0, 0, s * 0.08],
    });
    wheel.add(grip);
    for (let i = 0; i < 3; i++) {
      wheel.add(
        meshOf(new THREE.CylinderGeometry(0.007, 0.007, 0.007, 10), i === 1 ? mats.gold : mats.redAnodized, {
          position: [s * 0.052, 0.036 - i * 0.023, 0.023],
          rotation: [Math.PI / 2, 0, 0],
        }),
      );
    }
    wheel.add(
      meshOf(new THREE.TorusGeometry(0.027, 0.004, 6, 24), mats.metal, {
        position: [s * 0.143, -0.078, 0.033],
        rotation: [0, 0, 0],
      }),
    );
  }
  for (let i = 0; i < 8; i++) {
    wheel.add(
      box(0.009, 0.006, 0.002, i < 5 ? mats.emissiveRed : mats.emissiveTeal, {
        position: [-0.038 + i * 0.011, 0.047, 0.022],
      }),
    );
  }
  g.add(wheel);

  // steering column
  g.add(
    meshOf(new THREE.CylinderGeometry(0.018, 0.025, 0.24, 10), mats.darkMetal, {
      position: [0, 0.44, -0.39],
      rotation: [Math.PI / 2 - 0.2, 0, 0],
    }),
  );

  // halo ring & central pillar
  const haloPts = [
    [-0.33, 0.67, 0.34],
    [-0.405, 0.71, 0.14],
    [-0.39, 0.76, -0.1],
    [-0.28, 0.815, -0.3],
    [-0.1, 0.845, -0.37],
    [0.1, 0.845, -0.37],
    [0.28, 0.815, -0.3],
    [0.39, 0.76, -0.1],
    [0.405, 0.71, 0.14],
    [0.33, 0.67, 0.34],
  ];
  const halo = tube(haloPts, 0.027, mats.darkMetal, {
    segments: 100,
    radialSegments: 10,
  });
  halo.castShadow = true;
  g.add(halo);
  const haloStripe = tube(
    haloPts.map(([x, y, z]) => [x, y + 0.027, z]),
    0.005,
    mats.accent,
    { segments: 100, radialSegments: 6 },
  );
  g.add(haloStripe);
  const pillarPts = [
    [0, 0.58, -0.69],
    [0, 0.67, -0.6],
    [0, 0.765, -0.49],
    [0, 0.828, -0.4],
  ];
  g.add(tube(pillarPts, 0.031, mats.darkMetal, { segments: 40, radialSegments: 10 }));
  for (const s of [-1, 1]) {
    g.add(
      roundedBox(0.035, 0.07, 0.14, 0.015, mats.darkMetal, {
        position: [s * 0.35, 0.68, 0.34],
        rotation: [0.1, 0, s * 0.2],
      }),
    );
  }

  // rear-view mirrors
  const mirrors = new THREE.Group();
  for (const s of [-1, 1]) {
    mirrors.add(
      box(0.018, 0.02, 0.14, mats.carbon, {
        position: [s * 0.5, 0.61, -0.39],
        rotation: [0, -s * 0.45, s * 0.05],
      }),
    );
    const outer = roundedBox(0.15, 0.072, 0.073, 0.026, mats.paint, {
      position: [s * 0.565, 0.625, -0.44],
      rotation: [0, -s * 0.16, 0],
    });
    mirrors.add(outer);
    mirrors.add(
      meshOf(new THREE.PlaneGeometry(0.12, 0.045), mats.darkMetal, {
        position: [s * 0.565, 0.624, -0.402],
        rotation: [0, 0, 0],
      }),
    );
    mirrors.add(
      box(0.15, 0.01, 0.074, mats.accent, {
        position: [s * 0.565, 0.663, -0.44],
        rotation: [0, -s * 0.16, 0],
      }),
    );
  }
  g.add(mirrors);

  // small cockpit camera pod
  const cam = roundedBox(0.035, 0.035, 0.07, 0.01, mats.carbon, {
    position: [0.22, 0.65, -0.29],
    rotation: [0.2, 0, -0.1],
  });
  cam.add(
    meshOf(new THREE.CircleGeometry(0.012, 16), mats.glass, {
      position: [0, 0, 0.036],
    }),
  );
  g.add(cam);

  // foot pedals (visible in section)
  for (const s of [-1, 1]) {
    g.add(
      roundedBox(0.075, 0.12, 0.022, 0.012, mats.metal, {
        position: [s * 0.11, 0.33, -0.53],
        rotation: [-0.25, 0, 0],
      }),
    );
  }

  const wheels = [];
  const anchors = {
    cockpit: makeAnchor('cockpit', 0, 0.52, 0.02),
    driver: makeAnchor('driver', 0, 0.58, -0.02),
  };
  return { group: g, anchors, steeringWheel: wheel };
}

/* ------------------------------------------------------------------ */
/* Power unit                                                          */
/* ------------------------------------------------------------------ */

export function buildPowerUnit(mats) {
  const g = new THREE.Group();
  g.name = 'power-unit';

  const engine = new THREE.Group();
  engine.position.set(0, 0.0, 0.94);

  // central block and sump
  engine.add(
    roundedBox(0.32, 0.23, 0.4, 0.045, mats.darkMetal, {
      position: [0, 0.33, 0],
    }),
  );
  engine.add(
    roundedBox(0.28, 0.1, 0.35, 0.03, mats.metal, {
      position: [0, 0.21, 0.01],
    }),
  );
  engine.add(
    roundedBox(0.24, 0.03, 0.37, 0.015, mats.carbon, {
      position: [0, 0.175, 0],
    }),
  );

  // V banks, cam covers, cylinder details
  for (const s of [-1, 1]) {
    const bank = new THREE.Group();
    bank.position.set(s * 0.145, 0.4, 0);
    bank.rotation.z = -s * 0.45;
    bank.add(
      roundedBox(0.14, 0.13, 0.4, 0.025, mats.metal, {
        position: [0, 0, 0],
      }),
    );
    bank.add(
      roundedBox(0.125, 0.06, 0.39, 0.02, mats.matteBlack, {
        position: [0, 0.075, 0],
      }),
    );
    bank.add(
      box(0.1, 0.006, 0.32, mats.accent, {
        position: [0, 0.109, -0.015],
      }),
    );
    for (let i = 0; i < 3; i++) {
      const z = -0.12 + i * 0.12;
      bank.add(
        meshOf(new THREE.CylinderGeometry(0.045, 0.052, 0.055, 12), mats.matteBlack, {
          position: [0, 0.09, z],
        }),
      );
      bank.add(
        meshOf(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), mats.gold, {
          position: [0, 0.12, z],
        }),
      );
      // intake runner
      bank.add(
        tube(
          [
            [0, 0.1, z],
            [s * 0.035, 0.15, z - 0.01],
            [s * 0.07, 0.17, z - 0.03],
            [s * 0.08, 0.18, z - 0.06],
          ],
          0.017,
          mats.carbon,
          { segments: 10, radialSegments: 7 },
        ),
      );
      // exhaust primary
      bank.add(
        tube(
          [
            [s * 0.02, -0.02, z + 0.03],
            [s * 0.13, -0.05, z + 0.07],
            [s * 0.2, 0.0, z + 0.16],
            [s * 0.17, 0.09, z + 0.25],
            [s * 0.05, 0.13, 0.34],
          ],
          0.016,
          mats.gold,
          { segments: 22, radialSegments: 7 },
        ),
      );
    }
    engine.add(bank);
    // longitudinal cam-cover rail with fasteners
    for (let i = 0; i < 5; i++) {
      addBolt(mats, engine, [s * 0.19, 0.47, -0.17 + i * 0.085], 0.006);
    }
  }

  // top intake plenum
  engine.add(
    roundedBox(0.3, 0.095, 0.31, 0.038, mats.carbon, {
      position: [0, 0.555, -0.015],
    }),
  );
  engine.add(
    roundedBox(0.2, 0.045, 0.23, 0.022, mats.metal, {
      position: [0, 0.612, -0.01],
    }),
  );
  for (let i = 0; i < 4; i++) {
    engine.add(
      box(0.22, 0.006, 0.008, mats.accent, {
        position: [0, 0.63, -0.1 + i * 0.058],
      }),
    );
  }
  const throttle = meshOf(new THREE.CylinderGeometry(0.047, 0.05, 0.07, 18), mats.gold, {
    position: [0.0, 0.63, 0.18],
    rotation: [Math.PI / 2, 0, 0],
  });
  engine.add(throttle);

  // water pump / ancillaries
  for (const s of [-1, 1]) {
    engine.add(
      meshOf(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16), mats.blueAnodized, {
        position: [s * 0.24, 0.25, -0.12],
        rotation: [0, 0, Math.PI / 2],
      }),
    );
  }

  // exhaust collector
  const collector = meshOf(new THREE.CylinderGeometry(0.055, 0.085, 0.3, 16), mats.gold, {
    position: [0.02, 0.43, 0.28],
    rotation: [Math.PI / 2, 0, 0],
  });
  engine.add(collector);
  const collectorRing = meshOf(new THREE.TorusGeometry(0.065, 0.012, 8, 24), mats.copper, {
    position: [0.02, 0.43, 0.42],
    rotation: [0, 0, 0],
  });
  collectorRing.rotation.x = Math.PI / 2;
  engine.add(collectorRing);
  g.add(engine);

  // Turbocharger, mounted beside the rear of the block
  const turbo = new THREE.Group();
  turbo.position.set(0.16, 0.47, 1.27);
  turbo.rotation.y = -0.18;
  const housing = meshOf(new THREE.TorusGeometry(0.082, 0.052, 12, 30, Math.PI * 1.65), mats.gold, {
    rotation: [0, Math.PI / 2, 0],
  });
  turbo.add(housing);
  turbo.add(
    meshOf(new THREE.CylinderGeometry(0.065, 0.07, 0.09, 22), mats.darkMetal, {
      rotation: [0, 0, Math.PI / 2],
    }),
  );
  turbo.add(
    meshOf(new THREE.CylinderGeometry(0.032, 0.04, 0.12, 16), mats.metal, {
      position: [0.08, 0, 0],
      rotation: [0, 0, Math.PI / 2],
    }),
  );
  turbo.add(
    meshOf(new THREE.TorusGeometry(0.045, 0.008, 8, 24), mats.copper, {
      position: [-0.055, 0, 0],
      rotation: [0, Math.PI / 2, 0],
    }),
  );
  // compressor outlet to plenum
  turbo.add(
    tube(
      [
        [0, 0.06, -0.02],
        [0.06, 0.12, -0.08],
        [0.08, 0.16, -0.16],
        [0.05, 0.18, -0.28],
      ],
      0.035,
      mats.carbon,
      { segments: 22, radialSegments: 8 },
    ),
  );
  // exhaust tail pipe
  turbo.add(
    meshOf(new THREE.CylinderGeometry(0.052, 0.074, 0.28, 18), mats.darkMetal, {
      position: [0.0, 0.03, 0.2],
      rotation: [Math.PI / 2, 0, 0],
    }),
  );
  turbo.add(
    meshOf(new THREE.CylinderGeometry(0.057, 0.057, 0.02, 18), mats.copper, {
      position: [0, 0.03, 0.335],
      rotation: [Math.PI / 2, 0, 0],
    }),
  );
  g.add(turbo);

  // MGU-K / energy recovery unit
  const ers = new THREE.Group();
  ers.position.set(-0.18, 0.38, 1.12);
  ers.add(
    roundedBox(0.14, 0.19, 0.25, 0.03, mats.darkMetal, {
      position: [0, 0, 0],
    }),
  );
  ers.add(
    roundedBox(0.12, 0.025, 0.22, 0.012, mats.accent, {
      position: [0, 0.09, 0],
    }),
  );
  for (let i = 0; i < 4; i++) {
    ers.add(
      box(0.15, 0.006, 0.02, mats.copper, {
        position: [0, 0.06 - i * 0.03, -0.11],
      }),
    );
  }
  g.add(ers);

  // High voltage battery & cabling
  const battery = new THREE.Group();
  battery.position.set(0.2, 0.29, 0.69);
  battery.add(
    roundedBox(0.26, 0.2, 0.28, 0.035, mats.carbon, {
      position: [0, 0, 0],
    }),
  );
  battery.add(
    roundedBox(0.2, 0.13, 0.22, 0.02, mats.accentDark, {
      position: [0, 0.02, 0],
    }),
  );
  battery.add(
    meshOf(new THREE.PlaneGeometry(0.12, 0.055), mats.emissiveRed, {
      position: [0, 0.125, 0.0],
      rotation: [-Math.PI / 2, 0, 0],
    }),
  );
  for (let i = 0; i < 3; i++) {
    battery.add(
      meshOf(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), mats.copper, {
        position: [-0.08 + i * 0.08, 0.13, 0.03],
        rotation: [0, 0, 0],
      }),
    );
  }
  g.add(battery);

  const cable = tube(
    [
      [0.2, 0.37, 0.58],
      [0.18, 0.45, 0.74],
      [0.08, 0.5, 0.92],
      [0.0, 0.48, 1.05],
    ],
    0.016,
    mats.copper,
    { segments: 32, radialSegments: 7 },
  );
  g.add(cable);
  g.add(
    tube(
      [
        [-0.14, 0.32, 0.7],
        [-0.2, 0.36, 0.82],
        [-0.18, 0.32, 1.0],
        [-0.16, 0.3, 1.12],
      ],
      0.011,
      mats.blueAnodized,
      { segments: 24, radialSegments: 6 },
    ),
  );

  // fuel cell with a gold filler neck
  const cell = new THREE.Group();
  cell.position.set(0, 0.38, 0.46);
  cell.add(
    roundedBox(0.33, 0.28, 0.38, 0.06, mats.matteBlack, {
      position: [0, 0, 0],
    }),
  );
  cell.add(
    roundedBox(0.25, 0.22, 0.3, 0.035, mats.gold, {
      position: [0, 0.07, 0],
    }),
  );
  cell.add(
    meshOf(new THREE.CylinderGeometry(0.032, 0.032, 0.055, 16), mats.metal, {
      position: [0.13, 0.22, 0.06],
      rotation: [0.3, 0, 0.4],
    }),
  );
  g.add(cell);

  // intercooler / charge cooler core
  const cooler = new THREE.Group();
  cooler.position.set(-0.02, 0.48, 0.67);
  cooler.add(roundedBox(0.22, 0.15, 0.16, 0.02, mats.metal, { position: [0, 0, 0] }));
  for (let i = 0; i < 8; i++) {
    cooler.add(
      box(0.2, 0.004, 0.14, mats.darkMetal, {
        position: [0, -0.06 + i * 0.017, 0],
      }),
    );
  }
  cooler.add(
    meshOf(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 10), mats.blueAnodized, {
      position: [0.13, 0.02, 0.0],
      rotation: [Math.PI / 2, 0, 0],
    }),
  );
  g.add(cooler);

  const anchors = {
    powerUnit: makeAnchor('powerUnit', 0, 0.49, 0.98),
    engine: makeAnchor('engine', 0, 0.52, 0.95),
    turbo: makeAnchor('turbo', 0.16, 0.55, 1.27),
    battery: makeAnchor('battery', 0.2, 0.43, 0.69),
    exhaust: makeAnchor('exhaust', 0.02, 0.52, 1.38),
  };

  return { group: g, anchors };
}

export function buildRadiator(mats, side) {
  const g = new THREE.Group();
  g.name = 'radiator';
  const core = new THREE.Group();

  const fins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.035, 0.004, 0.32),
    mats.darkMetal,
    26,
  );
  fins.castShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 26; i++) {
    dummy.position.set(0, -0.09 + i * 0.0075, 0);
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  core.add(fins);

  for (const s of [-1, 1]) {
    core.add(
      roundedBox(0.075, 0.28, 0.06, 0.015, mats.carbon, {
        position: [0, 0, s * 0.18],
      }),
    );
    core.add(
      roundedBox(0.06, 0.055, 0.36, 0.018, mats.metal, {
        position: [0, s * 0.145, 0],
      }),
    );
  }

  // vertical end tanks
  core.add(
    roundedBox(0.07, 0.3, 0.06, 0.018, mats.carbon, {
      position: [0.048, 0, 0],
    }),
  );
  core.add(
    roundedBox(0.07, 0.3, 0.06, 0.018, mats.carbon, {
      position: [-0.048, 0, 0],
    }),
  );

  // hoses
  core.add(
    tube(
      [
        [0.06, 0.14, 0.12],
        [0.12, 0.19, 0.2],
        [0.17, 0.16, 0.24],
      ],
      0.022,
      mats.blueAnodized,
      { segments: 18, radialSegments: 8 },
    ),
  );

  const frame = new THREE.Group();
  frame.add(core);
  frame.rotation.set(0.28, side * 0.22, side * -0.3);
  frame.position.set(side * 0.51, 0.33, 0.16);
  g.add(frame);

  // ducting around the radiator
  const duct = roundedBox(0.1, 0.4, 0.48, 0.04, mats.carbon, {
    position: [side * 0.63, 0.34, 0.18],
    rotation: [0.25, side * 0.1, side * -0.25],
  });
  g.add(duct);
  // exposed inlet lip
  g.add(
    roundedBox(0.035, 0.3, 0.36, 0.025, mats.matteBlack, {
      position: [side * 0.55, 0.3, -0.27],
      rotation: [0.2, side * 0.15, side * 0.1],
    }),
  );

  return { group: g, anchor: makeAnchor('radiator', side * 0.56, 0.36, 0.17) };
}
