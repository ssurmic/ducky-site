// views/creators.js — 财经博主: follow finance creators; Ducky summarises each new video. The creator grid
// has Follow toggles (POST/DELETE /kol/{id}/sub); below it, the recent summary feed. The feed is a RECORD of
// the creator's view (attributed, tickers, bull/bear), never our advice.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, toast, spinner, empty } from "../ui.js";

const TAKE_CLS = { bull: "cr-bull", bear: "cr-bear", neutral: "cr-neutral" };
const CALL_ARROW = { bull: "▲", bear: "▼", neutral: "•" };

function pickSummary(x, isZh) {
  if (x == null) return "";
  if (typeof x === "object") return isZh ? (x.zh || x.en || "") : (x.en || x.zh || "");
  try { const o = JSON.parse(x); return isZh ? (o.zh || o.en || "") : (o.en || o.zh || ""); } catch (e) { return String(x); }
}

export function evidenceMeta(post) {
  let data = post.summary;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = {}; } }
  return data && typeof data === "object" ? data : {};
}
export function hasGroundedCalls(post) {
  const meta = evidenceMeta(post);
  return meta.quality === "grounded" && meta.source?.kind === "transcript" && (post.calls || []).some(c => typeof c.evidence === "string" && c.evidence.length >= 12);
}

function callChips(calls, isZh) {
  // per-ticker gist Ducky dug out of the video: $SYM ▲/▼ + the target the CREATOR stated (attributed,
  // never our own) + their one-line point. Compact chips so a promo/title-only video still yields signal.
  const wrap = el("div.cr-calls");
  for (const c of calls.slice(0, 6)) {
    const st = (c.stance === "bull" || c.stance === "bear") ? c.stance : "neutral";
    if (!c.evidence) continue;
    const chip = el("div.cr-call.cr-call-" + st);
    chip.appendChild(el("b.cr-call-sym.mono", "$" + String(c.sym || "").toUpperCase()));
    chip.appendChild(el("span.cr-call-arrow", s("creators.take_" + st)));
    if (c.target) chip.appendChild(el("span.cr-call-tgt.mono", String(c.target)));
    const note = pickSummary(c.note, isZh);
    if (note) chip.appendChild(el("span.cr-call-note", note));
    chip.appendChild(el("details.cr-evidence", el("summary", s("creators.evidence")), el("blockquote", c.evidence)));
    wrap.appendChild(chip);
  }
  return wrap;
}

export async function mount(root) {
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const card = el("section.card.creators-view");
  root.appendChild(card);
  card.append(el("h1", s("creators.h1")), el("p.muted", s("creators.sub")));
  card.appendChild(spinner());

  let doc, subs;
  try {
    [doc, subs] = await Promise.all([api.kol.feed(), api.kol.mine().catch(() => ({ subs: [] }))]);
  } catch (e) {
    clear(card); card.append(el("h1", s("creators.h1")), el("p.err", s("creators.load_error")));
    return () => {};
  }
  const following = new Set((subs && subs.subs) || []);
  const kols = (doc && doc.kols) || [];
  const posts = (doc && doc.posts) || [];
  let archive = false;
  render();

  function render() {
    clear(card);
    card.append(el("h1", s("creators.h1")), el("p.muted", s("creators.sub")));

    const isPro = store.isPro();
    if (!isPro) {
      const banner = el("div.cr-pro-banner",
        el("span.cr-pro-badge", s("creators.pro_badge")),
        el("span", " " + s("creators.pro_hint") + " "),
        el("a.btn.btn-primary.btn-sm", { href: "#/billing" }, s("creators.upgrade")));
      card.appendChild(banner);
    }

    card.appendChild(el("h2.cr-sub", s("creators.grid_h")));
    const grid = el("div.cr-grid");
    for (const k of kols) {
      const on = following.has(k.id);
      const label = "🎙️ " + (k.name || k.id) + " · " + (isPro ? (on ? s("creators.following") : s("creators.follow")) : "🔒 " + s("creators.pro_badge"));
      const chip = el("button.cr-chip" + (on && isPro ? ".on" : ""), { type: "button" }, label);
      chip.addEventListener("click", () => { if (isPro) toggle(k.id, chip); else router.go("#/billing"); });
      grid.appendChild(chip);
    }
    card.appendChild(grid);

    card.appendChild(el("h2.cr-sub", s("creators.feed_h")));
    const archiveBtn = el("button.btn.btn-ghost.btn-sm", { type: "button", "aria-pressed": String(archive), onclick: () => { archive = !archive; render(); } }, s(archive ? "creators.only_grounded" : "creators.show_archive"));
    card.appendChild(archiveBtn);
    const visiblePosts = archive ? posts : posts.filter(hasGroundedCalls);
    if (!visiblePosts.length) { card.appendChild(empty(s("creators.feed_empty"))); return; }
    const feed = el("div.cr-feed");
    for (const p of visiblePosts.slice(0, 40)) {
      const grounded = hasGroundedCalls(p);
      const stance = grounded && ["bull", "bear"].includes(p.take) ? p.take : "neutral";
      const art = el("article.cr-post");
      const head = el("div.cr-post-head",
        el("b.cr-who", "🎙️ " + (p.kol_name || p.kol_id || "")),
        el("span.cr-take." + TAKE_CLS[stance], grounded ? s("creators.take_" + stance) : s("creators.unverified")));
      if (p.tickers && p.tickers.length) head.appendChild(el("span.cr-tks.mono", p.tickers.slice(0, 4).map((t) => "$" + t).join(" · ")));
      art.appendChild(head);
      if (p.published_at) art.appendChild(el("time.muted.small", { datetime: p.published_at }, String(p.published_at).replace("T", " ").slice(0, 16) + " UTC"));
      art.appendChild(el("p.cr-attribution.muted.small", s("creators.attribution", { name: p.kol_name || p.kol_id || "—" })));
      art.appendChild(el("p.cr-sum", pickSummary(p.summary, isZh)));
      if (grounded && p.calls && p.calls.length) art.appendChild(callChips(p.calls, isZh));
      if (p.url) art.appendChild(el("a.cr-orig", { href: p.url, target: "_blank", rel: "noopener" }, s("creators.orig") + " ↗"));
      feed.appendChild(art);
    }
    card.appendChild(feed);
  }

  async function toggle(id, chip) {
    chip.disabled = true;
    const on = following.has(id);
    try {
      if (on) { await api.kol.unsub(id); following.delete(id); }
      else { await api.kol.sub(id); following.add(id); }
      const nowOn = following.has(id);
      chip.classList.toggle("on", nowOn);
      const k = kols.find((x) => x.id === id) || {};
      chip.textContent = "🎙️ " + (k.name || id) + " · " + (nowOn ? s("creators.following") : s("creators.follow"));
    } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
    finally { chip.disabled = false; }
  }

  return () => {};
}
