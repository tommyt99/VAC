# Schwarzschild Black Hole Simulation

Interactive WebGL2 demo that ray-marches null geodesics in the Schwarzschild metric and samples a thin equatorial accretion disk, producing gravitational lensing of the far side of the disk (Einstein-ring–like wrap) and a dark event-horizon silhouette.

## Run

Shaders are loaded with `fetch`, so open the folder through a local static server:

```bash
cd "Blackhole Simulation"
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Controls

- **Drag** (mouse or touch) to orbit the camera
- **Scroll** to zoom
- Camera keeps a short inertial coast after release

## Physics notes (v1)

- Geometric units with \(M = 1\), so the Schwarzschild radius is \(r_s = 2\)
- Photon sphere near \(r = 3M\)
- Accretion disk from the ISCO (\(r = 6M\)) out to \(r \approx 18M\)
- Rays integrate with a second-order (RK2) null-geodesic step; plane crossings accumulate disk emission before falling into the horizon or escaping to a starfield

Out of scope for this pass: Kerr spin, Doppler beaming, volumetric corona.
