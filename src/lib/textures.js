import * as THREE from 'three';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function canvasTexture(canvas, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

function noise(ctx, w, h, amount, alpha = 0.12, seed = 1) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  if (alpha > 0) {
    for (let i = 0; i < 5000; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = rnd() * 1.4 + 0.2;
      ctx.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},255,${rnd() * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* Carbon twill ------------------------------------------------------- */
export function carbonTextures() {
  const size = 512;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111214';
  ctx.fillRect(0, 0, size, size);

  const cell = 16;
  const groups = 4;
  for (let gy = 0; gy < size / cell; gy++) {
    for (let gx = 0; gx < size / cell; gx++) {
      const x = gx * cell;
      const y = gy * cell;
      const flip = (Math.floor(gx / groups) + Math.floor(gy / groups)) % 2 === 0;
      const bright = flip ? 26 : 17;
      const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      grad.addColorStop(0, `rgb(${bright + 5},${bright + 6},${bright + 8})`);
      grad.addColorStop(0.45, `rgb(${bright + 16},${bright + 18},${bright + 20})`);
      grad.addColorStop(0.55, `rgb(${bright + 5},${bright + 6},${bright + 7})`);
      grad.addColorStop(1, `rgb(${bright + 1},${bright + 2},${bright + 3})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cell - 0.6, cell - 0.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + cell, y + cell - 2);
      } else {
        ctx.moveTo(x + cell, y + 2);
        ctx.lineTo(x, y + cell - 2);
      }
      ctx.stroke();
    }
  }
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
    d[i] = v * 0.97;
    d[i + 1] = v * 0.98;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i <= size; i += cell * groups) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const map = canvasTexture(c, { repeat: [10, 10] });
  map.anisotropy = 16;

  const bumpCanvas = makeCanvas(size, size);
  const bctx = bumpCanvas.getContext('2d');
  bctx.drawImage(c, 0, 0);
  bctx.globalCompositeOperation = 'saturation';
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  const bump = canvasTexture(bumpCanvas, { srgb: false, repeat: [10, 10] });

  return { map, bump };
}

/* Concrete floor ----------------------------------------------------- */
export function concreteTextures() {
  const size = 1024;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rnd = (() => {
    let s = 8241;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })();

  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#25292b');
  base.addColorStop(0.45, '#303436');
  base.addColorStop(1, '#202426');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 190; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 20 + rnd() * 140;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() > 0.55;
    g.addColorStop(0, dark ? 'rgba(8,10,11,0.12)' : 'rgba(180,190,190,0.045)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  noise(ctx, size, size, 18, 0.025, 671);

  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.strokeStyle = `rgba(${rnd() > 0.7 ? 220 : 10},${rnd() > 0.7 ? 220 : 12},${rnd() > 0.7 ? 210 : 13},${0.025 + rnd() * 0.05})`;
    ctx.lineWidth = 0.5 + rnd() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x;
    let py = y;
    for (let k = 0; k < 5; k++) {
      px += (rnd() - 0.5) * 90;
      py += rnd() * 35;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // expansion seams
  ctx.strokeStyle = 'rgba(5,7,8,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, size * 0.5);
  ctx.lineTo(size, size * 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const map = canvasTexture(c, { repeat: [4, 4] });
  map.anisotropy = 16;

  const roughCanvas = makeCanvas(size, size);
  const rctx = roughCanvas.getContext('2d');
  rctx.fillStyle = '#7a7a7a';
  rctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 240; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 30 + rnd() * 220;
    const g = rctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() > 0.45 ? 'rgba(20,20,20,0.24)' : 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    rctx.fillStyle = g;
    rctx.beginPath();
    rctx.arc(x, y, r, 0, Math.PI * 2);
    rctx.fill();
  }
  noise(rctx, size, size, 30, 0, 913);
  const roughnessMap = canvasTexture(roughCanvas, { srgb: false, repeat: [4, 4] });

  // Sobel-ish normal map from a fine noise height field
  const hsize = 512;
  const hc = makeCanvas(hsize, hsize);
  const hctx = hc.getContext('2d');
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, hsize, hsize);
  noise(hctx, hsize, hsize, 26, 0, 144);
  const hd = hctx.getImageData(0, 0, hsize, hsize).data;
  const nc = makeCanvas(hsize, hsize);
  const nctx = nc.getContext('2d');
  const nimg = nctx.createImageData(hsize, hsize);
  const at = (x, y) => hd[((((y + hsize) % hsize) * hsize + ((x + hsize) % hsize)) << 2)] / 255;
  for (let y = 0; y < hsize; y++) {
    for (let x = 0; x < hsize; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 1.25;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 1.25;
      const i = (y * hsize + x) << 2;
      nimg.data[i] = Math.max(0, Math.min(255, 128 - dx * 127));
      nimg.data[i + 1] = Math.max(0, Math.min(255, 128 - dy * 127));
      nimg.data[i + 2] = 255;
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const normalMap = canvasTexture(nc, { srgb: false, repeat: [5, 5] });

  return { map, roughnessMap, normalMap };
}

/* Tyre markings ------------------------------------------------------ */
export function tyreSidewallTexture({ primary = '#ff4526', secondary = '#ede7da' } = {}) {
  const size = 1024;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;

  ctx.strokeStyle = 'rgba(235,230,218,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 444, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = primary;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 468, -Math.PI * 0.82, Math.PI * 0.42);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(235,230,218,0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 484, -Math.PI * 0.82, Math.PI * 0.42);
  ctx.stroke();

  ctx.fillStyle = secondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 62px Bahnschrift, "Arial Narrow", sans-serif';
  const arcText = (text, radius, start, end, sizePx, color, weight = 700) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${weight} ${sizePx}px Bahnschrift, "Arial Narrow", sans-serif`;
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
      const a = start + ((end - start) * i) / Math.max(1, chars.length - 1);
      ctx.save();
      ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  arcText('AETHON  •  VELOCE  R01', 408, -Math.PI * 0.72, -Math.PI * 0.08, 58, secondary, 700);
  arcText('RACE  TYRE  /  DRY  COMPOUND', 406, Math.PI * 0.18, Math.PI * 0.82, 30, 'rgba(232,226,214,0.7)', 500);

  ctx.fillStyle = primary;
  ctx.font = '800 42px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText('AR·24', cx, cy + 310);

  ctx.strokeStyle = 'rgba(235,230,218,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 342, 0, Math.PI * 2);
  ctx.stroke();

  // rotation arrow
  ctx.strokeStyle = primary;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy - 120, 54, 0.25, 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy - 153);
  ctx.lineTo(cx + 8, cy - 177);
  ctx.lineTo(cx + 4, cy - 139);
  ctx.closePath();
  ctx.fillStyle = primary;
  ctx.fill();

  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/* Typography helpers ------------------------------------------------- */
function spacedText(ctx, text, x, y, spacing, align = 'left') {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cursor, y);
    cursor += widths[i] + spacing;
  }
  return total;
}

export function wordmarkTexture({
  text = 'AETHON',
  sub = 'MOTORSPORT',
  color = '#f1ece1',
  accent = '#ff4022',
  width = 1024,
  height = 256,
  align = 'left',
} = {}) {
  const c = makeCanvas(width, height);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const x = align === 'center' ? width / 2 : align === 'right' ? width - 24 : 24;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 150px Bahnschrift, "Arial Narrow", sans-serif';
  const w = spacedText(ctx, text, x, height * 0.62, 13, align);
  ctx.fillStyle = accent;
  const barX = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.fillRect(barX, height * 0.7, Math.min(80, w), 8);
  ctx.fillStyle = 'rgba(241,236,225,0.6)';
  ctx.font = '500 28px Bahnschrift, "Arial Narrow", sans-serif';
  if (align === 'center') {
    spacedText(ctx, sub, x, height * 0.87, 10, 'center');
  } else {
    ctx.fillText(sub, barX + 2, height * 0.87);
  }
  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function numberTexture(num = '01', { color = '#f1ece1', accent = '#ff4022' } = {}) {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);
  ctx.rotate(-0.08);
  ctx.fillStyle = accent;
  ctx.fillRect(-230, 24, 460, 8);
  ctx.font = '900 330px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(num, 0, -8);
  ctx.restore();
  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function sideLiveryTexture({ flip = false } = {}) {
  const c = makeCanvas(1024, 512);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 512);
  ctx.save();
  if (flip) {
    ctx.translate(1024, 0);
    ctx.scale(-1, 1);
  }

  // charcoal speed panel laid over the pearl bodywork
  const panel = ctx.createLinearGradient(60, 160, 920, 430);
  panel.addColorStop(0, 'rgba(9,12,13,0.9)');
  panel.addColorStop(0.55, 'rgba(13,17,18,0.92)');
  panel.addColorStop(1, 'rgba(21,25,26,0.84)');
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.moveTo(38, 420);
  ctx.lineTo(42, 285);
  ctx.lineTo(228, 196);
  ctx.lineTo(760, 173);
  ctx.lineTo(983, 254);
  ctx.lineTo(984, 347);
  ctx.lineTo(760, 360);
  ctx.lineTo(230, 397);
  ctx.closePath();
  ctx.fill();

  // vermilion speed slash
  ctx.fillStyle = '#ff4022';
  ctx.beginPath();
  ctx.moveTo(38, 356);
  ctx.lineTo(760, 253);
  ctx.lineTo(984, 263);
  ctx.lineTo(984, 286);
  ctx.lineTo(764, 277);
  ctx.lineTo(38, 389);
  ctx.closePath();
  ctx.fill();

  // pale pinline above the slash
  ctx.strokeStyle = 'rgba(239,234,223,0.68)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(54, 318);
  ctx.lineTo(400, 246);
  ctx.lineTo(754, 232);
  ctx.stroke();

  ctx.fillStyle = 'rgba(245,240,230,0.96)';
  ctx.font = '800 114px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textBaseline = 'middle';
  spacedText(ctx, 'AETHON', 78, 295, 9);
  ctx.font = '500 24px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillStyle = 'rgba(213,225,219,0.74)';
  spacedText(ctx, 'ADVANCED RACING SYSTEMS', 82, 352, 6);

  ctx.fillStyle = '#efe9dd';
  ctx.font = '900 166px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('01', 938, 291);

  ctx.font = '600 22px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff5b3c';
  ctx.fillText('AR·24', 802, 349);
  ctx.restore();
  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function rearWingTexture() {
  const c = makeCanvas(1024, 256);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = '#f0eadf';
  ctx.font = '900 152px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textBaseline = 'middle';
  spacedText(ctx, 'AETHON', 32, 128, 8);
  ctx.fillStyle = '#ff4022';
  ctx.fillRect(32, 202, 960, 8);
  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function floorBrandingTexture() {
  const c = makeCanvas(1024, 512);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 512);
  ctx.save();
  ctx.translate(512, 256);
  ctx.fillStyle = 'rgba(238,233,222,0.16)';
  ctx.font = '800 160px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AETHON', 0, 30);
  ctx.fillStyle = 'rgba(255,64,34,0.42)';
  ctx.font = '600 28px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.letterSpacing = '10px';
  ctx.fillText('RACE OPERATIONS  /  BAY 01', 0, 96);
  ctx.strokeStyle = 'rgba(238,233,222,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-440, -94, 880, 210);
  ctx.restore();
  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function floorBayTexture() {
  const c = makeCanvas(1024, 1024);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.strokeStyle = 'rgba(238,233,222,0.5)';
  ctx.lineWidth = 5;
  ctx.strokeRect(70, 70, 884, 884);
  ctx.strokeStyle = 'rgba(255,64,34,0.65)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(70, 70);
  ctx.lineTo(250, 70);
  ctx.moveTo(70, 70);
  ctx.lineTo(70, 250);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(238,233,222,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(70, 900 + i * 7);
    ctx.lineTo(954, 900 + i * 7);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(238,233,222,0.4)';
  ctx.font = '600 28px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText('AETHON  /  AR·24', 100, 970);
  ctx.textAlign = 'right';
  ctx.fillText('NO.01', 930, 970);
  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function hazardTexture() {
  const c = makeCanvas(256, 64);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#171819';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#ffb02e';
  for (let i = -64; i < 320; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 64);
    ctx.lineTo(i + 24, 0);
    ctx.lineTo(i + 48, 0);
    ctx.lineTo(i + 24, 64);
    ctx.closePath();
    ctx.fill();
  }
  return canvasTexture(c, { repeat: [3, 1] });
}

export function telemetryTexture(variant = 0) {
  const c = makeCanvas(1024, 512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#071114';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = 'rgba(76,190,196,0.09)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff4526';
  ctx.fillRect(48, 40, 8, 46);
  ctx.fillStyle = '#e8eee9';
  ctx.font = '700 32px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText('AETHON / LIVE TELEMETRY', 76, 76);
  ctx.fillStyle = 'rgba(100,210,210,0.65)';
  ctx.font = '500 20px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText(variant ? 'SECTOR 03   ·   PIT LANE' : 'RUN 04   ·   INSTALLATION LAP', 76, 106);

  const colors = ['#54d4d0', '#ff5a36', '#ffce61'];
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = colors[k];
    ctx.lineWidth = k === 0 ? 3 : 1.5;
    ctx.globalAlpha = k === 0 ? 1 : 0.62;
    ctx.beginPath();
    for (let x = 0; x <= 640; x += 8) {
      const base = 260 + k * 46;
      const y =
        base -
        Math.sin(x * 0.013 + k * 1.4 + variant) * 32 -
        Math.sin(x * 0.037 + k) * 12 -
        (x > 420 ? Math.cos(x * 0.021) * 24 : 0);
      if (x === 0) ctx.moveTo(48 + x, y);
      else ctx.lineTo(48 + x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(232,238,233,0.14)';
  ctx.beginPath();
  ctx.moveTo(48, 355);
  ctx.lineTo(720, 355);
  ctx.stroke();

  ctx.fillStyle = '#e8eee9';
  ctx.font = '800 96px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText(variant ? '1:18.402' : '312', 48, 464);
  ctx.fillStyle = 'rgba(110,216,210,0.6)';
  ctx.font = '500 26px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText(variant ? 'LAP DELTA   -0.284' : 'KM/H   /   GEAR 8', 48, 494);

  ctx.fillStyle = 'rgba(7,17,20,0.85)';
  ctx.fillRect(760, 145, 216, 270);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.strokeRect(760, 145, 216, 270);
  ctx.fillStyle = 'rgba(232,238,233,0.55)';
  ctx.font = '500 18px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText('POWER UNIT', 784, 182);
  ctx.fillStyle = '#ff5a36';
  ctx.font = '700 72px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText(variant ? '68' : '82', 784, 262);
  ctx.fillStyle = '#e8eee9';
  ctx.font = '500 22px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.fillText('°C  COOLANT', 784, 292);
  ctx.fillStyle = 'rgba(232,238,233,0.16)';
  ctx.fillRect(784, 328, 158, 2);
  ctx.fillStyle = '#54d4d0';
  ctx.fillRect(784, 320, 112, 20);
  ctx.fillStyle = '#081012';
  ctx.font = '700 15px Bahnschrift, sans-serif';
  ctx.fillText('ENERGY 78%', 792, 336);
  return canvasTexture(c);
}

export function backlitSignTexture() {
  const c = makeCanvas(1600, 360);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, '#0b1517');
  g.addColorStop(1, '#081012');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1600, 360);
  ctx.strokeStyle = 'rgba(102,225,218,0.12)';
  ctx.strokeRect(8, 8, 1584, 344);
  ctx.fillStyle = '#ece7dc';
  ctx.font = '900 188px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textBaseline = 'middle';
  spacedText(ctx, 'AETHON', 108, 178, 17);
  ctx.fillStyle = '#ff4022';
  ctx.fillRect(112, 278, 430, 9);
  ctx.fillStyle = 'rgba(236,231,220,0.52)';
  ctx.font = '500 30px Bahnschrift, "Arial Narrow", sans-serif';
  spacedText(ctx, 'RACE OPERATIONS  /  BAY 01', 115, 318, 8);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(236,231,220,0.35)';
  ctx.font = '500 24px Bahnschrift, sans-serif';
  ctx.fillText('AETHON MOTORSPORT GmbH  ·  HINWIL', 1480, 318);
  return canvasTexture(c);
}

export function shadowTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 124);
  g.addColorStop(0, 'rgba(0,0,0,0.92)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = canvasTexture(c);
  return tex;
}

export function lightShaftTexture() {
  const c = makeCanvas(128, 512);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, 'rgba(205,235,238,0.28)');
  g.addColorStop(0.35, 'rgba(150,210,220,0.10)');
  g.addColorStop(1, 'rgba(120,190,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 512);
  const h = ctx.createLinearGradient(0, 0, 128, 0);
  h.addColorStop(0, 'rgba(0,0,0,1)');
  h.addColorStop(0.25, 'rgba(0,0,0,0)');
  h.addColorStop(0.75, 'rgba(0,0,0,0)');
  h.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 128, 512);
  return canvasTexture(c);
}

export function cableTexture() {
  const c = makeCanvas(256, 64);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e86421';
  ctx.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, 0, 3, 64);
  }
  const tex = canvasTexture(c, { repeat: [6, 1] });
  return tex;
}

export function displayGlyphsTexture() {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.translate(256, 256);
  ctx.strokeStyle = 'rgba(255,64,34,0.6)';
  ctx.lineWidth = 2;
  for (let r = 80; r < 240; r += 32) {
    ctx.globalAlpha = 1 - r / 320;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.6, 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI + 0.6, Math.PI + 2.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(245,240,230,0.82)';
  ctx.font = '700 44px Bahnschrift, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('01', 0, 16);
  const tex = canvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
