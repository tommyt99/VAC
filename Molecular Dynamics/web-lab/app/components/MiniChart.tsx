"use client";

import { useEffect, useRef, useState } from "react";

export type MiniChartPoint = {
  x: number;
  y: number;
};

export type MiniChartSeries = {
  label: string;
  color: string;
  values: MiniChartPoint[];
};

export type MiniChartProps = {
  title: string;
  series: MiniChartSeries[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
};

type ChartSize = {
  width: number;
  height: number;
};

function formatTick(value: number): string {
  const magnitude = Math.abs(value);
  if ((magnitude > 0 && magnitude < 0.001) || magnitude >= 10_000) {
    return value.toExponential(1);
  }
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1);
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function finiteValues(series: MiniChartSeries[]): MiniChartSeries[] {
  return series.map((item) => ({
    ...item,
    values: item.values.filter(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    ),
  }));
}

export function MiniChart({
  title,
  series,
  xLabel,
  yLabel,
  height = 176,
}: MiniChartProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeHeight = Math.max(120, height);
  const [size, setSize] = useState<ChartSize>({ width: 420, height: safeHeight });

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const bounds = shell.getBoundingClientRect();
      setSize({ width: Math.max(1, Math.round(bounds.width)), height: safeHeight });
    };
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [safeHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(size.width * dpr));
    canvas.height = Math.max(1, Math.round(size.height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const cleaned = finiteValues(series);
    const points = cleaned.flatMap((item) => item.values);
    const left = yLabel ? 52 : 44;
    const right = 13;
    const top = 12;
    const bottom = xLabel ? 34 : 23;
    const plotWidth = Math.max(1, size.width - left - right);
    const plotHeight = Math.max(1, size.height - top - bottom);

    context.fillStyle = "#080d15";
    context.fillRect(0, 0, size.width, size.height);

    if (points.length === 0) {
      context.fillStyle = "rgba(242, 235, 224, 0.55)";
      context.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("Waiting for trajectory data", size.width / 2, size.height / 2);
      return;
    }

    let xMinimum = Math.min(...points.map((point) => point.x));
    let xMaximum = Math.max(...points.map((point) => point.x));
    let yMinimum = Math.min(...points.map((point) => point.y));
    let yMaximum = Math.max(...points.map((point) => point.y));
    if (xMinimum === xMaximum) {
      const padding = Math.max(Math.abs(xMinimum) * 0.05, 0.5);
      xMinimum -= padding;
      xMaximum += padding;
    }
    if (yMinimum === yMaximum) {
      const padding = Math.max(Math.abs(yMinimum) * 0.05, 0.5);
      yMinimum -= padding;
      yMaximum += padding;
    } else {
      const padding = (yMaximum - yMinimum) * 0.08;
      yMinimum -= padding;
      yMaximum += padding;
    }

    const mapX = (value: number) =>
      left + ((value - xMinimum) / (xMaximum - xMinimum)) * plotWidth;
    const mapY = (value: number) =>
      top + plotHeight - ((value - yMinimum) / (yMaximum - yMinimum)) * plotHeight;

    context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.lineWidth = 1;
    for (let index = 0; index <= 4; index += 1) {
      const fraction = index / 4;
      const y = top + plotHeight * fraction;
      const value = yMaximum - (yMaximum - yMinimum) * fraction;
      context.strokeStyle = "rgba(242, 235, 224, 0.09)";
      context.beginPath();
      context.moveTo(left, y + 0.5);
      context.lineTo(left + plotWidth, y + 0.5);
      context.stroke();
      context.fillStyle = "rgba(242, 235, 224, 0.48)";
      context.textAlign = "right";
      context.textBaseline = "middle";
      context.fillText(formatTick(value), left - 7, y);
    }

    for (let index = 0; index <= 3; index += 1) {
      const fraction = index / 3;
      const x = left + plotWidth * fraction;
      const value = xMinimum + (xMaximum - xMinimum) * fraction;
      context.fillStyle = "rgba(242, 235, 224, 0.42)";
      context.textAlign = index === 0 ? "left" : index === 3 ? "right" : "center";
      context.textBaseline = "top";
      context.fillText(formatTick(value), x, top + plotHeight + 7);
    }

    context.save();
    context.beginPath();
    context.rect(left, top, plotWidth, plotHeight);
    context.clip();
    for (const item of cleaned) {
      if (item.values.length === 0) continue;
      context.strokeStyle = item.color;
      context.lineWidth = 1.8;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.beginPath();
      item.values.forEach((point, index) => {
        const x = mapX(point.x);
        const y = mapY(point.y);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();

      const latest = item.values.at(-1);
      if (latest) {
        context.fillStyle = item.color;
        context.beginPath();
        context.arc(mapX(latest.x), mapY(latest.y), 2.7, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();

    if (xLabel) {
      context.fillStyle = "rgba(242, 235, 224, 0.52)";
      context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText(xLabel.toUpperCase(), left + plotWidth / 2, size.height - 2);
    }
    if (yLabel) {
      context.save();
      context.translate(10, top + plotHeight / 2);
      context.rotate(-Math.PI / 2);
      context.fillStyle = "rgba(242, 235, 224, 0.52)";
      context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(yLabel.toUpperCase(), 0, 0);
      context.restore();
    }
  }, [series, size, xLabel, yLabel]);

  const cleaned = finiteValues(series);
  const summaryParts = cleaned.map((item) => {
    const latest = item.values.at(-1);
    return latest
      ? `${item.label}: ${item.values.length} points, latest value ${formatTick(latest.y)}`
      : `${item.label}: no data`;
  });
  const ariaSummary = `${title}. ${summaryParts.join(". ")}.`;

  return (
    <figure className="mini-chart" style={{ margin: 0, minWidth: 0 }}>
      <div
        className="mini-chart__header"
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 14px",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <figcaption
          style={{
            color: "#f2ebe0",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </figcaption>
        <div
          className="mini-chart__legend"
          aria-hidden="true"
          style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
        >
          {series.map((item) => (
            <span
              key={item.label}
              style={{
                alignItems: "center",
                color: "rgba(242, 235, 224, 0.62)",
                display: "inline-flex",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 10,
                gap: 5,
              }}
            >
              <span
                style={{
                  background: item.color,
                  borderRadius: 999,
                  display: "inline-block",
                  height: 5,
                  width: 14,
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div ref={shellRef} style={{ height: safeHeight, minWidth: 0, width: "100%" }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaSummary}
          style={{ display: "block", height: safeHeight, width: "100%" }}
        />
      </div>
    </figure>
  );
}
