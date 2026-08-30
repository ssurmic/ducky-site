// views/watchlist.js — add ticker · list of 全景 mini-cards from /snapshot · remove.
// gamma + expected rows are blurred behind a lock for free/paid (Pro only).
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as tg from "../tg.js";
import { el, clear, toast, spinner, empty, errorBox, lock, num, px, pct, int, signClass } from "../ui.js";

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export function normalizeList(resp) {
  const arr = Array.isArray(resp) ? resp : (resp && (resp.items || resp.watchlist || resp.tickers)) || [];
  return arr.map((x) => (typeof x === "string" ? x : x && (x.ticker || x.symbol))).filter(Boolean).map((t) => String(t).toUpperCase());
}

export async function mount(root) {
  const unsubs = [];
  const head = el("div.view-head", el("h1", s("watch.title")), el("span.count.mono", { id: "watch-count" }));
  const input = el("input.input.mono", { type: "text", placeholder: s("watch.placeholder"), autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "10", "aria-label": s("watch.placeholder") });
  const addBtn = el("button.btn.btn-primary", { type: "submit" }, s("watch.add"));
  const form = el("form.add-row", { onsubmit: onAdd }, input, addBtn);
  const list = el("div.cards", { id: "watch-cards" });
  root.append(head, form, list);

  async function onAdd(e) {
    e.preventDefault();
    const t = input.value.trim().toUpperCase().replace(/^\$/, "");
    if (!TICKER_RE.test(t)) { input.focus(); return; }
    addBtn.disabled = true;
    try {
      await api.watchlist.add(t);
      input.value = "";
      toast(s("watch.added", { t }), "ok");
      tg.haptic("success");
      await load();
      loadSnapshot(t, true);
    } catch (err) {
      if (err.status !== 402) toast(s("common.error", { msg: err.message }), "err");
    } finally { addBtn.disabled = false; }
  }

  async function onRemove(t) {
    try {
      await api.watchlist.remove(t);
      toast(s("watch.removed", { t }));
      tg.haptic("light");
      store.set("watchlist", store.get("watchlist").filter((x) => x !== t));
    } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
  }

  function render() {
    const items = store.get("watchlist") || [];
    const me = store.get("me") || {};
    const cap = me.caps && me.caps.watches;
    const cnt = document.getElementById("watch-count");
    if (cnt) cnt.textContent = cap ? s("watch.count", { n: items.length, cap }) : String(items.length);
    clear(list);
    if (!items.length) { list.appendChild(empty(s("watch.empty"))); return; }
    const snaps = store.get("snapshots") || {};
    for (const t of items) list.appendChild(card(t, snaps[t]));
  }

  function card(t, snap) {
    const c = el("article.card.snap", { "data-ticker": t });
    const head = el("div.snap-head",
      el("a.ticker.mono", { href: "#/chart/" + t }, "$" + t),
      el("span.spot.mono", snap && snap.ok ? px(snap.spot) : ""),
      snap && snap.ok ? el("span.chip", { class: snap.tech && snap.tech.oversold ? "chip-red" : "chip-dim" }, snap.tech && snap.tech.oversold ? s("watch.oversold") : s("watch.not_oversold")) : null,
      el("span.spacer"),
      el("a.btn.btn-ghost.btn-sm", { href: "#/chart/" + t }, s("watch.chart")),
      el("button.btn.btn-ghost.btn-sm.danger", { type: "button", "aria-label": s("watch.remove") + " " + t, onclick: () => onRemove(t) }, "✕"));
    c.appendChild(head);
    if (!snap) { c.appendChild(spinner()); return c; }
    if (snap.pending) { c.appendChild(spinner(s("common.building"))); return c; }
    if (snap.error && !snap.ok) { c.appendChild(errorBox(snap.error, () => loadSnapshot(t, true))); return c; }
    if (!snap.ok) { c.appendChild(el("p.muted", s("watch.no_data"))); return c; }

    const te = snap.tech || {}, r20 = (snap.retrace || {}).d20, rs = snap.rs || {}, v = snap.vol || {};
    const rows = el("dl.kv-grid");
    const row = (k, val, cls) => rows.append(el("dt", k), el("dd.mono", { class: cls || "" }, val));
    row(s("watch.rsi"), int(te.rsi_d) + " / " + int(te.rsi_w) + " / " + int(te.rsi_m), Number(te.rsi_d) < 30 ? "neg" : "");
    row(s("watch.dd"), pct(te.dd_pct), signClass(te.dd_pct));
    row(s("watch.vs50"), pct(te.vs_50dma), signClass(te.vs_50dma));
    row(s("watch.vs200"), pct(te.vs_200dma), signClass(te.vs_200dma));
    if (r20) row(s("watch.retrace"), int(r20.pos * 100) + "% · " + posWord(r20.pos) + " [" + num(r20.lo, 2) + "–" + num(r20.hi, 2) + "]", r20.pos < 0.25 ? "neg" : r20.pos > 0.75 ? "pos" : "");
    if (rs.excess20 !== undefined && rs.excess20 !== null) row(s("watch.rs", { b: rs.benchmark || "—" }), pct(rs.excess20) + (rs.label ? " · " + rs.label : ""), signClass(rs.excess20));
    if (v.iv || v.hv) row(s("watch.ivhv"), num(v.iv, 1) + "% / " + num(v.hv, 1) + "%" + (v.ratio ? " → " + num(v.ratio, 2) + " (" + v.label + ")" : ""));
    c.appendChild(rows);

    // Pro rows: gamma walls + expected range
    const pro = el("dl.kv-grid.pro-rows");
    const g = snap.gamma, ex = snap.expected;
    const proRow = (k, val) => pro.append(el("dt", k), el("dd.mono", val));
    if (store.isPro()) {
      proRow(s("watch.gamma"), g ? px(g.call_wall) + " / " + px(g.put_wall) + " / " + px(g.flip) + (g.regime ? " · " + g.regime : "") : "—");
      proRow(s("watch.expected"), ex ? px(ex.low) + "–" + px(ex.high) + " (±" + num(ex.move_pct, 1) + "%" + (ex.expiry ? " · " + ex.expiry : "") + ")" : "—");
      c.appendChild(pro);
    } else {
      proRow(s("watch.gamma"), "$000 / $000 / $000");
      proRow(s("watch.expected"), "$000–$000 (±0.0%)");
      c.appendChild(lock(pro));
    }
    return c;
  }

  function posWord(p) { return p < 0.25 ? s("watch.pos_low") : p > 0.75 ? s("watch.pos_high") : s("watch.pos_mid"); }

  async function load() {
    try {
      store.set("watchlist", normalizeList(await api.watchlist.list()));
    } catch (err) {
      clear(list); list.appendChild(errorBox(err, load));
    }
  }

  async function loadSnapshot(t, force) {
    const snaps = store.get("snapshots") || {};
    if (!force && snaps[t] && !snaps[t].pending && snaps[t].ok) return;
    store.patch("snapshots", { [t]: { pending: true } });
    try {
      const r = await api.snapshot(t, { tries: 6, onWait: () => store.patch("snapshots", { [t]: { pending: true } }) });
      const snap = r && r.snapshot ? r.snapshot : r;   // API wraps: {ticker, snapshot:{…}} (§4.2)
      store.patch("snapshots", { [t]: api.isAccepted(r) ? { ok: false, error: { message: s("common.building") } } : snap });
    } catch (err) {
      if (err.status === 401) return;
      store.patch("snapshots", { [t]: { ok: false, error: err } });
    }
  }

  unsubs.push(store.subscribe("watchlist", () => { render(); for (const t of store.get("watchlist")) loadSnapshot(t, false); }));
  unsubs.push(store.subscribe("snapshots", render));
  render();
  if ((store.get("watchlist") || []).length) for (const t of store.get("watchlist")) loadSnapshot(t, false);
  await load();
  return () => unsubs.forEach((u) => u());
}
