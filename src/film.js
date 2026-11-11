import * as THREE from 'three';

export const FILM_DURATION = 35;

export const CHAPTERS = [
  { id: '01', at: 0.0, title: 'NIGHT SHIFT', cn: '车库 / 沉睡', line: '发车之前，世界只剩引擎的呼吸。' },
  { id: '02', at: 3.6, title: 'THE MACHINE', cn: '机械 / 细节', line: '碳纤维、悬挂与轮胎，在冷光中显形。' },
  { id: '03', at: 9.8, title: 'IGNITION', cn: '点火 / 心跳', line: '1.6 升 V6 唤醒混动单元。' },
  { id: '04', at: 13.2, title: 'PIT EXIT', cn: '开门 / 穿越', line: '门升起，赛道的光涌进维修库。' },
  { id: '05', at: 23.0, title: 'FULL THROTTLE', cn: '赛道 / 晨光', line: '赛车向前，场景无缝化作赛道。' },
];

const clamp = THREE.MathUtils.clamp;
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const lerpV = (a, b, t) => v3(a).lerp(v3(b), t);

function carLaunchZ(lt) {
  const t = Math.max(0, lt);
  return 0.4 + 0.5 * t + 0.65 * t * t + 0.08 * t * t * t;
}
function carLaunchSpeed(lt) {
  const t = Math.max(0, lt);
  return 0.5 + 1.3 * t + 0.24 * t * t;
}

const SHOTS = [
  {
    id: 'rear', start: 0, end: 3.6, chapter: 0, flags: { flash: false },
    camera(lt, dur) {
      const t = smooth(lt / dur);
      return {
        pos: lerpV([3.15, 0.64, -5.65], [2.55, 0.78, -4.55], t),
        target: lerpV([0.18, 0.48, -2.15], [0.02, 0.54, -1.15], t),
        fov: lerp(42, 38, t),
        dof: 0.0055,
        speedBlur: 0,
        flare: 0,
        exposure: 0.60,
        shake: 0.0018,
      };
    },
  },
  {
    id: 'wing', start: 3.6, end: 6.8, chapter: 1, flags: { flash: false },
    camera(lt, dur) {
      const t = smooth(lt / dur);
      return {
        pos: lerpV([-3.15, 0.5, 4.55], [-2.35, 0.68, 3.75], t),
        target: lerpV([-0.05, 0.4, 2.35], [0, 0.45, 2.05], t),
        fov: lerp(34, 38, t),
        dof: 0.0055,
        speedBlur: 0,
        flare: 0,
        exposure: 0.61,
        shake: 0.0012,
      };
    },
  },
  {
    id: 'sidepod', start: 6.8, end: 9.8, chapter: 1, flags: { flash: false },
    camera(lt, dur) {
      const t = smooth(lt / dur);
      return {
        pos: lerpV([4.85, 0.92, -0.75], [4.3, 0.72, 1.35], t),
        target: lerpV([0, 0.5, -0.28], [0, 0.5, 0.32], t),
        fov: lerp(36, 34, t),
        dof: 0.006,
        speedBlur: 0,
        flare: 0,
        exposure: 0.61,
        shake: 0.0015,
      };
    },
  },
  {
    id: 'cockpit', start: 9.8, end: 13.2, chapter: 2, flags: { flash: false },
    camera(lt, dur) {
      const t = smooth(lt / dur);
      return {
        pos: lerpV([2.85, 1.95, 2.9], [2.05, 1.52, 2.2], t),
        target: lerpV([0, 0.63, 0.2], [0, 0.58, 0.13], t),
        fov: lerp(38, 34, t),
        dof: 0.0068,
        speedBlur: 0,
        flare: 0,
        exposure: 0.61,
        shake: 0.0018,
      };
    },
  },
  {
    id: 'door', start: 13.2, end: 17.0, chapter: 3, flags: { flash: false },
    camera(lt, dur) {
      const t = smooth(lt / dur);
      return {
        pos: lerpV([3.3, 2.22, -6.95], [2.7, 1.98, -6.2], t),
        target: lerpV([0, 0.96, 3.05], [0, 0.86, 3.55], t),
        fov: lerp(48.5, 47.0, t),
        dof: 0.0022,
        speedBlur: 0,
        flare: 0,
        exposure: 0.60,
        shake: 0.0025,
      };
    },
  },
  {
    id: 'launch', start: 17.0, end: 23.0, chapter: 3, flags: { flash: false },
    camera(lt) {
      const z = carLaunchZ(lt);
      const speed = carLaunchSpeed(lt);
      const outside = smooth((z - 7) / 42);
      return {
        pos: v3([2.18 + speed * 0.012, 1.23 + speed * 0.016, z - 5.65 - speed * 0.035]),
        target: v3([-0.08, 0.55 + speed * 0.002, z + 2.0]),
        fov: 47.5 - outside * 2.0,
        dof: 0.0018,
        speedBlur: 0.0008 + outside * 0.0026,
        flare: outside * 0.35,
        exposure: lerp(0.60, 0.62, outside),
        shake: 0.0024 + outside * 0.0022,
      };
    },
  },
  {
    id: 'speed', start: 23.0, end: 26.6, chapter: 4, flags: { flash: true, carZ: 40, speed: 17 },
    camera(lt) {
      const z = 40 + 17 * lt;
      return {
        pos: v3([5.3 + Math.sin(lt * 2.1) * 0.12, 1.35, z + 3.0]),
        target: v3([0.04, 0.5, z - 0.2]),
        fov: 38.0,
        dof: 0.0034,
        speedBlur: 0.0055,
        flare: 0.18,
        exposure: 0.61,
        shake: 0.0042,
      };
    },
  },
  {
    id: 'approach', start: 26.6, end: 29.9, chapter: 4, flags: { flash: true, carZ: 30, speed: 14 },
    camera(lt) {
      const z = 30 + 14 * lt;
      const camZ = 40 + 11.5 * lt;
      const gap = Math.max(0.4, camZ - z);
      return {
        pos: v3([2.55, 0.66, camZ]),
        target: v3([0.04, 0.52, z + 0.1]),
        fov: 34 + (1 - clamp(gap / 10, 0, 1)) * 6,
        dof: 0.004,
        speedBlur: 0.0018,
        flare: 0,
        exposure: 0.61,
        shake: 0.0034,
      };
    },
  },
  {
    id: 'escape', start: 29.9, end: 35.0, chapter: 4, flags: { flash: true, carZ: 26, speed: 16 },
    camera(lt, dur) {
      const z = 26 + 16 * lt;
      const t = smooth(lt / dur);
      return {
        pos: v3([1.9 + t * 1.1, 2.55 + t * 1.5, z - 7.0 - t * 0.7]),
        target: v3([0, 0.5, z + 9 + t * 4]),
        fov: 39 - t * 1.5,
        dof: 0.0022,
        speedBlur: 0.0032,
        flare: 0.5 + t * 0.2,
        exposure: 0.61,
        shake: 0.0034,
      };
    },
  },
];

export class LaunchFilm {
  constructor({ vehicle, garage, track, scene, camera, postfx, ui, audio, onFinish, onSkip, onChapter, onCut }) {
    this.vehicle = vehicle;
    this.garage = garage;
    this.track = track;
    this.scene = scene;
    this.camera = camera;
    this.postfx = postfx;
    this.ui = ui;
    this.audio = audio;
    this.onFinish = onFinish;
    this.onSkip = onSkip;
    this.onChapter = onChapter;
    this.onCut = onCut;
    this.time = 0;
    this.playing = false;
    this.finished = false;
    this.currentShot = -1;
    this.currentChapter = -1;
    this.wheelAngles = new Map();
    this.carZ = 0;
    this.carSpeed = 0;
    this.steer = 0;
    this.brakeMat = [...vehicle.materials.values()].find((m) => m.name === 'brake');
    this.exhaustMat = [...vehicle.materials.values()].find((m) => m.name === 'exhaust');
    this.lensExposure = 0.61;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.tmp3 = new THREE.Vector3();
    this.baseLightValues = null;
    this.introTitleHidden = false;
    this.fadeStarted = false;
    this.dofEnabled = true;
    this.onFinishCalled = false;
  }

  start() {
    this.time = 0;
    this.playing = true;
    this.finished = false;
    this.currentShot = -1;
    this.currentChapter = -1;
    this.introTitleHidden = false;
    this.fadeStarted = false;
    this.onFinishCalled = false;
    this.carZ = 0;
    this.carSpeed = 0;
    this.steer = 0;
    this.vehicle.root.position.set(0, -0.012, 0);
    this.vehicle.root.rotation.set(0, 0, 0);
    this.garage.setDoorOpen(0);
    this.garage.reflector.visible = true;
    this.track.setDaylight(0);
    this.track.setStartLights(false, 0);
    this.scene.fog.density = 0.0032;
    this.scene.fog.color.setHex(0x111417);
    this.postfx.compositeMat.uniforms.uShadowsWarm.value = 0;
    this.postfx.compositeMat.uniforms.uFlare.value = 0;
    this.postfx.compositeMat.uniforms.uDof.value = 0.0055;
    this.postfx.compositeMat.uniforms.uSpeedBlur.value = 0;
    this.captureBaseLights();
    this.ui.startCinema();
    this.ui.showChapter(0, { popup: false });
    this.ui.showIntroTitle(true);
    this.currentChapter = 0;
    this.playing = true;
    if (this.audio) this.audio.startFilm();
  }

  captureBaseLights() {
    if (this.baseLightValues) return;
    const lights = this.garage.lights;
    const entries = [];
    for (const key of ['key', 'key2', 'rimRed', 'rimCoolFront', 'warmKicker', 'frontKey', 'frontCool', 'signGlow']) {
      const l = lights[key];
      if (l) entries.push([l, l.intensity]);
    }
    for (const l of lights.area || []) entries.push([l, l.intensity]);
    this.baseLightValues = entries;
  }

  setInteriorLight(scale, time) {
    if (!this.baseLightValues) return;
    let s = scale;
    if (time < 2.1) {
      const flicker = 0.82 + Math.sin(time * 44) * 0.1 + Math.sin(time * 17.3) * 0.08;
      s *= 0.35 + 0.65 * smooth((time - 0.25) / 1.65) * flicker;
    }
    for (const [light, base] of this.baseLightValues) light.intensity = base * s;
  }

  restoreLighting() {
    if (!this.baseLightValues) return;
    for (const [light, base] of this.baseLightValues) light.intensity = base;
  }

  setChapter(index) {
    if (index === this.currentChapter) return;
    this.currentChapter = index;
    this.onChapter?.(index);
    this.ui.showChapter(index, { popup: index !== 1 });
  }

  findShot(t) {
    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i];
      if (t >= s.start && t < s.end) return i;
    }
    return SHOTS.length - 1;
  }

  update(dt) {
    if (!this.playing) return;
    this.time = Math.min(FILM_DURATION, this.time + dt);
    const t = this.time;
    const shotIndex = this.findShot(t);
    const shot = SHOTS[shotIndex];
    const changed = shotIndex !== this.currentShot;
    if (changed) {
      this.currentShot = shotIndex;
      const flags = shot.flags || {};
      if (flags.carZ != null) this.carZ = flags.carZ;
      if (flags.flash) {
        this.ui.cutFlash();
        this.audio?.whoosh?.();
      }
      this.onCut?.(shotIndex);
    }

    // chapter state
    const chapter = shot.chapter;
    this.setChapter(chapter);

    // car motion
    const local = t - shot.start;
    const duration = shot.end - shot.start;
    if (shot.id === 'launch') {
      this.carZ = carLaunchZ(local);
      this.carSpeed = carLaunchSpeed(local);
    } else if (shot.id === 'speed') {
      this.carZ = 40 + 17 * local;
      this.carSpeed = 17;
    } else if (shot.id === 'approach') {
      this.carZ = 30 + 14 * local;
      this.carSpeed = 14;
    } else if (shot.id === 'escape') {
      this.carZ = 26 + 16 * local;
      this.carSpeed = 16;
    } else if (shot.id === 'door') {
      // tiny creep as the door finishes opening
      const creep = smooth((local - 2.4) / 1.2) * 0.38;
      this.carZ = creep;
      this.carSpeed = local > 2.4 && local < 3.8 ? 0.32 : 0;
    } else {
      this.carZ = 0;
      this.carSpeed = 0;
    }

    const engineOn = t > 10.35;
    this.poseCar(dt, t, engineOn);
    this.updateWorld(t, dt);
    this.applyCamera(shot, local, duration, t);

    // HUD
    const chapterData = CHAPTERS[chapter];
    if (chapterData) {
      this.ui.setFilmTime(t);
      const showTelemetry = t > 16.7;
      let hudSpeed = 0;
      let gear = 'N';
      let throttle = 0;
      let mode = 'GARAGE / IDLE';
      if (shot.id === 'launch') {
        hudSpeed = clamp((t - 17) / 5.7, 0, 1) * 205;
        gear = hudSpeed > 135 ? '4' : hudSpeed > 75 ? '3' : hudSpeed > 20 ? '2' : '1';
        throttle = 0.18 + smooth((t - 17) / 5.2) * 0.7;
        mode = 'PIT EXIT / LAUNCH';
      } else if (shot.id === 'speed') {
        hudSpeed = 246 + smooth(local / 3.6) * 42;
        gear = '6';
        throttle = 0.88;
        mode = 'CIRCUIT / PULL';
      } else if (shot.id === 'approach') {
        hudSpeed = 289 + smooth(local / 3.3) * 28;
        gear = '7';
        throttle = 0.94;
        mode = 'CIRCUIT / PUSH';
      } else if (shot.id === 'escape') {
        hudSpeed = 306 + smooth(local / 5) * 24;
        gear = '8';
        throttle = 0.97;
        mode = 'CIRCUIT / MAX';
      }
      this.ui.setTelemetry({ speed: hudSpeed, gear, throttle, mode, visible: showTelemetry });
    }

    if (t > 33.35 && !this.fadeStarted) {
      this.fadeStarted = true;
      this.ui.fadeOut();
      this.audio?.endFilm();
    }
    if (!this.introTitleHidden && t > 2.5) {
      this.introTitleHidden = true;
      this.ui.showIntroTitle(false);
    }
    if (this.audio) {
      this.audio.update({
        time: t,
        speed: this.carSpeed,
        door: this.garage.door.position.y / (this.garage.doorHeight + 0.06),
        engineOn,
        shot: shot.id,
      });
    }
    if (t >= FILM_DURATION - 0.001) this.finish();
  }

  poseCar(dt, time, engineOn) {
    const car = this.vehicle;
    const speed = this.carSpeed;
    const baseY = -0.012;
    const speedFactor = clamp(speed / 18, 0, 1);
    const idleVibe = engineOn && speed < 2 ? 0.0018 : 0;
    const roadVibe = speedFactor * 0.0024;
    const vibe = idleVibe + roadVibe;
    const y = baseY + Math.sin(time * 31.0) * vibe + Math.sin(time * 17.0 + 1.7) * vibe * 0.5;
    car.root.position.set(0, y, this.carZ);
    const pitch = -smooth(clamp((this.time - 17) / 3, 0, 1)) * 0.0045 + Math.sin(time * 21) * vibe * 0.04;
    car.root.rotation.x = pitch;
    car.root.rotation.z = Math.sin(time * 19.2) * vibe * 0.15;

    for (const wheel of car.wheels) {
      const key = wheel.key;
      if (!this.wheelAngles.has(key)) this.wheelAngles.set(key, 0);
      let a = this.wheelAngles.get(key);
      a += (speed / wheel.radius) * dt;
      this.wheelAngles.set(key, a);
      wheel.spin.rotation.x = a;
      wheel.steer.rotation.y = wheel.front ? this.steer : 0;
    }
    this.steer *= 0.94;

    if (this.brakeMat) this.brakeMat.emissiveIntensity = 0.12 + speedFactor * 0.55 + (engineOn ? 0.03 : 0);
    if (this.exhaustMat) {
      const flicker = 0.55 + Math.sin(time * 37.4) * 0.18 + Math.sin(time * 91.2) * 0.08;
      this.exhaustMat.emissiveIntensity = (engineOn ? 0.45 + speedFactor * 0.7 : 0.1) * flicker;
    }
    if (car.rainLight) {
      car.rainLight.glow.material.opacity = (engineOn ? 0.5 : 0.28) + Math.sin(time * 8.4) * 0.08;
    }
    if (car.driver) {
      car.driver.position.y = Math.sin(time * 20.5) * vibe * 0.15;
    }
  }

  updateWorld(time, dt) {
    const door = smooth((time - 12.45) / 3.2);
    this.garage.setDoorOpen(door);
    const outside = smooth((time - 12.8) / 4.7);
    this.track.setDaylight(outside * 0.95);
    this.track.setStartLights(outside > 0.35, outside > 0.35 ? 5 : 0);
    const lightLevel = time < 18 ? 1 : 1 - smooth((time - 18) / 3.7) * 0.55;
    this.setInteriorLight(lightLevel, time);

    const fog = this.scene.fog;
    fog.density = lerp(0.0032, 0.00215, outside);
    fog.color.lerpColors(this.fogCold || (this.fogCold = new THREE.Color(0x111417)), this.fogWarm || (this.fogWarm = new THREE.Color(0x8f6c59)), outside);
    this.garage.reflector.visible = this.camera.position.z < 10.2 || time < 13.0;

    // exterior flares become physically sensible only past the threshold
    const cameraOutside = this.camera.position.z > 9.2;
    this.postfx.compositeMat.uniforms.uShadowsWarm.value = outside * 0.75;
    this.postfx.compositeMat.uniforms.uStreak.value = lerp(0.16, 0.28, outside);
  }

  applyCamera(shot, local, duration, time) {
    const cam = shot.camera(local, duration, this.carZ);
    let pos = cam.pos;
    let target = cam.target;
    let fov = cam.fov;
    if (this.camera.aspect < 0.85) {
      const k = Math.min(0.48, 0.85 - this.camera.aspect);
      let scale = 1.0;
      let fovScale = 1.0;
      if (shot.id === 'speed' || shot.id === 'approach' || shot.id === 'escape') {
        scale = 1.35 + k * 1.25;
        fovScale = 1.12 + k * 0.58;
      } else if (shot.id === 'door' || shot.id === 'launch') {
        scale = 1.0;
        fovScale = 1.14 + k * 0.8;
      } else {
        scale = 1.1 + k * 0.52;
        fovScale = 1.08 + k * 0.34;
      }
      target = target.clone();
      pos = target.clone().add(pos.clone().sub(target).multiplyScalar(scale));
      fov = Math.min(70, fov * fovScale);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    const engineVibe = time > 10.35 && this.carSpeed < 2 ? 0.0007 : 0;
    const amp = (cam.shake || 0) + engineVibe + clamp(this.carSpeed / 60, 0, 0.0032);
    this.camera.position.x += Math.sin(time * 27.3) * amp + Math.sin(time * 8.1 + 1.4) * amp * 0.45;
    this.camera.position.y += Math.sin(time * 21.7 + 0.7) * amp * 0.65;
    this.camera.rotation.z += Math.sin(time * 18.9) * amp * 0.18;
    this.camera.rotation.x += Math.sin(time * 23.1 + 2.1) * amp * 0.1;

    const u = this.postfx.compositeMat.uniforms;
    u.uDof.value = this.dofEnabled ? cam.dof : 0;
    u.uSpeedBlur.value = cam.speedBlur || 0;
    u.uExposure.value = cam.exposure;
    u.uShadowsWarm.value = Math.max(u.uShadowsWarm.value, cam.exposure > 0.66 ? 0.6 : 0);
    u.uStreak.value = lerp(0.16, 0.28, smooth((time - 13) / 5));

    // focus for radial speed blur sits on the car
    this.tmp.set(0, 0.55, this.carZ).project(this.camera);
    u.uFocus.value.set(this.tmp.x * 0.5 + 0.5, this.tmp.y * 0.5 + 0.5);

    // projected sun flare
    const sun = this.track.sunSprite.getWorldPosition(this.tmp2);
    const toward = this.tmp3.copy(sun).sub(this.camera.position).normalize();
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    const facing = toward.dot(forward);
    if (facing > 0 && this.camera.position.z > 8.5 && (cam.flare || 0) > 0.001) {
      this.tmp.copy(sun).project(this.camera);
      const sx = this.tmp.x * 0.5 + 0.5;
      const sy = this.tmp.y * 0.5 + 0.5;
      const inView = clamp(1 - Math.max(0, Math.abs(sx - 0.5) - 0.45) * 4, 0, 1)
        * clamp(1 - Math.max(0, Math.abs(sy - 0.5) - 0.45) * 4, 0, 1);
      u.uSun.value.set(sx, sy);
      u.uFlare.value = cam.flare * inView;
    } else {
      u.uFlare.value = 0;
    }
    this.lensExposure = cam.exposure;
  }

  landingCamera(time) {
    const t = time;
    const drift = Math.sin(t * 0.07) * 0.24;
    const breathe = Math.sin(t * 0.045 + 0.5) * 0.12;
    if (this.camera.aspect < 0.82) {
      this.camera.position.set(6.35 + drift * 0.5, 2.55 + breathe, 7.35);
      this.camera.lookAt(-0.1 + drift * 0.2, 0.55, 0.1);
      this.camera.fov = 59;
    } else {
      this.camera.position.set(4.05 + drift, 1.52 + breathe, 5.5 + Math.cos(t * 0.055) * 0.12);
      this.camera.lookAt(-0.22 + drift * 0.35, 0.56, 0.18);
      this.camera.fov = 40;
    }
    this.camera.updateProjectionMatrix();
    const u = this.postfx.compositeMat.uniforms;
    u.uDof.value = 0.003;
    u.uSpeedBlur.value = 0;
    u.uExposure.value = 0.595;
    u.uFlare.value = 0;
    u.uShadowsWarm.value = 0.12;
    u.uFocus.value.set(0.55, 0.56);
    u.uStreak.value = 0.19;
    this.camera.updateMatrixWorld();
  }

  finish() {
    if (this.onFinishCalled) return;
    this.onFinishCalled = true;
    this.playing = false;
    this.finished = true;
    this.audio?.endFilm();
    this.onFinish?.();
  }

  skip() {
    if (this.finished) return;
    this.playing = false;
    this.finished = true;
    this.onFinishCalled = true;
    this.audio?.endFilm();
    this.ui.fadeOut();
    setTimeout(() => {
      this.onSkip?.();
    }, 700);
  }

  stop() {
    this.playing = false;
  }
}


