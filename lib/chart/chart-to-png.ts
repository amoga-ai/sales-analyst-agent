// lib/chart/chart-to-png.ts: Draws a bar or donut chart from its JSON onto a canvas in the browser and returns a PNG data URL. No AI and no new packages.
export type ChartJson = {
  type: "BarChart" | "DonutChart";
  title?: string;
  labels: string[];
  values: number[];
};

const W = 800;
const H = 480;
const BAR_PALETTE = ["#7c3aed", "#db2777", "#0891b2", "#f59e0b", "#16a34a", "#dc2626", "#64748b"];
const DONUT_PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#64748b"];

// Draws one horizontal bar per label, with its value at the end of the bar.
function drawBars(ctx: CanvasRenderingContext2D, c: ChartJson) {
  const max = Math.max(1, ...c.values);
  const rowH = Math.min(60, (H - 120) / Math.max(1, c.labels.length));
  const left = 220;
  const barMax = W - left - 120;
  ctx.font = "16px Arial";
  c.labels.forEach((label, i) => {
    const y = 90 + i * rowH;
    const width = (c.values[i] / max) * barMax;
    ctx.fillStyle = "#3f3f46";
    ctx.fillText(label, 24, y + 18);
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(left, y, barMax, 24);
    ctx.fillStyle = BAR_PALETTE[i % BAR_PALETTE.length];
    ctx.fillRect(left, y, width, 24);
    ctx.fillStyle = "#18181b";
    ctx.fillText(String(c.values[i]), left + width + 8, y + 18);
  });
}

// Draws the donut as coloured arcs, with a legend listing each label and its value.
function drawDonut(ctx: CanvasRenderingContext2D, c: ChartJson) {
  const total = c.values.reduce((s, v) => s + v, 0) || 1;
  const cx = 230;
  const cy = H / 2 + 20;
  const r = 140;
  let start = -Math.PI / 2;
  c.values.forEach((v, i) => {
    const end = start + (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.lineWidth = 56;
    ctx.strokeStyle = DONUT_PALETTE[i % DONUT_PALETTE.length];
    ctx.stroke();
    start = end;
  });
  ctx.font = "16px Arial";
  c.labels.forEach((label, i) => {
    const y = 130 + i * 34;
    ctx.fillStyle = DONUT_PALETTE[i % DONUT_PALETTE.length];
    ctx.fillRect(480, y - 12, 14, 14);
    ctx.fillStyle = "#18181b";
    ctx.fillText(`${label}: ${c.values[i]}`, 504, y);
  });
}

// Draws the chart on a white canvas, with its title, and returns it as a PNG data URL.
export function chartToPng(chart: ChartJson): string {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#18181b";
  ctx.font = "bold 22px Arial";
  ctx.fillText(chart.title ?? "", 24, 40);

  if (chart.type === "BarChart") drawBars(ctx, chart);
  else drawDonut(ctx, chart);

  return canvas.toDataURL("image/png");
}