// ui.js — DOM helpers: el(), formatters, tier badge, lock overlay, toast, modal, upsell.
import { s, LANG } from "./strings.js";
import * as store from "./store.js";

/** el('div.card#id', {attrs}, ...children) — children: Node | string | null | array */
export function el(spec, attrs, ...children) {
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(spec || "div");
  const node = document.createElement((m && m[1]) || "div");
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g) || []) {
      if (part[0] === ".") node.classList.add(part.slice(1)); else node.id = part.slice(1);
    }
  }
  if (attrs && typeof attrs === "object" && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className += (node.className ? " " : "") + v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v; // only for trusted, build-time strings
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      else if (k === "dataset") Object.assign(node.dataset, v);
      else node.setAttribute(k, v === true ? "" : v);
    }
  } else if (attrs !== undefined) {
    children.unshift(attrs);
  }
  append(node, children);
  return node;
}
export function append(node, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(node, c);
    else node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

// ---- formatters ---------------------------------------------------------------------------
export function num(v, digits) {
  if (v === null || v === undefined || v === "" || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  return n.toLocaleString(LANG === "zh" ? "zh-CN" : "en-US", { minimumFractionDigits: digits ?? 2, maximumFractionDigits: digits ?? 2 });
}
export function px(v) { return v === null || v === undefined ? "—" : "$" + num(v, Number(v) >= 1000 ? 0 : 2); }
export function pct(v, digits) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  return (n > 0 ? "+" : "") + num(n, digits ?? 1) + "%";
}
export function int(v) { return v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : String(Math.round(Number(v))); }
export function signClass(v) { const n = Number(v); return Number.isNaN(n) || n === 0 ? "" : n > 0 ? "pos" : "neg"; }
export function date(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}
export function dateTime(value) {
  const d = new Date(value);
  return value && Number.isFinite(d.getTime()) ? d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—';
}
export function tierName(t) { return s("tier." + (t || "free")); }

export function tierBadge(t) {
  t = t || "free";
  return el("span.tier-badge.mono", { class: "tier-" + t, text: tierName(t) });
}
export function renderTierBadge() {
  const host = document.getElementById("tier-badge");
  if (!host) return;
  clear(host);
  const me = store.get("me");
  if (!me || !store.billingEnabled()) return;
  host.appendChild(tierBadge(me.tier));
}

/** Lock overlay for gated content: wraps `inner` blurred + a link to #/billing. */
export function lock(inner, hint) {
  const wrap = el("div.locked");
  const content = el("div.locked-content", { "aria-hidden": "true" }, inner);
  const veil = el("a.locked-veil", { href: "#/billing" },
    el("span.locked-icon", { "aria-hidden": "true" }, "🔒"),
    el("span.locked-text", hint || s("common.lock_hint")),
    el("span.locked-cta.mono", s("common.unlock")));
  wrap.append(content, veil);
  return wrap;
}

export function spinner(label) { return el("div.spinner-row", el("span.spinner", { "aria-hidden": "true" }), el("span.muted", label || s("common.loading"))); }
export function empty(text) { return el("p.empty", text); }
export function errorBox(err, retry) {
  const msg = err && err.status === 0 ? s("common.offline") : (err && err.message) || String(err);
  const box = el("div.errbox", el("span", s("common.error", { msg })));
  if (retry) box.appendChild(el("button.btn.btn-ghost.btn-sm", { type: "button", onclick: retry }, s("common.retry")));
  return box;
}

// ---- toast --------------------------------------------------------------------------------
export function toast(msg, kind) {
  const host = document.getElementById("toasts") || document.body.appendChild(el("div#toasts"));
  const t = el("div.toast", { class: kind || "", role: "status" }, msg);
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3200);
}

// ---- modal --------------------------------------------------------------------------------
let modalState = null;
export function modal(title, body, actions) {
  closeModal();
  const host = document.getElementById("modal") || document.body.appendChild(el("div#modal"));
  const opener = document.activeElement;
  const shell = document.querySelector(".app-shell");
  const scroller = document.querySelector('.app-main');
  const scrollTop = scroller?.scrollTop;
  const wasInert = shell?.inert;
  const box = el("div.modal-box", { role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-title", tabindex: -1 },
    el("div.modal-heading", el("h2#modal-title", title),
      el("button.modal-close", {type:"button", "aria-label":s("common.close"), onclick:closeModal}, "×")),
    el("div.modal-body", body),
    el("div.modal-actions", (actions || []).map((a) => el("a.btn", { class: a.primary ? "btn-primary" : "btn-ghost", href: a.href || "#", onclick: (e) => { if (!a.href) e.preventDefault(); if (a.onclick) a.onclick(e); if (a.close !== false) closeModal(); } }, a.label)),
      el("button.btn.btn-ghost", { type: "button", onclick: closeModal }, s("common.close"))));
  host.appendChild(box);
  host.hidden = false;
  host.onclick = (e) => { if (e.target === host) closeModal(); };
  const keydown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); return; }
    if (event.key !== "Tab") return;
    const nodes = [...box.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex="0"]')]
      .filter(node => !node.disabled && !node.closest('[hidden]') && ![...box.querySelectorAll('details:not([open])')].some(detail => detail.contains(node) && node !== detail.querySelector('summary')));
    const first = nodes[0], last = nodes.at(-1);
    if (!first) { event.preventDefault(); box.focus(); }
    else if (event.shiftKey && (document.activeElement === first || document.activeElement === box)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  modalState = {opener, shell, wasInert, keydown, scroller, scrollTop};
  if (shell) shell.inert = true;
  document.body.classList.add("modal-open");
  document.addEventListener("keydown", keydown);
  box.querySelector(".modal-close").focus({preventScroll:true});
  return host;
}
export function closeModal() {
  if (modalState) {
    const {opener, shell, wasInert, keydown, scroller, scrollTop} = modalState;
    document.removeEventListener("keydown", keydown);
    if (shell) shell.inert = !!wasInert;
    document.body.classList.remove("modal-open");
    modalState = null;
    if (opener?.isConnected) opener.focus({preventScroll:true});
    if (scroller) scroller.scrollTop = scrollTop;
  }
  const host = document.getElementById("modal");
  if (!host) return;
  clear(host);
  host.hidden = true;
}
export function confirm(text) {
  return new Promise((resolve) => {
    modal(text, "", [{ label: s("common.delete"), primary: true, onclick: () => resolve(true) }]);
    const host = document.getElementById("modal");
    const obs = new MutationObserver(() => { if (host.hidden) { obs.disconnect(); resolve(false); } });
    obs.observe(host, { attributes: true, attributeFilter: ["hidden"] });
  });
}

/** 402 upsell: {cap, tier} from the API. */
export function upsell(info) {
  info = info || {};
  if (!store.billingEnabled()) {
    modal(s('access.limit_title'), el('p', Number.isFinite(info.cap)
      ? s('access.limit_body', {cap:info.cap}) : s('access.unavailable')),
      [{label:s('common.close')}]);
    return;
  }
  const feature = info.feature || ({watch_limit:'watches',alert_limit:'alerts',creator_limit:'creators',evidence_limit:'evidence'}[info.error]);
  const quota = Number.isFinite(info.cap) && ['watches','alerts','creators','evidence'].includes(feature);
  const body = el('div',el('p',quota?s('experience.limit_'+feature,{cap:info.cap}):s('upsell.body')),
    el('p.muted',quota?s('experience.replace'):s('billing.pick_pro')));
  modal(quota?s('experience.limit_title'):s('upsell.title'),body,
    [{label:s('experience.keep_free')},
     {label:s('experience.compare'),primary:true,href:'#/billing'}]);
}
