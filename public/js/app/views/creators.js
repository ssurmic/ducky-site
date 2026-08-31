// views/creators.js — 财经博主: follow finance creators; Ducky summarises each new video. The creator grid
// has Follow toggles (POST/DELETE /kol/{id}/sub); below it, the recent summary feed. The feed is a RECORD of
// the creator's view (attributed, tickers, bull/bear), never our advice.
import { s } from "../strings.js";
import * as api from "../api.js";
import { el, clear, toast, spinner, empty } from "../ui.js";

const TAKE_CLS = { bull: "cr-bull", bear: "cr-bear", neutral: "cr-neutral" };

function pickSummary(x, isZh) {
  if (x == null) return "";
  if (typeof x === "object") return isZh ? (x.zh || x.en || "") : (x.en || x.zh || "");
  try { const o = JSON.parse(x); return isZh ? (o.zh || o.en || "") : (o.en || o.zh || ""); } catch (e) { return String(x); }
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
  render();

  function render() {
    clear(card);
    card.append(el("h1", s("creators.h1")), el("p.muted", s("creators.sub")));

    card.appendChild(el("h2.cr-sub", s("creators.grid_h")));
    const grid = el("div.cr-grid");
    for (const k of kols) {
      const on = following.has(k.id);
      const chip = el("button.cr-chip" + (on ? ".on" : ""), { type: "button" },
        "🎙️ " + (k.name || k.id) + " · " + (on ? s("creators.following") : s("creators.follow")));
      chip.addEventListener("click", () => toggle(k.id, chip));
      grid.appendChild(chip);
    }
    card.appendChild(grid);

    card.appendChild(el("h2.cr-sub", s("creators.feed_h")));
    if (!posts.length) { card.appendChild(empty(s("creators.feed_empty"))); return; }
    const feed = el("div.cr-feed");
    for (const p of posts.slice(0, 40)) {
      const art = el("article.cr-post");
      const head = el("div.cr-post-head",
        el("b.cr-who", "🎙️ " + (p.kol_name || p.kol_id || "")),
        el("span.cr-take." + (TAKE_CLS[p.take || "neutral"] || "cr-neutral"), s("creators.take_" + (p.take || "neutral"))));
      if (p.tickers && p.tickers.length) head.appendChild(el("span.cr-tks.mono", p.tickers.slice(0, 4).map((t) => "$" + t).join(" · ")));
      art.appendChild(head);
      art.appendChild(el("p.cr-sum", pickSummary(p.summary, isZh)));
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
