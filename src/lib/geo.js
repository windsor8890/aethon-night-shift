import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function meshOf(geometry, material, opts = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  if (opts.name) mesh.name = opts.name;
  if (opts.position) mesh.position.set(...opts.position);
  if (opts.rotation) mesh.rotation.set(...opts.rotation);
  if (opts.scale) mesh.scale.set(...opts.scale);
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  if (opts.renderOrder !== undefined) mesh.renderOrder = opts.renderOrder;
  return mesh;
}

export function box(w, h, d, mat, opts = {}) {
  return meshOf(new THREE.BoxGeometry(w, h, d), mat, opts);
}

export function roundedBox(w, h, d, radius, mat, opts = {}) {
  const r = Math.min(radius, w * 0.49, h * 0.49, d * 0.49);
  return meshOf(new RoundedBoxGeometry(w, h, d, 4, r), mat, opts);
}

export function cylinderBetween(a, b, r, mat, opts = {}) {
  const start = a.isVector3 ? a : new THREE.Vector3(...a);
  const end = b.isVector3 ? b : new THREE.Vector3(...b);
  const dir = end.clone().sub(start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r, r, len, opts.radialSegments || 10, 1, opts.openEnded || false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  if (opts.name) mesh.name = opts.name;
  return mesh;
}

export function taperedCylinderBetween(a, b, r1, r2, mat, opts = {}) {
  const start = a.isVector3 ? a : new THREE.Vector3(...a);
  const end = b.isVector3 ? b : new THREE.Vector3(...b);
  const dir = end.clone().sub(start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r2, r1, len, opts.radialSegments || 10, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  return mesh;
}

export function tube(points, radius, mat, opts = {}) {
  const pts = points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', opts.tension ?? 0.35);
  const seg = opts.segments || 40;
  const radial = opts.radialSegments || 8;
  const geo = new THREE.TubeGeometry(curve, seg, radius, radial, false);
  return meshOf(geo, mat, {
    name: opts.name,
    castShadow: opts.castShadow !== false,
    receiveShadow: opts.receiveShadow !== false,
  });
}

export function torusRing(radius, thickness, mat, opts = {}) {
  const geo = new THREE.TorusGeometry(radius, thickness, opts.radialSegments || 10, opts.tubularSegments || 64);
  const m = meshOf(geo, mat, opts);
  if (opts.plane === 'xz') m.rotation.x = Math.PI / 2;
  return m;
}

export function circleDisc(radius, mat, opts = {}) {
  return meshOf(new THREE.CircleGeometry(radius, opts.segments || 48), mat, opts);
}

/* ------------------------------------------------------------------ */
/* Lofted monocoques / body shells                                     */
/* ------------------------------------------------------------------ */

function sectionPoint(sec, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const top = s >= 0;
  const exponent = top ? sec.topExp ?? sec.exp ?? 2.6 : sec.bottomExp ?? sec.exp ?? 3.4;
  const e = 2 / exponent;
  let x = Math.sign(c) * Math.pow(Math.abs(c), e) * sec.halfWidth;
  const y = sec.centerY + Math.sign(s) * Math.pow(Math.abs(s), e) * sec.halfHeight;
  if (top) x *= 1 - (sec.topPinch || 0) * Math.pow(Math.max(0, s), 2.2);
  else x *= 1 - (sec.bottomPinch || 0) * Math.pow(Math.max(0, -s), 2.2);
  x += sec.offsetX || 0;
  return [x, y];
}

/**
 * Build a closed, smooth lofted shell from elliptical / superelliptical
 * cross sections. Sections should be ordered front-to-back.
 */
export function loftShell(sections, opts = {}) {
  const radial = opts.radial || 34;
  const list = sections.map((s) => {
    const top = s.top;
    const bottom = s.bottom;
    return {
      ...s,
      centerY: (top + bottom) * 0.5,
      halfHeight: Math.max(0.001, (top - bottom) * 0.5),
      topExp: s.topExp ?? s.exp,
      bottomExp: s.bottomExp ?? s.exp,
    };
  });

  const cols = list.length;
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < radial; i++) {
      const theta = (i / radial) * TAU;
      const [x, y] = sectionPoint(list[j], theta);
      vertices.push(x, y, list[j].z);
      uvs.push(i / radial, j / Math.max(1, cols - 1));
    }
  }

  for (let j = 0; j < cols - 1; j++) {
    for (let i = 0; i < radial; i++) {
      const ni = (i + 1) % radial;
      const a = j * radial + i;
      const b = j * radial + ni;
      const c = (j + 1) * radial + ni;
      const d = (j + 1) * radial + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  if (opts.capStart !== false) {
    const center = vertices.length / 3;
    const sec = list[0];
    vertices.push(sec.offsetX || 0, sec.centerY, sec.z);
    uvs.push(0.5, 0.5);
    for (let i = 0; i < radial; i++) {
      const ni = (i + 1) % radial;
      indices.push(center, ni, i);
    }
  }
  if (opts.capEnd !== false) {
    const center = vertices.length / 3;
    const sec = list[cols - 1];
    const base = (cols - 1) * radial;
    vertices.push(sec.offsetX || 0, sec.centerY, sec.z);
    uvs.push(0.5, 0.5);
    for (let i = 0; i < radial; i++) {
      const ni = (i + 1) % radial;
      indices.push(center, base + i, base + ni);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/* ------------------------------------------------------------------ */
/* Aerofoils                                                           */
/* ------------------------------------------------------------------ */

function airfoilLoop(steps = 12, thickness = 0.12, camber = 0.03) {
  const loop = [];
  for (let i = 0; i <= steps; i++) {
    const u = (1 - Math.cos((Math.PI * i) / steps)) * 0.5;
    const yt =
      5 * thickness *
      (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    const yc = camber * Math.sin(Math.PI * Math.pow(u, 0.8));
    loop.push([u, yc + yt]);
  }
  for (let i = steps - 1; i > 0; i--) {
    const u = (1 - Math.cos((Math.PI * i) / steps)) * 0.5;
    const yt =
      5 * thickness *
      (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    const yc = camber * Math.sin(Math.PI * Math.pow(u, 0.8));
    loop.push([u, yc - yt]);
  }
  return loop;
}

/**
 * A spanwise wing with root/tip chord, sweep, dihedral and pitch.
 * Local +Z is the chord direction; the wing extends across X.
 */
export function wingGeometry(opts = {}) {
  const span = opts.span ?? 1.8;
  const chordRoot = opts.chordRoot ?? 0.34;
  const chordTip = opts.chordTip ?? chordRoot * 0.8;
  const thickness = opts.thickness ?? 0.12;
  const camber = opts.camber ?? 0.03;
  const angle = opts.angle ?? 0.1;
  const sweep = opts.sweep ?? 0;
  const rise = opts.rise ?? 0;
  const dihedral = opts.dihedral ?? 0;
  const spanSegments = opts.spanSegments ?? 26;
  const foilSteps = opts.foilSteps ?? 10;
  const loop = airfoilLoop(foilSteps, thickness, camber);
  const ring = loop.length;
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= spanSegments; j++) {
    const t = j / spanSegments;
    const s = t * 2 - 1;
    const a = Math.abs(s);
    const chord = lerp(chordRoot, chordTip, a * a);
    const x = s * span * 0.5;
    const zBase = (opts.z ?? 0) + a * sweep + (1 - a * a) * (opts.centerSweep || 0);
    const yBase = (opts.y ?? 0) + a * a * dihedral + Math.pow(a, 3) * rise;
    for (let i = 0; i < ring; i++) {
      const [u, py] = loop[i];
      const px = u * chord;
      const vy = py * chord;
      const zz = px * Math.cos(angle) - vy * Math.sin(angle);
      const yy = px * Math.sin(angle) + vy * Math.cos(angle);
      vertices.push(x, yBase + yy, zBase + zz);
      uvs.push(t, i / ring);
    }
  }

  for (let j = 0; j < spanSegments; j++) {
    for (let i = 0; i < ring; i++) {
      const ni = (i + 1) % ring;
      const a = j * ring + i;
      const b = j * ring + ni;
      const c = (j + 1) * ring + ni;
      const d = (j + 1) * ring + i;
      indices.push(a, c, b, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function airfoilMesh(opts, mat) {
  return meshOf(wingGeometry(opts), mat, { name: opts.name });
}

/**
 * Extrude a 2D side-profile. The profile is (z, y) relative to the plate.
 * The plate is extruded across X and centred on x.
 */
export function sidePlate(points, thickness, mat, opts = {}) {
  const shape = new THREE.Shape();
  points.forEach(([z, y], i) => (i === 0 ? shape.moveTo(z, y) : shape.lineTo(z, y)));
  shape.closePath();
  if (opts.holes) {
    for (const holePoints of opts.holes) {
      const hole = new THREE.Path();
      holePoints.forEach(([z, y], i) => (i === 0 ? hole.moveTo(z, y) : hole.lineTo(z, y)));
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: opts.bevel ?? 0.003,
    bevelThickness: opts.bevel ?? 0.003,
    curveSegments: 12,
  });
  geo.translate(0, 0, -thickness / 2);
  // Shape X is the longitudinal (Z) axis. Rotating -90° preserves the
  // profile's front/rear orientation while extruding the plate across X.
  geo.rotateY(-Math.PI / 2);
  const m = meshOf(geo, mat, { name: opts.name });
  if (opts.x !== undefined) m.position.x = opts.x;
  return m;
}

export function ringCurveGeometry(points, radius, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    true,
    'catmullrom',
    0.3,
  );
  return new THREE.TubeGeometry(curve, opts.segments || 96, radius, opts.radialSegments || 8, true);
}

export function makeAnchor(name, x = 0, y = 0, z = 0) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  return o;
}

export function setShadow(group, cast = true, receive = true) {
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return group;
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose();
    }
  });
}
