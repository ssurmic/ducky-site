// views/billing.js — plans from /billing/plans · tier cards + "Which one?" · rails: Stars (inside TG, MainButton),
// Alipay/WeChat QR + order code + "/paid DK-xxxx", USDT address+memo, Stripe (data-soon unless checkout_url) · orders.
// Rail ids sent to POST /billing/order are the backend's canonical ids (manual_alipay / manual_wechat / manual_usdt /
// usdc_* / btc / stars / stripe); /billing/qr/{alipay|wechat} keeps the short name. CNY rails are sold per year only,
// so an order on them always carries months=12 whatever the monthly/annual toggle says (the bot does the same).
import { s, has, CFG, LANG } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as tg from "../tg.js";
import * as auth from "../auth.js";
import { el, clear, toast, spinner, errorBox, tierName, date, num } from "../ui.js";

let selected = { tier: "paid", months: 12 };
// crypto orders carry a unique sub-cent / sat suffix (crypto_watch matches on it) — never round it away.
// Prefer the server's authoritative amount string; else format at the rail's real precision, not 2dp.
function amtStr(o) {
  if (o && o.payload && o.payload.amount_str) return o.payload.amount_str + " " + (o.currency || "");
  const cur = (o && o.currency) || "";
  const dec = cur === "XTR" ? 0 : cur === "BTC" ? 8 : (cur === "USDT" || cur === "USDC") ? 6 : 2;
  return num(o && o.amount, dec) + " " + cur;
}
// finding billing.js:14 — plansCache was module-level and never invalidated, so the rails list ("only the
// rails the server can honour right now") and every price froze at the first Billing visit of the session.
// Give it a short TTL so a server-side rails/price change is reflected within a minute.
let plansCache = null, plansCacheAt = 0;
const PLANS_TTL_MS = 60000;
let onPayStars = null;

/** Backend rail id for a button; the QR route wants the short name back (manual_alipay → alipay). */
const CNY_RAILS = ["manual_alipay", "manual_wechat"];
export function isCnyRail(rail) { return CNY_RAILS.includes(rail); }
export function qrName(rail) { return String(rail).replace(/^manual_/, ""); }
/** Months an order on `rail` is created with: CNY rails only exist as 12-month plans. */
export function orderMonths(rail, months) { return isCnyRail(rail) ? 12 : months; }

/** Router hook: MainButton config (Telegram only). */
export function mainButton() {
  if (!tg.inTG) return null;
  return { text: s("billing.stars_btn") + " · " + tierName(selected.tier), onClick: () => { if (onPayStars) onPayStars(); } };
}

/** Fold the real /billing/plans shape — one row per {tier, months, currency, amount, rails} (billing.list_plans) —
 *  into per-tier price fields; object/legacy shapes and the CFG.PRICES fallback fill whatever is still missing. */
export function normalizePlans(resp) {
  const out = { paid: null, pro: null, rails: null, usdt: null };
  const pick = (o, keys) => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return Number(o[k]); return null; };
  const tierId = (v) => { const id = String(v || "").toLowerCase(); return id === "pro" ? "pro" : /paid|signal/.test(id) ? "paid" : null; };
  const blank = (id) => ({ tier: id, name: id === "pro" ? "Pro" : "Signal", monthly_usd: null, annual_usd: null, annual_cny: null, stars_monthly: null, stars_annual: null });
  const norm = (id, o) => ({
    tier: id, name: o.name || (id === "pro" ? "Pro" : "Signal"),
    monthly_usd: pick(o, ["monthly_usd", "usd_monthly", "monthly", "price_monthly_usd", "usd_month"]),
    annual_usd: pick(o, ["annual_usd", "usd_annual", "annual", "yearly_usd", "usd_year"]),
    annual_cny: pick(o, ["annual_cny", "cny_annual", "cny_year"]),
    stars_monthly: pick(o, ["stars_monthly", "stars", "stars_month"]),
    stars_annual: pick(o, ["stars_annual", "stars_year"]),
  });
  // {currency, months} → field on the tier object (list_plans row shape)
  const FIELD = { "USD:1": "monthly_usd", "USD:12": "annual_usd", "CNY:12": "annual_cny", "XTR:1": "stars_monthly", "XTR:12": "stars_annual" };
  const isRow = (p) => p && p.currency !== undefined && p.amount !== undefined && p.months !== undefined;
  const plans = resp && (resp.plans || resp.tiers || resp);
  if (Array.isArray(plans)) {
    for (const p of plans) {
      const id = tierId(p.tier || p.id); if (!id) continue;
      if (isRow(p)) {
        const t = out[id] || (out[id] = blank(id));
        const f = FIELD[String(p.currency).toUpperCase() + ":" + Number(p.months)];
        if (f && t[f] === null) t[f] = Number(p.amount);
        if (p.label) t.name = p.label;
      } else out[id] = norm(id, p);
    }
  } else if (plans && typeof plans === "object") {
    for (const k of Object.keys(plans)) { const id = tierId(k); if (id) out[id] = norm(id, plans[k]); }
  }
  if (resp && Array.isArray(resp.rails)) out.rails = resp.rails.map((r) => String(r.id || r).toLowerCase());
  if (resp && resp.usdt) out.usdt = resp.usdt;
  // CFG fallback fills any price the API did not provide (or everything when the API is unreachable)
  const P = CFG.PRICES || {};
  const fill = (id, src) => { if (!src) return; const t = out[id] || (out[id] = blank(id)); for (const k of Object.keys(src)) if (t[k] === null && src[k] !== undefined && src[k] !== null) t[k] = Number(src[k]); };
  if (P.signal) fill("paid", { monthly_usd: P.signal.monthly_usd, annual_usd: P.signal.annual_usd, annual_cny: P.china && P.china.annual_cny });
  if (P.pro) fill("pro", { monthly_usd: P.pro.monthly_usd, annual_usd: P.pro.annual_usd });
  return out;
}

export async function mount(root) {
  let plans = (Date.now() - plansCacheAt < PLANS_TTL_MS) ? plansCache : null, busy = false;   // finding billing.js:14
  const me = store.get("me") || {};
  // preselect a plan that reflects the user's context, not a hardcoded "Signal": a Pro subscriber sees
  // Pro selected (renewal/current), everyone else sees Signal (the entry tier).
  selected.tier = me.tier === "pro" ? "pro" : "paid";
  // finding billing.js:76 — GET /me nests expiry under subscription.expires_at (app.py), not me.expires_at,
  // so a paying subscriber never saw their plan end date.
  const sub = me.subscription || {};
  const head = el("div.view-head", el("h1", s("billing.title")),
    el("span.muted.small", s("billing.current", { tier: tierName(me.tier) }) + (sub.expires_at ? " · " + s("tier.expires", { date: date(sub.expires_at) }) : "")));
  const picker = el("div.picker", el("b", s("billing.pick_title")), el("ul", el("li", s("billing.pick_signal")), el("li", s("billing.pick_pro"))));
  const toggle = el("div.seg.mono", { role: "group" },
    ["monthly", "annual"].map((m) => el("button", { type: "button", "data-m": m, class: (m === "annual") === (selected.months === 12) ? "on" : "", onclick: () => { selected.months = m === "annual" ? 12 : 1; toggle.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.m === m)); renderTiers(); renderRails(); } }, s("billing." + m))));
  const tiers = el("div.tier-cards");
  const rails = el("section.rails");
  const panel = el("section.pay-panel", { hidden: true });
  const ordersBox = el("section.orders", el("h2", s("billing.orders")), spinner());
  const foot = el("p.muted.small.billing-foot", s("billing.disclaimer") + " ", el("a", { href: (LANG === "zh" ? "" : "/en") + "/disclaimer/" }, s("billing.disclaimer_link")));
  root.append(head, picker, toggle, tiers, rails, panel, ordersBox, foot);

  function price(p) {
    if (!p) return "—";
    const annual = selected.months === 12;
    const usd = annual ? p.annual_usd : p.monthly_usd;
    let txt = usd !== null ? "$" + num(usd, 0) + (annual ? s("billing.per_yr") : s("billing.per_mo")) : "—";
    if (annual && p.annual_cny && LANG === "zh") txt += " · ¥" + num(p.annual_cny, 0) + s("billing.per_yr");
    return txt;
  }
  function renderTiers() {
    clear(tiers);
    for (const id of ["paid", "pro"]) {
      const p = plans && plans[id];
      const on = selected.tier === id;
      tiers.appendChild(el("article.card.tier-card", { class: on ? "on" : "", "data-tier": id },
        el("h3", tierName(id)),
        el("p.price.mono", price(p)),
        el("p.muted.small", s("billing.desc_" + id)),
        el("button.btn", { type: "button", class: on ? "btn-primary" : "btn-ghost", onclick: () => { selected.tier = id; renderTiers(); renderRails(); tg.haptic("light"); if (tg.inTG) { const mb = mainButton(); if (mb) tg.showMain(mb.text, mb.onClick); } } },
          on ? "✓ " + tierName(id) : s("billing.choose", { tier: tierName(id) }))));
    }
  }
  function railEnabled(r) { return !plans || !plans.rails || plans.rails.includes(r); }
  function renderRails() {
    clear(rails);
    rails.appendChild(el("h2", s("billing.rail_title")));
    const row = el("div.rail-row");
    if (tg.inTG) row.appendChild(el("button.btn.btn-primary", { type: "button", onclick: payStars }, "⭐ " + s("billing.stars_btn")));
    else row.appendChild(el("a.btn.btn-ghost", { href: "https://t.me/" + CFG.BOT + "/" + CFG.MINIAPP + "?startapp=billing", target: "_blank", rel: "noopener", title: s("billing.stars_only_tg") }, "⭐ " + s("billing.rail_stars")));
    // canonical backend ids; /billing/plans lists only the rails the server can honour right now
    [["manual_alipay", "billing.rail_alipay"], ["manual_wechat", "billing.rail_wechat"], ["manual_usdt", "billing.rail_usdt"]]
      .forEach(([r, key]) => { if (railEnabled(r)) row.appendChild(el("button.btn.btn-ghost", { type: "button", onclick: () => manual(r) }, s(key) + (isCnyRail(r) ? " · " + s("billing.annual") : ""))); });
    ["usdc_erc20", "usdc_trc20", "btc"].forEach((r) => { if (railEnabled(r)) row.appendChild(el("button.btn.btn-ghost", { type: "button", onclick: () => crypto(r) }, s("billing.rail_" + r))); });
    const stripeOk = !!(plans && plans.rails && plans.rails.includes("stripe"));
    row.appendChild(el("button.btn.btn-ghost", { type: "button", disabled: !stripeOk, "data-soon": stripeOk ? null : "", onclick: stripe }, s("billing.rail_stripe") + (stripeOk ? "" : " · " + s("billing.soon"))));
    rails.appendChild(row);
    if (!tg.inTG) rails.appendChild(el("p.muted.small", s("billing.stars_only_tg")));
  }

  async function order(rail) {
    if (busy) return null;
    const me = store.get("me") || {};
    if (me.profile_complete === false) {
      toast(s("billing.need_profile"), "err");
      location.hash = "#/profile?next=billing";
      return null;
    }
    busy = true; tg.mainProgress(true);
    panel.hidden = false; clear(panel); panel.appendChild(spinner(s("billing.creating")));
    try {
      const o = await api.billing.order(selected.tier, orderMonths(rail, selected.months), rail);
      loadOrders();
      return o;
    } catch (err) {
      clear(panel); panel.appendChild(errorBox(err));
      return null;
    } finally { busy = false; tg.mainProgress(false); }
  }

  async function payStars() {
    const o = await order("stars");
    if (!o) return;
    const link = o.payload && o.payload.invoice_link;
    if (!link) { clear(panel); panel.appendChild(errorBox(new Error("no invoice_link"))); return; }
    clear(panel); panel.appendChild(orderHead(o));
    try {
      const status = await tg.openInvoice(link);
      if (status === "paid") { toast(s("billing.paid"), "ok"); tg.haptic("success"); await auth.refreshMe(); location.hash = "#/watchlist"; }
      else if (status === "cancelled") toast(s("billing.cancelled"));
      else toast(s("billing.status_" + status));
      loadOrders();
    } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
  }
  onPayStars = payStars;

  function orderHead(o) {
    return el("div.order-head",
      el("div", el("span.muted", s("billing.order_code") + " "), el("b.mono", o.order_code)),
      el("div", el("span.muted", s("billing.amount") + " "), el("b.mono", amtStr(o))),
      el("div", el("span.muted", s("billing.plan") + " "), el("b", tierName(o.tier || selected.tier) + " · " + (Number(o.months || selected.months) === 12 ? s("billing.annual") : s("billing.monthly")))));
  }
  function paidHint(o) {
    const cmd = "/paid " + o.order_code;
    return el("div.paid-hint",
      el("p", s("billing.manual_hint", { code: o.order_code })),
      el("div.cta-row", el("button.btn.btn-ghost.btn-sm", { type: "button", onclick: () => copy(cmd) }, s("common.copy") + " " + cmd),
        el("a.btn.btn-primary.btn-sm", { href: "https://t.me/" + CFG.BOT, target: "_blank", rel: "noopener", onclick: (e) => { if (tg.inTG) { e.preventDefault(); tg.openTelegramLink("https://t.me/" + CFG.BOT); } } }, s("billing.open_bot"))));
  }
  async function manual(rail) {
    const o = await order(rail);
    if (!o) return;
    clear(panel); panel.appendChild(orderHead(o));
    if (rail === "manual_usdt") {
      const addr = (o.payload && o.payload.address) || (plans && plans.usdt && plans.usdt.address) || "";
      const memo = (o.payload && o.payload.memo) || o.order_code;
      panel.append(
        el("div.kv-grid", el("dt", s("billing.usdt_addr")), el("dd.mono.break", addr, " ", el("button.copy", { type: "button", onclick: () => copy(addr) }, s("common.copy"))),
          el("dt", s("billing.usdt_memo")), el("dd.mono", memo, " ", el("button.copy", { type: "button", onclick: () => copy(memo) }, s("common.copy")))),
        el("p.muted.small", s("billing.usdt_hint", { code: o.order_code })), paidHint(o));
      return;
    }
    const img = el("img.qr", { alt: s("billing.rail_" + qrName(rail)) + " QR" });
    const qrBox = el("div.qr-box", spinner());
    panel.append(qrBox, o.payload && o.payload.caption ? el("p.muted.small", o.payload.caption) : null, paidHint(o));
    try {
      img.src = (o.payload && o.payload.qr_url && /^data:/.test(o.payload.qr_url)) ? o.payload.qr_url : await api.billing.qr(qrName(rail));
      clear(qrBox); qrBox.appendChild(img);
    } catch (err) { clear(qrBox); qrBox.appendChild(el("p.errbox", s("billing.qr_fail"))); }
  }
  async function crypto(rail) {
    const o = await order(rail);
    if (!o) return;
    clear(panel); panel.appendChild(orderHead(o));
    const p = o.payload || {};
    if (!p.address) { panel.appendChild(el("p.errbox", s("billing.crypto_noaddr"))); return; }
    const amt = p.amount_str || String(o.amount);
    panel.append(
      el("div.kv-grid",
        el("dt", s("billing.crypto_network")), el("dd", p.network || ""),
        el("dt", s("billing.crypto_addr")), el("dd.mono.break", p.address, " ", el("button.copy", { type: "button", onclick: () => copy(p.address) }, s("common.copy"))),
        el("dt", s("billing.crypto_amount")), el("dd.mono", amt + " " + (p.asset || ""), " ", el("button.copy", { type: "button", onclick: () => copy(amt) }, s("common.copy")))),
      el("p.muted.small", s("billing.crypto_hint", { asset: p.asset || "", network: p.network || "", hours: p.expires_h || 48 })),
      el("p.small.warn", s("billing.crypto_warn", { network: p.network || "" })));
  }
  async function stripe() {
    const o = await order("stripe");
    if (!o) return;
    const url = o.payload && o.payload.checkout_url;
    clear(panel); panel.appendChild(orderHead(o));
    if (url) { panel.appendChild(el("a.btn.btn-primary", { href: url, target: "_blank", rel: "noopener" }, s("billing.rail_stripe") + " →")); tg.openLink(url); }
    else panel.appendChild(el("p.muted", s("billing.soon")));
  }
  function copy(text) {
    try { navigator.clipboard.writeText(text).then(() => toast(s("common.copied"), "ok")); } catch (e) { toast(text); }
  }

  async function loadOrders() {
    try {
      const r = await api.billing.orders();
      const arr = Array.isArray(r) ? r : (r && (r.items || r.orders)) || [];
      clear(ordersBox); ordersBox.appendChild(el("h2", s("billing.orders")));
      if (!arr.length) { ordersBox.appendChild(el("p.muted", s("billing.orders_empty"))); return; }
      const tbl = el("div.orders-list");
      for (const o of arr) {
        const st = String(o.status || o.state || "pending").toLowerCase();
        tbl.appendChild(el("div.order-row", { "data-status": st },
          el("b.mono", o.order_code || o.code || "—"),
          el("span", tierName(o.tier) + (o.months ? " · " + o.months + "m" : "")),
          el("span.mono", amtStr(o)),
          el("span.chip", { class: "chip-" + (st === "paid" || st === "settled" ? "done" : st === "rejected" || st === "expired" ? "error" : "pending") }, has("billing.status_" + st) ? s("billing.status_" + st) : st),
          el("span.muted.small.mono", date(o.created_at || o.created))));
      }
      ordersBox.appendChild(tbl);
    } catch (err) { clear(ordersBox); ordersBox.appendChild(el("h2", s("billing.orders"))); ordersBox.appendChild(errorBox(err, loadOrders)); }
  }

  if (!plans) {
    try { plans = plansCache = normalizePlans(await api.billing.plans()); plansCacheAt = Date.now(); }   // finding billing.js:14
    catch (err) { plans = normalizePlans(null); }
  }
  renderTiers(); renderRails(); loadOrders();
  return () => { onPayStars = null; };
}
