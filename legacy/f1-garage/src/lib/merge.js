import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collapse static opaque meshes inside a group into one mesh per material.
 * Keeps transparency, instancing, render ordering and marked sub-trees intact.
 * This is deliberately run after all modelling so the procedural scene keeps
 * its editability while the GPU sees far fewer draw calls.
 */
export function mergeStaticMeshes(root, { name = 'merged', skip = () => false } = {}) {
  root.updateWorldMatrix(true, true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
    if (Array.isArray(o.material)) return;
    if (o.material.transparent || o.material.depthWrite === false) return;
    if (o.renderOrder) return;
    if (o.userData?.noMerge) return;
    if (skip(o)) return;

    let p = o.parent;
    while (p && p !== root) {
      if (p.userData && p.userData.noMerge) return;
      p = p.parent;
    }

    const attrs = Object.keys(o.geometry.attributes).sort().join(',');
    const indexed = o.geometry.index ? 'i' : 'n';
    const key = [
      o.material.uuid,
      attrs,
      indexed,
      o.castShadow ? 1 : 0,
      o.receiveShadow ? 1 : 0,
      o.frustumCulled ? 1 : 0,
    ].join('|');

    let b = buckets.get(key);
    if (!b) {
      b = {
        material: o.material,
        castShadow: o.castShadow,
        receiveShadow: o.receiveShadow,
        frustumCulled: o.frustumCulled,
        entries: [],
      };
      buckets.set(key, b);
    }
    b.entries.push(o);
  });

  let mergedCount = 0;
  for (const bucket of buckets.values()) {
    if (bucket.entries.length < 2) continue;

    const geometries = [];
    for (const entry of bucket.entries) {
      entry.updateWorldMatrix(true, false);
      const g = entry.geometry.clone();
      const local = new THREE.Matrix4().multiplyMatrices(rootInverse, entry.matrixWorld);
      g.applyMatrix4(local);
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      geometries.push(g);
    }

    let mergedGeom;
    try {
      mergedGeom = mergeGeometries(geometries, false);
    } catch {
      mergedGeom = null;
    }
    if (!mergedGeom) {
      for (const g of geometries) g.dispose();
      continue;
    }
    mergedGeom.computeBoundingSphere();
    const mesh = new THREE.Mesh(mergedGeom, bucket.material);
    mesh.name = `${name}-${mergedCount}`;
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.frustumCulled = bucket.frustumCulled;
    mesh.userData.merged = true;
    root.add(mesh);
    mergedCount += 1;

    for (const entry of bucket.entries) {
      entry.removeFromParent();
    }
    for (const g of geometries) g.dispose();
  }

  return mergedCount;
}
