import * as THREE from 'three';

function makeGlowTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSpeedEffects({ scene }) {
  const root = new THREE.Group();
  root.name = 'speed-effects';
  scene.add(root);

  const streakCount = 74;
  const streakData = [];
  const positions = new Float32Array(streakCount * 6);
  const colors = new Float32Array(streakCount * 6);
  for (let i = 0; i < streakCount; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (1.2 + Math.random() * 5.8);
    const y = 0.22 + Math.random() * 3.2;
    const z = -2 + Math.random() * 14;
    const len = 0.25 + Math.random() * 1.35;
    streakData.push({ x, y, z, len, speed: 0.7 + Math.random() * 0.8, alpha: 0.25 + Math.random() * 0.65 });
    const bright = 0.6 + Math.random() * 0.4;
    for (let v = 0; v < 2; v++) {
      const idx = i * 6 + v * 3;
      colors[idx] = bright * 0.7;
      colors[idx + 1] = bright * 0.88;
      colors[idx + 2] = bright;
    }
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  streakGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const streakMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false;
  streaks.visible = false;
  root.add(streaks);

  const sparkCount = 28;
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkData = [];
  for (let i = 0; i < sparkCount; i++) {
    sparkData.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
    sparkPositions[i * 3 + 1] = -10;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMat = new THREE.PointsMaterial({
    map: makeGlowTexture(64),
    color: 0xff8a42,
    size: 0.13,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.visible = false;
  root.add(sparks);

  let elapsed = 0;
  let sparkTimer = 0;
  let visibleAmount = 0;

  function update({ carZ = 0, speed = 0, active = false, dt = 0.016, time = 0 } = {}) {
    elapsed = time;
    root.position.z = carZ;
    const target = active ? Math.min(1, speed / 12) : 0;
    visibleAmount += (target - visibleAmount) * Math.min(1, dt * 3.5);
    const on = visibleAmount > 0.015;
    streaks.visible = on;
    sparks.visible = on;
    streakMat.opacity = visibleAmount * 0.17;
    sparkMat.opacity = visibleAmount * 0.85;

    if (on) {
      for (let i = 0; i < streakCount; i++) {
        const s = streakData[i];
        s.z -= (speed * 2.4 + 1.2) * s.speed * dt;
        if (s.z < -7) {
          s.z = 10 + Math.random() * 6;
          s.x = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 5.8);
          s.y = 0.22 + Math.random() * 3.2;
          s.len = 0.25 + Math.random() * 1.35;
        }
        const idx = i * 6;
        positions[idx] = s.x;
        positions[idx + 1] = s.y;
        positions[idx + 2] = s.z;
        positions[idx + 3] = s.x;
        positions[idx + 4] = s.y;
        positions[idx + 5] = s.z - s.len * (0.7 + visibleAmount * 0.7);
      }
      streakGeo.attributes.position.needsUpdate = true;

      sparkTimer -= dt;
      if (sparkTimer <= 0 && visibleAmount > 0.3) {
        sparkTimer = 0.035 + Math.random() * 0.06;
        let idx = -1;
        for (let i = 0; i < sparkCount; i++) {
          if (sparkData[i].life <= 0) { idx = i; break; }
        }
        if (idx >= 0) {
          const side = Math.random() > 0.5 ? 1 : -1;
          const s = sparkData[idx];
          s.x = side * (0.55 + Math.random() * 0.35);
          s.y = 0.025;
          s.z = -0.6 + Math.random() * 1.0;
          s.vx = side * (Math.random() * 0.6 + 0.1);
          s.vy = Math.random() * 0.9 + 0.25;
          s.vz = -(1.2 + Math.random() * 2.2);
          s.life = 0.22 + Math.random() * 0.35;
        }
      }
      for (let i = 0; i < sparkCount; i++) {
        const s = sparkData[i];
        if (s.life > 0) {
          s.life -= dt;
          s.vy -= 2.2 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.z += s.vz * dt;
          if (s.y < 0.01) s.life = 0;
          sparkPositions[i * 3] = s.x;
          sparkPositions[i * 3 + 1] = s.y;
          sparkPositions[i * 3 + 2] = s.z;
        } else {
          sparkPositions[i * 3 + 1] = -10;
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;
    } else {
      sparkTimer = 0;
    }
  }

  return { root, streaks, sparks, update };
}
