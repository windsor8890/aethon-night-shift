import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

const WHITE = '#f6f0e2';
const YELLOW = '#f3c400';

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function wordmark(text, {
  width = 1024,
  height = 220,
  font = '700 132px "Arial Narrow", Arial, sans-serif',
  color = WHITE,
  style = '',
  spacing = 8,
  stroke = null,
} = {}) {
  return canvasTexture(width, height, (ctx) => {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${style ? style + ' ' : ''}${font}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 5;
      ctx.strokeText(text, width / 2, height / 2 + 4);
    }
    ctx.fillText(text, width / 2, height / 2 + 4);
  });
}

function shellMark() {
  return canvasTexture(560, 620, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h * 0.54);
    ctx.lineJoin = 'round';
    ctx.fillStyle = YELLOW;
    ctx.strokeStyle = '#b51b1b';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(0, 238);
    ctx.bezierCurveTo(-80, 170, -158, 62, -214, -66);
    ctx.bezierCurveTo(-155, -172, -74, -232, 0, -246);
    ctx.bezierCurveTo(74, -232, 155, -172, 214, -66);
    ctx.bezierCurveTo(158, 62, 80, 170, 0, 238);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#b51b1b';
    ctx.lineWidth = 13;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, 206);
      ctx.quadraticCurveTo(i * 27, 20, i * 58, -190 - Math.abs(i) * 8);
      ctx.stroke();
    }
    ctx.fillStyle = '#b51b1b';
    ctx.beginPath();
    ctx.ellipse(0, 216, 130, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function ferrariShield() {
  return canvasTexture(500, 620, (ctx, w, h) => {
    ctx.fillStyle = '#f0c400';
    ctx.strokeStyle = '#0a0907';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(62, 38);
    ctx.lineTo(438, 38);
    ctx.quadraticCurveTo(448, 210, 416, 340);
    ctx.quadraticCurveTo(372, 524, 250, 592);
    ctx.quadraticCurveTo(128, 524, 84, 340);
    ctx.quadraticCurveTo(52, 210, 62, 38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // A stylised prancing horse silhouette.
    ctx.fillStyle = '#0a0907';
    ctx.beginPath();
    ctx.moveTo(300, 140);
    ctx.bezierCurveTo(330, 118, 365, 142, 356, 174);
    ctx.bezierCurveTo(350, 198, 326, 202, 320, 218);
    ctx.bezierCurveTo(350, 250, 342, 308, 306, 334);
    ctx.bezierCurveTo(290, 352, 296, 380, 316, 398);
    ctx.bezierCurveTo(306, 414, 284, 414, 268, 400);
    ctx.bezierCurveTo(248, 414, 222, 412, 206, 394);
    ctx.bezierCurveTo(222, 378, 236, 360, 226, 338);
    ctx.bezierCurveTo(202, 320, 196, 288, 210, 260);
    ctx.bezierCurveTo(174, 256, 150, 232, 160, 212);
    ctx.bezierCurveTo(170, 192, 198, 198, 216, 210);
    ctx.bezierCurveTo(218, 186, 238, 168, 256, 162);
    ctx.bezierCurveTo(270, 156, 282, 160, 288, 170);
    ctx.bezierCurveTo(280, 182, 262, 184, 254, 198);
    ctx.bezierCurveTo(264, 224, 278, 232, 296, 232);
    ctx.bezierCurveTo(306, 216, 292, 198, 300, 178);
    ctx.bezierCurveTo(286, 168, 286, 150, 300, 140);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f0c400';
    ctx.lineWidth = 7;
    ctx.stroke();
  });
}

function italianFlag() {
  return canvasTexture(480, 300, (ctx, w, h) => {
    ctx.fillStyle = '#129447';
    ctx.fillRect(0, 0, w / 3, h);
    ctx.fillStyle = '#f5efe2';
    ctx.fillRect(w / 3, 0, w / 3, h);
    ctx.fillStyle = '#ce1e2b';
    ctx.fillRect(w * 2 / 3, 0, w / 3, h);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);
  });
}

function pirelli() {
  return canvasTexture(1100, 240, (ctx, w, h) => {
    ctx.fillStyle = YELLOW;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 150px "Arial Narrow", Arial, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText('PIRELLI', w / 2, h / 2);
  });
}

function decalMaterial(texture, { mirror = false } = {}) {
  let map = texture;
  if (mirror) {
    map = texture.clone();
    map.wrapS = THREE.RepeatWrapping;
    map.repeat.x = -1;
    map.offset.x = 1;
    map.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({
    name: 'FerrariLiveryDecal',
    map,
    transparent: true,
    alphaTest: 0.06,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -7,
    roughness: 0.44,
    metalness: 0.04,
    envMapIntensity: 0.4,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function project(carRoot, bodyMesh, texture, def, mirror = false) {
  bodyMesh.updateMatrixWorld(true);
  const geometry = new DecalGeometry(
    bodyMesh,
    new THREE.Vector3(...def.position),
    new THREE.Euler(...(def.orientation || [0, Math.PI / 2, 0])),
    new THREE.Vector3(...(def.size || [1, 0.2, 0.5])),
  );
  const mesh = new THREE.Mesh(geometry, decalMaterial(texture, { mirror }));
  mesh.name = `livery-${def.name || 'decal'}`;
  mesh.renderOrder = 8;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  carRoot.add(mesh);
  return mesh.material;
}

export function applyLivery(carRoot, bodyMesh) {
  const textures = {
    rayBan: wordmark('Ray-Ban', {
      width: 1500, height: 330, font: 'italic 700 178px "Brush Script MT", "Segoe Script", cursive', spacing: 0,
    }),
    ceva: wordmark('CEVA', { width: 700, height: 220, font: '900 154px "Arial Narrow", Arial, sans-serif', spacing: 18 }),
    santander: wordmark('Santander', { width: 1200, height: 240, font: '700 140px "Arial Narrow", Arial, sans-serif', spacing: 2 }),
    aws: wordmark('aws', { width: 560, height: 220, font: '900 160px "Arial Narrow", Arial, sans-serif', spacing: 5 }),
    velas: wordmark('VELAS', { width: 700, height: 220, font: '700 135px "Arial Narrow", Arial, sans-serif', spacing: 12 }),
    richard: wordmark('RICHARD MILLE', { width: 1500, height: 220, font: '600 112px Georgia, serif', spacing: 14 }),
    snap: wordmark('Snapdragon', { width: 1200, height: 220, font: '700 120px "Arial Narrow", Arial, sans-serif', spacing: 2 }),
    mahle: wordmark('MAHLE', { width: 600, height: 200, font: '800 132px "Arial Narrow", Arial, sans-serif', spacing: 8 }),
    palantir: wordmark('○ Palantir', { width: 850, height: 200, font: '600 108px "Arial Narrow", Arial, sans-serif', spacing: 4 }),
    brembo: wordmark('brembo', { width: 600, height: 200, font: '800 120px "Arial Narrow", Arial, sans-serif', spacing: 0 }),
    vpower: wordmark('V-Power', { width: 850, height: 220, font: '700 128px "Arial Narrow", Arial, sans-serif', spacing: 2 }),
    number: wordmark('16', { width: 500, height: 500, font: '800 340px "Arial Narrow", Arial, sans-serif', spacing: 0 }),
    shell: shellMark(),
    shield: ferrariShield(),
    flag: italianFlag(),
    pirelli: pirelli(),
  };

  const materials = [];
  const sideDefs = [
    { name: 'ray-ban', texture: textures.rayBan, position: [0.82, 0.45, -0.24], size: [0.98, 0.25, 0.5] },
    { name: 'ceva', texture: textures.ceva, position: [0.82, 0.43, -0.93], size: [0.32, 0.11, 0.4] },
    { name: 'shell-side', texture: textures.shell, position: [0.82, 0.48, 0.26], size: [0.25, 0.28, 0.4] },
    { name: 'santander', texture: textures.santander, position: [0.34, 0.88, -0.22], size: [0.44, 0.1, 0.36] },
    { name: 'aws-engine', texture: textures.aws, position: [0.41, 0.74, -0.08], size: [0.2, 0.075, 0.36] },
    { name: 'number-16', texture: textures.number, position: [0.34, 0.78, -0.6], size: [0.29, 0.23, 0.34] },
    { name: 'richard-mille', texture: textures.richard, position: [0.25, 0.64, 1.06], size: [0.48, 0.085, 0.32] },
    { name: 'shield-cover', texture: textures.shield, position: [0.3, 0.78, -1.05], size: [0.14, 0.18, 0.3] },
    { name: 'flag-side', texture: textures.flag, position: [0.31, 0.84, -0.02], size: [0.1, 0.055, 0.28] },
    { name: 'snapdragon', texture: textures.snap, position: [0.69, 0.23, -0.45], size: [0.45, 0.08, 0.35] },
  ];

  for (const side of [1, -1]) {
    sideDefs.forEach((def) => {
      const pos = [side * def.position[0], def.position[1], def.position[2]];
      materials.push(project(carRoot, bodyMesh, def.texture, {
        ...def,
        position: pos,
        orientation: [0, side * Math.PI / 2, 0],
      }, side < 0));
    });
  }

  const topDefs = [
    { name: 'velas', texture: textures.velas, position: [0, 0.9, 1.08], size: [0.24, 0.1, 0.62] },
    { name: 'shell-nose', texture: textures.shell, position: [0, 0.9, 1.32], size: [0.14, 0.14, 0.62] },
    { name: 'aws-nose', texture: textures.aws, position: [0, 0.85, 1.5], size: [0.17, 0.06, 0.62] },
    { name: 'number-nose', texture: textures.number, position: [0, 0.82, 1.72], size: [0.25, 0.24, 0.62] },
    { name: 'santander-nose', texture: textures.santander, position: [0, 0.78, 1.93], size: [0.2, 0.04, 0.62] },
    { name: 'shield-front', texture: textures.shield, position: [0, 0.36, 2.78], orientation: [0, 0, 0], size: [0.22, 0.26, 0.5] },
  ];
  for (const def of topDefs) {
    materials.push(project(carRoot, bodyMesh, def.texture, {
      ...def,
      orientation: def.orientation || [-Math.PI / 2, 0, 0],
    }));
  }

  const wingDefs = [
    { name: 'vpower-wing', texture: textures.vpower, position: [0.98, 0.3, 2.35], size: [0.26, 0.075, 0.3] },
    { name: 'aws-wing', texture: textures.aws, position: [0.98, 0.205, 2.35], size: [0.22, 0.06, 0.3] },
  ];
  for (const side of [1, -1]) {
    wingDefs.forEach((def) => {
      materials.push(project(carRoot, bodyMesh, def.texture, {
        ...def,
        position: [side * def.position[0], def.position[1], def.position[2]],
        orientation: def.orientation ? [0, side * Math.PI / 2, 0] : [0, side * Math.PI / 2, 0],
      }, side < 0));
    });
  }

  return { materials };
}

export function applyTireLivery(wheels) {
  const pzero = wordmark('P ZERO', {
    width: 760,
    height: 170,
    font: '800 110px "Arial Narrow", Arial, sans-serif',
    color: YELLOW,
    spacing: 8,
  });
  const materials = [];
  for (const wheel of wheels) {
    const side = wheel.userData.side || 1;
    const mat = new THREE.MeshBasicMaterial({
      name: 'PirelliTyreMark',
      map: pzero,
      transparent: true,
      opacity: 0.92,
      alphaTest: 0.08,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.08), mat);
    plane.position.set(side * 0.198, 0.12, 0.02);
    plane.rotation.y = side * Math.PI / 2;
    plane.renderOrder = 8;
    wheel.add(plane);
    materials.push(mat);
  }
  return { materials };
}
