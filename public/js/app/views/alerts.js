// views/alerts.js — list with state chips (pending/done/error/fired) · add form → 202 toast · 402 upsell · delete.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as tg from "../tg.js";
import { el, clear, toast, spinner, empty, errorBox, confirm, date } from "../ui.js";

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export function normalizeAlerts(resp) {
  const arr = Array.isArray(resp) ? resp : (resp && (resp.items || resp.alerts)) || [];
  return arr.map((a) => ({
    id: a.id ?? a.alert_id,
    ticker: String(a.ticker || a.symbol || "").toUpperCase(),
    condition: a.condition || a.condition_nl || a.text || "",
    state: stateOf(a),
    created_at: a.created_at || a.created || null,
    fired_at: a.fired_at || a.triggered_at || null,
  }));
}
export function stateOf(a) {
  if (a.fired_at || a.triggered_at || a.status === "fired" || a.status === "triggered") return "fired";
  const raw = String(a.compile_state || a.status || a.state || "done").toLowerCase();
  if (/pending|queued|compiling/.test(raw)) return "pending";
  if (/error|fail|invalid|reject/.test(raw)) return "error";
  return "done";
}

export async function mount(root) {
  const unsubs = []; let refreshTimer = null, refreshes = 0;
  const head = el("div.view-head", el("h1", s("alerts.title")), el("span.count.mono", { id: "alerts-count" }));
  const tIn = el("input.input.mono.short", { type: "text", placeholder: s("alerts.ticker_ph"), autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "10", "aria-label": s("alerts.ticker_ph") });
  const cIn = el("input.input", { type: "text", placeholder: s("alerts.cond_ph"), autocomplete: "off", maxlength: "200", "aria-label": s("alerts.cond_ph") });
  const addBtn = el("button.btn.btn-primary", { type: "submit" }, s("alerts.add"));
  const form = el("form.add-row.alerts-form", { onsubmit: onAdd }, tIn, cIn, addBtn);
  const list = el("div.alist", { id: "alerts-list" });
  root.append(head, form, el("p.muted.small", s("alerts.help")), list);

  async function onAdd(e) {
    e.preventDefault();
    const t = tIn.value.trim().toUpperCase().replace(/^\$/, ""), cond = cIn.value.trim();
    if (!TICKER_RE.test(t)) { tIn.focus(); return; }
    if (cond.length < 3) { cIn.focus(); return; }
    addBtn.disabled = true;
    try {
      const r = await api.alerts.add(t, cond);
      const body = api.isAccepted(r) ? r.body : r;
      toast(s("alerts.queued"), "ok");
      tg.haptic("success");
      cIn.value = "";
      store.set("alerts", [{ id: body && body.id, ticker: t, condition: cond, state: "pending", created_at: new Date().toISOString() }].concat(store.get("alerts") || []));
      scheduleRefresh();
    } catch (err) {
      if (err.status !== 402) toast(s("common.error", { msg: err.message }), "err");
    } finally { addBtn.disabled = false; }
  }

  async function onDelete(a) {
    if (!(await confirm(s("alerts.confirm_delete")))) return;
    try {
      await api.alerts.remove(a.id);
      toast(s("alerts.deleted"));
      tg.haptic("light");
      store.set("alerts", (store.get("alerts") || []).filter((x) => x.id !== a.id));
    } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
  }

  function render() {
    const items = store.get("alerts") || [];
    const me = store.get("me") || {};
    const cap = me.caps && me.caps.alerts;
    const cnt = document.getElementById("alerts-count");
    if (cnt) cnt.textContent = cap ? s("alerts.count", { n: items.length, cap }) : String(items.length);
    clear(list);
    if (!items.length) { list.appendChild(empty(s("alerts.empty"))); return; }
    for (const a of items) {
      list.appendChild(el("article.card.alert-row", { "data-id": a.id, "data-state": a.state },
        el("div.alert-main",
          el("a.ticker.mono", { href: "#/chart/" + a.ticker }, "$" + a.ticker),
          el("span.cond", a.condition)),
        el("div.alert-side",
          el("span.chip", { class: "chip-" + a.state }, s("alerts.state_" + a.state)),
          a.created_at ? el("span.muted.small.mono", date(a.created_at)) : null,
          el("button.btn.btn-ghost.btn-sm.danger", { type: "button", "aria-label": s("common.delete"), onclick: () => onDelete(a) }, "✕"))));
    }
  }

  async function load() {
    try {
      store.set("alerts", normalizeAlerts(await api.alerts.list()));
      if ((store.get("alerts") || []).some((a) => a.state === "pending")) scheduleRefresh();
    } catch (err) { clear(list); list.appendChild(errorBox(err, load)); }
  }
  function scheduleRefresh() {
    if (refreshTimer || refreshes >= 4) return;
    refreshTimer = setTimeout(() => { refreshTimer = null; refreshes++; load(); }, 20000);
  }

  unsubs.push(store.subscribe("alerts", render));
  render();
  if (!(store.get("alerts") || []).length) list.appendChild(spinner());
  await load();
  return () => { unsubs.forEach((u) => u()); if (refreshTimer) clearTimeout(refreshTimer); };
}
