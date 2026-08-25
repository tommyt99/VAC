/* Exact snippets from falcon-landing-annotated/sim/index.html (copy of rocket-landing). Do not pretty-print the math. */
window.SNIPPETS = {
  "constants":   {
    "title": "Vehicle constants",
    "file": "sim/index.html",
    "fn": "const block",
    "anchor": "fn-constants",
    "code": "const G = 9.80665;\nconst G0 = 9.80665;\nconst ISP = 282;            // s, Merlin 1D sea-level\nconst TMAX = 845000;        // N, one Merlin 1D SL\nconst L = 42;               // m, stage length\nconst M_DRY = 25600;        // kg\nconst M_FUEL0 = 5200;       // kg usable landing prop\nconst D_BODY = 3.66;        // m\nconst A_REF = Math.PI * 1.83 * 1.83;\nconst CD = 0.70;\nconst DELTA_MAX = 10 * Math.PI / 180;\nconst LEG = 2.8;            // m, deployed gear below engine\nconst RHO0 = 1.225;\nconst H_SCALE = 8500;\nconst V_LAND = -1.3;\nconst PAD_R = 24;           // m, success radius\nconst PHYS_HZ = 300;\nconst DT = 1 / PHYS_HZ;",
    "note": "These are the only numbers the 2D trainer believes. TMAX is one Merlin 1D sea-level (845 kN). ISP is 282 s SL. Mass is a dry stage plus a small landing load — not the 395 t ascent load. DELTA_MAX is ±10°. PHYS_HZ = 300 sets the integrator step DT = 1/300 s. V_LAND = −1.3 m/s is the hover-slam target sink; PAD_R = 24 m is the success circle."
  },
  "state":   {
    "title": "State object s",
    "file": "sim/index.html",
    "fn": "s",
    "anchor": "fn-state",
    "code": "const s = {\n  x: 0, z: 0, vx: 0, vz: 0, theta: 0, omega: 0, m: M_DRY + M_FUEL0\n};",
    "note": "The planar 7-vector is a plain object: x, z, vx, vz, theta, omega, m. θ is s.theta (rad from vertical, + toward +x). ω is s.omega. Mass starts at M_DRY + M_FUEL0. There is no separate estimator — guidance reads this object directly."
  },
  "spawnIC":   {
    "title": "spawnIC — initial conditions",
    "file": "sim/index.html",
    "fn": "spawnIC",
    "anchor": "fn-spawnIC",
    "code": "function spawnIC(kind) {\n  mode = kind || mode;\n  let x, z, vx, vz, th, om, fuel;\n  if (mode === \"perfect\") {\n    x = 35; z = 1500; vx = 3; vz = -78;\n    th = 1.0 * Math.PI / 180; om = 0; fuel = M_FUEL0;\n  } else if (mode === \"hard\") {\n    x = rand(-700, 700); z = rand(1800, 2400);\n    vx = rand(-36, 36); vz = rand(-130, -92);\n    th = rand(-11, 11) * Math.PI / 180;\n    om = rand(-6, 6) * Math.PI / 180;\n    fuel = 5000;\n  } else {\n    x = rand(-360, 360); z = rand(1500, 2100);\n    vx = rand(-20, 20); vz = rand(-105, -78);\n    th = rand(-6, 6) * Math.PI / 180;\n    om = rand(-3.2, 3.2) * Math.PI / 180;\n    fuel = M_FUEL0;\n  }\n  s.x = x; s.z = z; s.vx = vx; s.vz = vz;\n  s.theta = th; s.omega = om; s.m = M_DRY + fuel;\n  uCmd = 0; deltaCmd = 0; finCmd = 0;\n  apOn = true; paused = false; done = false;\n  outcome = \"\"; outcomeWhy = \"\";\n  tSim = 0; apMem = {}; lastPhase = \"coast\";\n  legsDeploy = 0; manThrottle = 0; manDelta = 0;\n  particles.length = 0; trail.length = 0;\n  cam.x = s.x * 0.5; cam.z = s.z * 0.5;\n  document.getElementById(\"banner\").className = \"banner\";\n  syncModeButtons();\n  syncApButton();\n}",
    "note": "A run is a draw from one of three boxes (perfect / normal / hard) written straight into s. Hard also cuts fuel to 5000 kg. After assignment the autopilot is re-armed and lastPhase is reset to coast. This is how the trainer samples the two-point boundary-value problem."
  },
  "hCom":   {
    "title": "hCom(m) — COM height ℓ",
    "file": "sim/index.html",
    "fn": "hCom",
    "anchor": "fn-hCom",
    "code": "function hCom(m) {\n  const frac = clamp((m - M_DRY) / M_FUEL0, 0, 1);\n  return L * (0.45 - 0.05 * frac);\n}",
    "note": "ℓ in the essay is hc = hCom(s.m) in the sim. Fuel fraction 1 → 0.40 L; dry → 0.45 L. Empty COM sits higher than a fueled one (remaining mass is engines and aft RP-1). On a 42 m stage that is about 16.8–18.9 m above the gimbal."
  },
  "inertia":   {
    "title": "inertia(m) — centroidal I",
    "file": "sim/index.html",
    "fn": "inertia",
    "anchor": "fn-inertia",
    "code": "function inertia(m) {\n  const hc = hCom(m);\n  return m * (L * L / 12 + (L / 2 - hc) * (L / 2 - hc));\n}",
    "note": "I is a rod of length L about a COM that is not at L/2: m (L²/12 + (L/2 − hc)²). The parallel-axis shift is why I changes as fuel burns and hc walks. Used only as I in M/I for α̇."
  },
  "rho":   {
    "title": "rho(z) — exponential atmosphere",
    "file": "sim/index.html",
    "fn": "rho",
    "anchor": "fn-rho",
    "code": "function rho(z) { return RHO0 * Math.exp(-Math.max(z, 0) / H_SCALE); }",
    "note": "ρ(z) = RHO0 · exp(−max(z,0) / H_SCALE) with RHO0 = 1.225 and H_SCALE = 8500 m. Below the deck the sim refuses a negative altitude in the exponent. This is the only atmosphere; there is no Mach table."
  },
  "feetZ":   {
    "title": "feetZ(s) — gear height",
    "file": "sim/index.html",
    "fn": "feetZ",
    "anchor": "fn-feetZ",
    "code": "function feetZ(s) { return s.z - hCom(s.m) * Math.cos(s.theta) - LEG; }",
    "note": "s.z is COM altitude. Gear contact is z − ℓ cosθ − LEG = 0 with LEG = 2.8 m. A lean shortens the geometric height of the feet, so a tilted stack hits earlier. Guidance and the RUD check both use this, not raw s.z."
  },
  "stepPhysics":   {
    "title": "stepPhysics(dt)",
    "file": "sim/index.html",
    "fn": "stepPhysics",
    "anchor": "fn-stepPhysics",
    "code": "function stepPhysics(dt) {\n  const u = clamp(uCmd, 0, 1);\n  const delta = clamp(deltaCmd, -DELTA_MAX, DELTA_MAX);\n  const fuel = s.m - M_DRY;\n  const T = fuel > 1 ? u * TMAX : 0;\n  const hc = hCom(s.m);\n  const I = inertia(s.m);\n  const ang = s.theta + delta;\n\n  let Fx = T * Math.sin(ang);\n  let Fz = T * Math.cos(ang);\n\n  const v = Math.hypot(s.vx, s.vz);\n  if (v > 0.15) {\n    const D = 0.5 * rho(s.z) * v * v * CD * A_REF;\n    Fx -= D * s.vx / v;\n    Fz -= D * s.vz / v;\n  }\n\n  // Gimbal moment (the inverted-pendulum torque) + light aero.\n  let M = hc * T * Math.sin(delta);\n  const aoa = s.theta - Math.atan2(s.vx, -s.vz + 1e-6);\n  const q = 0.5 * rho(s.z) * v * v;\n  M += -q * A_REF * L * 0.05 * Math.sin(aoa);\n  M += q * 16 * clamp(finCmd, -1, 1);\n\n  s.vx += (Fx / s.m) * dt;\n  s.vz += (Fz / s.m - G) * dt;\n  s.omega += (M / I) * dt;\n  s.x += s.vx * dt;\n  s.z += s.vz * dt;\n  s.theta = wrapPi(s.theta + s.omega * dt);\n  if (T > 0) s.m = Math.max(s.m - T / (ISP * G0) * dt, M_DRY);\n\n  return T;\n}",
    "note": "One semi-implicit Euler step of the planar rigid body. T = u·TMAX if any fuel remains. Thrust is applied at the gimbal (ang = θ+δ), drag opposes velocity, the inverted-pendulum moment is ℓ T sinδ, then v is updated before x. Mass burns last. This function is the plant. Everything else is clothing or a controller."
  },
  "thrust":   {
    "title": "Thrust components Tx, Tz",
    "file": "sim/index.html",
    "fn": "stepPhysics",
    "anchor": "fn-stepPhysics",
    "code": "  const ang = s.theta + delta;\n\n  let Fx = T * Math.sin(ang);\n  let Fz = T * Math.cos(ang);",
    "note": "T → u*TMAX (see the fuel gate a few lines above). θ → s.theta, δ → the clamped deltaCmd. ang = theta+delta, then Fx = T sin(ang), Fz = T cos(ang). Upright, δ = 0, Fz = T and Fx = 0. The same δ that makes a moment also steals a slice of T into the horizontal channel."
  },
  "throttle":   {
    "title": "Throttle gate T = u TMAX",
    "file": "sim/index.html",
    "fn": "stepPhysics",
    "anchor": "fn-stepPhysics",
    "code": "  const u = clamp(uCmd, 0, 1);\n  const delta = clamp(deltaCmd, -DELTA_MAX, DELTA_MAX);\n  const fuel = s.m - M_DRY;\n  const T = fuel > 1 ? u * TMAX : 0;\n  const hc = hCom(s.m);\n  const I = inertia(s.m);",
    "note": "uCmd is clamped to [0,1], deltaCmd to ±DELTA_MAX. If remaining fuel ≤ 1 kg the engine is dead (T = 0). hc and I are recomputed every substep from current mass. There is no T_min floor and no ignition delay — u is an instantaneous knob."
  },
  "moment":   {
    "title": "Moment M = ℓ T sin δ",
    "file": "sim/index.html",
    "fn": "stepPhysics",
    "anchor": "fn-stepPhysics",
    "code": "  let M = hc * T * Math.sin(delta);",
    "note": "ℓ → hc = hCom(s.m), T → u*TMAX, δ → delta. The essay writes I ω̇ = −ℓ T sinδ from a sign convention on +δ. The sim uses M = hc * T * sin(delta) and then omega += (M/I)*dt, so a positive δ (thrust rotated toward +x, below the COM) produces a positive M and grows +θ. Geometry is the same lever; the sign is absorbed into how the PD later inverts the gimbal."
  },
  "mdot":   {
    "title": "Mass flow ṁ = −T / (Isp g0)",
    "file": "sim/index.html",
    "fn": "stepPhysics",
    "anchor": "fn-stepPhysics",
    "code": "  if (T > 0) s.m = Math.max(s.m - T / (ISP * G0) * dt, M_DRY);",
    "note": "s.m = max(s.m − T/(ISP*G0)*dt, M_DRY). ISP = 282 s, G0 = 9.80665. The rocket equation is not evaluated as Δv = Isp g0 ln(m0/mf); it is this increment, every 1/300 s, while T > 0. Dry mass is a floor — you cannot burn the tanks."
  },
  "integrator":   {
    "title": "Semi-implicit Euler at 300 Hz",
    "file": "sim/index.html",
    "fn": "stepPhysics / frame",
    "anchor": "fn-stepPhysics",
    "code": "const PHYS_HZ = 300;\nconst DT = 1 / PHYS_HZ;\n\n  s.vx += (Fx / s.m) * dt;\n  s.vz += (Fz / s.m - G) * dt;\n  s.omega += (M / I) * dt;\n  s.x += s.vx * dt;\n  s.z += s.vz * dt;\n  s.theta = wrapPi(s.theta + s.omega * dt);",
    "note": "Velocity first, then position, using the new v — semi-implicit (symplectic) Euler. Attitude is wrapped to (−π, π]. The display loop accumulates real time and calls tick(DT) at PHYS_HZ = 300, capped at 24 substeps per frame so a tab-hitch cannot explode the plant."
  },
  "physHz":   {
    "title": "PHYS_HZ clock",
    "file": "sim/index.html",
    "fn": "frame",
    "anchor": "fn-frame",
    "code": "const PHYS_HZ = 300;\nconst DT = 1 / PHYS_HZ;\n\n    while (acc >= DT && n < maxSub) {\n      tick(DT);\n      acc -= DT;\n      n++;\n      tSim += DT;\n    }",
    "note": "DT = 1/PHYS_HZ = 1/300 s. The rAF loop is not the physics clock. acc stores leftover frame time; each tick(DT) runs guidance + stepPhysics once. tSim advances by DT, not by the display dt."
  },
  "aero":   {
    "title": "Aero force and grid-fin moment",
    "file": "sim/index.html",
    "fn": "stepPhysics",
    "anchor": "fn-stepPhysics",
    "code": "  const v = Math.hypot(s.vx, s.vz);\n  if (v > 0.15) {\n    const D = 0.5 * rho(s.z) * v * v * CD * A_REF;\n    Fx -= D * s.vx / v;\n    Fz -= D * s.vz / v;\n  }\n\n  // Gimbal moment (the inverted-pendulum torque) + light aero.\n  let M = hc * T * Math.sin(delta);\n  const aoa = s.theta - Math.atan2(s.vx, -s.vz + 1e-6);\n  const q = 0.5 * rho(s.z) * v * v;\n  M += -q * A_REF * L * 0.05 * Math.sin(aoa);\n  M += q * 16 * clamp(finCmd, -1, 1);",
    "note": "What the 2D sim adds beyond the vacuum pendulum: quadratic drag D = ½ ρ v² Cd A_REF opposing velocity, a weathercocking moment −q A_REF L · 0.05 · sin(α), and a grid-fin moment q·16·finCmd. Cd·A is intentionally small so the gimbal story stays in front. Authority dies with q — do not count on fins in the last second. There is no transonic table and no CP walk."
  },
  "guidance":   {
    "title": "guidance() — full autopilot",
    "file": "sim/index.html",
    "fn": "guidance",
    "anchor": "fn-guidance",
    "code": "function guidance() {\n  const h = Math.max(feetZ(s), 0.10);\n  const aMaxNet = Math.max(TMAX / s.m * Math.max(Math.cos(s.theta), 0.75) - G, 1.5);\n  const vDown = Math.max(-s.vz, 0);\n\n  let hSb = (vDown * vDown - V_LAND * V_LAND) / (2 * aMaxNet);\n  hSb += (s.vx * s.vx) / (2 * Math.max(TMAX / s.m, 1)) * 0.22;\n  hSb += Math.min(0.40 * Math.abs(s.x) + 1.4 * Math.abs(s.vx), 180);\n  hSb = 1.06 * hSb + 12;\n  lastHsb = hSb;\n\n  if (apMem.burn && h > 55 && vDown < 8) apMem.burn = false;\n  if (h <= hSb && h < 1200) apMem.burn = true;\n  const inBurn = !!apMem.burn;\n\n  let thLim;\n  if (h < 40) thLim = (5 + 10 * h / 40) * Math.PI / 180;\n  else if (h < 180) thLim = 16 * Math.PI / 180;\n  else thLim = 20 * Math.PI / 180;\n\n  let kx = 0.0022, kv = 0.022;\n  if (Math.abs(s.x) < 18 && Math.abs(s.vx) < 4) { kx = 0.0012; kv = 0.016; }\n  let thetaCmd = clamp(-kv * s.vx - kx * s.x, -thLim, thLim);\n  if (h < 14) thetaCmd *= h / 14;\n\n  const fuel = s.m - M_DRY;\n  let u = 0;\n  let phase = \"coast\";\n\n  if (inBurn && fuel > 15) {\n    if (h > 30) {\n      const aNet = (s.vz * s.vz - V_LAND * V_LAND) / (2 * h);\n      u = clamp((aNet + G) * s.m / (TMAX * Math.max(Math.cos(s.theta), 0.42)), 0, 1);\n      if (vDown > 25 && h > 40) u = Math.max(u, 0.92);\n      if (vDown < 10 && h > 50) { u = 0; apMem.burn = false; }\n    } else {\n      let vzCmd = -Math.min(1.15 + 0.12 * h, 7);\n      if (h < 7) vzCmd = -1.05;\n      let aNet = 3.5 * (vzCmd - s.vz);\n      if (s.vz > 0.4) aNet = -2;\n      u = clamp((aNet + G) * s.m / (TMAX * Math.max(Math.cos(s.theta), 0.5)), 0, 1);\n    }\n    phase = u > 0.04 ? \"burn\" : \"coast\";\n  } else {\n    const xMiss = Math.abs(s.x + s.vx * 8);\n    if (fuel > 3300 && h > hSb + 320 && h < 2200 && (xMiss > 400 || Math.abs(s.vx) > 36)) {\n      u = 0.50;\n      phase = \"approach\";\n    }\n  }\n\n  const err = thetaCmd - s.theta;\n  const wn = 3.6, zeta = 1.12;\n  const alphaDes = wn * wn * err - 2 * zeta * wn * s.omega;\n  const T_est = Math.max(u * TMAX, 1);\n  const hc = hCom(s.m);\n  let delta = 0;\n  if (u >= 0.06) delta = clamp(alphaDes * inertia(s.m) / (hc * T_est), -DELTA_MAX, DELTA_MAX);\n  const fin = clamp(3.2 * err - 1.7 * s.omega, -1, 1);\n\n  if (fuel <= 8) { u = 0; delta = 0; }\n  lastPhase = phase;\n  return { u, delta, fin, phase, hSb, thetaCmd };\n}",
    "note": "The whole landing brain in one function: suicide-burn altitude, coast/slam phase, a PD tilt that walks x back over the pad, then an NDI inversion of M = ℓ T sinδ for the gimbal. Prefer the tighter chips (h_sb, coastSlam, attitude) unless you want the entire 60-line loop. Not G-FOLD — no SOCP, no annulus constraint."
  },
  "hsb":   {
    "title": "Suicide-burn altitude h_sb",
    "file": "sim/index.html",
    "fn": "guidance",
    "anchor": "fn-guidance",
    "code": "  const h = Math.max(feetZ(s), 0.10);\n  const aMaxNet = Math.max(TMAX / s.m * Math.max(Math.cos(s.theta), 0.75) - G, 1.5);\n  const vDown = Math.max(-s.vz, 0);\n\n  let hSb = (vDown * vDown - V_LAND * V_LAND) / (2 * aMaxNet);\n  hSb += (s.vx * s.vx) / (2 * Math.max(TMAX / s.m, 1)) * 0.22;\n  hSb += Math.min(0.40 * Math.abs(s.x) + 1.4 * Math.abs(s.vx), 180);\n  hSb = 1.06 * hSb + 12;\n  lastHsb = hSb;",
    "note": "Essay: h★ = V² / (2(T/m − g)). Sim: hSb = (vDown² − V_LAND²) / (2 aMaxNet), then extras for leftover vx and |x|, then 1.06·hSb + 12 m of pad. V → vDown = max(−s.vz, 0). aMaxNet uses TMAX/m · cosθ − g, floored at 1.5 m/s². The V_LAND² term is the hover-slam target (−1.3 m/s), not a dead stop in the air."
  },
  "coastSlam":   {
    "title": "Coast until h ≤ h_sb, then slam",
    "file": "sim/index.html",
    "fn": "guidance",
    "anchor": "fn-guidance",
    "code": "  if (apMem.burn && h > 55 && vDown < 8) apMem.burn = false;\n  if (h <= hSb && h < 1200) apMem.burn = true;\n  const inBurn = !!apMem.burn;\n\n  let thLim;\n  if (h < 40) thLim = (5 + 10 * h / 40) * Math.PI / 180;\n  else if (h < 180) thLim = 16 * Math.PI / 180;\n  else thLim = 20 * Math.PI / 180;\n\n  let kx = 0.0022, kv = 0.022;\n  if (Math.abs(s.x) < 18 && Math.abs(s.vx) < 4) { kx = 0.0012; kv = 0.016; }\n  let thetaCmd = clamp(-kv * s.vx - kx * s.x, -thLim, thLim);\n  if (h < 14) thetaCmd *= h / 14;\n\n  const fuel = s.m - M_DRY;\n  let u = 0;\n  let phase = \"coast\";\n\n  if (inBurn && fuel > 15) {\n    if (h > 30) {\n      const aNet = (s.vz * s.vz - V_LAND * V_LAND) / (2 * h);\n      u = clamp((aNet + G) * s.m / (TMAX * Math.max(Math.cos(s.theta), 0.42)), 0, 1);\n      if (vDown > 25 && h > 40) u = Math.max(u, 0.92);\n      if (vDown < 10 && h > 50) { u = 0; apMem.burn = false; }\n    } else {\n      let vzCmd = -Math.min(1.15 + 0.12 * h, 7);\n      if (h < 7) vzCmd = -1.05;\n      let aNet = 3.5 * (vzCmd - s.vz);\n      if (s.vz > 0.4) aNet = -2;\n      u = clamp((aNet + G) * s.m / (TMAX * Math.max(Math.cos(s.theta), 0.5)), 0, 1);\n    }\n    phase = u > 0.04 ? \"burn\" : \"coast\";\n  } else {\n    const xMiss = Math.abs(s.x + s.vx * 8);\n    if (fuel > 3300 && h > hSb + 320 && h < 2200 && (xMiss > 400 || Math.abs(s.vx) > 36)) {\n      u = 0.50;\n      phase = \"approach\";\n    }\n  }",
    "note": "apMem.burn is the commit flag. Set when h ≤ hSb and h < 1200 m; cleared if you have killed sink well above the deck (h > 55 m and vDown < 8) so the vehicle does not hover at 150 m. Once in burn, u is solved from the remaining double-integrator aNet = (vz² − V_LAND²)/(2h), or a vz track in the last 30 m. A rare 'approach' 50% pulse exists only for a huge downrange miss with fuel to spare."
  },
  "attitude":   {
    "title": "Attitude PD / NDI and gimbal invert",
    "file": "sim/index.html",
    "fn": "guidance",
    "anchor": "fn-guidance",
    "code": "  let kx = 0.0022, kv = 0.022;\n  if (Math.abs(s.x) < 18 && Math.abs(s.vx) < 4) { kx = 0.0012; kv = 0.016; }\n  let thetaCmd = clamp(-kv * s.vx - kx * s.x, -thLim, thLim);\n  if (h < 14) thetaCmd *= h / 14;\n\n  const err = thetaCmd - s.theta;\n  const wn = 3.6, zeta = 1.12;\n  const alphaDes = wn * wn * err - 2 * zeta * wn * s.omega;\n  const T_est = Math.max(u * TMAX, 1);\n  const hc = hCom(s.m);\n  let delta = 0;\n  if (u >= 0.06) delta = clamp(alphaDes * inertia(s.m) / (hc * T_est), -DELTA_MAX, DELTA_MAX);\n  const fin = clamp(3.2 * err - 1.7 * s.omega, -1, 1);",
    "note": "Two contiguous excerpts from guidance(), in source order: the θ_cmd PD, then (after the slam-throttle block, which lives on the coastSlam chip) the NDI invert. θ_cmd = clamp(−kv vx − kx x). α_des = ωn² e − 2ζωn ω with ωn = 3.6, ζ = 1.12. Invert M = ℓ T sinδ ≈ ℓ T δ as δ = α_des · I / (hc · T_est). Fins do the same job while the engine is dark. The essay’s ê_T ∥ a_cmd + g ẑ is this commanded tilt, not atan2(ax, az+g)."
  },
  "evaluateContact":   {
    "title": "evaluateContact — success / RUD",
    "file": "sim/index.html",
    "fn": "evaluateContact",
    "anchor": "fn-evaluateContact",
    "code": "function evaluateContact() {\n  const tilt = Math.abs(s.theta);\n  const sink = Math.abs(s.vz);\n  const lat = Math.abs(s.vx);\n  const miss = Math.abs(s.x);\n  const spin = Math.abs(s.omega);\n  if (sink > 4.0) return { ok: false, why: \"HIGH SINK RATE\" };\n  if (tilt > 9 * Math.PI / 180) return { ok: false, why: \"TIP-OVER\" };\n  if (miss > PAD_R) return { ok: false, why: \"OFF PAD\" };\n  if (lat > 3.0) return { ok: false, why: \"LATERAL VELOCITY\" };\n  if (spin > 40 * Math.PI / 180) return { ok: false, why: \"TIP-OVER\" };\n  return { ok: true, why: \"GEAR DOWN  ·  VEHICLE STABLE\" };\n}",
    "note": "Soft landing in this trainer is a gate, not a crush-core integration: |vz| ≤ 4 m/s, |θ| ≤ 9°, |x| ≤ PAD_R (24 m), |vx| ≤ 3 m/s, |ω| ≤ 40°/s. Anything else is a RUD string. The essay's M_tip free-body is not computed — tip-over is this attitude/rate cut."
  },
  "landing":   {
    "title": "Gear contact",
    "file": "sim/index.html",
    "fn": "feetZ / evaluateContact / tick",
    "anchor": "fn-tick",
    "code": "function feetZ(s) { return s.z - hCom(s.m) * Math.cos(s.theta) - LEG; }\n\nfunction evaluateContact() {\n  const tilt = Math.abs(s.theta);\n  const sink = Math.abs(s.vz);\n  const lat = Math.abs(s.vx);\n  const miss = Math.abs(s.x);\n  const spin = Math.abs(s.omega);\n  if (sink > 4.0) return { ok: false, why: \"HIGH SINK RATE\" };\n  if (tilt > 9 * Math.PI / 180) return { ok: false, why: \"TIP-OVER\" };\n  if (miss > PAD_R) return { ok: false, why: \"OFF PAD\" };\n  if (lat > 3.0) return { ok: false, why: \"LATERAL VELOCITY\" };\n  if (spin > 40 * Math.PI / 180) return { ok: false, why: \"TIP-OVER\" };\n  return { ok: true, why: \"GEAR DOWN  ·  VEHICLE STABLE\" };\n}\n\n  const h = feetZ(s);\n  const wantLegs = h < 450 || lastPhase === \"burn\" || s.z < 500;\n  legsDeploy = clamp(legsDeploy + (wantLegs ? 1.6 : -0.8) * dt, 0, 1);\n\n  if (h <= 0) {\n    const frac = 0; // already at or past contact this substep\n    s.z -= h; // snap gear to deck\n    const ev = evaluateContact();\n    finish(ev.ok, ev.why);\n    return;\n  }",
    "note": "Contact is feetZ(s) ≤ 0. The COM is snapped so the gear sits on the deck (s.z −= h), then evaluateContact decides LZ-1 or RUD. Legs begin deploying when h < 450 m or the landing burn is already on — cosmetic, not a load path. No honeycomb stroke, no friction cone, no deck slope."
  }
};

window.SNIPPET_ALIASES = {
  "h_sb": "hsb",
  "hSb": "hsb",
  "hsb": "hsb",
  "suicide": "hsb",
  "stepPhysics": "stepPhysics",
  "guidance": "guidance",
  "spawnIC": "spawnIC",
  "s": "state",
  "state": "state",
  "hCom": "hCom",
  "h_com": "hCom",
  "ell": "hCom",
  "inertia": "inertia",
  "rho": "rho",
  "feetZ": "feetZ",
  "thrust": "thrust",
  "Tx": "thrust",
  "moment": "moment",
  "mdot": "mdot",
  "mass": "mdot",
  "integrator": "integrator",
  "euler": "integrator",
  "PHYS_HZ": "physHz",
  "physHz": "physHz",
  "aero": "aero",
  "fins": "aero",
  "attitude": "attitude",
  "delta": "attitude",
  "ndi": "attitude",
  "coastSlam": "coastSlam",
  "coast": "coastSlam",
  "landing": "landing",
  "evaluateContact": "evaluateContact",
  "constants": "constants",
  "throttle": "throttle"
};

