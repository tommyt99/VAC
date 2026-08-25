# F9 S1 Terminal Descent 3D

Playable 3D Falcon 9 first-stage landing sim for Tommy Tran.
Same plant as the 2D trainer. One Merlin. Open index.html via file://. Needs network once for Three.js. No build step.

## Controls

W/S throttle. IJKL or arrows gimbal (I/K pitch, J/L yaw). Space autopilot. R reset. P pause. C cycle camera (follow, chase, pad). Mouse drag orbit. Scroll zoom. Buttons: Reset, Pause, Autopilot, Perfect / Normal / Hard, Follow / Chase / Pad. Manual keys dismiss AP.

## States

r = (x, y, z) COM, +z up, pad at origin.
v = (vx, vy, vz) m/s.
q quaternion body-to-world, body +z is nose.
omega = (wx, wy, wz) body frame rad/s.
m mass kg.

Gear: z - hCom * (body-z dot world-z) - 2.8 m = 0.
hCom = L * (0.45 - 0.05 * fuelFrac), same as 2D.
I_trans = m * (L^2/12 + (L/2 - hCom)^2). Izz = m * R^2 / 2.

## How 3D extends 2D

The 2D trainer is the xz slice. Same numbers, same suicide burn.
Engine at the base. Thrust is body +z rotated by two-axis gimbal of 10 deg.
Moment is r_engine cross F. Gravity at COM has no moment.
Open-loop hover is an unstable equilibrium.
Sanity: hover holds when u tracks mass. Small tilt, gimbal 0, T above weight: tilt stays and the stack walks off the pad.

Vertical: 2D hover-slam. h_sb from sink rate and T/W. Coast then slam. Soften only in last 30 m. Do not hover at 150 m.

Horizontal: two-axis PD tilt vector kills vx, vy and walks x, y over the pad, then invert gimbal. Grid fins when engine is dark.

Integrator: semi-implicit Euler at 300 Hz.

## Numbers

42 m by 3.66 m stage. Dry 25600 kg. Landing prop 5200 kg (5000 on Hard).
Isp 282 s. Start T/W about 2.80. Pad radius 24 m. Gear 2.8 m.

Success: tilt under 9 deg, groundspeed under 3 m/s, sink under 4 m/s, range under 24 m.

Verified headless: Perfect lands. Normal 39 of 40. Hard about 1 in 3.

## Knobs

Top of sim.js: TMAX, M_DRY, M_FUEL0, ISP, DELTA_MAX, CD, V_LAND, PAD_R.

Inside guidance: kx, kv, and the h_sb fudge 1.06 plus 12. Start boxes in spawnIC.

Built for Tommy Tran.

CDN: unpkg.com/three@0.160.1/build/three.min.js
