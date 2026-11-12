const MODES = {
  full: {
    title: 'FULL<br />ASSEMBLY',
    kicker: 'CHASSIS 066 / ROSSO CORSA',
    cn: '整车展示',
    desc: '2022 赛季 Ferrari F1-75 的真实外形，完整呈现 18 英寸轮组、地面效应底板与 Rosso Corsa 单体壳。',
    specs: [
      ['CHASSIS', 'CFRP MONOCOQUE'],
      ['POWER UNIT', '1.6L V6 TURBO HYBRID'],
      ['GEARBOX', '8-SPEED'],
      ['WHEELBASE', '3.60 M'],
    ],
    state: 'STATIC SHOWROOM / BAY 01',
    aside: null,
  },
  cutaway: {
    title: 'CUT<br />AWAY',
    kicker: 'CUT PLANE / X +0.26 M',
    cn: '工程剖视',
    desc: '右舷车身沿纵向剖开，V6 混合动力单元、能量储存、侧箱散热器与座舱结构在碳纤维外壳下逐层显露。',
    specs: [
      ['CUT PLANE', 'X +0.26 M'],
      ['POWER UNIT', '1.6L V6 / 066'],
      ['ENERGY STORE', '4 MJ'],
      ['COOLING', '2 RADIATORS'],
    ],
    state: 'CUTAWAY / SYSTEMS EXPOSED',
    aside: {
      kicker: 'SYSTEMS OVERVIEW',
      count: '04',
      foot: 'CUT X +0.26 M / SHOW CAR',
      rows: [
        ['01', 'POWER UNIT', 'V6 + MGU-K'],
        ['02', 'ENERGY STORE', '4 MJ BATTERY'],
        ['03', 'RADIATOR', 'SIDEPOD CORE'],
        ['04', 'COCKPIT CELL', 'DRIVER SURVIVAL'],
      ],
    },
  },
  systems: {
    title: 'SYSTEMS<br />X-RAY',
    kicker: 'GHOST SHELL / SYSTEMS LIVE',
    cn: '系统透视',
    desc: '车身以半透明幽灵材质呈现，动力总成、储能、冷却回路与座舱骨骼同时可见，用于阅读整车系统关系。',
    specs: [
      ['BODY', 'GHOST / 18%'],
      ['POWER UNIT', '1.6L V6'],
      ['ENERGY STORE', '4 MJ'],
      ['MASS', '798 KG'],
    ],
    state: 'SYSTEMS / GHOST SHELL',
    aside: {
      kicker: 'SYSTEMS OVERVIEW',
      count: '04',
      foot: 'GHOST SHELL / SHOW CAR',
      rows: [
        ['01', 'POWER UNIT', 'V6 + TURBO'],
        ['02', 'ENERGY STORE', 'HV BATTERY'],
        ['03', 'COOLING', 'RADIATOR CORE'],
        ['04', 'COCKPIT', 'DRIVER CELL'],
      ],
    },
  },
  detail: {
    title: 'DETAIL<br />STUDY',
    kicker: 'FRONT CORNER / 18 INCH',
    cn: '细节研究',
    desc: '贴近前翼、轮组、碳陶制动与推杆悬挂，观察 2022 规则下的机械细节与 Rosso Corsa 表面处理。',
    specs: [
      ['FRONT WING', '4-ELEMENT'],
      ['WHEELS', '18 INCH'],
      ['BRAKES', 'CARBON CERAMIC'],
      ['SUSPENSION', 'PUSHROD'],
    ],
    state: 'DETAIL / FRONT CORNER',
    aside: {
      kicker: 'DETAIL STUDY',
      count: '04',
      foot: 'FRONT CORNER / CLOSE UP',
      rows: [
        ['01', 'FRONT WING', '4-ELEMENT'],
        ['02', 'WHEEL', '18 INCH'],
        ['03', 'BRAKE', 'CARBON'],
        ['04', 'SUSPENSION', 'PUSHROD'],
      ],
    },
  },
};

const PINS = [
  { key: 'power', n: '01', label: 'POWER UNIT', cn: '动力单元' },
  { key: 'battery', n: '02', label: 'ENERGY STORE', cn: '储能' },
  { key: 'radiator', n: '03', label: 'RADIATOR', cn: '散热器' },
  { key: 'cockpit', n: '04', label: 'COCKPIT', cn: '座舱' },
];

export class ShowcaseUI {
  constructor({ onMode, onReset } = {}) {
    this.onMode = onMode;
    this.onReset = onReset;
    this.mode = 'full';
    this.$ = (id) => document.getElementById(id);
    this.modeButtons = [...document.querySelectorAll('.mode-btn')];
    this.intro = document.querySelector('.intro');
    this.aside = this.$('asidePanel');
    this.pinsEl = this.$('pins');
    this.credits = this.$('creditsModal');
    this.loader = this.$('loader');
    this.toastEl = this.$('toast');
    this.pinEls = new Map();
    this.buildPins();
    this.bind();
    this.setMode('full', false);
  }

  buildPins() {
    for (const data of PINS) {
      const el = document.createElement('div');
      el.className = 'pin';
      el.dataset.pin = data.key;
      el.title = `${data.label} / ${data.cn}`;
      el.innerHTML = `<i>${data.n}</i>`;
      this.pinsEl.appendChild(el);
      this.pinEls.set(data.key, el);
    }
  }

  bind() {
    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });
    this.$('resetView').addEventListener('click', () => this.onReset?.());
    this.$('creditsBtn').addEventListener('click', () => this.openCredits());
    this.$('creditsClose').addEventListener('click', () => this.closeCredits());
    this.$('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
    this.credits.addEventListener('click', (e) => {
      if (e.target === this.credits) this.closeCredits();
    });
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (this.credits.classList.contains('is-open')) this.closeCredits();
        return;
      }
      if (this.credits.classList.contains('is-open')) return;
      if (e.key === '1') this.setMode('full');
      if (e.key === '2') this.setMode('cutaway');
      if (e.key === '3') this.setMode('systems');
      if (e.key === '4') this.setMode('detail');
      if (e.key.toLowerCase() === 'r') this.onReset?.();
      if (e.key.toLowerCase() === 'i') this.openCredits();
      if (e.key.toLowerCase() === 'f') this.toggleFullscreen();
    });
  }

  setProgress(p) {
    const pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
    this.$('loaderBar').style.width = `${pct}%`;
    this.$('loaderPct').textContent = String(pct).padStart(2, '0');
  }

  ready() {
    this.setProgress(1);
    this.loader.classList.add('is-done');
    this.intro.classList.add('is-ready');
    setTimeout(() => { this.loader.style.display = 'none'; }, 1100);
  }

  error(message) {
    this.$('loaderPct').textContent = '--';
    const meta = this.loader.querySelector('.loader-meta span');
    if (meta) meta.textContent = `LOAD ERROR / ${message}`;
    this.showToast('MODEL LOAD FAILED');
  }

  setMode(mode, notify = true) {
    if (!MODES[mode]) return;
    this.mode = mode;
    const data = MODES[mode];
    this.modeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === mode));
    this.$('modeKicker').textContent = data.kicker;
    this.$('modeTitle').innerHTML = data.title;
    this.$('modeCn').textContent = data.cn;
    this.$('modeDesc').textContent = data.desc;
    this.$('modeState').textContent = data.state;
    this.renderSpecs(data.specs);
    this.renderAside(data.aside);
    this.pinsEl.style.display = (mode === 'cutaway' || mode === 'systems') ? '' : 'none';
    if (notify) this.onMode?.(mode);
  }

  renderSpecs(specs) {
    const grid = this.$('specGrid');
    grid.innerHTML = specs.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
  }

  renderAside(aside) {
    if (!aside) {
      this.aside.setAttribute('aria-hidden', 'true');
      return;
    }
    this.aside.setAttribute('aria-hidden', 'false');
    this.$('asideKicker').textContent = aside.kicker;
    this.$('asideCount').textContent = aside.count;
    this.$('asideFoot').textContent = aside.foot;
    this.$('asideList').innerHTML = aside.rows.map(([n, label, meta]) => (
      `<li><span class="n">${n}</span><span>${label}</span><em>${meta}</em></li>`
    )).join('');
  }

  updatePins(points, camera) {
    if (this.mode !== 'cutaway' && this.mode !== 'systems') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const data of PINS) {
      const el = this.pinEls.get(data.key);
      const point = points[data.key];
      if (!el || !point) { if (el) el.classList.remove('is-on'); continue; }
      const p = point.clone().project(camera);
      const on = p.z > -1 && p.z < 1 && p.x > -0.94 && p.x < 0.94 && p.y > -0.86 && p.y < 0.9;
      if (!on) { el.classList.remove('is-on'); continue; }
      const x = (p.x * 0.5 + 0.5) * w;
      const y = (-p.y * 0.5 + 0.5) * h;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.classList.add('is-on');
    }
  }

  openCredits() {
    this.credits.classList.add('is-open');
    this.$('creditsClose').focus({ preventScroll: true });
  }

  closeCredits() {
    this.credits.classList.remove('is-open');
    this.$('creditsBtn').focus({ preventScroll: true });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('is-on'), 2200);
  }
}
