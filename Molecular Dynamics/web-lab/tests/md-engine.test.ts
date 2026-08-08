import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONFIG,
  MDSimulation,
  SUBSTANCES,
  computeLennardJonesForces,
  framesToXyz,
  rawLennardJones,
  shiftedForceLennardJones,
  snapshotToFrame,
  wrapCoordinate,
} from "../app/lib/md.ts";

function assertClose(
  actual: number,
  expected: number,
  tolerance: number,
  message?: string,
): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    message ?? `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("raw Lennard-Jones potential and force match characteristic values", () => {
  const atSigma = rawLennardJones(1);
  assert.equal(atSigma.potential, 0);
  assert.equal(atSigma.forceMagnitude, 24);

  const equilibrium = rawLennardJones(2 ** (1 / 6));
  assertClose(equilibrium.potential, -1, 2e-15);
  assertClose(equilibrium.forceMagnitude, 0, 2e-14);
  assert.throws(() => rawLennardJones(0), /positive/);
});

test("shifted-force Lennard-Jones potential and force are continuous at cutoff", () => {
  const cutoff = 2.5;
  assert.deepEqual(shiftedForceLennardJones(cutoff, cutoff), {
    potential: 0,
    forceMagnitude: 0,
  });
  assert.deepEqual(shiftedForceLennardJones(cutoff + 0.01, cutoff), {
    potential: 0,
    forceMagnitude: 0,
  });

  const justInside = shiftedForceLennardJones(cutoff - 1e-7, cutoff);
  assert.ok(Math.abs(justInside.potential) < 1e-12);
  assert.ok(Math.abs(justInside.forceMagnitude) < 2e-8);
});

test("shifted-force value agrees with the negative numerical energy gradient", () => {
  const radius = 1.31;
  const cutoff = 2.5;
  const h = 1e-6;
  const upper = shiftedForceLennardJones(radius + h, cutoff).potential;
  const lower = shiftedForceLennardJones(radius - h, cutoff).potential;
  const numericalForce = -(upper - lower) / (2 * h);
  const analyticForce = shiftedForceLennardJones(radius, cutoff).forceMagnitude;

  assertClose(analyticForce, numericalForce, 2e-9);
});

test("pair forces obey Newton's third law and periodic translation invariance", () => {
  const boxLength = 6;
  const cutoff = 2.5;
  const acrossBoundary = new Float64Array([0.1, 1.2, 2.3, 5.0, 1.2, 2.3]);
  const first = computeLennardJonesForces(acrossBoundary, boxLength, cutoff);

  for (let axis = 0; axis < 3; axis += 1) {
    assertClose(first.forces[axis] + first.forces[axis + 3], 0, 1e-14);
  }
  assert.ok(first.forces[0] > 0, "the wrapped separation should be repulsive");

  const translated = new Float64Array(acrossBoundary.length);
  for (let i = 0; i < acrossBoundary.length; i += 3) {
    translated[i] = wrapCoordinate(acrossBoundary[i] + 1.7, boxLength);
    translated[i + 1] = wrapCoordinate(acrossBoundary[i + 1] - 2.1, boxLength);
    translated[i + 2] = wrapCoordinate(acrossBoundary[i + 2] + 3.3, boxLength);
  }
  const second = computeLennardJonesForces(translated, boxLength, cutoff);

  assertClose(second.potential, first.potential, 2e-9);
  assertClose(second.virial, first.virial, 2e-8);
  for (let i = 0; i < first.forces.length; i += 1) {
    assertClose(second.forces[i], first.forces[i], 2e-8);
  }
});

test("initialization is seeded, zero-momentum, and exactly temperature-scaled", () => {
  const config = {
    ...DEFAULT_CONFIG,
    particleCount: 32 as const,
    temperature: 1.15,
    seed: 123456,
  };
  const first = new MDSimulation(config).snapshot();
  const repeat = new MDSimulation(config).snapshot();
  const otherSeed = new MDSimulation({ ...config, seed: 123457 }).snapshot();

  assert.deepEqual(first.positions, repeat.positions);
  assert.deepEqual(first.velocities, repeat.velocities);
  assert.notDeepEqual(first.velocities, otherSeed.velocities);
  assertClose(first.temperature, config.temperature, 2e-15);
  for (const component of first.momentum) assertClose(component, 0, 2e-14);
  for (const coordinate of first.positions) {
    assert.ok(coordinate >= 0 && coordinate < first.boxLength);
  }
  assert.ok(first.cutoff < first.boxLength / 2);
});

test("seeded trajectories remain deterministic after integration", () => {
  const config = {
    ...DEFAULT_CONFIG,
    particleCount: 32 as const,
    timestep: 0.003,
    seed: 77,
  };
  const first = new MDSimulation(config);
  const repeat = new MDSimulation(config);
  first.step(80);
  repeat.step(80);

  assert.deepEqual(first.snapshot(), repeat.snapshot());
});

test("NVE velocity-Verlet trajectory conserves energy and momentum", () => {
  const simulation = new MDSimulation({
    ...DEFAULT_CONFIG,
    substance: "generic",
    particleCount: 32,
    density: 0.82,
    temperature: 0.9,
    timestep: 0.004,
    ensemble: "nve",
    seed: 987,
  });
  let maximumRelativeDrift = 0;

  for (let index = 0; index < 1_200; index += 1) {
    simulation.step();
    const snapshot = simulation.snapshot();
    maximumRelativeDrift = Math.max(
      maximumRelativeDrift,
      Math.abs(snapshot.energyDrift),
    );
  }

  const final = simulation.snapshot();
  assert.ok(maximumRelativeDrift < 5e-4, `energy drift was ${maximumRelativeDrift}`);
  assertClose(final.time, 4.8, 2e-13);
  assert.equal(final.step, 1_200);
  assert.ok(Number.isFinite(final.temperature));
  assert.ok(Number.isFinite(final.pressure));
  for (const component of final.momentum) assertClose(component, 0, 3e-14);
});

test("trajectory frames clone snapshots and export valid multi-frame XYZ", () => {
  const simulation = new MDSimulation({
    ...DEFAULT_CONFIG,
    particleCount: 32,
    seed: 19,
  });
  const initialSnapshot = simulation.snapshot();
  const initialFrame = snapshotToFrame(initialSnapshot);
  simulation.step(10);
  const laterFrame = snapshotToFrame(simulation.snapshot());

  initialSnapshot.positions[0] = 999;
  assert.notEqual(initialFrame.positions[0], 999, "frames must own their coordinates");

  const xyz = framesToXyz([initialFrame, laterFrame], SUBSTANCES.argon);
  const lines = xyz.split("\n");
  const linesPerFrame = simulation.particleCount + 2;
  assert.equal(lines.length, linesPerFrame * 2);
  assert.equal(lines[0], String(simulation.particleCount));
  assert.match(lines[1], /^step=0 time\*=0\.000000 box\*=\d+\.\d{6} model=shifted-force-lj$/);
  assert.match(lines[2], /^Ar -?\d+\.\d{8} -?\d+\.\d{8} -?\d+\.\d{8}$/);
  assert.equal(lines[linesPerFrame], String(simulation.particleCount));
  assert.match(lines[linesPerFrame + 1], /^step=10 time\*=0\.040000 /);
});
