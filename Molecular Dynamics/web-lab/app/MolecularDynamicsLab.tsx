"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MiniChart } from "./components/MiniChart";
import {
  SimulationCanvas,
  type ColorMode,
  type Representation,
} from "./components/SimulationCanvas";
import {
  DEFAULT_CONFIG,
  framesToXyz,
  MDSimulation,
  PARTICLE_COUNTS,
  physicalTimePicoseconds,
  snapshotToFrame,
  SUBSTANCES,
  type SimulationConfig,
  type SimulationSnapshot,
  type SubstanceKey,
  type TrajectoryFrame,
} from "./lib/md";

type HistoryPoint = {
  time: number;
  total: number;
  kinetic: number;
  potential: number;
  temperature: number;
  pressure: number;
  msd: number;
};

type ChartTab = "energy" | "temperature" | "structure";

const SPEEDS = [1, 2, 4, 8] as const;
const MAX_HISTORY = 180;
const MAX_TRAJECTORY_FRAMES = 120;

function historyPoint(snapshot: SimulationSnapshot): HistoryPoint {
  return {
    time: snapshot.time,
    total: snapshot.total,
    kinetic: snapshot.kinetic,
    potential: snapshot.potential,
    temperature: snapshot.temperature,
    pressure: snapshot.pressure,
    msd: snapshot.meanSquareDisplacement,
  };
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatSigned(value: number, digits = 4) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function MolecularDynamicsLab() {
  const [initial] = useState(() => {
    const engine = new MDSimulation(DEFAULT_CONFIG);
    const initialSnapshot = engine.snapshot();
    return {
      engine,
      snapshot: initialSnapshot,
      rdf: engine.radialDistribution(),
      history: [historyPoint(initialSnapshot)],
      trajectory: [snapshotToFrame(initialSnapshot)],
    };
  });
  const engineRef = useRef<MDSimulation>(initial.engine);

  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(initial.snapshot);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>(initial.history);
  const [rdf, setRdf] = useState(initial.rdf);
  const [chartTab, setChartTab] = useState<ChartTab>("energy");
  const [representation, setRepresentation] = useState<Representation>("spheres");
  const [colorBy, setColorBy] = useState<ColorMode>("substance");
  const [particleSize, setParticleSize] = useState(1);
  const [showBox, setShowBox] = useState(true);
  const [showVectors, setShowVectors] = useState(false);
  const [showTrails, setShowTrails] = useState(false);
  const [cameraResetSignal, setCameraResetSignal] = useState(0);
  const trajectoryRef = useRef<TrajectoryFrame[]>(initial.trajectory);
  const lastRecordedStep = useRef(0);

  const preset = SUBSTANCES[config.substance];
  const pending = JSON.stringify(config) !== JSON.stringify(draft);

  const resetSimulation = useCallback(
    (nextConfig: SimulationConfig, shouldRun = false) => {
      try {
        const engine = new MDSimulation(nextConfig);
        const nextSnapshot = engine.snapshot();
        engineRef.current = engine;
        setConfig(nextConfig);
        setDraft(nextConfig);
        setSnapshot(nextSnapshot);
        setHistory([historyPoint(nextSnapshot)]);
        setRdf(engine.radialDistribution());
        trajectoryRef.current = [snapshotToFrame(nextSnapshot)];
        lastRecordedStep.current = 0;
        setError(null);
        setRunning(shouldRun);
      } catch (cause) {
        setRunning(false);
        setError(cause instanceof Error ? cause.message : "Could not initialize the system.");
      }
    },
    [],
  );

  const recordSnapshot = useCallback((next: SimulationSnapshot) => {
    if (next.step - lastRecordedStep.current < 16) return;
    lastRecordedStep.current = next.step;
    setHistory((current) => [...current, historyPoint(next)].slice(-MAX_HISTORY));
    trajectoryRef.current = [
      ...trajectoryRef.current,
      snapshotToFrame(next),
    ].slice(-MAX_TRAJECTORY_FRAMES);
    if (next.step % 128 < 16 && engineRef.current) {
      setRdf(engineRef.current.radialDistribution());
    }
  }, []);

  const stepOnce = useCallback(
    (count = 1) => {
      try {
        engineRef.current!.step(count);
        const next = engineRef.current!.snapshot();
        setSnapshot(next);
        recordSnapshot(next);
        setError(null);
      } catch (cause) {
        setRunning(false);
        setError(
          cause instanceof Error
            ? cause.message
            : "The state became unstable. Reduce the timestep and restart.",
        );
      }
    },
    [recordSnapshot],
  );

  useEffect(() => {
    if (!running) return;
    let animationFrame = 0;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;
      stepOnce(speed);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [running, speed, stepOnce]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, select, textarea, button") ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        setRunning((value) => !value);
      } else if (event.key.toLowerCase() === "r") {
        resetSimulation(config, false);
      } else if (event.key === "." && !running) {
        stepOnce(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [config, resetSimulation, running, stepOnce]);

  const selectSubstance = (substance: SubstanceKey) => {
    const next = { ...config, substance };
    resetSimulation(next, false);
  };

  const exportXyz = () => {
    const frames = trajectoryRef.current;
    downloadText(
      `${preset.key}-trajectory.xyz`,
      framesToXyz(frames, preset),
      "chemical/x-xyz;charset=utf-8",
    );
  };

  const exportCsv = () => {
    const lines = [
      "time_reduced,temperature_reduced,kinetic_per_particle,potential_per_particle,total_per_particle,pressure_reduced,msd_reduced",
      ...history.map((point) =>
        [
          point.time,
          point.temperature,
          point.kinetic / config.particleCount,
          point.potential / config.particleCount,
          point.total / config.particleCount,
          point.pressure,
          point.msd,
        ].join(","),
      ),
    ];
    downloadText(`${preset.key}-observables.csv`, lines.join("\n"), "text/csv;charset=utf-8");
  };

  const chartSeries = useMemo(() => {
    if (chartTab === "temperature") {
      return [
        {
          label: "Temperature T*",
          color: "#e0a45a",
          values: history.map((point) => ({ x: point.time, y: point.temperature })),
        },
      ];
    }
    if (chartTab === "structure") {
      return [
        {
          label: "Radial distribution g(r)",
          color: "#67c6c3",
          values: rdf.map((point) => ({ x: point.radius, y: point.value })),
        },
      ];
    }
    return [
      {
        label: "Total",
        color: "#f2ebe0",
        values: history.map((point) => ({ x: point.time, y: point.total / config.particleCount })),
      },
      {
        label: "Kinetic",
        color: "#e0a45a",
        values: history.map((point) => ({ x: point.time, y: point.kinetic / config.particleCount })),
      },
      {
        label: "Potential",
        color: "#67c6c3",
        values: history.map((point) => ({ x: point.time, y: point.potential / config.particleCount })),
      },
    ];
  }, [chartTab, config.particleCount, history, rdf]);

  const physicalTime = physicalTimePicoseconds(snapshot.time, preset);
  const momentumMagnitude = Math.hypot(...snapshot.momentum);

  return (
    <main className="lab-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-mark">VAC</span>
          <span className="brand-rule" aria-hidden="true" />
          <span>Interactive lab</span>
        </div>
        <div className="header-actions" aria-label="Data export">
          <button className="button button-quiet" type="button" onClick={exportCsv}>
            Export CSV
          </button>
          <button className="button button-outline" type="button" onClick={exportXyz}>
            Download XYZ
          </button>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Computational physics / 01</p>
          <h1>Molecular dynamics</h1>
        </div>
        <p className="lede">
          Explore how particles move, collide, and organize under molecular forces—directly in your browser.
        </p>
        <div className="model-badge">
          <span className="status-dot" aria-hidden="true" />
          Educational model · shifted-force Lennard–Jones
        </div>
      </section>

      <div className="lab-grid">
        <aside className="panel setup-panel" aria-labelledby="setup-heading">
          <div className="panel-heading">
            <div>
              <p className="panel-index">01</p>
              <h2 id="setup-heading">Set up the system</h2>
            </div>
            {pending && <span className="pending-badge">Pending</span>}
          </div>

          <div className="control-stack">
            <label className="field">
              <span>Substance</span>
              <select
                value={config.substance}
                onChange={(event) => selectSubstance(event.target.value as SubstanceKey)}
              >
                {Object.values(SUBSTANCES).map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>Single-site monatomic LJ approximation</small>
            </label>

            <div className="preset-card">
              <div className="atom-swatch" style={{ background: preset.color }}>
                {preset.symbol}
              </div>
              <div>
                <strong>{preset.label}</strong>
                <span>
                  σ {preset.sigmaAngstrom} Å · ε/kB {preset.epsilonKelvin} K
                </span>
              </div>
            </div>

            <label className="field">
              <span>Particle count</span>
              <select
                value={draft.particleCount}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    particleCount: Number(event.target.value) as SimulationConfig["particleCount"],
                  }))
                }
              >
                {PARTICLE_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count} atoms · FCC lattice
                  </option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <label className="field">
                <span>Temperature T*</span>
                <select
                  value={draft.temperature}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, temperature: Number(event.target.value) }))
                  }
                >
                  <option value={0.55}>0.55 · cool</option>
                  <option value={0.9}>0.90 · liquid</option>
                  <option value={1.25}>1.25 · warm</option>
                  <option value={1.8}>1.80 · hot</option>
                </select>
              </label>
              <label className="field">
                <span>Density ρ*</span>
                <select
                  value={draft.density}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, density: Number(event.target.value) }))
                  }
                >
                  <option value={0.35}>0.35 · dilute</option>
                  <option value={0.65}>0.65</option>
                  <option value={0.82}>0.82 · liquid</option>
                  <option value={1}>1.00 · dense</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Ensemble</span>
              <select
                value={draft.ensemble}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    ensemble: event.target.value as SimulationConfig["ensemble"],
                  }))
                }
              >
                <option value="nve">NVE · energy conserving</option>
                <option value="langevin">Langevin · thermal bath</option>
              </select>
              <small>
                {draft.ensemble === "nve"
                  ? "Temperature is initialized, not held."
                  : "Stochastic thermostat with γ* = 1."}
              </small>
            </label>

            <div className="field-row">
              <label className="field">
                <span>Timestep Δt*</span>
                <select
                  value={draft.timestep}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, timestep: Number(event.target.value) }))
                  }
                >
                  <option value={0.002}>0.002</option>
                  <option value={0.004}>0.004</option>
                  <option value={0.006}>0.006</option>
                  <option value={0.008}>0.008</option>
                </select>
              </label>
              <label className="field">
                <span>Random seed</span>
                <input
                  type="number"
                  min="0"
                  max="4294967295"
                  value={draft.seed}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, seed: Number(event.target.value) }))
                  }
                />
              </label>
            </div>
          </div>

          <button
            className="button button-primary apply-button"
            type="button"
            disabled={!pending}
            onClick={() => resetSimulation(draft, false)}
          >
            Apply & restart
          </button>

          <details className="disclosure display-disclosure">
            <summary>Display options</summary>
            <div className="control-stack display-controls">
              <label className="field">
                <span>Representation</span>
                <select
                  value={representation}
                  onChange={(event) => setRepresentation(event.target.value as Representation)}
                >
                  <option value="spheres">Space-filling spheres</option>
                  <option value="points">Precision points</option>
                </select>
              </label>
              <label className="field">
                <span>Color by</span>
                <select value={colorBy} onChange={(event) => setColorBy(event.target.value as ColorMode)}>
                  <option value="substance">Substance</option>
                  <option value="speed">Speed</option>
                  <option value="energy">Kinetic energy</option>
                </select>
              </label>
              <label className="range-field">
                <span>Particle size</span>
                <output>{particleSize.toFixed(1)}×</output>
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.1"
                  value={particleSize}
                  onChange={(event) => setParticleSize(Number(event.target.value))}
                />
              </label>
              <label className="check-field">
                <input type="checkbox" checked={showBox} onChange={(event) => setShowBox(event.target.checked)} />
                <span>Simulation box</span>
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={(event) => setShowVectors(event.target.checked)}
                />
                <span>Velocity vectors</span>
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={showTrails}
                  onChange={(event) => setShowTrails(event.target.checked)}
                />
                <span>Motion trails</span>
              </label>
            </div>
          </details>
        </aside>

        <section className="stage-column" aria-label="Interactive simulation">
          <div className="stage-frame">
            <div className="stage-topbar">
              <div className="stage-system">
                <span style={{ background: preset.color }} aria-hidden="true" />
                {preset.label.toUpperCase()} · {config.particleCount} ATOMS · {config.ensemble.toUpperCase()}
              </div>
              <button
                className="stage-button"
                type="button"
                onClick={() => setCameraResetSignal((value) => value + 1)}
              >
                Reset view
              </button>
            </div>
            <SimulationCanvas
              snapshot={snapshot}
              preset={preset}
              representation={representation}
              colorBy={colorBy}
              showBox={showBox}
              showVectors={showVectors}
              showTrails={showTrails}
              particleSize={particleSize}
              resetSignal={cameraResetSignal}
            />
            <div className="stage-hint">Drag to orbit · scroll to zoom · space to pause</div>
            {error && (
              <div className="simulation-error" role="alert">
                <strong>Simulation paused</strong>
                <span>{error} Reduce Δt* or restart the system.</span>
              </div>
            )}
          </div>

          <div className="transport" aria-label="Simulation transport controls">
            <button
              className="play-button"
              type="button"
              onClick={() => setRunning((value) => !value)}
              aria-label={running ? "Pause simulation" : "Play simulation"}
            >
              <span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>
              {running ? "Pause" : "Play"}
            </button>
            <button className="transport-button" type="button" disabled={running} onClick={() => stepOnce(1)}>
              Step
            </button>
            <button className="transport-button" type="button" onClick={() => resetSimulation(config, false)}>
              Restart
            </button>
            <span className="transport-divider" aria-hidden="true" />
            <label className="speed-control">
              <span>Simulation speed</span>
              <select
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value) as (typeof SPEEDS)[number])}
              >
                {SPEEDS.map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
            <span className="transport-note">Speed changes steps per frame, never Δt*</span>
          </div>
        </section>

        <aside className="panel observables-panel" aria-labelledby="observables-heading">
          <div className="panel-heading">
            <div>
              <p className="panel-index">02</p>
              <h2 id="observables-heading">Live observables</h2>
            </div>
            <span className={`run-state ${running ? "is-running" : ""}`}>{running ? "Running" : "Paused"}</span>
          </div>

          <div className="metric-grid">
            <article className="metric-card">
              <span>Temperature</span>
              <strong>{snapshot.temperature.toFixed(3)}</strong>
              <small>T*</small>
            </article>
            <article className="metric-card">
              <span>Total energy</span>
              <strong>{formatSigned(snapshot.total / config.particleCount, 3)}</strong>
              <small>E*/N</small>
            </article>
            <article className="metric-card">
              <span>{config.ensemble === "nve" ? "Energy drift" : "Pressure"}</span>
              <strong>
                {config.ensemble === "nve"
                  ? `${formatSigned(snapshot.energyDrift * 100, 3)}%`
                  : snapshot.pressure.toFixed(3)}
              </strong>
              <small>{config.ensemble === "nve" ? "from initial" : "P*"}</small>
            </article>
            <article className="metric-card">
              <span>Simulation time</span>
              <strong>{snapshot.time.toFixed(2)}</strong>
              <small>t*</small>
            </article>
          </div>

          <div className="chart-panel">
            <div className="tab-list" role="tablist" aria-label="Observable chart">
              {(["energy", "temperature", "structure"] as ChartTab[]).map((tab) => (
                <button
                  key={tab}
                  className={chartTab === tab ? "active" : ""}
                  role="tab"
                  aria-selected={chartTab === tab}
                  type="button"
                  onClick={() => setChartTab(tab)}
                >
                  {tab === "structure" ? "g(r)" : tab}
                </button>
              ))}
            </div>
            <MiniChart
              title={chartTab === "energy" ? "Energy per particle" : chartTab === "temperature" ? "Reduced temperature" : "Radial distribution"}
              series={chartSeries}
              xLabel={chartTab === "structure" ? "r*" : "t*"}
              yLabel={chartTab === "energy" ? "E*/N" : chartTab === "temperature" ? "T*" : "g(r)"}
              height={190}
            />
            <div className="secondary-stat">
              <span>Mean-square displacement</span>
              <strong>{snapshot.meanSquareDisplacement.toFixed(4)} σ²</strong>
            </div>
          </div>

          <dl className="metadata-list">
            <div><dt>Integrator</dt><dd>Velocity Verlet</dd></div>
            <div><dt>Boundary</dt><dd>Periodic</dd></div>
            <div><dt>Cutoff</dt><dd>{snapshot.cutoff.toFixed(2)} σ</dd></div>
            <div><dt>Box</dt><dd>{snapshot.boxLength.toFixed(2)} σ</dd></div>
            <div><dt>Seed</dt><dd>{config.seed}</dd></div>
            <div><dt>|P|</dt><dd>{momentumMagnitude.toExponential(1)}</dd></div>
            {preset.key !== "generic" && (
              <div><dt>Mapped time</dt><dd>{physicalTime.toFixed(2)} ps</dd></div>
            )}
          </dl>

          <details className="disclosure science-notes">
            <summary>Science notes & limitations</summary>
            <div>
              <p>
                Particles interact through a 12–6 Lennard–Jones potential with a shifted-force cutoff. The engine uses FCC initialization, Gaussian velocities, periodic boundaries, and reduced units.
              </p>
              <p>
                Ne, Ar, Kr, and Xe are classical monatomic mappings. At equal T* and ρ*, they share the same reduced trajectory; the preset changes physical-unit conversion and appearance. Parameter sets vary, and quantum, many-body, and long-range corrections are omitted.
              </p>
              <p>
                H₂ and water are intentionally excluded until distinct bonded and electrostatic models are validated. Use the XYZ export for deeper inspection in VMD.
              </p>
            </div>
          </details>
        </aside>
      </div>

      <footer className="site-footer">
        <span>VAC Computational Physics Lab</span>
        <span>Runs locally in your browser · no trajectory data uploaded</span>
      </footer>

      <p className="sr-only" aria-live="polite">
        {preset.label} loaded with {config.particleCount} atoms. Simulation {running ? "running" : "paused"}.
      </p>
    </main>
  );
}
