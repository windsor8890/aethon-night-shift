export class LaunchAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineGain = null;
    this.windGain = null;
    this.padGain = null;
    this.doorGain = null;
    this.started = false;
    this.muted = false;
    this.lastRpm = 0;
    this.lastSpeed = 0;
    this.engineStarted = false;
    this.lastTime = 0;
    this.doorWasOpen = false;
    this.lastDoor = 0;
    this.nodes = [];
  }

  get enabled() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.38;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.25;
    master.connect(compressor).connect(ctx.destination);
    this.master = master;

    // a long synthetic room for the garage / dawn circuit
    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(2.8, 2.0);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.23;
    reverb.connect(reverbGain).connect(master);
    this.reverb = reverb;

    const noise = this.makeNoise(3.2);
    this.noiseBuffer = noise;

    // Engine: a firing-frequency saw plus detuned harmonics and a filtered
    // exhaust noise layer. The result is intentionally synthetic, but it has
    // the right mechanical pulse and turbo edge.
    const engineBus = ctx.createGain();
    engineBus.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 900;
    engineFilter.Q.value = 1.4;
    engineBus.connect(engineFilter);
    engineFilter.connect(master);
    const engineSend = ctx.createGain();
    engineSend.gain.value = 0.18;
    engineFilter.connect(engineSend).connect(reverb);
    this.engineBus = engineBus;
    this.engineFilter = engineFilter;

    const makeSaw = (type, detune, gain) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = 90;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(engineBus);
      osc.start();
      this.nodes.push(osc);
      return { osc, gain: g };
    };
    this.engineSaws = [
      makeSaw('sawtooth', -5, 0.23),
      makeSaw('sawtooth', 5, 0.2),
      makeSaw('triangle', 0, 0.08),
    ];
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 45;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.18;
    sub.connect(subGain).connect(engineBus);
    sub.start();
    this.nodes.push(sub);
    this.engineSub = { osc: sub, gain: subGain };

    // exhaust air
    const exhaust = ctx.createBufferSource();
    exhaust.buffer = noise;
    exhaust.loop = true;
    const exhaustFilter = ctx.createBiquadFilter();
    exhaustFilter.type = 'bandpass';
    exhaustFilter.frequency.value = 280;
    exhaustFilter.Q.value = 0.7;
    const exhaustGain = ctx.createGain();
    exhaustGain.gain.value = 0.0;
    exhaust.connect(exhaustFilter).connect(exhaustGain).connect(engineBus);
    exhaust.start();
    this.nodes.push(exhaust);
    this.exhaustGain = exhaustGain;
    this.exhaustFilter = exhaustFilter;

    // turbo / hybrid whine
    const turbo = ctx.createOscillator();
    turbo.type = 'sine';
    turbo.frequency.value = 1500;
    const turboGain = ctx.createGain();
    turboGain.gain.value = 0;
    turbo.connect(turboGain).connect(master);
    turbo.start();
    this.nodes.push(turbo);
    this.turbo = { osc: turbo, gain: turboGain };

    // wind and tyre roar
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'highpass';
    windFilter.frequency.value = 500;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start();
    this.nodes.push(wind);
    this.windGain = windGain;
    this.windFilter = windFilter;

    // low cinematic pad
    const padBus = ctx.createGain();
    padBus.gain.value = 0;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 220;
    padFilter.Q.value = 0.7;
    padBus.connect(padFilter).connect(master);
    const padSend = ctx.createGain();
    padSend.gain.value = 0.32;
    padFilter.connect(padSend).connect(reverb);
    const padFreqs = [55, 82.5, 110];
    this.padOscs = [];
    for (let i = 0; i < padFreqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = padFreqs[i];
      osc.detune.value = (i - 1) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.13 : 0.06;
      osc.connect(g).connect(padBus);
      osc.start();
      this.nodes.push(osc);
      this.padOscs.push(osc);
    }
    // slow filter movement for the pad
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(padFilter.frequency);
    lfo.start();
    this.nodes.push(lfo);
    this.padBus = padBus;
    this.padFilter = padFilter;

    this.started = true;
    return true;
  }

  makeImpulse(seconds, decay) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buffer = ctx.createBuffer(2, len, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.2);
      }
    }
    return buffer;
  }

  makeNoise(seconds) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, len, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06;
      data[i] = last * 3.8;
    }
    return buffer;
  }

  async startFilm() {
    if (this.muted) return;
    const ok = await this.init();
    if (!ok) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const now = this.ctx.currentTime;
    this.fade(this.engineBus.gain, 0.0001, 0.001, now);
    this.fade(this.master.gain, this.muted ? 0 : 0.38, 0.6, now);
    this.fade(this.padBus.gain, 0.55, 2.0, now);
    this.lastTime = 0;
    this.engineStarted = false;
    this.started = true;
    this.impact(now + 0.7, 0.18);
  }

  update({ time = 0, speed = 0, door = 0, engineOn = false, shot = '' } = {}) {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted) {
      this.lastTime = time;
      this.lastSpeed = speed;
      return;
    }
    const now = this.ctx.currentTime;
    const dt = Math.min(0.1, Math.max(0, time - this.lastTime));
    this.lastTime = time;

    if (engineOn && !this.engineStarted) {
      this.engineStarted = true;
      this.startEngine(now);
    }

    let rpm = 0;
    if (engineOn) {
      if (shot === 'launch') rpm = 6800 + Math.min(1, speed / 17) * 5100;
      else if (shot === 'speed' || shot === 'approach' || shot === 'escape') rpm = 12400 + Math.min(1, time / 35) * 900;
      else if (time > 10.35) rpm = 4200 + Math.sin(time * 3.2) * 250;
    }
    rpm = Math.max(0, rpm);
    const targetRpm = Math.min(14000, rpm);
    this.lastRpm += (targetRpm - this.lastRpm) * Math.min(1, dt * 3.2);
    const normalized = this.lastRpm / 14000;
    const firing = Math.max(38, this.lastRpm / 60 * 3);
    for (const saw of this.engineSaws) {
      this.ramp(saw.osc.frequency, firing * (saw.osc.type === 'triangle' ? 0.5 : 1), now, 0.08);
    }
    this.ramp(this.engineSub.osc.frequency, Math.max(28, firing * 0.25), now, 0.08);
    const engineLevel = engineOn ? 0.13 + normalized * 0.42 : 0.0001;
    this.ramp(this.engineBus.gain, engineLevel, now, 0.16);
    this.ramp(this.engineFilter.frequency, 700 + normalized * 2600, now, 0.12);
    this.ramp(this.exhaustGain.gain, engineOn ? 0.04 + normalized * 0.22 : 0.0001, now, 0.14);
    this.ramp(this.turbo.gain.gain, engineOn ? 0.002 + normalized * 0.03 : 0, now, 0.2);
    this.ramp(this.turbo.osc.frequency, 1400 + normalized * 3600, now, 0.3);

    const speedN = Math.min(1, speed / 22);
    this.lastSpeed += (speed - this.lastSpeed) * Math.min(1, dt * 2.2);
    const windLevel = speedN * 0.09 + (shot === 'escape' ? 0.015 : 0);
    this.ramp(this.windGain.gain, windLevel, now, 0.2);
    this.ramp(this.windFilter.frequency, 480 + speedN * 1600, now, 0.3);

    // door servo: short tactile rumble while the shutter travels
    if (door > 0.01 && this.lastDoor <= 0.01) this.doorStart(now);
    this.lastDoor = door;
    if (door > 0.01 && door < 0.98) {
      this.doorWasOpen = true;
      this.ramp(this.padFilter.frequency, 220 + door * 240, now, 0.2);
    } else if (door >= 0.98 && this.doorWasOpen) {
      this.doorWasOpen = false;
      this.whoosh(now, 0.22);
    }

    // pad opens into the track section
    const trackness = time > 22 ? 1 : time > 13 ? 0.55 : 0.2;
    this.ramp(this.padBus.gain, 0.38 + trackness * 0.35, now, 0.4);
    this.ramp(this.padFilter.frequency, 150 + trackness * 380, now, 0.5);
  }

  doorStart(now) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(88, now);
    motor.frequency.linearRampToValueAtTime(132, now + 1.2);
    motor.frequency.linearRampToValueAtTime(104, now + 2.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 2.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.008, now + 2.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
    motor.connect(filter).connect(gain).connect(this.master);
    motor.start(now);
    motor.stop(now + 3.2);

    const rumble = ctx.createBufferSource();
    rumble.buffer = this.noiseBuffer;
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 130;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, now);
    rg.gain.exponentialRampToValueAtTime(0.02, now + 0.25);
    rg.gain.exponentialRampToValueAtTime(0.0001, now + 2.9);
    rumble.connect(rf).connect(rg).connect(this.master);
    rumble.start(now);
    rumble.stop(now + 3.0);
  }

  startEngine(now) {
    const ctx = this.ctx;
    const starter = ctx.createOscillator();
    starter.type = 'sawtooth';
    starter.frequency.setValueAtTime(380, now);
    starter.frequency.exponentialRampToValueAtTime(950, now + 0.95);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.exponentialRampToValueAtTime(0.026, now + 0.15);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 840;
    f.Q.value = 2.5;
    starter.connect(f).connect(sg).connect(this.master);
    starter.start(now);
    starter.stop(now + 1.1);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(80, now + 0.85);
    thump.frequency.exponentialRampToValueAtTime(36, now + 1.45);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, now + 0.85);
    tg.gain.exponentialRampToValueAtTime(0.18, now + 0.92);
    tg.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    thump.connect(tg).connect(this.master);
    thump.start(now + 0.85);
    thump.stop(now + 1.9);

    this.impact(now + 0.9, 0.28);
  }

  impact(now, level = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.6);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(level, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc.connect(g).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  whoosh(now = this.ctx?.currentTime, level = 0.08) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(250, now);
    f.frequency.exponentialRampToValueAtTime(2400, now + 0.7);
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(level, now + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    src.connect(f).connect(g).connect(this.master);
    src.start(now);
    src.stop(now + 1.2);
  }

  endFilm() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.fade(this.engineBus.gain, 0.0001, 1.6, now);
    this.fade(this.windGain.gain, 0.0001, 1.0, now);
    this.fade(this.turbo.gain.gain, 0.0001, 1.0, now);
    this.fade(this.padBus.gain, 0.0001, 2.3, now);
    this.fade(this.master.gain, 0.0001, 2.0, now);
    this.engineStarted = false;
    this.pendingStop = true;
  }

  enterIdle() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.fade(this.master.gain, this.muted ? 0 : 0.32, 1.0, now);
    this.fade(this.padBus.gain, 0.18, 2.0, now);
    this.fade(this.engineBus.gain, 0.001, 1.8, now);
    this.fade(this.windGain.gain, 0.0001, 1.0, now);
    this.engineStarted = false;
    this.fade(this.turbo.gain.gain, 0.0001, 1.0, now);
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.fade(this.master.gain, this.muted ? 0.0001 : 0.38, 0.25, now);
  }

  ramp(param, value, now, time = 0.1) {
    if (!this.ctx) return;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, Math.max(0.01, time));
  }

  fade(param, value, time, now) {
    if (!this.ctx) return;
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(0.0001, param.value), now);
    param.exponentialRampToValueAtTime(Math.max(0.0001, value), now + Math.max(0.02, time));
  }

  uiClick() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}
