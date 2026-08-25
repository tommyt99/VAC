(() => {
"use strict";

if (typeof THREE === "undefined") {
  const boot = document.getElementById("boot");
  if (boot) boot.textContent = "THREE.JS FAILED TO LOAD — CHECK NETWORK";
  return;
}

// ---------------------------------------------------------------------------
// Vehicle (Falcon 9 Block 5 first stage, single-engine landing burn)
// Numbers match /workspace/rocket-landing/index.html
// ---------------------------------------------------------------------------
const G = 9.80665;
const G0 = 9.80665;
const ISP = 282;
const TMAX = 845000;
const L = 42;
const M_DRY = 25600;
const M_FUEL0 = 5200;
const D_BODY = 3.66;
const A_REF = Math.PI * 1.83 * 1.83;
const CD = 0.70;
const DELTA_MAX = 10 * Math.PI / 180;
const LEG = 2.8;
const RHO0 = 1.225;
const H_SCALE = 8500;
const V_LAND = -1.3;
const PAD_R = 24;
const PHYS_HZ = 300;
const DT = 1 / PHYS_HZ;

function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function deg(r) { return r * 180 / Math.PI; }

function hCom(m) {
  const frac = clamp((m - M_DRY) / M_FUEL0, 0, 1);
  return L * (0.45 - 0.05 * frac);
}
function Itrans(m) {
  const hc = hCom(m);
  return m * (L * L / 12 + (L / 2 - hc) * (L / 2 - hc));
}
function IzzSpin(m) {
  const R = D_BODY / 2;
  return m * (R * R * 0.5);
}
function rho(z) { return RHO0 * Math.exp(-Math.max(z, 0) / H_SCALE); }

// Quaternion w,x,y,z — body-to-world. Body +z is the nose.
function qId() { return { w: 1, x: 0, y: 0, z: 0 }; }
function qNorm(q) {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  q.w /= n; q.x /= n; q.y /= n; q.z /= n;
  return q;
}
function qMul(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
  };
}
function qConj(q) { return { w: q.w, x: -q.x, y: -q.y, z: -q.z }; }
function qRot(q, v) {
  const qv = { w: 0, x: v.x, y: v.y, z: v.z };
  const r = qMul(qMul(q, qv), qConj(q));
  return { x: r.x, y: r.y, z: r.z };
}
function qFromAxisAngle(ax, ay, az, ang) {
  const n = Math.hypot(ax, ay, az) || 1;
  const h = ang * 0.5, s = Math.sin(h);
  return { w: Math.cos(h), x: ax / n * s, y: ay / n * s, z: az / n * s };
}
function qIntegrate(q, w, dt) {
  const mag = Math.hypot(w.x, w.y, w.z);
  const dq = mag < 1e-12
    ? { w: 1, x: w.x * dt * 0.5, y: w.y * dt * 0.5, z: w.z * dt * 0.5 }
    : qFromAxisAngle(w.x, w.y, w.z, mag * dt);
  return qNorm(qMul(q, dq));
}
function bodyZ(q) { return qRot(q, { x: 0, y: 0, z: 1 }); }
function tiltAngle(q) {
  return Math.acos(clamp(bodyZ(q).z, -1, 1));
}
function feetZ(st) {
  return st.z - hCom(st.m) * bodyZ(st.q).z - LEG;
}

// ---------------------------------------------------------------------------
// State
// r=(x,y,z) +z up, v, q body→world, ω body, m
// ---------------------------------------------------------------------------
const s = {
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  q: qId(),
  wx: 0, wy: 0, wz: 0,
  m: M_DRY + M_FUEL0
};
let uCmd = 0, dP = 0, dY = 0, finP = 0, finY = 0;
let apOn = true, paused = false, done = false;
let outcome = "", outcomeWhy = "";
let tSim = 0, mode = "normal";
let apMem = { burn: false, phase: "coast", hSb: 0 };
let lastHsb = 0, lastPhase = "coast";
let legsDeploy = 0;
let manThrottle = 0, manDP = 0, manDY = 0;
const keys = Object.create(null);
let camMode = "follow";
const orbit = { th: 0.85, ph: 0.38, dist: 140 };
let look = { x: 0, y: 0, z: 400 };
let shake = 0;
let dragging = false, lastMX = 0, lastMY = 0;

// ---------------------------------------------------------------------------
// Physics — inverted pendulum: engine at r_e = (0,0,-hCom), F at engine,
// M = r_e × F. Gravity at COM, no moment. Open-loop hover is unstable.
// ---------------------------------------------------------------------------
function stepPhysics(dt) {
  const u = clamp(uCmd, 0, 1);
  const gp = clamp(dP, -DELTA_MAX, DELTA_MAX);
  const gy = clamp(dY, -DELTA_MAX, DELTA_MAX);
  const fuel = s.m - M_DRY;
  const T = fuel > 1 ? u * TMAX : 0;
  const hc = hCom(s.m);
  const It = Itrans(s.m);
  const Iz = IzzSpin(s.m);

  const Fb = {
    x: T * Math.sin(gp),
    y: T * Math.sin(gy),
    z: T * Math.cos(gp) * Math.cos(gy)
  };
  const Fw = qRot(s.q, Fb);

  const v = Math.hypot(s.vx, s.vy, s.vz);
  let Dx = 0, Dy = 0, Dz = 0;
  if (v > 0.15) {
    const D = 0.5 * rho(s.z) * v * v * CD * A_REF;
    Dx = D * s.vx / v;
    Dy = D * s.vy / v;
    Dz = D * s.vz / v;
  }

  let Mx = hc * Fb.y;
  let My = -hc * Fb.x;
  let Mz = 0;

  const bz = bodyZ(s.q);
  const qdyn = 0.5 * rho(s.z) * v * v;
  const vhat = v > 0.15 ? { x: s.vx / v, y: s.vy / v, z: s.vz / v } : { x: 0, y: 0, z: -1 };
  const aeroScale = qdyn * A_REF * L * 0.05;
  const mAeroW = {
    x: aeroScale * (bz.y * (-vhat.z) - bz.z * (-vhat.y)),
    y: aeroScale * (bz.z * (-vhat.x) - bz.x * (-vhat.z)),
    z: aeroScale * (bz.x * (-vhat.y) - bz.y * (-vhat.x))
  };
  const mAeroB = qRot(qConj(s.q), mAeroW);
  Mx += mAeroB.x;
  My += mAeroB.y;
  Mz += mAeroB.z;
  Mx += qdyn * 16 * clamp(finY, -1, 1);
  My += qdyn * 16 * clamp(finP, -1, 1);
  Mz += -0.4 * Iz * s.wz;

  const wx = s.wx, wy = s.wy, wz = s.wz;
  const taux = wy * (Iz * wz) - wz * (It * wy);
  const tauy = wz * (It * wx) - wx * (Iz * wz);
  const tauz = wx * (It * wy) - wy * (It * wx);

  s.vx += ((Fw.x - Dx) / s.m) * dt;
  s.vy += ((Fw.y - Dy) / s.m) * dt;
  s.vz += ((Fw.z - Dz) / s.m - G) * dt;
  s.wx += ((Mx - taux) / It) * dt;
  s.wy += ((My - tauy) / It) * dt;
  s.wz += ((Mz - tauz) / Math.max(Iz, 1)) * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.z += s.vz * dt;
  s.q = qIntegrate(s.q, { x: s.wx, y: s.wy, z: s.wz }, dt);
  if (T > 0) s.m = Math.max(s.m - T / (ISP * G0) * dt, M_DRY);
  return T;
}

function guidance() {
  const h = Math.max(feetZ(s), 0.10);
  const bz = bodyZ(s.q);
  const tilt = Math.acos(clamp(bz.z, -1, 1));
  const aMaxNet = Math.max(TMAX / s.m * Math.max(bz.z, 0.75) - G, 1.5);
  const vDown = Math.max(-s.vz, 0);
  const vH = Math.hypot(s.vx, s.vy);
  const range = Math.hypot(s.x, s.y);

  let hSb = (vDown * vDown - V_LAND * V_LAND) / (2 * aMaxNet);
  hSb += (vH * vH) / (2 * Math.max(TMAX / s.m, 1)) * 0.22;
  hSb += Math.min(0.40 * range + 1.4 * vH, 180);
  hSb = 1.06 * hSb + 12;
  lastHsb = hSb;
  apMem.hSb = hSb;

  if (apMem.burn && h > 55 && vDown < 8) apMem.burn = false;
  if (h <= hSb && h < 1200) apMem.burn = true;
  const inBurn = !!apMem.burn;

  let thLim;
  if (h < 40) thLim = (5 + 10 * h / 40) * Math.PI / 180;
  else if (h < 180) thLim = 16 * Math.PI / 180;
  else thLim = 20 * Math.PI / 180;

  let kx = 0.0022, kv = 0.022;
  if (range < 18 && vH < 4) { kx = 0.0012; kv = 0.016; }

  let pitchCmd = clamp(-kv * s.vx - kx * s.x, -thLim, thLim);
  let yawTiltCmd = clamp(-kv * s.vy - kx * s.y, -thLim, thLim);
  if (h < 14) { pitchCmd *= h / 14; yawTiltCmd *= h / 14; }
  if (tilt > 28 * Math.PI / 180) { pitchCmd = 0; yawTiltCmd = 0; }

  const fuel = s.m - M_DRY;
  let u = 0;
  let phase = "coast";

  if (inBurn && fuel > 15) {
    if (h > 30) {
      const aNet = (s.vz * s.vz - V_LAND * V_LAND) / (2 * h);
      u = clamp((aNet + G) * s.m / (TMAX * Math.max(bz.z, 0.42)), 0, 1);
      if (vDown > 25 && h > 40) u = Math.max(u, 0.92);
      if (vDown < 10 && h > 50) { u = 0; apMem.burn = false; }
    } else {
      let vzCmd = -Math.min(1.15 + 0.12 * h, 7);
      if (h < 7) vzCmd = -1.05;
      let aNet = 3.5 * (vzCmd - s.vz);
      if (s.vz > 0.4) aNet = -2;
      u = clamp((aNet + G) * s.m / (TMAX * Math.max(bz.z, 0.5)), 0, 1);
    }
    phase = u > 0.04 ? "burn" : "coast";
  } else {
    const xMiss = Math.hypot(s.x + s.vx * 8, s.y + s.vy * 8);
    if (fuel > 3300 && h > hSb + 320 && h < 2200 && (xMiss > 400 || vH > 36)) {
      u = 0.50;
      phase = "approach";
    }
  }

  const pitch = Math.atan2(bz.x, Math.max(bz.z, 0.05));
  const yawTilt = Math.atan2(bz.y, Math.max(bz.z, 0.05));
  const wW = qRot(s.q, { x: s.wx, y: s.wy, z: s.wz });
  const pitchRate = wW.y;
  const yawTiltRate = -wW.x;
  const errP = pitchCmd - pitch;
  const errY = yawTiltCmd - yawTilt;
  const wn = 3.6, zeta = 1.12;
  const alphaP = wn * wn * errP - 2 * zeta * wn * pitchRate;
  const alphaY = wn * wn * errY - 2 * zeta * wn * yawTiltRate;
  const T_est = Math.max(u * TMAX, 1);
  const hc = hCom(s.m);
  const It = Itrans(s.m);
  let gp = 0, gy = 0;
  if (u >= 0.06) {
    gp = clamp(-alphaP * It / (hc * T_est), -DELTA_MAX, DELTA_MAX);
    gy = clamp((-alphaY) * It / (hc * T_est), -DELTA_MAX, DELTA_MAX);
  }
  const fP = clamp(3.2 * errP - 1.7 * pitchRate, -1, 1);
  const fY = clamp(-(3.2 * errY - 1.7 * yawTiltRate), -1, 1);
  if (fuel <= 8) { u = 0; gp = 0; gy = 0; }
  lastPhase = phase;
  return { u, dP: gp, dY: gy, finP: fP, finY: fY, phase, hSb };
}

function manualControls(dt) {
  const up = keys.KeyW;
  const dn = keys.KeyS;
  const pUp = keys.KeyI || keys.ArrowUp;
  const pDn = keys.KeyK || keys.ArrowDown;
  const yLf = keys.KeyJ || keys.ArrowLeft;
  const yRt = keys.KeyL || keys.ArrowRight;
  if (up || dn || pUp || pDn || yLf || yRt) {
    if (apOn) { apOn = false; syncApButton(); }
  }
  if (apOn) return;
  if (up) manThrottle = clamp(manThrottle + 0.9 * dt, 0, 1);
  if (dn) manThrottle = clamp(manThrottle - 0.9 * dt, 0, 1);
  if (pUp) manDP = clamp(manDP + 0.8 * dt, -DELTA_MAX, DELTA_MAX);
  else if (pDn) manDP = clamp(manDP - 0.8 * dt, -DELTA_MAX, DELTA_MAX);
  else manDP *= Math.pow(0.08, dt);
  if (yRt) manDY = clamp(manDY + 0.8 * dt, -DELTA_MAX, DELTA_MAX);
  else if (yLf) manDY = clamp(manDY - 0.8 * dt, -DELTA_MAX, DELTA_MAX);
  else manDY *= Math.pow(0.08, dt);
  uCmd = manThrottle;
  dP = manDP;
  dY = manDY;
  const bz = bodyZ(s.q);
  const pitch = Math.atan2(bz.x, Math.max(bz.z, 0.05));
  const yawTilt = Math.atan2(bz.y, Math.max(bz.z, 0.05));
  const wW = qRot(s.q, { x: s.wx, y: s.wy, z: s.wz });
  finP = clamp(-2.2 * pitch - 1.4 * wW.y, -1, 1);
  finY = clamp(-(-2.2 * yawTilt - 1.4 * (-wW.x)), -1, 1);
}

function evaluateContact() {
  const tilt = tiltAngle(s.q);
  const sink = Math.abs(s.vz);
  const lat = Math.hypot(s.vx, s.vy);
  const miss = Math.hypot(s.x, s.y);
  const spin = Math.hypot(s.wx, s.wy, s.wz);
  if (sink > 4.0) return { ok: false, why: "HIGH SINK RATE" };
  if (tilt > 9 * Math.PI / 180) return { ok: false, why: "TIP-OVER" };
  if (miss > PAD_R) return { ok: false, why: "OFF PAD" };
  if (lat > 3.0) return { ok: false, why: "LATERAL VELOCITY" };
  if (spin > 40 * Math.PI / 180) return { ok: false, why: "TIP-OVER" };
  return { ok: true, why: "GEAR DOWN  ·  VEHICLE STABLE" };
}

function finish(ok, why) {
  done = true;
  outcome = ok ? "ok" : "bad";
  outcomeWhy = why;
  uCmd = 0; dP = 0; dY = 0;
  const ban = document.getElementById("banner");
  ban.className = "banner show " + (ok ? "ok" : "bad");
  document.getElementById("bannerBig").textContent =
    ok ? "LZ-1  ·  LANDING CONFIRMED" : "RUD  ·  VEHICLE LOST";
  document.getElementById("bannerWhy").textContent = why;
  if (!ok) explode();
  else dustBurst(1.4);
}

function spawnIC(kind) {
  mode = kind || mode;
  let fuel = M_FUEL0;
  s.wx = 0; s.wy = 0; s.wz = 0;
  if (mode === "perfect") {
    s.x = 35; s.y = 18; s.z = 1500;
    s.vx = 3; s.vy = -2; s.vz = -78;
    s.q = qFromAxisAngle(0, 1, 0, 1.0 * Math.PI / 180);
  } else if (mode === "hard") {
    const az = rand(0, Math.PI * 2);
    const r = rand(0, 700);
    s.x = r * Math.cos(az); s.y = r * Math.sin(az);
    s.z = rand(1800, 2400);
    const vaz = rand(0, Math.PI * 2);
    const vh = rand(0, 36);
    s.vx = vh * Math.cos(vaz); s.vy = vh * Math.sin(vaz);
    s.vz = rand(-130, -92);
    const tilt = rand(-11, 11) * Math.PI / 180;
    const tax = rand(0, Math.PI * 2);
    s.q = qFromAxisAngle(Math.cos(tax), Math.sin(tax), 0, tilt);
    s.wx = rand(-6, 6) * Math.PI / 180;
    s.wy = rand(-6, 6) * Math.PI / 180;
    fuel = 5000;
  } else {
    const az = rand(0, Math.PI * 2);
    const r = rand(0, 360);
    s.x = r * Math.cos(az); s.y = r * Math.sin(az);
    s.z = rand(1500, 2100);
    const vaz = rand(0, Math.PI * 2);
    const vh = rand(0, 20);
    s.vx = vh * Math.cos(vaz); s.vy = vh * Math.sin(vaz);
    s.vz = rand(-105, -78);
    const tilt = rand(-6, 6) * Math.PI / 180;
    const tax = rand(0, Math.PI * 2);
    s.q = qFromAxisAngle(Math.cos(tax), Math.sin(tax), 0, tilt);
    s.wx = rand(-3.2, 3.2) * Math.PI / 180;
    s.wy = rand(-3.2, 3.2) * Math.PI / 180;
    fuel = M_FUEL0;
  }
  s.m = M_DRY + fuel;
  uCmd = 0; dP = 0; dY = 0; finP = 0; finY = 0;
  apOn = true; paused = false; done = false;
  outcome = ""; outcomeWhy = "";
  tSim = 0; apMem = { burn: false, phase: "coast", hSb: 0 }; lastPhase = "coast";
  legsDeploy = 0; manThrottle = 0; manDP = 0; manDY = 0;
  particles.length = 0; trail.length = 0;
  look.x = s.x; look.y = s.y; look.z = s.z;
  orbit.dist = 120;
  document.getElementById("banner").className = "banner";
  document.getElementById("btnPause").textContent = "Pause";
  syncModeButtons();
  syncApButton();
}

function tick(dt) {
  if (done) {
    if (outcome === "ok") {
      const bz = bodyZ(s.q);
      s.z = hCom(s.m) * bz.z + LEG;
      s.vz = 0;
      s.vx *= 0.9; s.vy *= 0.9;
      s.wx *= 0.85; s.wy *= 0.85; s.wz *= 0.85;
    } else {
      stepPhysics(dt);
      if (s.z < hCom(s.m) * 0.2) s.z = hCom(s.m) * 0.2;
    }
    return;
  }
  if (apOn) {
    const g = guidance();
    uCmd = g.u; dP = g.dP; dY = g.dY; finP = g.finP; finY = g.finY;
    manThrottle = uCmd; manDP = dP; manDY = dY;
  }
  manualControls(dt);
  stepPhysics(dt);

  const h = feetZ(s);
  const wantLegs = h < 450 || lastPhase === "burn" || s.z < 500;
  legsDeploy = clamp(legsDeploy + (wantLegs ? 1.6 : -0.8) * dt, 0, 1);

  if (h <= 0) {
    s.z -= h;
    const ev = evaluateContact();
    finish(ev.ok, ev.why);
    return;
  }
  if (tiltAngle(s.q) > 80 * Math.PI / 180) {
    finish(false, "TUMBLE");
    return;
  }
  if (s.z < -10) finish(false, "GROUND IMPACT");
}

// ---------------------------------------------------------------------------
// Three.js world
// Physics is +z up. Scene uses the same frame (camera.up = +z).
// ---------------------------------------------------------------------------
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x02040a, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
if (renderer.toneMapping !== undefined) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07060c, 0.00022);

const camera = new THREE.PerspectiveCamera(48, 1, 0.4, 20000);
camera.up.set(0, 0, 1);

function cylZ(rt, rb, h, seg) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg || 28);
  g.rotateX(Math.PI / 2);
  return g;
}

function makeCanvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildSky() {
  const skyTex = makeCanvasTex(8, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#02040a");
    g.addColorStop(0.42, "#0a1020");
    g.addColorStop(0.48, "#1a1733");
    g.addColorStop(0.50, "#c45a28");
    g.addColorStop(0.56, "#3a2040");
    g.addColorStop(1, "#12141a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(9000, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.rotation.x = Math.PI / 2;
  scene.add(sky);

  const starN = 1800;
  const pos = new Float32Array(starN * 3);
  const col = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const a = Math.random() * Math.PI * 2;
    const p = Math.acos(rand(0.02, 0.92));
    const r = 8200;
    pos[i * 3] = r * Math.sin(p) * Math.cos(a);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(a);
    pos[i * 3 + 2] = r * Math.cos(p);
    const b = 0.55 + Math.random() * 0.45;
    col[i * 3] = 0.75 + Math.random() * 0.25;
    col[i * 3 + 1] = 0.8 + Math.random() * 0.2;
    col[i * 3 + 2] = b;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({
    size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false,
    transparent: true, opacity: 0.9, depthWrite: false
  }));
  scene.add(stars);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(200, 4200, 64),
    new THREE.MeshBasicMaterial({
      color: 0xff7a30, transparent: true, opacity: 0.07,
      side: THREE.DoubleSide, depthWrite: false, fog: false
    })
  );
  glow.position.z = 4;
  scene.add(glow);
}

function padTexture() {
  return makeCanvasTex(1024, 1024, (ctx, w) => {
    ctx.fillStyle = "#2a2d34";
    ctx.fillRect(0, 0, w, w);
    for (let i = 0; i < 8000; i++) {
      const n = 28 + Math.random() * 22;
      ctx.fillStyle = `rgba(${n},${n + 2},${n + 6},${0.35 + Math.random() * 0.35})`;
      ctx.fillRect(Math.random() * w, Math.random() * w, 2 + Math.random() * 4, 2 + Math.random() * 3);
    }
    const cx = w / 2, cy = w / 2, sc = w / 80;
    ctx.strokeStyle = "#3f4450";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 38 * sc, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#3a3e48";
    ctx.beginPath(); ctx.arc(cx, cy, 28 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f5c518";
    ctx.lineWidth = 7;
    ctx.lineCap = "butt";
    const a = 12 * sc;
    ctx.beginPath(); ctx.moveTo(cx - a, cy - a); ctx.lineTo(cx + a, cy + a); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + a, cy - a); ctx.lineTo(cx - a, cy + a); ctx.stroke();
    ctx.fillStyle = "#f5c518";
    ctx.font = "bold 42px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LZ-1", cx, cy + 20 * sc);
    ctx.strokeStyle = "rgba(245,197,24,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath(); ctx.arc(cx, cy, PAD_R * sc, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  });
}

function buildGround() {
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(3500, 64),
    new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.96, metalness: 0.02 })
  );
  scene.add(dirt);

  const dunes = new THREE.Mesh(
    new THREE.CircleGeometry(2800, 48),
    new THREE.MeshStandardMaterial({ color: 0x161820, roughness: 0.98, metalness: 0 })
  );
  dunes.position.z = -0.4;
  scene.add(dunes);

  const padMat = new THREE.MeshStandardMaterial({
    map: padTexture(), roughness: 0.82, metalness: 0.08
  });
  const pad = new THREE.Mesh(new THREE.CircleGeometry(40, 48), padMat);
  pad.position.z = 0.05;
  scene.add(pad);

  const apron = new THREE.Mesh(
    new THREE.RingGeometry(40, 55, 48),
    new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.9, metalness: 0.05 })
  );
  apron.position.z = 0.03;
  scene.add(apron);

  const ringMat = new THREE.LineBasicMaterial({ color: 0xf5c518, transparent: true, opacity: 0.18 });
  const tickMat = new THREE.LineBasicMaterial({ color: 0x8b93a7, transparent: true, opacity: 0.16 });
  [50, 100, 200, 400].forEach((r, i) => {
    const pts = [];
    for (let k = 0; k <= 64; k++) {
      const a = k / 64 * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.08));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const ln = new THREE.Line(g, i === 0 ? ringMat : tickMat);
    scene.add(ln);
  });

  for (let x = -800; x <= 800; x += 100) {
    if (x === 0) continue;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -12, 0.1), new THREE.Vector3(x, 12, 0.1)
    ]);
    scene.add(new THREE.Line(g, tickMat));
    const g2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-12, x, 0.1), new THREE.Vector3(12, x, 0.1)
    ]);
    scene.add(new THREE.Line(g2, tickMat));
  }

  const bunker = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x252830, roughness: 0.85 })
  );
  bunker.position.set(48, 18, 1.6);
  scene.add(bunker);
  const lightBar = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf5c518, emissive: 0xf5c518, emissiveIntensity: 0.7 })
  );
  lightBar.position.set(48, 18, 3.0);
  scene.add(lightBar);

}

function buildPadLights() {
  vis.padLamps = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffe08a, emissive: 0xf5c518, emissiveIntensity: 0.9
      })
    );
    lamp.position.set(Math.cos(a) * 30, Math.sin(a) * 30, 0.45);
    scene.add(lamp);
    vis.padLamps.push(lamp);
  }
}

const vis = {
  rocket: null, inner: null, legs: [], fins: [],
  plume: null, plumeCore: null, engineLight: null, padSpot: null,
  trail: null, padLamps: [], particles: null
};

function bodyTexture() {
  return makeCanvasTex(256, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#8b909a");
    g.addColorStop(0.28, "#f4f5f8");
    g.addColorStop(0.55, "#d5d8e0");
    g.addColorStop(0.78, "#9aa0aa");
    g.addColorStop(1, "#6e737c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(20,24,32,0.16)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 10; i++) {
      const y = (i / 10) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h); ctx.stroke();
    ctx.fillStyle = "#1d3a7a";
    ctx.fillRect(w * 0.18, h * 0.18, 22, 14);
    ctx.fillStyle = "#b22222";
    ctx.fillRect(w * 0.18, h * 0.18, 22, 5);
  });
}

function finTexture() {
  return makeCanvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#4a4e58";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(200,205,215,0.45)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(i * w / 5, 0); ctx.lineTo(i * w / 5, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * h / 5); ctx.lineTo(w, i * h / 5); ctx.stroke();
    }
  });
}

function buildRocket() {
  const R = D_BODY / 2;
  const rocket = new THREE.Group();
  const inner = new THREE.Group();
  rocket.add(inner);

  const white = new THREE.MeshStandardMaterial({
    map: bodyTexture(), metalness: 0.28, roughness: 0.46
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x0e0f12, metalness: 0.55, roughness: 0.42 });
  const aft = new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.6, roughness: 0.4 });
  const copp = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.82, roughness: 0.32 });
  const coppIn = new THREE.MeshStandardMaterial({ color: 0x2a160c, metalness: 0.4, roughness: 0.6 });
  const silv = new THREE.MeshStandardMaterial({ color: 0xd8dbe2, metalness: 0.55, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.5, roughness: 0.45 });
  const titan = new THREE.MeshStandardMaterial({
    map: finTexture(), metalness: 0.7, roughness: 0.35, color: 0x9aa0aa
  });

  const bodyH = 33.2;
  const body = new THREE.Mesh(cylZ(R, R, bodyH, 32), white);
  body.position.z = -1.1;
  inner.add(body);

  const inter = new THREE.Mesh(cylZ(R * 1.02, R * 1.02, 2.7, 32), black);
  inter.position.z = 16.55;
  inner.add(inter);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(R * 1.02, 0.9, 24), black);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 18.15;
  inner.add(cap);

  const oct = new THREE.Mesh(cylZ(R * 1.04, R * 1.04, 3.4, 8), aft);
  oct.position.z = -17.3;
  inner.add(oct);

  const race = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.38, 30),
    new THREE.MeshStandardMaterial({ color: 0x2a2d34, metalness: 0.4, roughness: 0.5 })
  );
  race.position.set(R + 0.05, 0, -1.2);
  inner.add(race);

  const bell = new THREE.Mesh(cylZ(0.55, 1.15, 2.3, 24), copp);
  bell.position.z = -20.15;
  inner.add(bell);
  const throat = new THREE.Mesh(cylZ(0.42, 0.55, 0.5, 16), coppIn);
  throat.position.z = -18.85;
  inner.add(throat);

  vis.fins = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const fin = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 1.65), titan);
    plate.position.x = R + 0.95;
    fin.add(plate);
    fin.position.z = 15.4;
    fin.rotation.z = a;
    inner.add(fin);
    vis.fins.push(fin);
  }

  vis.legs = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 9.6), silv);
    beam.position.z = -4.8;
    g.add(beam);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.18), dark);
    foot.position.z = -9.55;
    g.add(foot);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.2), silv);
    strut.position.set(-0.55, 0, -3.2);
    strut.rotation.y = 0.22;
    g.add(strut);
    g.position.set(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, -18.2);
    g.rotation.z = a;
    inner.add(g);
    vis.legs.push(g);
  }

  const plume = new THREE.Group();
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xffc878, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const outer = new THREE.Mesh(new THREE.ConeGeometry(1.6, 18, 18, 1, true), plumeMat);
  outer.rotation.x = Math.PI;
  outer.position.z = -9;
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.55, 10, 12, 1, true), coreMat);
  core.rotation.x = Math.PI;
  core.position.z = -5;
  plume.add(outer);
  plume.add(core);
  plume.position.z = -21.2;
  inner.add(plume);
  vis.plume = plume;
  vis.plumeCore = core;
  vis.plumeMat = plumeMat;
  vis.coreMat = coreMat;

  const engL = new THREE.PointLight(0xffb060, 0, 80, 1.6);
  engL.position.z = -22;
  inner.add(engL);
  vis.engineLight = engL;

  vis.rocket = rocket;
  vis.inner = inner;
  scene.add(rocket);
}

function buildLights() {
  scene.add(new THREE.AmbientLight(0x1a2233, 0.28));
  const hemi = new THREE.HemisphereLight(0x3a4a78, 0x1a120c, 0.72);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xd0d6ea, 1.15);
  moon.position.set(-180, 120, 260);
  scene.add(moon);
  const rim = new THREE.DirectionalLight(0xff8a40, 0.35);
  rim.position.set(80, -40, 20);
  scene.add(rim);

  const spot = new THREE.SpotLight(0xffc070, 0, 180, 0.55, 0.45, 1.2);
  spot.position.set(0, 0, 8);
  spot.target.position.set(0, 0, 0);
  scene.add(spot);
  scene.add(spot.target);
  vis.padSpot = spot;
}

function buildTrail() {
  const g = new THREE.BufferGeometry();
  const n = 240;
  const pos = new Float32Array(n * 3);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setDrawRange(0, 0);
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({
    color: 0x7af8ff, transparent: true, opacity: 0.32
  }));
  scene.add(line);
  vis.trail = line;
  vis.trailN = n;
}

const particles = [];
const trail = [];

function emitPlume(n) {
  const hc = hCom(s.m);
  const eb = qRot(s.q, { x: 0, y: 0, z: -hc });
  const dir = qRot(s.q, {
    x: Math.sin(dP), y: Math.sin(dY), z: Math.cos(dP) * Math.cos(dY)
  });
  for (let i = 0; i < n; i++) {
    const spd = 40 + uCmd * 90 + Math.random() * 40;
    particles.push({
      x: s.x + eb.x + (Math.random() - 0.5) * 1.2,
      y: s.y + eb.y + (Math.random() - 0.5) * 1.2,
      z: s.z + eb.z + (Math.random() - 0.5) * 0.6,
      vx: s.vx - dir.x * spd + (Math.random() - 0.5) * 18,
      vy: s.vy - dir.y * spd + (Math.random() - 0.5) * 18,
      vz: s.vz - dir.z * spd + (Math.random() - 0.5) * 12,
      life: 0.18 + Math.random() * 0.28,
      age: 0, r: 0.6 + Math.random() * 1.4 * uCmd, kind: "plume"
    });
  }
}
function dustBurst(scale) {
  for (let i = 0; i < 34 * scale; i++) {
    const a = rand(0, Math.PI * 2);
    const spd = rand(8, 40) * scale;
    particles.push({
      x: s.x + rand(-6, 6), y: s.y + rand(-6, 6), z: 0.4,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      vz: rand(2, 12) * 0.45,
      life: rand(0.6, 1.6), age: 0, r: rand(0.8, 2.4), kind: "dust"
    });
  }
}
function explode() {
  for (let i = 0; i < 110; i++) {
    const a = rand(0, Math.PI * 2);
    const b = rand(-0.4, 1.2);
    const spd = rand(10, 70);
    particles.push({
      x: s.x, y: s.y, z: s.z,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, vz: b * spd,
      life: rand(0.4, 1.4), age: 0, r: rand(0.8, 3.2), kind: "fire"
    });
  }
}
function stepParticles(dt) {
  if (uCmd > 0.05 && !done) emitPlume(Math.ceil(uCmd * 6));
  const h = feetZ(s);
  if (!done && uCmd > 0.2 && h < 50) {
    if (Math.random() < uCmd * 0.4) dustBurst(0.15 * uCmd * (1 - h / 50));
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.kind !== "plume") p.vz -= 18 * dt;
    if (p.z < 0) { p.z = 0; p.vz *= -0.2; p.vx *= 0.7; p.vy *= 0.7; }
    if (p.age > p.life) particles.splice(i, 1);
  }
  if (particles.length > 420) particles.splice(0, particles.length - 420);
}

function buildParticles() {
  const n = 420;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setDrawRange(0, 0);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({
    size: 2.4, vertexColors: true, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(pts);
  vis.particles = pts;
}

function syncParticles() {
  const pos = vis.particles.geometry.attributes.position.array;
  const col = vis.particles.geometry.attributes.color.array;
  const n = particles.length;
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    const k = 1 - p.age / p.life;
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    if (p.kind === "plume") {
      col[i * 3] = 1; col[i * 3 + 1] = 0.7 + 0.25 * k; col[i * 3 + 2] = 0.35 * k;
    } else if (p.kind === "fire") {
      col[i * 3] = 1; col[i * 3 + 1] = 0.35 + 0.4 * k; col[i * 3 + 2] = 0.12;
    } else {
      col[i * 3] = 0.7; col[i * 3 + 1] = 0.65; col[i * 3 + 2] = 0.55;
    }
  }
  vis.particles.geometry.setDrawRange(0, n);
  vis.particles.geometry.attributes.position.needsUpdate = true;
  vis.particles.geometry.attributes.color.needsUpdate = true;
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function updateRocket() {
  const hc = hCom(s.m);
  vis.rocket.position.set(s.x, s.y, s.z);
  vis.rocket.quaternion.set(s.q.x, s.q.y, s.q.z, s.q.w);
  vis.inner.position.z = -hc + L / 2;

  const hang = lerp(8 * Math.PI / 180, 50 * Math.PI / 180, legsDeploy);
  for (const g of vis.legs) {
    g.rotation.y = hang;
  }
  for (const f of vis.fins) {
    f.children[0].rotation.z = 0.08 * (finP - finY) * 0.5;
  }

  const on = uCmd > 0.04 && !(done && outcome === "ok");
  vis.plume.visible = on;
  if (on) {
    vis.plume.rotation.set(-dY, dP, 0);
    const sc = 0.45 + 1.7 * uCmd;
    vis.plume.scale.set(0.7 + 0.8 * uCmd, 0.7 + 0.8 * uCmd, sc);
    vis.plumeMat.opacity = 0.25 + 0.5 * uCmd;
    vis.coreMat.opacity = 0.45 + 0.5 * uCmd;
    vis.engineLight.intensity = 8 + 55 * uCmd;
  } else {
    vis.engineLight.intensity = 0;
  }

  const h = Math.max(feetZ(s), 0);
  if (uCmd > 0.15 && h < 90) {
    vis.padSpot.intensity = (uCmd * 40) * (1 - h / 90);
    vis.padSpot.position.set(s.x * 0.15, s.y * 0.15, 10);
  } else {
    vis.padSpot.intensity = 0;
  }

  if (vis.padLamps) {
    const blink = Math.floor(tSim * 2);
    vis.padLamps.forEach((l, i) => {
      l.material.emissiveIntensity = (blink + i) % 2 ? 1.1 : 0.25;
    });
  }
}

function updateTrail() {
  const pos = vis.trail.geometry.attributes.position.array;
  const n = Math.min(trail.length, vis.trailN);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = trail[i].x;
    pos[i * 3 + 1] = trail[i].y;
    pos[i * 3 + 2] = trail[i].z;
  }
  vis.trail.geometry.setDrawRange(0, n);
  vis.trail.geometry.attributes.position.needsUpdate = true;
}

function updateCamera(dt) {
  const tgt = { x: s.x, y: s.y, z: s.z };
  look.x = lerp(look.x, tgt.x, 1 - Math.pow(0.08, dt));
  look.y = lerp(look.y, tgt.y, 1 - Math.pow(0.08, dt));
  look.z = lerp(look.z, tgt.z, 1 - Math.pow(0.08, dt));
  shake = lerp(shake, uCmd * 1.6, 0.25);
  const shx = shake * (Math.random() - 0.5) * 0.15;
  const shy = shake * (Math.random() - 0.5) * 0.15;
  const shz = shake * (Math.random() - 0.5) * 0.08;

  let cx, cy, cz;
  if (camMode === "pad") {
    cx = 92; cy = -78; cz = 14;
    camera.position.set(cx + shx, cy + shy, cz + shz);
    camera.lookAt(s.x, s.y, Math.max(s.z, 8));
  } else if (camMode === "chase") {
    const bz = bodyZ(s.q);
    const back = 55 + clamp(s.z * 0.02, 0, 40);
    cx = s.x - bz.x * 8 + 18;
    cy = s.y - bz.y * 8 - 28;
    cz = s.z + 14;
    const want = { x: cx, y: cy, z: cz };
    if (!updateCamera._c) updateCamera._c = { x: cx, y: cy, z: cz };
    updateCamera._c.x = lerp(updateCamera._c.x, want.x, 1 - Math.pow(0.12, dt));
    updateCamera._c.y = lerp(updateCamera._c.y, want.y, 1 - Math.pow(0.12, dt));
    updateCamera._c.z = lerp(updateCamera._c.z, want.z, 1 - Math.pow(0.12, dt));
    camera.position.set(updateCamera._c.x + shx, updateCamera._c.y + shy, updateCamera._c.z + shz);
    camera.lookAt(s.x, s.y, s.z);
  } else {
    const h = Math.max(feetZ(s), 8);
    const wantDist = clamp(58 + Math.min(h, 280) * 0.14, 50, 160);
    orbit.dist = lerp(orbit.dist, wantDist, 1 - Math.pow(0.12, dt));
    const cph = Math.cos(orbit.ph), sph = Math.sin(orbit.ph);
    cx = look.x + orbit.dist * cph * Math.cos(orbit.th);
    cy = look.y + orbit.dist * cph * Math.sin(orbit.th);
    cz = look.z + orbit.dist * sph;
    camera.position.set(cx + shx, cy + shy, Math.max(cz + shz, 2));
    camera.lookAt(look.x, look.y, look.z);
  }
}

function fmt(n, d) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toFixed(d);
}
function setVal(id, text, cls) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "v" + (cls ? " " + cls : "");
}
function hud() {
  const h = feetZ(s);
  const fuel = Math.max(s.m - M_DRY, 0);
  const tw = (uCmd * TMAX) / (s.m * G);
  const tilt = deg(tiltAngle(s.q));
  const gs = Math.hypot(s.vx, s.vy);
  const range = Math.hypot(s.x, s.y);
  const vzHot = s.vz < -6 || s.vz > 2;
  const thHot = Math.abs(tilt) > 8;
  const fuelHot = fuel < 600;
  setVal("hAlt", fmt(Math.max(h, 0), 1) + " m", h < 40 ? "amber" : "");
  setVal("hVz", fmt(s.vz, 2) + " m/s", vzHot ? "warn" : (s.vz > -2.5 && h < 80 ? "ok" : ""));
  setVal("hGs", fmt(gs, 2) + " m/s", gs > 8 ? "warn" : "");
  setVal("hX", fmt(range, 1) + " m", range > PAD_R ? "warn" : (range < 8 ? "ok" : ""));
  setVal("hTh", fmt(tilt, 1) + "°", thHot ? "warn" : "");
  setVal("hGi", fmt(deg(dP), 1) + " / " + fmt(deg(dY), 1) + "°");
  setVal("hU", (uCmd * 100).toFixed(0) + " %", uCmd > 0.85 ? "amber" : "");
  setVal("hFuel", (fuel / 1000).toFixed(2) + " t", fuelHot ? "warn" : "");
  document.getElementById("fuelBar").style.width = (100 * fuel / M_FUEL0) + "%";
  const mm = Math.floor(tSim / 60);
  const ss = tSim - mm * 60;
  setVal("hT", String(mm).padStart(2, "0") + ":" + ss.toFixed(1).padStart(4, "0"));
  setVal("hM", (s.m / 1000).toFixed(1) + " t");
  setVal("hTW", fmt(tw, 2));
  setVal("hOm", fmt(deg(Math.hypot(s.wx, s.wy, s.wz)), 1) + " °/s");
  setVal("hSb", fmt(lastHsb, 0) + " m");
  setVal("hCam", camMode.toUpperCase());
  const names = { coast: "coasting", burn: "landing burn", approach: "approach burn" };
  document.getElementById("phase").textContent = done
    ? (outcome === "ok" ? "landed" : "loss of vehicle")
    : (names[lastPhase] || lastPhase);
  document.getElementById("apLabel").textContent = apOn ? "autopilot armed" : "manual — stick active";
}

function syncModeButtons() {
  for (const [id, m] of [["btnPerfect", "perfect"], ["btnNormal", "normal"], ["btnHard", "hard"]]) {
    document.getElementById(id).classList.toggle("on", mode === m);
  }
}
function syncApButton() {
  document.getElementById("btnAp").classList.toggle("on", apOn);
}
function syncCamButtons() {
  document.getElementById("btnFollow").classList.toggle("on", camMode === "follow");
  document.getElementById("btnChase").classList.toggle("on", camMode === "chase");
  document.getElementById("btnPad").classList.toggle("on", camMode === "pad");
}
function cycleCam() {
  camMode = camMode === "follow" ? "chase" : camMode === "chase" ? "pad" : "follow";
  syncCamButtons();
}

let acc = 0, lastTs = 0, trailAcc = 0;

function frame(ts) {
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  if (!paused) {
    acc += dt;
    let n = 0;
    const maxSub = 24;
    while (acc >= DT && n < maxSub) {
      tick(DT);
      acc -= DT;
      n++;
      tSim += DT;
    }
    if (n === maxSub) acc = 0;
    stepParticles(dt);
    updateCamera(dt);
    trailAcc += dt;
    if (trailAcc > 0.05 && !done) {
      trailAcc = 0;
      trail.push({ x: s.x, y: s.y, z: s.z });
      if (trail.length > 240) trail.shift();
    }
  }
  updateRocket();
  updateTrail();
  syncParticles();
  renderer.render(scene, camera);
  hud();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") {
    e.preventDefault();
    if (!done) { apOn = !apOn; syncApButton(); }
  } else if (e.code === "KeyR") spawnIC(mode);
  else if (e.code === "KeyP") {
    paused = !paused;
    document.getElementById("btnPause").textContent = paused ? "Resume" : "Pause";
  } else if (e.code === "KeyC") cycleCam();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  dragging = true;
  lastMX = e.clientX; lastMY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", () => { dragging = false; });
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
  lastMX = e.clientX; lastMY = e.clientY;
  orbit.th -= dx * 0.005;
  orbit.ph = clamp(orbit.ph + dy * 0.004, 0.05, 1.45);
  if (camMode !== "follow") { camMode = "follow"; syncCamButtons(); }
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  orbit.dist = clamp(orbit.dist * (1 + e.deltaY * 0.0015), 28, 1200);
  if (camMode !== "follow") { camMode = "follow"; syncCamButtons(); }
}, { passive: false });

document.getElementById("btnReset").onclick = () => spawnIC(mode);
document.getElementById("btnPause").onclick = () => {
  paused = !paused;
  document.getElementById("btnPause").textContent = paused ? "Resume" : "Pause";
};
document.getElementById("btnAp").onclick = () => { apOn = !apOn; syncApButton(); };
document.getElementById("btnPerfect").onclick = () => spawnIC("perfect");
document.getElementById("btnNormal").onclick = () => spawnIC("normal");
document.getElementById("btnHard").onclick = () => spawnIC("hard");
document.getElementById("btnFollow").onclick = () => { camMode = "follow"; syncCamButtons(); };
document.getElementById("btnChase").onclick = () => { camMode = "chase"; syncCamButtons(); };
document.getElementById("btnPad").onclick = () => { camMode = "pad"; syncCamButtons(); };

buildSky();
buildGround();
buildPadLights();
buildRocket();
buildLights();
buildTrail();
buildParticles();
resize();
spawnIC("normal");
document.getElementById("boot").classList.add("hide");
requestAnimationFrame(frame);
})();
