export type SubstanceKey = "argon" | "neon" | "krypton" | "xenon" | "generic";
export type Ensemble = "nve" | "langevin";

export type SubstancePreset = {
  key: SubstanceKey;
  label: string;
  symbol: string;
  model: string;
  color: string;
  sigmaAngstrom: number;
  epsilonKelvin: number;
  massAmu: number;
};

export const SUBSTANCES: Record<SubstanceKey, SubstancePreset> = {
  argon: {
    key: "argon",
    label: "Argon (Ar)",
    symbol: "Ar",
    model: "Monatomic Lennard–Jones preset",
    color: "#e0a45a",
    sigmaAngstrom: 3.405,
    epsilonKelvin: 119.8,
    massAmu: 39.948,
  },
  neon: {
    key: "neon",
    label: "Neon (Ne)",
    symbol: "Ne",
    model: "Monatomic Lennard–Jones preset",
    color: "#f28ba8",
    sigmaAngstrom: 2.789,
    epsilonKelvin: 35.6,
    massAmu: 20.18,
  },
  krypton: {
    key: "krypton",
    label: "Krypton (Kr)",
    symbol: "Kr",
    model: "Monatomic Lennard–Jones preset",
    color: "#a78bfa",
    sigmaAngstrom: 3.65,
    epsilonKelvin: 171,
    massAmu: 83.798,
  },
  xenon: {
    key: "xenon",
    label: "Xenon (Xe)",
    symbol: "Xe",
    model: "Monatomic Lennard–Jones preset",
    color: "#67c6c3",
    sigmaAngstrom: 4.1,
    epsilonKelvin: 221,
    massAmu: 131.293,
  },
  generic: {
    key: "generic",
    label: "Generic LJ particles",
    symbol: "LJ",
    model: "Dimensionless 12–6 Lennard–Jones",
    color: "#f2ebe0",
    sigmaAngstrom: 1,
    epsilonKelvin: 1,
    massAmu: 1,
  },
};

export const PARTICLE_COUNTS = [32, 108, 256] as const;

export type SimulationConfig = {
  substance: SubstanceKey;
  particleCount: (typeof PARTICLE_COUNTS)[number];
  density: number;
  temperature: number;
  timestep: number;
  ensemble: Ensemble;
  friction: number;
  seed: number;
};

export const DEFAULT_CONFIG: SimulationConfig = {
  substance: "argon",
  particleCount: 108,
  density: 0.82,
  temperature: 0.9,
  timestep: 0.004,
  ensemble: "nve",
  friction: 1,
  seed: 42,
};

export type PairEvaluation = {
  potential: number;
  forceMagnitude: number;
};

export type ForceEvaluation = {
  forces: Float64Array;
  potential: number;
  virial: number;
};

export type SimulationSnapshot = {
  step: number;
  time: number;
  boxLength: number;
  cutoff: number;
  positions: Float64Array;
  velocities: Float64Array;
  kinetic: number;
  potential: number;
  total: number;
  temperature: number;
  pressure: number;
  momentum: [number, number, number];
  energyDrift: number;
  meanSquareDisplacement: number;
};

export type TrajectoryFrame = {
  step: number;
  time: number;
  boxLength: number;
  positions: Float64Array;
};

const BOLTZMANN = 1.380649e-23;
const ATOMIC_MASS_UNIT = 1.6605390666e-27;

export function wrapCoordinate(value: number, boxLength: number): number {
  return value - boxLength * Math.floor(value / boxLength);
}

export function minimumImage(delta: number, boxLength: number): number {
  return delta - boxLength * Math.round(delta / boxLength);
}

export function rawLennardJones(radius: number): PairEvaluation {
  if (!(radius > 0)) throw new Error("Pair distance must be positive.");
  const invR2 = 1 / (radius * radius);
  const invR6 = invR2 * invR2 * invR2;
  const invR12 = invR6 * invR6;
  return {
    potential: 4 * (invR12 - invR6),
    forceMagnitude: (24 * (2 * invR12 - invR6)) / radius,
  };
}

export function shiftedForceLennardJones(
  radius: number,
  cutoff: number,
): PairEvaluation {
  if (radius >= cutoff) return { potential: 0, forceMagnitude: 0 };
  const pair = rawLennardJones(radius);
  const atCutoff = rawLennardJones(cutoff);
  return {
    potential:
      pair.potential -
      atCutoff.potential +
      (radius - cutoff) * atCutoff.forceMagnitude,
    forceMagnitude: pair.forceMagnitude - atCutoff.forceMagnitude,
  };
}

export function computeLennardJonesForces(
  positions: Float64Array,
  boxLength: number,
  cutoff: number,
  target?: Float64Array,
): ForceEvaluation {
  const particleCount = positions.length / 3;
  const forces = target ?? new Float64Array(positions.length);
  forces.fill(0);
  let potential = 0;
  let virial = 0;
  const cutoff2 = cutoff * cutoff;

  for (let i = 0; i < particleCount - 1; i += 1) {
    const i3 = i * 3;
    for (let j = i + 1; j < particleCount; j += 1) {
      const j3 = j * 3;
      const dx = minimumImage(positions[i3] - positions[j3], boxLength);
      const dy = minimumImage(positions[i3 + 1] - positions[j3 + 1], boxLength);
      const dz = minimumImage(positions[i3 + 2] - positions[j3 + 2], boxLength);
      const radius2 = dx * dx + dy * dy + dz * dz;
      if (radius2 >= cutoff2) continue;
      if (radius2 < 1e-10) {
        throw new Error(`Particles ${i} and ${j} overlap.`);
      }

      const radius = Math.sqrt(radius2);
      const pair = shiftedForceLennardJones(radius, cutoff);
      const coefficient = pair.forceMagnitude / radius;
      const fx = coefficient * dx;
      const fy = coefficient * dy;
      const fz = coefficient * dz;

      forces[i3] += fx;
      forces[i3 + 1] += fy;
      forces[i3 + 2] += fz;
      forces[j3] -= fx;
      forces[j3 + 1] -= fy;
      forces[j3 + 2] -= fz;
      potential += pair.potential;
      virial += dx * fx + dy * fy + dz * fz;
    }
  }

  return { forces, potential, virial };
}

function validateConfig(config: SimulationConfig): SimulationConfig {
  if (!PARTICLE_COUNTS.includes(config.particleCount)) {
    throw new Error("Particle count must form a complete FCC lattice.");
  }
  if (!(config.density > 0.1 && config.density <= 1.2)) {
    throw new Error("Density must be between 0.1 and 1.2.");
  }
  if (!(config.temperature > 0.05 && config.temperature <= 3)) {
    throw new Error("Temperature must be between 0.05 and 3.0.");
  }
  if (!(config.timestep > 0 && config.timestep <= 0.01)) {
    throw new Error("Timestep must be positive and no larger than 0.01.");
  }
  return { ...config, seed: Math.trunc(config.seed) >>> 0 };
}

function createFccPositions(particleCount: number, boxLength: number): Float64Array {
  const cells = Math.round(Math.cbrt(particleCount / 4));
  if (4 * cells * cells * cells !== particleCount) {
    throw new Error("Particle count does not form a complete FCC lattice.");
  }
  const basis = [
    [0, 0, 0],
    [0, 0.5, 0.5],
    [0.5, 0, 0.5],
    [0.5, 0.5, 0],
  ];
  const positions = new Float64Array(particleCount * 3);
  const cellLength = boxLength / cells;
  let index = 0;
  for (let x = 0; x < cells; x += 1) {
    for (let y = 0; y < cells; y += 1) {
      for (let z = 0; z < cells; z += 1) {
        for (const [bx, by, bz] of basis) {
          positions[index * 3] = (x + bx) * cellLength;
          positions[index * 3 + 1] = (y + by) * cellLength;
          positions[index * 3 + 2] = (z + bz) * cellLength;
          index += 1;
        }
      }
    }
  }
  return positions;
}

export class MDSimulation {
  readonly config: SimulationConfig;
  readonly particleCount: number;
  readonly degreesOfFreedom: number;
  readonly boxLength: number;
  readonly cutoff: number;

  private positions: Float64Array;
  private unwrapped: Float64Array;
  private initialUnwrapped: Float64Array;
  private velocities: Float64Array;
  private forces: Float64Array;
  private potential = 0;
  private virial = 0;
  private initialEnergy = 0;
  private rngState: number;
  private spareNormal: number | null = null;
  private stepIndex = 0;
  private elapsed = 0;

  constructor(input: SimulationConfig) {
    this.config = validateConfig(input);
    this.particleCount = this.config.particleCount;
    this.degreesOfFreedom = 3 * this.particleCount - 3;
    this.boxLength = Math.cbrt(this.particleCount / this.config.density);
    this.cutoff = Math.min(2.5, this.boxLength * 0.49);
    this.rngState = this.config.seed || 0x6d2b79f5;
    this.positions = createFccPositions(this.particleCount, this.boxLength);
    this.unwrapped = this.positions.slice();
    this.initialUnwrapped = this.positions.slice();
    this.velocities = this.createVelocities();
    this.forces = new Float64Array(this.positions.length);
    const evaluation = computeLennardJonesForces(
      this.positions,
      this.boxLength,
      this.cutoff,
      this.forces,
    );
    this.potential = evaluation.potential;
    this.virial = evaluation.virial;
    this.initialEnergy = this.kineticEnergy() + this.potential;
  }

  private random(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) >>> 0;
    let value = this.rngState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private normal(): number {
    if (this.spareNormal !== null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return value;
    }
    const u1 = Math.max(this.random(), Number.EPSILON);
    const u2 = this.random();
    const radius = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    this.spareNormal = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  }

  private createVelocities(): Float64Array {
    const velocities = new Float64Array(this.particleCount * 3);
    const mean = [0, 0, 0];
    for (let i = 0; i < this.particleCount; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = this.normal();
        velocities[i * 3 + axis] = value;
        mean[axis] += value;
      }
    }
    for (let axis = 0; axis < 3; axis += 1) mean[axis] /= this.particleCount;

    let speedSquared = 0;
    for (let i = 0; i < this.particleCount; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const index = i * 3 + axis;
        velocities[index] -= mean[axis];
        speedSquared += velocities[index] * velocities[index];
      }
    }
    const scale = Math.sqrt(
      (this.degreesOfFreedom * this.config.temperature) / speedSquared,
    );
    for (let i = 0; i < velocities.length; i += 1) velocities[i] *= scale;
    return velocities;
  }

  private halfKick(): void {
    const halfDt = 0.5 * this.config.timestep;
    for (let i = 0; i < this.velocities.length; i += 1) {
      this.velocities[i] += halfDt * this.forces[i];
    }
  }

  private drift(fraction: number): void {
    const dt = this.config.timestep * fraction;
    for (let i = 0; i < this.positions.length; i += 1) {
      const displacement = dt * this.velocities[i];
      this.unwrapped[i] += displacement;
      this.positions[i] = wrapCoordinate(
        this.positions[i] + displacement,
        this.boxLength,
      );
    }
  }

  private refreshForces(): void {
    const evaluation = computeLennardJonesForces(
      this.positions,
      this.boxLength,
      this.cutoff,
      this.forces,
    );
    this.potential = evaluation.potential;
    this.virial = evaluation.virial;
  }

  private applyOrnsteinUhlenbeck(): void {
    const attenuation = Math.exp(-this.config.friction * this.config.timestep);
    const noiseScale = Math.sqrt(
      this.config.temperature * (1 - attenuation * attenuation),
    );
    for (let i = 0; i < this.velocities.length; i += 1) {
      this.velocities[i] =
        attenuation * this.velocities[i] + noiseScale * this.normal();
    }
  }

  private advanceOne(): void {
    this.halfKick();
    if (this.config.ensemble === "langevin") {
      this.drift(0.5);
      this.applyOrnsteinUhlenbeck();
      this.drift(0.5);
    } else {
      this.drift(1);
    }
    this.refreshForces();
    this.halfKick();
    this.stepIndex += 1;
    this.elapsed += this.config.timestep;

    if (!Number.isFinite(this.potential) || !Number.isFinite(this.kineticEnergy())) {
      throw new Error("The trajectory became non-finite.");
    }
  }

  step(count = 1): void {
    for (let i = 0; i < count; i += 1) this.advanceOne();
  }

  private kineticEnergy(): number {
    let sum = 0;
    for (let i = 0; i < this.velocities.length; i += 1) {
      sum += this.velocities[i] * this.velocities[i];
    }
    return 0.5 * sum;
  }

  private momentum(): [number, number, number] {
    const total: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < this.particleCount; i += 1) {
      total[0] += this.velocities[i * 3];
      total[1] += this.velocities[i * 3 + 1];
      total[2] += this.velocities[i * 3 + 2];
    }
    return total;
  }

  private meanSquareDisplacement(): number {
    const mean = [0, 0, 0];
    for (let i = 0; i < this.particleCount; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        mean[axis] +=
          this.unwrapped[i * 3 + axis] - this.initialUnwrapped[i * 3 + axis];
      }
    }
    for (let axis = 0; axis < 3; axis += 1) mean[axis] /= this.particleCount;

    let sum = 0;
    for (let i = 0; i < this.particleCount; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const displacement =
          this.unwrapped[i * 3 + axis] -
          this.initialUnwrapped[i * 3 + axis] -
          mean[axis];
        sum += displacement * displacement;
      }
    }
    return sum / this.particleCount;
  }

  snapshot(): SimulationSnapshot {
    const kinetic = this.kineticEnergy();
    const total = kinetic + this.potential;
    const volume = this.boxLength ** 3;
    const temperature = (2 * kinetic) / this.degreesOfFreedom;
    return {
      step: this.stepIndex,
      time: this.elapsed,
      boxLength: this.boxLength,
      cutoff: this.cutoff,
      positions: this.positions.slice(),
      velocities: this.velocities.slice(),
      kinetic,
      potential: this.potential,
      total,
      temperature,
      pressure: (this.particleCount * temperature + this.virial / 3) / volume,
      momentum: this.momentum(),
      energyDrift:
        this.initialEnergy === 0 ? 0 : (total - this.initialEnergy) / Math.abs(this.initialEnergy),
      meanSquareDisplacement: this.meanSquareDisplacement(),
    };
  }

  radialDistribution(binCount = 36): Array<{ radius: number; value: number }> {
    const maxRadius = this.boxLength * 0.5;
    const width = maxRadius / binCount;
    const counts = new Float64Array(binCount);
    for (let i = 0; i < this.particleCount - 1; i += 1) {
      const i3 = i * 3;
      for (let j = i + 1; j < this.particleCount; j += 1) {
        const j3 = j * 3;
        const dx = minimumImage(this.positions[i3] - this.positions[j3], this.boxLength);
        const dy = minimumImage(
          this.positions[i3 + 1] - this.positions[j3 + 1],
          this.boxLength,
        );
        const dz = minimumImage(
          this.positions[i3 + 2] - this.positions[j3 + 2],
          this.boxLength,
        );
        const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (radius < maxRadius) counts[Math.floor(radius / width)] += 2;
      }
    }

    return Array.from(counts, (count, index) => {
      const inner = index * width;
      const outer = inner + width;
      const shellVolume = (4 * Math.PI * (outer ** 3 - inner ** 3)) / 3;
      const idealCount = this.particleCount * this.config.density * shellVolume;
      return { radius: inner + width * 0.5, value: count / idealCount };
    });
  }
}

export function physicalTimePicoseconds(timeReduced: number, preset: SubstancePreset): number {
  if (preset.key === "generic") return timeReduced;
  const sigmaMeters = preset.sigmaAngstrom * 1e-10;
  const massKilograms = preset.massAmu * ATOMIC_MASS_UNIT;
  const epsilonJoules = preset.epsilonKelvin * BOLTZMANN;
  return timeReduced * sigmaMeters * Math.sqrt(massKilograms / epsilonJoules) * 1e12;
}

export function snapshotToFrame(snapshot: SimulationSnapshot): TrajectoryFrame {
  return {
    step: snapshot.step,
    time: snapshot.time,
    boxLength: snapshot.boxLength,
    positions: snapshot.positions.slice(),
  };
}

export function framesToXyz(
  frames: TrajectoryFrame[],
  preset: SubstancePreset,
): string {
  return frames
    .map((frame) => {
      const lines = [
        String(frame.positions.length / 3),
        `step=${frame.step} time*=${frame.time.toFixed(6)} box*=${frame.boxLength.toFixed(6)} model=shifted-force-lj`,
      ];
      for (let i = 0; i < frame.positions.length; i += 3) {
        lines.push(
          `${preset.symbol} ${frame.positions[i].toFixed(8)} ${frame.positions[i + 1].toFixed(8)} ${frame.positions[i + 2].toFixed(8)}`,
        );
      }
      return lines.join("\n");
    })
    .join("\n");
}
