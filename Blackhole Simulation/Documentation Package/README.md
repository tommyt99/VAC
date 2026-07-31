# VAC Schwarzschild Simulation — Documentation Package

This package explains the black-hole simulation in `Blackhole Simulation/` at repository snapshot `6904ea0` on branch `optimize`.

## Package contents

- `VAC_Schwarzschild_Simulation_Technical_Report.pdf` — finished 17-page report for reading and sharing.
- `VAC_Schwarzschild_Simulation_Technical_Report.docx` — editable source of the report.
- `VAC_Schwarzschild_Simulation_Presentation.pptx` — editable 13-slide presentation with presenter notes and a source block on every slide.

## Core interpretation

The project is a real-time WebGL2 ray tracer through a fixed Schwarzschild spacetime. Its scientific core is the reduced null-geodesic equation implemented in the fragment shader and advanced with explicit midpoint RK2 integration.

The ray paths, capture behavior, and Schwarzschild landmark radii are physics-based. The disk palette, spiral bands, opacity, photon-sphere glow, procedural stars, and final post-processing are illustrative. The project is not a numerical-relativity solver, fluid simulation, or calibrated radiative-transfer model.

## Run the simulation

```sh
cd "Blackhole Simulation"
python3 -m http.server 8080
```

Open `http://localhost:8080` in a browser with WebGL2 support. Drag to orbit and scroll to zoom.

## Verification performed

- The simulation initialized with WebGL2, loaded its primary assets, and responded to pointer and wheel controls in desktop and mobile viewport checks.
- The report was rendered to 17 pages and inspected visually; its accessibility audit reported no high-, medium-, or low-severity findings, and all table dimensions were internally consistent.
- The PDF was independently rasterized and inspected across all 17 pages.
- The PowerPoint was rendered from the exported `.pptx`, inspected slide-by-slide, and passed the presentation overflow test. All 13 slides include presenter notes and source blocks.

Line references in the report and slides match snapshot `6904ea0`; re-check them after changes to the shader or JavaScript.
