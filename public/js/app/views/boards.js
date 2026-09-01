// views/boards.js — 雷达 (Radar): the market-wide SHARED intel boards — the same feeds Ducky pushes to the
// Telegram group topics (大盘水位/宏观, 财报, 内部人买入, 便宜期权 IV/HV…), surfaced in-app as a T-layout
// dashboard. These are identical for EVERY user (unlike personalised alerts), so they live as a standard
// section. Reads the public, compliance-scrubbed /public/signals/recent.json — a RECORD of filings/scans,
// attributed and time-stamped, never our own advice. Excludes 鸭子的交易 (personal trades).
import { s } from "../strings.js";
import * as api from "../api.js";
import { el, clear, spinner } from "../ui.js";

// section → firehose kinds (mirrors the backend tg_topics TOPICS). `wide` = the "—" top bar of the T.
const BOARDS = [
  { key: "liquidity", icon: "🌊", kinds: "liquidity,kindex,macro", wide: true },
  { key: "digest",    icon: "🧭", kinds: "digest,market,default" },
  { key: "insider",   icon: "💰", kinds: "insider,cluster,political" },
  { key: "partner",   icon: "🤝", kinds: "partner,stake,13f,nvdev" },
  { key: "earnings",  icon: "📊", kinds: "earnings" },
  { key: "hiring",    icon: "🧑‍💻", kinds: "hiring" },
  { key: "volscan",   icon: "📉", kinds: "volscan" },
];

// kind → short human label (fallback when a signal's scrubbed summary is empty)
const KIND_LABEL = {
  insider: ["内部人买入", "Insider buy"], cluster: ["集群买入", "Cluster buy"], political: ["议员交易", "Congress trade"],
  partner: ["战略合作", "Partnership"], stake: ["大额持股", "Big stake"], "13f": ["机构持仓", "13F"], nvdev: ["巨头动向", "Giant move"],
  earnings: ["财报", "Earnings"], hiring: ["招聘信号", "Hiring"], volscan: ["期权错杀", "Cheap vol"],
  liquidity: ["流动性", "Liquidity"], kindex: ["K 指数", "K-index"], macro: ["宏观", "Macro"],
  digest: ["划重点", "Highlight"], market: ["市场", "Market"], default: ["动态", "Update"],
};

function ago(iso, isZh) {
  const t = Date.parse(iso); if (isNaN(t)) return "";
  const m = Math.max(0, (Date.now() - t) / 60000);
  if (m < 60) return isZh ? `${Math.round(m)}分钟前` : `${Math.round(m)}m`;
  const h = m / 60; if (h < 24) return isZh ? `${Math.round(h)}小时前` : `${Math.round(h)}h`;
  const d = Math.round(h / 24); return isZh ? `${d}天前` : `${d}d`;
}
function dirArrow(n) { return n > 0 ? ["▲", "bull"] : n < 0 ? ["▼", "bear"] : ["", ""]; }

export async function mount(root) {
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const card = el("section.card.boards-view");
  root.appendChild(card);
  card.append(el("h1", s("boards.h1")), el("p.muted", s("boards.sub")));
  card.appendChild(spinner());

  let results, wa = null;
  try {
    const [sig] = await Promise.all([
      Promise.all(BOARDS.map((b) =>
        api.signals.board(b.kinds, { days: 7, limit: 12 }).then((r) => (r && r.items) || []).catch(() => []))),
      // Week Ahead is a static file on the site; it may 404 until the backend publishes it → skip the block.
      fetch("/week-ahead.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : null)
        .then((j) => { if (j && Array.isArray(j.events) && j.events.length) wa = j; }).catch(() => {}),
    ]);
    results = sig;
  } catch (e) {
    clear(card); card.append(el("h1", s("boards.h1")), el("p.err", s("boards.load_error"))); return () => {};
  }

  clear(card);
  card.append(el("h1", s("boards.h1")), el("p.muted", s("boards.sub")));
  const grid = el("div.brd-grid");
  if (wa) grid.appendChild(weekAheadCard(wa));
  BOARDS.forEach((b, i) => {
    const items = (results[i] || []).filter((it) => it && (it.ticker || (it.summary && String(it.summary).trim()) || it.key));
    const sec = el("section.brd-card" + (b.wide ? ".brd-wide" : ""));
    sec.appendChild(el("div.brd-head",
      el("span.brd-ico", { "aria-hidden": "true" }, b.icon),
      el("div.brd-htext",
        el("div.brd-title", s("boards.t_" + b.key)),
        el("div.brd-desc.muted", s("boards.d_" + b.key)))));
    if (!items.length) { sec.appendChild(el("p.brd-empty.muted", s("boards.empty"))); }
    else {
      const list = el("div.brd-list");
      for (const it of items.slice(0, b.wide ? 6 : 5)) list.appendChild(itemRow(it));
      sec.appendChild(list);
    }
    grid.appendChild(sec);
  });
  card.appendChild(grid);
  return () => {};

  function weekAheadCard(doc) {
    const sec = el("section.brd-card.brd-wide.wa-card");
    sec.appendChild(el("div.brd-head",
      el("span.brd-ico", { "aria-hidden": "true" }, "📅"),
      el("div.brd-htext",
        el("div.brd-title", (isZh ? "本周前瞻" : "Week Ahead") + (doc.week_of ? " · " + doc.week_of : "")),
        el("div.brd-desc.muted", isZh ? "本周高影响宏观 + 重点财报,一眼扫完。" : "This week's high-impact macro + key earnings at a glance."))));
    const byDay = new Map();
    for (const e of doc.events) {
      const k = (isZh ? e.dow : (e.dow_en || e.dow)) + " " + (e.date || "");
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(e);
    }
    const strip = el("div.wa-strip");
    for (const [label, evs] of byDay) {
      const col = el("div.wa-day");
      col.appendChild(el("div.wa-dh", label));
      for (const e of evs.slice(0, 6)) {
        const isEr = e.kind === "earnings";
        const row = el("div.wa-ev" + (isEr ? ".wa-er" : ".wa-macro"));
        const et = e.et || (isZh ? e.et_zh : e.et_en) || "";
        if (et) row.appendChild(el("span.wa-et.mono", et));
        row.appendChild(el("span.wa-nm" + (isEr ? ".mono" : ""), (isEr ? "$" : "") + (e.name || "") + (e.watch ? " ★" : "")));
        col.appendChild(row);
      }
      strip.appendChild(col);
    }
    sec.appendChild(strip);
    return sec;
  }

  function itemRow(it) {
    const [arrow, cls] = dirArrow(Number(it.direction) || 0);
    const row = el("div.brd-item");
    if (it.ticker) row.appendChild(el("span.brd-tk.mono", "$" + String(it.ticker).toUpperCase()));
    const kl = KIND_LABEL[it.kind] || [it.kind || "", it.kind || ""];
    const label = (it.summary && String(it.summary).trim()) ? String(it.summary).trim() : (isZh ? kl[0] : kl[1]);
    row.appendChild(el("span.brd-txt", label));
    if (arrow) row.appendChild(el("span.brd-dir." + cls, arrow));
    row.appendChild(el("span.brd-time.muted", ago(it.ts, isZh)));
    return row;
  }
}
