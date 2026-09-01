// overlays.js — price-line overlays on a Lightweight Charts candlestick series (Pro only):
// gamma call/put walls + flip, expected weekly range (two lines), 20-day retrace band.
import { s } from "./strings.js";

const LWC = () => window.LightweightCharts;
const Style = () => (LWC() && LWC().LineStyle) || { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3 };

function line(series, price, color, title, style, width) {
  if (price === null || price === undefined || Number.isNaN(Number(price))) return null;
  return series.createPriceLine({
    // axisLabelVisible:false on purpose — the wall/range values live in the top legend, and stacking 8 colored
    // price tags on the right axis used to bury the ONE tag that matters: the live price (owner: "靠墙把最新价格
    // overshadow 了"). The line + its on-chart title still show where each level sits.
    price: Number(price), color, lineWidth: width || 1, lineStyle: style, axisLabelVisible: false, title,
  });
}

/** apply(series, snapshot, colors) → { remove() }. Only call when tier === 'pro'. */
export function apply(series, snap, colors) {
  const lines = [];
  const c = Object.assign({ call: "#3fb950", put: "#f85149", flip: "#f5c33b", exp: "#58a6ff", band: "#9aa7b4" }, colors || {});
  const st = Style();
  const g = snap && snap.gamma;
  if (g) {
    lines.push(line(series, g.call_wall, c.call, s("chart.legend_call"), st.Solid, 2));
    lines.push(line(series, g.put_wall, c.put, s("chart.legend_put"), st.Solid, 2));
    lines.push(line(series, g.flip, c.flip, s("chart.legend_flip"), st.LargeDashed, 1));
  }
  const e = snap && snap.expected;
  if (e) {
    lines.push(line(series, e.high, c.exp, s("chart.legend_exp") + " ▲", st.Dashed, 1));
    lines.push(line(series, e.low, c.exp, s("chart.legend_exp") + " ▼", st.Dashed, 1));
  }
  const d20 = snap && snap.retrace && snap.retrace.d20;
  if (d20) {
    lines.push(line(series, d20.hi, c.band, s("chart.legend_d20") + " ↑", st.Dotted, 1));
    lines.push(line(series, d20.lo, c.band, s("chart.legend_d20") + " ↓", st.Dotted, 1));
  }
  return {
    remove() { for (const l of lines) if (l) { try { series.removePriceLine(l); } catch (err) { /* ignore */ } } lines.length = 0; },
    count: lines.filter(Boolean).length,
  };
}

/** Legend entries for the overlay strip. */
export function legend(snap, colors) {
  const c = Object.assign({ call: "#3fb950", put: "#f85149", flip: "#f5c33b", exp: "#58a6ff", band: "#9aa7b4" }, colors || {});
  const out = [];
  const g = snap && snap.gamma, e = snap && snap.expected, d = snap && snap.retrace && snap.retrace.d20;
  if (g) {
    // skip a level that isn't present so the legend never prints "null" (e.g. no gamma flip)
    if (g.call_wall != null) out.push({ color: c.call, label: s("chart.legend_call"), value: g.call_wall });
    if (g.put_wall != null) out.push({ color: c.put, label: s("chart.legend_put"), value: g.put_wall });
    if (g.flip != null) out.push({ color: c.flip, label: s("chart.legend_flip"), value: g.flip });
  }
  if (e && e.low != null && e.high != null) out.push({ color: c.exp, label: s("chart.legend_exp"), value: e.low + "–" + e.high });
  if (d && d.lo != null && d.hi != null) out.push({ color: c.band, label: s("chart.legend_d20"), value: d.lo + "–" + d.hi });
  return out;
}

/** All numeric overlay prices (for autoscale). */
export function levels(snap) {
  const g = (snap && snap.gamma) || {}, e = (snap && snap.expected) || {}, d = (snap && snap.retrace && snap.retrace.d20) || {};
  return [g.call_wall, g.put_wall, g.flip, e.low, e.high, d.lo, d.hi].map(Number).filter((x) => Number.isFinite(x) && x > 0);
}

/** RSI(14) from closes (Wilder smoothing). bars: [{time, close}] → [{time, value}] */
export function rsi(bars, period) {
  period = period || 14;
  const out = [];
  if (!bars || bars.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = bars[i].close - bars[i - 1].close;
    if (d >= 0) gain += d; else loss -= d;
  }
  let ag = gain / period, al = loss / period;
  out.push({ time: bars[period].time, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
  for (let i = period + 1; i < bars.length; i++) {
    const d = bars[i].close - bars[i - 1].close;
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    out.push({ time: bars[i].time, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
  }
  return out;
}

/** EMA over a plain number[] (seeded with the first value). */
export function ema(vals, period) {
  const k = 2 / (period + 1), out = [];
  let prev;
  for (let i = 0; i < vals.length; i++) {
    prev = i === 0 ? vals[i] : vals[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

/** MACD(12,26,9) from closes → { macd, signal, hist } as [{time, value}] (warmup slice trimmed). */
export function macd(bars, fast, slow, sig) {
  fast = fast || 12; slow = slow || 26; sig = sig || 9;
  if (!bars || bars.length <= slow + sig) return { macd: [], signal: [], hist: [] };
  const closes = bars.map((b) => b.close);
  const ef = ema(closes, fast), es = ema(closes, slow);
  const macdLine = closes.map((_, i) => ef[i] - es[i]);
  const signal = ema(macdLine, sig);
  const start = slow;   // drop the EMA warmup so the seed distortion doesn't show
  const macdOut = [], sigOut = [], histOut = [];
  for (let i = start; i < bars.length; i++) {
    macdOut.push({ time: bars[i].time, value: macdLine[i] });
    sigOut.push({ time: bars[i].time, value: signal[i] });
    histOut.push({ time: bars[i].time, value: macdLine[i] - signal[i] });
  }
  return { macd: macdOut, signal: sigOut, hist: histOut };
}
