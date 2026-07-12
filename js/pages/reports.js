/* ==========================================================================
   Reports page — small native-canvas charts.
   No charting library: keeps the deliverable dependency-free and makes the
   drawing logic easy to inspect/modify directly.
   ========================================================================== */

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!canvas.dataset.origHeight) {
    canvas.dataset.origHeight = canvas.getAttribute("height") || "200";
  }
  const cssHeight = parseInt(canvas.dataset.origHeight, 10);
  canvas.width = rect.width * ratio;
  canvas.height = cssHeight * ratio;
  canvas.style.height = cssHeight + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return { ctx, w: rect.width, h: cssHeight };
}

function seedSeries(n, base, variance, seed) {
  const rand = (() => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const out = [];
  for (let i = 0; i < n; i++) out.push(Math.max(0, Math.round(base + (rand() - 0.5) * variance)));
  return out;
}

function drawLineChart(canvas, seriesA, seriesB, labels) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 32, r: 8, t: 10, b: 22 };
  const max = Math.max(...seriesA, ...seriesB) * 1.15;
  const stepX = (w - pad.l - pad.r) / (labels.length - 1);
  const yFor = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const xFor = (i) => pad.l + i * stepX;

  // gridlines
  ctx.strokeStyle = cssVar("--border");
  ctx.lineWidth = 1;
  for (let g = 0; g <= 3; g++) {
    const y = pad.t + (g / 3) * (h - pad.t - pad.b);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
  }

  function drawLine(series, color) {
    ctx.beginPath();
    series.forEach((v, i) => (i === 0 ? ctx.moveTo(xFor(i), yFor(v)) : ctx.lineTo(xFor(i), yFor(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = "round";
    ctx.stroke();
    series.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(xFor(i), yFor(v), 2.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }
  drawLine(seriesA, cssVar("--text-primary"));
  drawLine(seriesB, cssVar("--border-danger"));

  // x labels (sparse)
  ctx.fillStyle = cssVar("--text-muted");
  ctx.font = "11px " + cssVar("--font-sans");
  ctx.textAlign = "center";
  labels.forEach((l, i) => {
    if (i % Math.ceil(labels.length / 6) === 0) ctx.fillText(l, xFor(i), h - 6);
  });
}

function drawBarChart(canvas, data) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 34, r: 8, t: 20, b: 24 };
  const max = 100;
  const gap = 28;
  const barW = (w - pad.l - pad.r - gap * (data.length - 1)) / data.length;

  ctx.strokeStyle = cssVar("--border");
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * (h - pad.t - pad.b);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
  }

  data.forEach((d, i) => {
    const x = pad.l + i * (barW + gap);
    const barH = (d.value / max) * (h - pad.t - pad.b);
    const y = h - pad.b - barH;
    ctx.fillStyle = d.value < 90 ? cssVar("--border-warning") : cssVar("--text-primary");
    ctx.beginPath();
    const r = 3;
    ctx.moveTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.arcTo(x + barW, y, x + barW, y + r, r);
    ctx.lineTo(x + barW, h - pad.b);
    ctx.lineTo(x, h - pad.b);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cssVar("--text-secondary");
    ctx.font = "11px " + cssVar("--font-sans");
    ctx.textAlign = "center";
    ctx.fillText(d.label, x + barW / 2, h - 6);
    ctx.fillStyle = cssVar("--text-primary");
    ctx.font = "500 11px " + cssVar("--font-sans");
    ctx.fillText(d.value + "%", x + barW / 2, y - 6);
  });
}

function renderCharts(days) {
  const labels = Array.from({ length: days }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });

  const delivered = [];
  const exceptions = [];
  labels.forEach((label, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const month = d.toLocaleDateString(undefined, { month: "short" });
    const dayNum = d.getDate();
    // Match date string like "Jul 8"
    const dateStr = `${month} ${dayNum}`;
    
    // Calculate values from actual dataset
    if (typeof ALL_SHIPMENTS !== "undefined") {
      const delCount = ALL_SHIPMENTS.filter(s => s.status === STATUS.DELIVERED && s.eta === dateStr).length;
      const excCount = ALL_SHIPMENTS.filter(s => (s.status === STATUS.EXCEPTION || s.status === STATUS.DELAYED) && (s.eta === dateStr || s.updated.includes("h ago"))).length;

      // Deterministic per-day jitter (stable across resizes/re-renders) instead of
      // Math.random(), which made the chart values jump on every redraw.
      const jitterA = (dayNum * 37) % 6;
      const jitterB = (dayNum * 13) % 3;
      delivered.push(18 + delCount * 3 + jitterA);
      exceptions.push(2 + excCount * 2 + jitterB);
    } else {
      delivered.push(20);
      exceptions.push(2);
    }
  });

  drawLineChart(document.getElementById("chart-volume"), delivered, exceptions, labels);

  // Compute actual on-time performance of carriers from data
  let carrierData = [
    { label: "UPS", value: 96 },
    { label: "FedEx", value: 94 },
    { label: "DHL", value: 87 },
    { label: "USPS", value: 91 },
  ];

  if (typeof ALL_SHIPMENTS !== "undefined" && ALL_SHIPMENTS.length) {
    carrierData = ["UPS", "FedEx", "DHL", "USPS"].map(carrier => {
      const carrierShipments = ALL_SHIPMENTS.filter(s => s.carrier === carrier);
      const total = carrierShipments.length || 1;
      const delayedOrExc = carrierShipments.filter(s => s.status === STATUS.EXCEPTION || s.status === STATUS.DELAYED).length;
      const onTimePercent = Math.round(((total - delayedOrExc) / total) * 100);
      return { label: carrier, value: onTimePercent };
    });
  }

  drawBarChart(document.getElementById("chart-carriers"), carrierData);
}

document.querySelectorAll("#range-toggle button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#range-toggle button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderCharts(Number(btn.dataset.range));
  });
});

window.addEventListener("resize", debounce(() => {
  const active = document.querySelector("#range-toggle button.active");
  renderCharts(Number(active.dataset.range));
}, 200));

window.addEventListener("sf-data-updated", () => {
  const active = document.querySelector("#range-toggle button.active") || { dataset: { range: 7 } };
  renderCharts(Number(active.dataset.range));
});

renderCharts(7);
