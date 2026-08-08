"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import type { SimulationSnapshot, SubstancePreset } from "../lib/md";

export type ParticleRepresentation = "spheres" | "points";
export type ParticleColorMode = "substance" | "speed" | "energy";
// Concise aliases keep the component pleasant to consume in local UI state.
export type Representation = ParticleRepresentation;
export type ColorMode = ParticleColorMode;

export type SimulationCanvasProps = {
  snapshot: SimulationSnapshot;
  preset: SubstancePreset;
  representation?: ParticleRepresentation;
  colorBy?: ParticleColorMode;
  showBox?: boolean;
  showVectors?: boolean;
  showTrails?: boolean;
  particleSize?: number;
  resetSignal?: number;
};

type Camera = {
  yaw: number;
  pitch: number;
  zoom: number;
};

type Viewport = {
  width: number;
  height: number;
};

type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  perspective: number;
};

type TrailFrame = {
  step: number;
  boxLength: number;
  positions: Float64Array;
};

const DEFAULT_CAMERA: Camera = { yaw: 0.62, pitch: 0.42, zoom: 1 };
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.35;

const visuallyHidden = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute" as const,
  whiteSpace: "nowrap" as const,
  width: "1px",
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseHex(color: string): [number, number, number] {
  const raw = color.replace("#", "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((character) => character + character)
          .join("")
      : raw;
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) return [224, 164, 90];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgb(color: [number, number, number], alpha = 1): string {
  return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(
    color[2],
  )}, ${alpha})`;
}

function mix(
  start: [number, number, number],
  end: [number, number, number],
  amount: number,
): [number, number, number] {
  const t = clamp(amount, 0, 1);
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
    start[2] + (end[2] - start[2]) * t,
  ];
}

function particleColor(
  mode: ParticleColorMode,
  base: [number, number, number],
  normalizedSpeed: number,
): [number, number, number] {
  if (mode === "substance") return base;
  if (mode === "speed") {
    const cool: [number, number, number] = [78, 195, 197];
    const warm: [number, number, number] = [242, 139, 113];
    return mix(cool, warm, normalizedSpeed);
  }
  const low: [number, number, number] = [68, 105, 145];
  const middle: [number, number, number] = [242, 235, 224];
  const high: [number, number, number] = [224, 164, 90];
  return normalizedSpeed < 0.5
    ? mix(low, middle, normalizedSpeed * 2)
    : mix(middle, high, (normalizedSpeed - 0.5) * 2);
}

function makeProjector(
  camera: Camera,
  viewport: Viewport,
  boxLength: number,
): (x: number, y: number, z: number) => ProjectedPoint {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const scale =
    (Math.min(viewport.width, viewport.height) * 0.64 * camera.zoom) / boxLength;
  const centerX = viewport.width * 0.5;
  const centerY = viewport.height * 0.51;
  const cameraDistance = boxLength * 3.8;

  return (x, y, z) => {
    const yawX = cosYaw * x + sinYaw * z;
    const yawZ = -sinYaw * x + cosYaw * z;
    const pitchY = cosPitch * y - sinPitch * yawZ;
    const pitchZ = sinPitch * y + cosPitch * yawZ;
    const perspective = cameraDistance / (cameraDistance - pitchZ);
    return {
      x: centerX + yawX * scale * perspective,
      y: centerY - pitchY * scale * perspective,
      depth: pitchZ,
      perspective,
    };
  };
}

function drawArrow(
  context: CanvasRenderingContext2D,
  start: ProjectedPoint,
  end: ProjectedPoint,
): void {
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const arrowLength = 4.5;
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - arrowLength * Math.cos(angle - Math.PI / 6),
    end.y - arrowLength * Math.sin(angle - Math.PI / 6),
  );
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - arrowLength * Math.cos(angle + Math.PI / 6),
    end.y - arrowLength * Math.sin(angle + Math.PI / 6),
  );
  context.stroke();
}

export function SimulationCanvas({
  snapshot,
  preset,
  representation = "spheres",
  colorBy = "substance",
  showBox = true,
  showVectors = false,
  showTrails = false,
  particleSize = 1,
  resetSignal = 0,
}: SimulationCanvasProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const trailRef = useRef<TrailFrame[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ width: 900, height: 620 });
  const [viewRevision, setViewRevision] = useState(0);
  const instructionsId = useId();

  const resetCamera = () => {
    cameraRef.current = { ...DEFAULT_CAMERA };
    setViewRevision((revision) => revision + 1);
  };

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const bounds = shell.getBoundingClientRect();
      setViewport({
        width: Math.max(1, Math.round(bounds.width)),
        height: Math.max(1, Math.round(bounds.height)),
      });
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    cameraRef.current = { ...DEFAULT_CAMERA };
    trailRef.current = [];
  }, [resetSignal]);

  useEffect(() => {
    if (!showTrails) {
      trailRef.current = [];
      return;
    }

    const history = trailRef.current;
    const latest = history.at(-1);
    if (
      latest &&
      (snapshot.step < latest.step ||
        snapshot.positions.length !== latest.positions.length ||
        snapshot.boxLength !== latest.boxLength)
    ) {
      history.length = 0;
    }
    if (history.at(-1)?.step !== snapshot.step) {
      history.push({
        step: snapshot.step,
        boxLength: snapshot.boxLength,
        positions: snapshot.positions.slice(),
      });
      if (history.length > 12) history.shift();
    }
  }, [showTrails, snapshot.boxLength, snapshot.positions, snapshot.step]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(viewport.width * dpr));
    const pixelHeight = Math.max(1, Math.round(viewport.height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const background = context.createRadialGradient(
      viewport.width * 0.53,
      viewport.height * 0.46,
      10,
      viewport.width * 0.53,
      viewport.height * 0.46,
      Math.max(viewport.width, viewport.height) * 0.7,
    );
    background.addColorStop(0, "#111b27");
    background.addColorStop(0.55, "#080d15");
    background.addColorStop(1, "#05070c");
    context.fillStyle = background;
    context.fillRect(0, 0, viewport.width, viewport.height);

    const boxLength = snapshot.boxLength;
    const halfBox = boxLength * 0.5;
    const project = makeProjector(cameraRef.current, viewport, boxLength);
    const baseColor = parseHex(preset.color);
    const particleCount = Math.floor(snapshot.positions.length / 3);
    const speeds = new Float64Array(particleCount);
    let minimumSpeed = Number.POSITIVE_INFINITY;
    let maximumSpeed = 0;

    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      const speed = Math.hypot(
        snapshot.velocities[offset],
        snapshot.velocities[offset + 1],
        snapshot.velocities[offset + 2],
      );
      speeds[index] = speed;
      minimumSpeed = Math.min(minimumSpeed, speed);
      maximumSpeed = Math.max(maximumSpeed, speed);
    }
    const speedRange = Math.max(maximumSpeed - minimumSpeed, 1e-9);

    if (showBox) {
      const corners: Array<[number, number, number]> = [
        [-halfBox, -halfBox, -halfBox],
        [halfBox, -halfBox, -halfBox],
        [-halfBox, halfBox, -halfBox],
        [halfBox, halfBox, -halfBox],
        [-halfBox, -halfBox, halfBox],
        [halfBox, -halfBox, halfBox],
        [-halfBox, halfBox, halfBox],
        [halfBox, halfBox, halfBox],
      ];
      const projectedCorners = corners.map(([x, y, z]) => project(x, y, z));
      const edges = [
        [0, 1],
        [0, 2],
        [0, 4],
        [1, 3],
        [1, 5],
        [2, 3],
        [2, 6],
        [3, 7],
        [4, 5],
        [4, 6],
        [5, 7],
        [6, 7],
      ];
      context.save();
      context.lineWidth = 1;
      for (const [startIndex, endIndex] of edges) {
        const start = projectedCorners[startIndex];
        const end = projectedCorners[endIndex];
        const averageDepth = (start.depth + end.depth) / (2 * boxLength) + 0.5;
        context.strokeStyle = `rgba(103, 198, 195, ${0.13 + 0.27 * averageDepth})`;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      }
      for (const corner of projectedCorners) {
        context.fillStyle = "rgba(242, 235, 224, 0.38)";
        context.beginPath();
        context.arc(corner.x, corner.y, 1.4, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }

    if (showTrails && trailRef.current.length > 1) {
      const history = trailRef.current;
      context.save();
      context.lineCap = "round";
      context.lineWidth = representation === "points" ? 0.7 : 1.05;
      for (let frameIndex = 1; frameIndex < history.length; frameIndex += 1) {
        const previous = history[frameIndex - 1].positions;
        const current = history[frameIndex].positions;
        const alpha = 0.025 + 0.16 * (frameIndex / (history.length - 1));
        context.strokeStyle = rgb(baseColor, alpha);
        for (let index = 0; index < particleCount; index += 1) {
          const offset = index * 3;
          if (
            Math.abs(current[offset] - previous[offset]) > halfBox ||
            Math.abs(current[offset + 1] - previous[offset + 1]) > halfBox ||
            Math.abs(current[offset + 2] - previous[offset + 2]) > halfBox
          ) {
            continue;
          }
          const start = project(
            previous[offset] - halfBox,
            previous[offset + 1] - halfBox,
            previous[offset + 2] - halfBox,
          );
          const end = project(
            current[offset] - halfBox,
            current[offset + 1] - halfBox,
            current[offset + 2] - halfBox,
          );
          context.beginPath();
          context.moveTo(start.x, start.y);
          context.lineTo(end.x, end.y);
          context.stroke();
        }
      }
      context.restore();
    }

    const particles = Array.from({ length: particleCount }, (_, index) => {
      const offset = index * 3;
      return {
        index,
        projected: project(
          snapshot.positions[offset] - halfBox,
          snapshot.positions[offset + 1] - halfBox,
          snapshot.positions[offset + 2] - halfBox,
        ),
      };
    }).sort((left, right) => left.projected.depth - right.projected.depth);

    if (showVectors && maximumSpeed > 0) {
      context.save();
      context.lineWidth = 0.85;
      context.lineCap = "round";
      const vectorScale = (boxLength * 0.28) / maximumSpeed;
      for (const particle of particles) {
        const offset = particle.index * 3;
        const startX = snapshot.positions[offset] - halfBox;
        const startY = snapshot.positions[offset + 1] - halfBox;
        const startZ = snapshot.positions[offset + 2] - halfBox;
        const end = project(
          startX + snapshot.velocities[offset] * vectorScale,
          startY + snapshot.velocities[offset + 1] * vectorScale,
          startZ + snapshot.velocities[offset + 2] * vectorScale,
        );
        const normalized = (speeds[particle.index] - minimumSpeed) / speedRange;
        context.strokeStyle = rgb(
          particleColor("speed", baseColor, normalized),
          0.52,
        );
        drawArrow(context, particle.projected, end);
      }
      context.restore();
    }

    const scale =
      (Math.min(viewport.width, viewport.height) * 0.64 * cameraRef.current.zoom) /
      boxLength;
    const safeParticleSize = clamp(particleSize, 0.4, 2.2);
    const baseRadius =
      representation === "spheres"
        ? clamp(scale * 0.095, 4.2, 11.5) * safeParticleSize
        : clamp(scale * 0.024, 1.25, 3.1) * safeParticleSize;

    for (const particle of particles) {
      const normalized = (speeds[particle.index] - minimumSpeed) / speedRange;
      const color = particleColor(colorBy, baseColor, normalized);
      const depthFade = clamp(
        0.7 + particle.projected.depth / (boxLength * 3),
        0.5,
        1,
      );
      const radius = baseRadius * particle.projected.perspective;

      if (representation === "points") {
        context.fillStyle = rgb(color, depthFade);
        context.beginPath();
        context.arc(
          particle.projected.x,
          particle.projected.y,
          radius,
          0,
          Math.PI * 2,
        );
        context.fill();
        continue;
      }

      const gradient = context.createRadialGradient(
        particle.projected.x - radius * 0.34,
        particle.projected.y - radius * 0.4,
        radius * 0.05,
        particle.projected.x,
        particle.projected.y,
        radius,
      );
      gradient.addColorStop(0, rgb(mix(color, [255, 255, 255], 0.62), depthFade));
      gradient.addColorStop(0.3, rgb(mix(color, [255, 255, 255], 0.12), depthFade));
      gradient.addColorStop(1, rgb(mix(color, [5, 7, 12], 0.68), depthFade * 0.92));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(
        particle.projected.x,
        particle.projected.y,
        radius,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.strokeStyle = rgb(mix(color, [242, 235, 224], 0.25), depthFade * 0.35);
      context.lineWidth = 0.7;
      context.stroke();
    }

    const vignette = context.createRadialGradient(
      viewport.width * 0.5,
      viewport.height * 0.5,
      Math.min(viewport.width, viewport.height) * 0.22,
      viewport.width * 0.5,
      viewport.height * 0.5,
      Math.max(viewport.width, viewport.height) * 0.72,
    );
    vignette.addColorStop(0, "rgba(5, 7, 12, 0)");
    vignette.addColorStop(1, "rgba(5, 7, 12, 0.34)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, viewport.width, viewport.height);
  }, [
    colorBy,
    particleSize,
    preset.color,
    representation,
    resetSignal,
    showBox,
    showTrails,
    showVectors,
    snapshot,
    viewport,
    viewRevision,
  ]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = "grabbing";
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    cameraRef.current.yaw += deltaX * 0.008;
    cameraRef.current.pitch = clamp(
      cameraRef.current.pitch + deltaY * 0.008,
      -1.35,
      1.35,
    );
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setViewRevision((revision) => revision + 1);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerRef.current?.id !== event.pointerId) return;
    pointerRef.current = null;
    event.currentTarget.style.cursor = "grab";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    cameraRef.current.zoom = clamp(
      cameraRef.current.zoom * Math.exp(-event.deltaY * 0.0012),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    setViewRevision((revision) => revision + 1);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const camera = cameraRef.current;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft":
        camera.yaw -= 0.12;
        break;
      case "ArrowRight":
        camera.yaw += 0.12;
        break;
      case "ArrowUp":
        camera.pitch = clamp(camera.pitch - 0.1, -1.35, 1.35);
        break;
      case "ArrowDown":
        camera.pitch = clamp(camera.pitch + 0.1, -1.35, 1.35);
        break;
      case "+":
      case "=":
        camera.zoom = clamp(camera.zoom * 1.12, MIN_ZOOM, MAX_ZOOM);
        break;
      case "-":
      case "_":
        camera.zoom = clamp(camera.zoom / 1.12, MIN_ZOOM, MAX_ZOOM);
        break;
      case "Home":
      case "0":
        cameraRef.current = { ...DEFAULT_CAMERA };
        break;
      default:
        handled = false;
    }
    if (!handled) return;
    event.preventDefault();
    setViewRevision((revision) => revision + 1);
  };

  const particleCount = snapshot.positions.length / 3;
  const ariaSummary = `${preset.label} molecular dynamics view with ${particleCount} particles at reduced temperature ${snapshot.temperature.toFixed(
    3,
  )}. Step ${snapshot.step}. Drag or use arrow keys to orbit; use the mouse wheel or plus and minus keys to zoom.`;

  return (
    <div
      ref={shellRef}
      className="simulation-canvas-shell"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minHeight: 380 }}
    >
      <canvas
        ref={canvasRef}
        className="simulation-canvas"
        role="img"
        aria-label={ariaSummary}
        aria-describedby={instructionsId}
        tabIndex={0}
        onDoubleClick={resetCamera}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onWheel={handleWheel}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: "grab",
          touchAction: "none",
        }}
      />
      <span id={instructionsId} style={visuallyHidden}>
        Interactive particle view. Drag to orbit, scroll to zoom, use arrow keys to
        orbit, and press Home or zero to reset the camera.
      </span>
    </div>
  );
}
