import * as THREE from 'three';

const std = (opts) => new THREE.MeshPhysicalMaterial(opts);

export function createMaterials(textures) {
  const carbonShell = std({
    name: 'carbon-shell',
    color: 0x202225,
    map: textures.carbon.map,
    bumpMap: textures.carbon.bump,
    bumpScale: 0.018,
    metalness: 0.62,
    roughness: 0.3,
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.2,
  });

  const carbonInternal = std({
    name: 'carbon-internal',
    color: 0x15171a,
    map: textures.carbon.map,
    bumpMap: textures.carbon.bump,
    bumpScale: 0.012,
    metalness: 0.45,
    roughness: 0.42,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.95,
  });

  const paint = std({
    name: 'livery-ivory',
    color: 0xd8d1c2,
    metalness: 0.24,
    roughness: 0.36,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    iridescence: 0.1,
    iridescenceIOR: 1.4,
    envMapIntensity: 1.0,
    sheen: 0.12,
    sheenColor: new THREE.Color(0xfff5e6),
  });

  const accent = std({
    name: 'livery-vermilion',
    color: 0xe22b18,
    metalness: 0.35,
    roughness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07,
    envMapIntensity: 1.25,
  });

  const accentDark = std({
    name: 'livery-oxide',
    color: 0x7b170e,
    metalness: 0.6,
    roughness: 0.32,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });

  const metal = std({
    name: 'machined-aluminium',
    color: 0xaeb2b4,
    metalness: 1.0,
    roughness: 0.23,
    envMapIntensity: 1.3,
  });

  const darkMetal = std({
    name: 'dark-titanium',
    color: 0x64696d,
    metalness: 1.0,
    roughness: 0.34,
    envMapIntensity: 1.1,
  });

  const gold = std({
    name: 'heat-gold',
    color: 0xc3934f,
    metalness: 1.0,
    roughness: 0.27,
    envMapIntensity: 1.3,
  });

  const copper = std({
    name: 'copper',
    color: 0x9b5733,
    metalness: 1.0,
    roughness: 0.36,
  });

  const rubber = std({
    name: 'tyre-rubber',
    color: 0x111213,
    metalness: 0.0,
    roughness: 0.78,
    clearcoat: 0.2,
    clearcoatRoughness: 0.8,
  });

  const rubberTread = std({
    name: 'tyre-tread',
    color: 0x0d0e0f,
    metalness: 0.0,
    roughness: 0.9,
  });

  const glossBlack = std({
    name: 'gloss-black',
    color: 0x08090a,
    metalness: 0.55,
    roughness: 0.17,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const matteBlack = std({
    name: 'matte-black',
    color: 0x0c0e0f,
    metalness: 0.2,
    roughness: 0.78,
  });

  const interior = std({
    name: 'cockpit-interior',
    color: 0x17191a,
    metalness: 0.4,
    roughness: 0.62,
  });

  const seat = std({
    name: 'seat-composite',
    color: 0x24211f,
    metalness: 0.15,
    roughness: 0.6,
    clearcoat: 0.16,
  });

  const redAnodized = std({
    name: 'anodised-red',
    color: 0xb51d15,
    metalness: 0.85,
    roughness: 0.3,
  });

  const blueAnodized = std({
    name: 'anodised-blue',
    color: 0x1f5f6b,
    metalness: 0.85,
    roughness: 0.28,
  });

  const brakeDisc = std({
    name: 'brake-carbon',
    color: 0x3b3d3e,
    metalness: 0.65,
    roughness: 0.7,
    clearcoat: 0.15,
  });

  const belt = std({
    name: 'belt-webbing',
    color: 0x9e2419,
    metalness: 0.0,
    roughness: 0.72,
  });

  const glass = std({
    name: 'visor-glass',
    color: 0x1b2425,
    metalness: 0.65,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    envMapIntensity: 2.0,
  });

  const helmetWhite = std({
    name: 'helmet-shell',
    color: 0xf0e9dc,
    metalness: 0.3,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });

  const helmetRed = std({
    name: 'helmet-vermilion',
    color: 0xee3c21,
    metalness: 0.35,
    roughness: 0.25,
    clearcoat: 1,
  });

  const screen = new THREE.MeshBasicMaterial({
    name: 'steering-display',
    color: 0x9ff2ef,
    toneMapped: false,
  });

  const screenDark = new THREE.MeshBasicMaterial({
    name: 'screen-dark',
    color: 0x03090a,
    toneMapped: false,
  });

  const emissiveRed = new THREE.MeshBasicMaterial({
    name: 'emissive-red',
    color: 0xff3820,
    toneMapped: false,
  });

  const emissiveTeal = new THREE.MeshBasicMaterial({
    name: 'emissive-teal',
    color: 0x8ff7ec,
    toneMapped: false,
  });

  const emissiveWhite = new THREE.MeshBasicMaterial({
    name: 'emissive-white',
    color: 0xdff5f2,
    toneMapped: false,
  });

  const rainLight = new THREE.MeshBasicMaterial({
    name: 'rain-light',
    color: 0xff2418,
    toneMapped: false,
  });

  const tyreDecal = new THREE.MeshBasicMaterial({
    name: 'tyre-sidewall-decal',
    map: textures.tyreWall,
    transparent: true,
    depthWrite: false,
    toneMapped: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const decal = (map, opacity = 1) =>
    new THREE.MeshBasicMaterial({
      name: 'livery-decal',
      map,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

  const wordmarkDark = decal(textures.wordmarkSmall);
  wordmarkDark.color.setHex(0x141819);
  const numberDark = decal(textures.number);
  numberDark.color.setHex(0x171b1c);

  const decals = {
    wordmark: decal(textures.wordmark),
    wordmarkSmall: decal(textures.wordmarkSmall),
    wordmarkDark,
    number: decal(textures.number),
    numberDark,
  };

  const materials = {
    paint,
    accent,
    accentDark,
    carbonShell,
    carbon: carbonInternal,
    metal,
    darkMetal,
    gold,
    copper,
    rubber,
    rubberTread,
    glossBlack,
    matteBlack,
    interior,
    seat,
    redAnodized,
    blueAnodized,
    brakeDisc,
    belt,
    glass,
    helmetWhite,
    helmetRed,
    screen,
    screenDark,
    emissiveRed,
    emissiveTeal,
    emissiveWhite,
    rainLight,
    tyreDecal,
    decals,
    all: [],
  };

  materials.all = [
    paint,
    accent,
    accentDark,
    carbonShell,
    carbonInternal,
    metal,
    darkMetal,
    gold,
    copper,
    rubber,
    rubberTread,
    glossBlack,
    matteBlack,
    interior,
    seat,
    redAnodized,
    blueAnodized,
    brakeDisc,
    belt,
    glass,
    helmetWhite,
    helmetRed,
    screen,
    screenDark,
    emissiveRed,
    emissiveTeal,
    emissiveWhite,
    rainLight,
    tyreDecal,
    ...Object.values(decals),
  ];

  // Materials that belong to the outer bodywork. These are the only
  // surfaces removed by the partial cutaway (the internals stay whole).
  for (const m of [paint, accent, accentDark]) m.userData.bodywork = true;

  return materials;
}
