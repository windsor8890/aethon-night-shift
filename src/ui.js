const q = (id) => document.getElementById(id);

export class FilmUI {
  constructor({ chapters = [], duration = 35, onPlay, onSkip, onReplay, onExplore, onGarage, onSound, onFullscreen } = {}) {
    this.chapters = chapters;
    this.duration = duration;
    this.callbacks = { onPlay, onSkip, onReplay, onExplore, onGarage, onSound, onFullscreen };
    this.app = q('app');
    this.loader = q('loader');
    this.landing = q('landing');
    this.filmHud = q('filmHud');
    this.endCard = q('endCard');
    this.exploreHud = q('exploreHud');
    this.chapterCard = q('chapterCard');
    this.cinemaTitle = q('cinemaTitle');
    this.progressFill = q('progressFill');
    this.progressHead = q('progressHead');
    this.progressMarks = q('progressMarks');
    this.timeEl = q('filmTime');
    this.speedEl = q('speedValue');
    this.gearEl = q('gearValue');
    this.throttleEl = q('throttleFill');
    this.modeEl = q('telemMode');
    this.telemetryEl = q('filmTelemetry');
    this.soundLabel = q('soundLabel');
    this.soundDot = q('soundDot');
    this.toastEl = q('toast');
    this.creditsModal = q('creditsModal');
    this.fadeBlack = q('fadeBlack');
    this.flashEl = q('cutFlash');
    this.chapterTimer = 0;
    this.toastTimer = 0;
    this.soundOn = true;

    this._wire();
    this._buildMarks();
  }

  _wire() {
    q('playBtn').addEventListener('click', () => this.callbacks.onPlay?.());
    q('freeLookBtn').addEventListener('click', () => this.callbacks.onExplore?.('garage'));
    q('skipBtn').addEventListener('click', () => this.callbacks.onSkip?.());
    q('replayBtn').addEventListener('click', () => this.callbacks.onReplay?.());
    q('exploreBtn').addEventListener('click', () => this.callbacks.onExplore?.('track'));
    q('garageBtn').addEventListener('click', () => this.callbacks.onGarage?.());
    q('exploreReplay').addEventListener('click', () => this.callbacks.onReplay?.());
    q('exploreGarage').addEventListener('click', () => this.callbacks.onGarage?.());
    q('soundToggle').addEventListener('click', () => this.toggleSound());
    q('filmSound').addEventListener('click', () => this.toggleSound());
    q('fullscreenBtn').addEventListener('click', () => this.callbacks.onFullscreen?.());
    q('creditsBtn').addEventListener('click', () => this.openCredits());
    q('creditsBtn2').addEventListener('click', () => this.openCredits());
    q('closeCredits').addEventListener('click', () => this.closeCredits());
    this.creditsModal.addEventListener('click', (e) => {
      if (e.target === this.creditsModal) this.closeCredits();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.creditsModal.classList.contains('is-open')) this.closeCredits();
      }
    });
  }

  _buildMarks() {
    this.progressMarks.innerHTML = '';
    for (const chapter of this.chapters) {
      const mark = document.createElement('i');
      mark.style.left = `${(chapter.at / this.duration) * 100}%`;
      this.progressMarks.appendChild(mark);
    }
  }

  setLoading(progress, message) {
    const pct = Math.max(0, Math.min(1, progress));
    q('loadFill').style.width = `${(pct * 100).toFixed(1)}%`;
    q('loadPercent').textContent = `${Math.round(pct * 100)}%`;
    if (message) q('loadMessage').textContent = message;
  }

  ready() {
    this.app.classList.remove('is-loading');
    this.setLoading(1, 'SYSTEMS READY');
  }

  showLanding() {
    this.app.classList.remove('is-loading', 'is-cinema', 'is-end', 'is-explore');
    this.app.classList.add('is-ready');
    this.filmHud.setAttribute('aria-hidden', 'true');
    this.endCard.setAttribute('aria-hidden', 'true');
    this.exploreHud.classList.remove('is-visible');
    this.exploreHud.setAttribute('aria-hidden', 'true');
    this.fadeBlack.classList.remove('on');
    this.chapterCard.classList.remove('is-visible');
    this.cinemaTitle.classList.remove('is-visible');
    this.telemetryEl.classList.remove('is-visible');
  }

  startCinema() {
    this.app.classList.remove('is-end', 'is-explore');
    this.app.classList.add('is-cinema');
    this.filmHud.setAttribute('aria-hidden', 'false');
    this.endCard.setAttribute('aria-hidden', 'true');
    this.exploreHud.classList.remove('is-visible');
    this.fadeBlack.classList.remove('on');
    this.telemetryEl.classList.remove('is-visible');
    this.chapterCard.classList.remove('is-visible');
    this.cinemaTitle.classList.remove('is-visible');
  }

  showIntroTitle(show) {
    this.cinemaTitle.classList.toggle('is-visible', !!show);
  }

  showChapter(index, { popup = true } = {}) {
    const c = this.chapters[index] || this.chapters[0];
    if (!c) return;
    q('filmChapterNum').textContent = c.id;
    q('filmChapterName').textContent = c.title;
    q('filmChapterCn').textContent = c.cn;
    q('chapterCardNum').textContent = c.id;
    q('chapterCardTitle').textContent = c.title;
    q('chapterCardCn').textContent = c.line;
    q('progressChapter').textContent = `${c.id} / ${c.title}`;
    if (popup) {
      this.chapterCard.classList.add('is-visible');
      clearTimeout(this.chapterTimer);
      this.chapterTimer = setTimeout(() => this.chapterCard.classList.remove('is-visible'), 2750);
    }
  }

  setFilmTime(time) {
    const t = Math.max(0, Math.min(this.duration, time));
    this.timeEl.textContent = formatTime(t);
    const pct = (t / this.duration) * 100;
    this.progressFill.style.width = `${pct}%`;
    this.progressHead.style.left = `${pct}%`;
    q('progressTime').textContent = `${formatTime(t)} — ${formatTime(this.duration)}`;
  }

  setTelemetry({ speed = 0, gear = 'N', throttle = 0, mode = 'GARAGE / IDLE', visible = false } = {}) {
    this.speedEl.textContent = String(Math.round(speed)).padStart(3, '0');
    this.gearEl.textContent = gear;
    this.throttleEl.style.width = `${Math.max(0, Math.min(1, throttle)) * 100}%`;
    this.modeEl.textContent = mode;
    this.telemetryEl.classList.toggle('is-visible', !!visible);
  }

  cutFlash() {
    this.flashEl.classList.add('on');
    setTimeout(() => this.flashEl.classList.remove('on'), 55);
  }

  fadeOut() {
    this.fadeBlack.classList.add('on');
  }

  showEnd() {
    this.app.classList.remove('is-explore');
    this.app.classList.add('is-end');
    this.fadeBlack.classList.add('on');
    this.endCard.setAttribute('aria-hidden', 'false');
    this.filmHud.setAttribute('aria-hidden', 'true');
    this.chapterCard.classList.remove('is-visible');
    this.telemetryEl.classList.remove('is-visible');
  }

  showExplore() {
    this.app.classList.remove('is-cinema', 'is-end');
    this.app.classList.add('is-explore');
    this.fadeBlack.classList.remove('on');
    this.endCard.setAttribute('aria-hidden', 'true');
    this.filmHud.setAttribute('aria-hidden', 'true');
    this.exploreHud.classList.add('is-visible');
    this.exploreHud.setAttribute('aria-hidden', 'false');
    this.telemetryEl.classList.remove('is-visible');
  }

  toggleSound(force) {
    this.soundOn = typeof force === 'boolean' ? force : !this.soundOn;
    this.soundLabel.textContent = this.soundOn ? 'SOUND ON' : 'MUTED';
    this.soundDot.classList.toggle('on', this.soundOn);
    const filmSound = q('filmSound');
    if (filmSound) {
      filmSound.textContent = this.soundOn ? 'SOUND ON' : 'MUTED';
      filmSound.classList.toggle('is-muted', !this.soundOn);
    }
    this.callbacks.onSound?.(this.soundOn);
    return this.soundOn;
  }

  openCredits() {
    this.creditsModal.classList.add('is-open');
    this.creditsModal.setAttribute('aria-hidden', 'false');
  }

  closeCredits() {
    this.creditsModal.classList.remove('is-open');
    this.creditsModal.setAttribute('aria-hidden', 'true');
  }

  toast(text, ms = 2200) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('is-visible'), ms);
  }
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
