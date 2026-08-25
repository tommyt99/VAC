# Falcon Landing

2D / 3D Falcon 9 first-stage landing trainer plus the technical tutorial.

This is a planar-then-3D inverted-pendulum plant: one Merlin at the base, gimbaled thrust, suicide-burn / hover-slam into LZ-1. Same numbers across the 2D and 3D trainers. The essay is the science; the annotated edition pops the real JavaScript next to each equation.

## Layout

| Folder | What |
|---|---|
| [2D Trainer](2D%20Trainer/) | Canvas sim. Open `index.html`. |
| [3D Trainer](3D%20Trainer/) | Three.js pad. Open `index.html` (needs network once for Three.js). |
| [Tutorial](Tutorial/) | Night-notebook essay. Open `index.html`. |
| [Annotated Tutorial](Annotated%20Tutorial/) | Same essay with code-chip popouts into the 2D plant. |

## Run

No build. Download the folder or clone the repo and open the HTML files in a browser.

- 2D: `W/S` throttle, `A/D` gimbal, `Space` autopilot, `R` reset. Perfect / Normal / Hard start boxes.
- 3D: same plant, two-axis gimbal (`IJKL` or arrows), `C` cycles follow / chase / pad cam, mouse orbit.

## Model (short)

States: position, velocity, attitude (2D: θ; 3D: quaternion), mass.  
Thrust at the engine, COM above it, moment `r × T`. Open-loop hover is unstable.  
Vertical channel is a suicide burn, not a 150 m hover.

Public Falcon numbers in the tutorial are tagged official vs unofficial.

Parked here because VAC is the simulations / scientific-computing shelf.
