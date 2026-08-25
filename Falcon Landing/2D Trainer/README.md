# F9 S1 Terminal Descent

A self-contained 2D Falcon 9 first-stage landing sim. The vehicle is a planar inverted pendulum: a gimbaled engine at the base applies both force and a moment about the center of mass. Autopilot (on by default) flies a suicide-burn / hover-slam into LZ-1. You can also take the stick and crash it.

## How to open

Open index.html in a browser. Double-click works. No build step.

## Controls

W/S or up/down: throttle
A/D or left/right: gimbal (manual keys dismiss autopilot)
Space: autopilot on/off
R: reset (new randomized attempt)
P: pause
Buttons: Perfect start, Normal, Hard

## Why this is an inverted pendulum

The engine sits at the tail. The COM is about 17-19 m above it, so thrust is applied at a lever arm. Gravity acts at the COM and produces no moment.

r_engine = (-h_com * sin(theta), -h_com * cos(theta))
F        = (T * sin(theta+delta), T * cos(theta+delta))
M        = r cross F = h_com * T * sin(delta)

When delta = 0 the force line passes through the COM (no torque). If the stack is already tilted, that force has a horizontal component and you accelerate off the pad. Open-loop hover (theta = 0, delta = 0, T = mg) is an equilibrium and it is unstable. The same gimbaled vector has to hold weight, translate over the X, and produce the moment that keeps attitude from walking away. That coupling is the inverted pendulum.

Sanity checks:
- theta = 0, delta = 0, u = mg/Tmax: hovers (u must track mass as fuel burns).
- small theta, delta = 0, T > mg: theta stays put, x runs away (tips off the pad).

## States

x: downrange, m (pad at 0)
z: COM altitude, m
vx, vz: m/s
theta: pitch from vertical, rad; + tips the nose toward +x
omega: pitch rate, rad/s
m: mass, kg

Gear contact: z - h_com*cos(theta) - 2.8 m = 0 (legs 2.8 m below the engine).

## Equations

dx/dt = vx
dz/dt = vz
m * dvx/dt = T*sin(theta+delta) - 0.5*rho*|v|*Cd*A * vx/|v|
m * dvz/dt = T*cos(theta+delta) - m*g - 0.5*rho*|v|*Cd*A * vz/|v|
I * domega/dt = h_com*T*sin(delta) + M_aero + M_fins
dtheta/dt = omega
dm/dt = -T / (Isp * g0)

T = u * Tmax, u in [0, 1], delta in [-10 deg, +10 deg].
Atmosphere: rho = 1.225 * exp(-z / 8500). Aero is intentionally small so the gimbal / inverted-pendulum story stays in front.
Integrator: semi-implicit Euler at 300 Hz, drawn with requestAnimationFrame.

## Suicide burn / hover-slam

Latest altitude at which max T/W can still kill the sink rate:

h_sb = (vz^2 - v_land^2) / (2 * (Tmax/m - g))
     + a little extra for leftover vx and |x|
     + about 12 m pad

Coast until h <= h_sb, then burn. If the burn kills speed well above the deck, cut and fall -- do not hover at 150 m. Last ~30 m tracks a sinking vz into about -1.2 m/s at the gear. That is the hover-slam: T/W at landing is well above 1, so you cannot loiter on the engine.

Attitude: PD / NDI on theta. Command a small tilt that produces the horizontal accel that kills vx and walks x back over the pad, then invert M = h_com*T*sin(delta) for the gimbal. Grid fins do the same job while the engine is dark.

## Numbers (single-engine landing)

Height / diameter: 42 m / 3.66 m (Falcon-ish first stage)
Dry mass: 25600 kg
Landing prop: 5200 kg (5000 kg on Hard) -- about 17 s at full throttle
Start mass: 30800 kg, T/W max about 2.80
Dry T/W: 3.37 (why it cannot hover for long)
Tmax: 845 kN (one Merlin 1D sea level)
Isp: 282 s SL; mdot = T/(Isp*g0) about 305 kg/s at 100 percent
COM: 40 percent of height (full landing fuel) to 45 percent (dry). Empty COM is higher than full.
Gimbal: +/- 10 deg hard stop
Cd * A: 0.70 * 10.5 m^2 (quadratic drag, not dominant)
Gear: 2.8 m; touchdown with engine about 2.8 m AGL
Pad: 24 m radius

Success: |theta| < 9 deg, |vx| < 3 m/s, |vz| < 4 m/s, |x| < 24 m.
Anything else at contact is a RUD (high sink, tip-over, off-pad, side load).

Autopilot land rate in the sibling physics prototype (same gains and ICs): Normal about 100 percent of 50 randomized starts. Hard about 1 in 3 (fuel-limited, as intended). Perfect is a demo.

## Knobs worth turning

These live at the top of the script in index.html:

TMAX, M_DRY, M_FUEL0: T/W and burn time. Lower T/W means earlier light and less hover margin.
ISP: prop consumption
DELTA_MAX: gimbal stop (control authority)
CD: raise it and aero starts to steal the pendulum story
V_LAND: target touchdown sink rate
PAD_R: how fat the X is
Guidance kx, kv inside guidance(): how hard it tilts to recenter
h_sb fudge (1.06 and +12): light earlier or later
Start boxes in spawnIC(): Normal / Hard / Perfect envelopes

Built for Tommy Tran, a structural / bridge engineer who asked for a rocket landing sim and correctly called it an inverted pendulum.
