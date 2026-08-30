// views/chart.js — Lightweight Charts 5 candlesticks from /bars + RSI(14) pane; Pro overlays via overlays.js.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as overlays from "../overlays.js";
import { el, clear, spinner, errorBox, lock, px, num } from "../ui.js";
import { normalizeList } from "./watchlist.js";

const PERIODS = ["3mo", "6mo", "1y", "2y"];
const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

function cssVar(name, fallback) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; }

export function normalizeBars(resp) {
  const arr = Array.isArray(resp) ? resp : (resp && (resp.bars || resp.items)) || [];
  const out = [];
  for (const b of arr) {
    let t = b.t ?? b.time ?? b.date;
    if (typeof t === "number") t = t > 1e12 ? Math.floor(t / 1000) : Math.floor(t);
    else if (typeof t === "string") t = /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : Math.floor(Date.parse(t) / 1000);
    if (t === undefined || t === null || Number.isNaN(t)) continue;
    const o = Number(b.o ?? b.open), h = Number(b.h ?? b.high), l = Number(b.l ?? b.low), c = Number(b.c ?? b.close);
    if ([o, h, l, c].some(Number.isNaN)) continue;
    out.push({ time: t, open: o, high: h, low: l, close: c, volume: Number(b.v ?? b.volume ?? 0) });
  }
  out.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return out.filter((b, i) => i === 0 || b.time !== out[i - 1].time);
}

export async function mount(root, params) {
  let ticker = (params && params.ticker) || "";
  let period = "6mo", chart = null, ro = null, ovl = null, alive = true;

  const input = el("input.input.mono", { type: "text", value: ticker, placeholder: s("chart.pick"), autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "10", "aria-label": s("chart.pick") });
  const form = el("form.add-row", { onsubmit: (e) => { e.preventDefault(); const t = input.value.trim().toUpperCase().replace(/^\$/, ""); if (TICKER_RE.test(t)) location.hash = "#/chart/" + t; } },
    input, el("button.btn.btn-primary", { type: "submit" }, s("chart.go")));
  const periodRow = el("div.seg.mono", { role: "group", "aria-label": s("chart.period") },
    PERIODS.map((p) => el("button", { type: "button", "data-period": p, class: p === period ? "on" : "", onclick: () => { period = p; periodRow.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.period === p)); draw(); } }, s("chart.period_" + p))));
  const head = el("div.view-head", el("h1.mono", ticker ? "$" + ticker : s("chart.title")), el("span.spot.mono", { id: "chart-spot" }));
  const legendRow = el("div.legend", { id: "chart-legend" });
  const host = el("div.chart-host", { id: "chart-host" });
  const status = el("div", { id: "chart-status" });
  root.append(head, form, periodRow, legendRow, host, status);

  if (!ticker) {
    host.hidden = true; legendRow.hidden = true; periodRow.hidden = true;
    const wl = store.get("watchlist") || [];
    const chips = el("div.chips", wl.map((t) => el("a.chip.mono", { href: "#/chart/" + t }, "$" + t)));
    status.append(el("p.muted", s("chart.pick_hint")), chips);
    if (!wl.length) { try { store.set("watchlist", normalizeList(await api.watchlist.list())); clear(chips); for (const t of store.get("watchlist")) chips.appendChild(el("a.chip.mono", { href: "#/chart/" + t }, "$" + t)); } catch (e) { /* ignore */ } }
    return () => { alive = false; };
  }

  function destroy() { if (ovl) { ovl.remove(); ovl = null; } if (ro) { ro.disconnect(); ro = null; } if (chart) { try { chart.remove(); } catch (e) { /* ignore */ } chart = null; } clear(host); }

  async function draw() {
    destroy();
    clear(status); clear(legendRow);
    status.appendChild(spinner());
    const LWC = window.LightweightCharts;
    if (!LWC) { clear(status); status.appendChild(errorBox(new Error("charts lib missing"))); return; }
    let bars;
    try { bars = normalizeBars(await api.bars(ticker, period)); }
    catch (err) { if (!alive) return; clear(status); status.appendChild(errorBox(err, draw)); return; }
    if (!alive) return;
    clear(status);
    if (!bars.length) { status.appendChild(el("p.muted", s("chart.no_bars"))); return; }
    const spot = document.getElementById("chart-spot"); if (spot) spot.textContent = px(bars[bars.length - 1].close);

    const text = cssVar("--muted", "#9aa7b4"), grid = cssVar("--border", "#223041"), up = cssVar("--green", "#3fb950"), down = cssVar("--red", "#f85149");
    chart = LWC.createChart(host, {
      autoSize: true,
      layout: { background: { type: "solid", color: "transparent" }, textColor: text, attributionLogo: false, panes: { separatorColor: grid, enableResize: false } },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, rightOffset: 4 },
      crosshair: { mode: 0 },
      handleScroll: { vertTouchDrag: false },
    });
    let levels = []; // overlay prices folded into autoscale so walls outside the candle range stay visible
    const candles = chart.addSeries(LWC.CandlestickSeries, { upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down,
      autoscaleInfoProvider: (orig) => { const r = orig(); if (!r || !r.priceRange || !levels.length) return r; const lo = Math.min(r.priceRange.minValue, ...levels), hi = Math.max(r.priceRange.maxValue, ...levels); return { priceRange: { minValue: lo, maxValue: hi }, margins: r.margins }; } });
    candles.setData(bars);
    // RSI(14) in its own pane
    const rsiSeries = chart.addSeries(LWC.LineSeries, { color: cssVar("--blue", "#58a6ff"), lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: s("chart.rsi") }, 1);
    rsiSeries.setData(overlays.rsi(bars, 14));
    rsiSeries.createPriceLine({ price: 70, color: down, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
    rsiSeries.createPriceLine({ price: 30, color: up, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
    try { const panes = chart.panes(); if (panes[1]) panes[1].setHeight(110); } catch (e) { /* older lib */ }
    chart.timeScale().fitContent();

    // Overlays: Pro only. Free/paid see a lock strip instead.
    if (store.isPro()) {
      legendRow.appendChild(spinner(s("chart.loading_snapshot")));
      try {
        const snaps = store.get("snapshots") || {};
        let snap = snaps[ticker] && snaps[ticker].ok ? snaps[ticker] : null;
        if (!snap) { const r = await api.snapshot(ticker, { tries: 6 }); if (!api.isAccepted(r)) { snap = r; store.patch("snapshots", { [ticker]: r }); } }
        if (!alive || !chart) return;
        clear(legendRow);
        if (snap && snap.ok) {
          ovl = overlays.apply(candles, snap, { call: up, put: down, flip: cssVar("--accent", "#f5c33b"), exp: cssVar("--blue", "#58a6ff"), band: text });
          levels = overlays.levels(snap); candles.applyOptions({});
          for (const it of overlays.legend(snap, { call: up, put: down, flip: cssVar("--accent", "#f5c33b"), exp: cssVar("--blue", "#58a6ff"), band: text })) {
            legendRow.appendChild(el("span.legend-item.mono", el("i", { style: { background: it.color } }), it.label + " ", el("b", typeof it.value === "number" ? num(it.value, 2) : String(it.value))));
          }
          if (!ovl.count) legendRow.appendChild(el("span.muted.small", s("chart.no_overlays")));
        } else legendRow.appendChild(el("span.muted.small", s("common.building")));
      } catch (err) { if (alive) { clear(legendRow); legendRow.appendChild(el("span.muted.small", s("common.error", { msg: err.message }))); } }
    } else {
      const fake = el("div.legend-fake.mono", s("chart.overlays"));
      legendRow.appendChild(lock(fake, s("chart.lock")));
    }
  }

  await draw();
  return () => { alive = false; destroy(); };
}
