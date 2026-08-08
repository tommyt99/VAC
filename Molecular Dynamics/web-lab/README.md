# VAC Molecular Dynamics Lab

An interactive, browser-based molecular dynamics lab built around a deterministic Lennard–Jones engine. It is the maintained web companion to the historical C++ simulations in this repository; peer-contributed source remains preserved under `archive/peer-contributions/`.

## What it does

- Simulates 32, 108, or 256 particles on a complete FCC lattice.
- Switches among Generic LJ, neon, argon, krypton, and xenon single-site presets.
- Runs either NVE velocity Verlet dynamics or a Langevin thermal bath.
- Visualizes particles with orbit, zoom, points/spheres, speed or energy coloring, velocity vectors, and motion trails.
- Charts energy, temperature, radial distribution, and mean-square displacement.
- Exports a standards-shaped multi-frame XYZ trajectory for VMD and an observables CSV.
- Runs entirely in the browser; trajectory data is not uploaded.

## Run locally

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Verification

```bash
npm test
```

The test suite checks characteristic Lennard–Jones values, shifted-force continuity, force/energy consistency, Newton's third law, periodic translation invariance, seeded initialization, deterministic integration, NVE energy and momentum stability, XYZ export, the production build, and the server-rendered interface.

## Scientific scope

The engine uses Lennard–Jones reduced units, periodic boundaries, minimum-image displacements, Gaussian initial velocities with center-of-mass removal, and a shifted-force cutoff. Substance presets map the same one-component reduced model into illustrative physical units; they are classical monatomic approximations, not complete force fields.

Hydrogen and water are intentionally not offered. They require separately validated bonded, orientational, charge, and long-range interaction models. Lennard–Jones parameter sets and cutoff treatments also vary, so this lab should be treated as an educational and numerical-methods tool rather than a research replacement for LAMMPS, GROMACS, or VMD.

The browser is the primary interactive view. Export XYZ when you want VMD's trajectory analysis and publication rendering tools.

## Keyboard and pointer controls

- Drag or touch-drag: orbit the camera
- Wheel or trackpad: zoom
- Space: play/pause when focus is outside a form control
- `.`: single step while paused
- `R`: restart the current setup

## Model references

- Argon mapping: σ = 3.405 Å and ε/kB = 119.8 K, as used in this [NIST-hosted parameter table](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=922033).
- Shifted-force cutoff context: [Toxvaerd and Dyre, J. Chem. Phys. 134, 081102 (2011)](https://doi.org/10.1063/1.3558787).
