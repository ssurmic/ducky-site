// views/boards.js — 雷达 (Radar): the market-wide SHARED intel boards — the same feeds Ducky pushes to the
// Telegram group topics (大盘水位/宏观, 财报, 内部人买入, 便宜期权 IV/HV…), surfaced in-app as a T-layout
// dashboard. These are identical for EVERY user (unlike personalised alerts), so they live as a standard
// section. Reads the public, compliance-scrubbed /public/signals/recent.json — a RECORD of filings/scans,
// attributed and time-stamped, never our own advice. Excludes 鸭子的交易 (personal trades).
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import { el, clear, spinner } from "../ui.js";
import { icon } from "../icons.js";
import { dateTime, metric } from './creator-research.js';
import { pct, px } from '../ui.js';

// section → firehose kinds (mirrors the backend tg_topics TOPICS). `wide` = the "—" top bar of the T.
const BOARDS = [
  { key: "liquidity", icon: "🌊", kinds: "liquidity,kindex,macro", wide: true },
  { key: "digest",    icon: "🧭", kinds: "digest,market,default" },
  { key: "insider",   icon: "💰", kinds: "insider,cluster,political" },
  { key: "partner",   icon: "🤝", kinds: "partner,stake,13f" },
  { key: "earnings",  icon: "📊", kinds: "earnings" },
  { key: "hiring",    icon: "🧑‍💻", kinds: "hiring" },
  { key: "volscan",   icon: "📉", kinds: "volscan" },
];

// kind → short human label (fallback when a signal's scrubbed summary is empty)
const KIND_LABEL = {
  insider: ["内部人买入", "Insider buy"], cluster: ["集群买入", "Cluster buy"], political: ["议员交易", "Congress trade"],
  partner: ["战略合作", "Partnership"], stake: ["大额持股", "Major holding"], "13f": ["机构持仓", "13F"], nvdev: ["行业动态", "Industry news"],
  earnings: ["财报", "Earnings"], hiring: ["招聘信号", "Hiring"], volscan: ["期权波动", "Option volatility"],
  liquidity: ["流动性", "Liquidity"], kindex: ["K 指数", "K-index"], macro: ["宏观", "Macro"],
  digest: ["每日摘要", "Daily summary"], market: ["市场", "Market"], default: ["动态", "Update"],
};

// Week-Ahead macro cleanup: Nasdaq's feed is noisy (ISM sub-indices, IBD/TIPP, GDPNow) and English-only.
// Map to a SHORT bilingual label, DROP low-signal noise, and collapse ISM sub-readings to one. Order matters
// (specific before generic; the broad speaker rule is last).
const WA_MACRO = [
  { re: /continuing jobless/i, zh: "续请失业金", en: "Continuing claims" },
  { re: /nonfarm productivity/i, zh: "非农生产率", en: "Nonfarm productivity" },
  { re: /\bADP\b/i, zh: "小非农 ADP", en: "ADP payrolls" },
  { re: /initial jobless|jobless claims/i, zh: "初请失业金", en: "Jobless claims" },
  { re: /nonfarm|payroll/i, zh: "非农就业", en: "Nonfarm payrolls" },
  { re: /\bADP\b/i, zh: "小非农 ADP", en: "ADP payrolls" },
  { re: /unemployment rate/i, zh: "失业率", en: "Unemployment rate" },
  { re: /(average )?hourly earnings/i, zh: "平均时薪", en: "Avg hourly earnings" },
  { re: /participation rate/i, zh: "劳动参与率", en: "Participation rate" },
  { re: /\bCPI\b/i, zh: "CPI 通胀", en: "CPI" },
  { re: /\bPPI\b/i, zh: "PPI 物价", en: "PPI" },
  { re: /\bPCE\b/i, zh: "PCE 物价", en: "PCE" },
  { re: /retail sales/i, zh: "零售销售", en: "Retail sales" },
  { re: /JOLTS/i, zh: "JOLTS 职位空缺", en: "JOLTS openings" },
  { re: /ISM.*(services|non-?manufacturing)/i, zh: "ISM 服务业", en: "ISM Services" },
  { re: /ISM.*manufacturing.*(employ|new orders|prices|inventor|backlog|supplier|export|import)/i, drop: true },
  { re: /ISM.*manufacturing/i, zh: "ISM 制造业", en: "ISM Mfg" },
  { re: /IBD|TIPP|optimism/i, drop: true },
  { re: /GDPNow|atlanta fed/i, drop: true },
  { re: /consumer confidence/i, zh: "消费者信心", en: "Consumer confidence" },
  { re: /(consumer sentiment|michigan)/i, zh: "密歇根消费信心", en: "UMich sentiment" },
  { re: /durable goods/i, zh: "耐用品订单", en: "Durable goods" },
  { re: /(housing starts|building permits|home sales|existing home|new home)/i, zh: "房地产数据", en: "Housing" },
  { re: /trade balance/i, zh: "贸易帐", en: "Trade balance" },
  { re: /\bGDP\b/i, zh: "GDP", en: "GDP" },
  { re: /FOMC|rate decision|federal funds|minutes/i, zh: "FOMC 利率", en: "FOMC" },
  { re: /speaks|speech/i, zh: "美联储讲话", en: "Fed speaks", speaker: true },
];
export function waMacroLabel(name, isZh) {
  for (const m of WA_MACRO) {
    if (m.re.test(name)) {
      if (m.drop) return null;
      if (m.speaker) { const mm = name.match(/([A-Z][a-zA-Z]+)\s+speaks/i); const who = mm ? mm[1] : "";
        return (isZh ? "美联储讲话" : "Fed speaks") + (who ? (isZh ? " · " + who : ": " + who) : ""); }
      return isZh ? m.zh : m.en;
    }
  }
  return name;
}

function ago(iso, isZh) {
  const t = Date.parse(iso); if (isNaN(t)) return "";
  const m = Math.max(0, (Date.now() - t) / 60000);
  if (m < 60) return isZh ? `${Math.round(m)}分钟前` : `${Math.round(m)}m`;
  const h = m / 60; if (h < 24) return isZh ? `${Math.round(h)}小时前` : `${Math.round(h)}h`;
  const d = Math.round(h / 24); return isZh ? `${d}天前` : `${d}d`;
}
function dirArrow(n) { return n > 0 ? ["▲", "bull"] : n < 0 ? ["▼", "bear"] : ["", ""]; }

export async function mount(root) {
  const epoch=store.epoch();
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const card = el("section.boards-view");
  root.appendChild(card);
  card.append(el("h1", s("boards.h1")), el("p.muted", s("boards.sub")));
  card.appendChild(spinner());

  let results, history = [];
  const staticCtl = new AbortController();
  const staticTimer = setTimeout(() => staticCtl.abort(), 15000);
  try {
    const [sig] = await Promise.all([
      Promise.all(BOARDS.map((b) =>
        api.signals.board(b.kinds, { days: 7, limit: 12 }).then((r) => (r && r.items) || []).catch(() => null))),
      fetch("/radar-history.json", { signal: staticCtl.signal }).then(r => r.ok ? r.json() : null)
        .then(j => { history = j && Array.isArray(j.items) ? j.items : []; }).catch(() => {}),
    ]);
    clearTimeout(staticTimer);
    results = sig;
  } catch (e) {
    clear(card); card.append(el("h1", s("boards.h1")), el("p.err", s("boards.load_error"))); return () => {};
  }

  if(epoch!==store.epoch()) return ()=>{};
  clear(card);
  card.append(el("h1", s("boards.h1")), el("p.muted", s("boards.sub")));
  card.appendChild(el("p.muted.small", s("boards.updated_window")));
  const grid = el("div.brd-grid");
  const archiveHost=el('section.signal-archive');
  let archiveEpoch=0;
  BOARDS.forEach((b, i) => {
    const items = (results[i] || []).filter((it) => it && (it.ticker || it.summary || it.extra?.message_text));
    const sec = el("section.brd-card" + (b.wide ? ".brd-wide" : ""));
    sec.appendChild(el("div.brd-head",
      el("span.brd-ico", { "aria-hidden": "true" }, icon(b.key)),
      el("div.brd-htext",
        el("div.brd-title", s("boards.t_" + b.key)),
        el("div.brd-desc.muted", s("boards.d_" + b.key)))));
    if (results[i] === null) { sec.appendChild(el("p.brd-empty.muted", { role: "status" }, s("boards.load_error"))); }
    else if (!items.length) { sec.appendChild(el("p.brd-empty.muted", s(results[i]?.length ? "boards.missing_body" : "boards.empty"))); }
    else {
      const list = el("div.brd-list");
      for (const it of items.slice(0, 1)) list.appendChild(itemRow(it));
      sec.appendChild(list);
    }
    for (const receipt of history.filter(r => r.board === b.key).slice(0, 1)) {
      const lang = isZh ? "zh" : "en";
      sec.appendChild(itemRow({ticker: receipt.ticker, ts: receipt.ts, kind: b.key,
        summary: receipt.summary?.[lang] || "", archived: true, source_url: receipt.source_url,
        extra: {message_text: receipt.body?.[lang] || ""}}));
    }
    sec.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>openArchive(b)},s('boards.browse_history')));
    grid.appendChild(sec);
  });
  card.appendChild(el("a.btn.btn-ghost.btn-sm", {href:"#/calendar"}, s("watch.events")));
  card.appendChild(grid);
  card.appendChild(archiveHost);
  return () => {archiveEpoch++;staticCtl.abort();clearTimeout(staticTimer);};

  async function openArchive(board) {
    let cursor=null, count=0, pending=false;
    const token=++archiveEpoch;
    clear(archiveHost);
    const title=el('h2',{tabindex:'-1'},s('boards.t_'+board.key)+' · '+s('boards.archive_title'));
    const ticker=el('input.input',{type:'search',placeholder:s('boards.ticker_filter'),'aria-label':s('boards.ticker_filter'),maxlength:12});
    const filter=el('form.evidence-controls',ticker,el('button.btn.btn-ghost',{type:'submit'},s('boards.apply_filter')));
    const rows=el('div.signal-history-list'),status=el('p.muted.small',{role:'status'}),more=el('button.btn.btn-ghost',{type:'button'},s('creators.load_more'));
    archiveHost.append(title,el('p.muted',s('boards.archive_hint')),filter,rows,status,more);
    let query='';
    filter.addEventListener('submit',e=>{e.preventDefault();if(pending)return;query=ticker.value.trim().toUpperCase().replace(/^\$/,'');cursor=null;count=0;clear(rows);load();});
    more.addEventListener('click',()=>load());
    title.focus({preventScroll:true});archiveHost.scrollIntoView?.({behavior:'smooth',block:'start'});
    await load();
    async function load() {
      if(pending)return;pending=true;more.disabled=true;status.textContent=s('common.loading');
      try {
        const doc=await api.get('/public/signals/archive.json?kind='+encodeURIComponent(board.kinds)+'&limit=30'+(cursor?'&before='+cursor:'')+(query?'&ticker='+encodeURIComponent(query):''),{auth:false});
        if(token!==archiveEpoch || epoch!==store.epoch())return;
        let day='';
        for(const row of doc.items || []) {const next=(row.ts || '').slice(0,10);if(next!==day){day=next;rows.append(el('h3.signal-day',day+' UTC'));}rows.append(itemRow(row));count++;}
        cursor=doc.next_cursor;more.hidden=!cursor;
        status.textContent=s(cursor?'boards.archive_count':'boards.archive_end',{n:count});
      } catch {if(token===archiveEpoch){status.textContent=s('boards.load_error');more.hidden=false;}}
      finally {pending=false;more.disabled=false;}
    }
  }

  function itemRow(it) {
    const kl = KIND_LABEL[it.kind] || [it.kind || "", it.kind || ""];
    const sum = (it.summary && String(it.summary).trim()) ? String(it.summary).trim() : "";
    const label = sum || (isZh ? kl[0] : kl[1]);
    const tk = it.ticker ? String(it.ticker).toUpperCase() : "";

    const wrap = el("div.brd-itemw");
    const row = el("button.brd-item", { type: "button", "aria-expanded": "false" });
    if (tk) row.appendChild(el("span.brd-tk.mono", "$" + tk));
    row.appendChild(el("span.brd-txt", label));
    row.appendChild(el("span.brd-time.muted", it.archived ? String(it.ts).slice(0,10) : ago(it.ts, isZh)));
    row.appendChild(el("span.brd-caret", { "aria-hidden": "true" }, "⌄"));
    const disclosure=el('span.brd-disclosure',s('boards.expand'));row.append(disclosure);

    const detail = el("div.brd-detail");
    if (it.archived) detail.appendChild(el("p.brd-receipt-note.muted.small", s("boards.history_note")));
    detail.appendChild(el("div.brd-full", it.extra?.message_text || label));
    if(!it.extra?.message_text && !it.summary) detail.append(el('p.muted.small',s('boards.missing_body')));
    detail.append(el('p.muted.small',s('boards.recorded_at')+' '+dateTime(it.ts)),
      el('p.muted.small',s('boards.timestamp_note')));
    const origin=it.extra?.source_url || it.extra?.url || it.source_url;
    try {const u=new URL(origin);if(u.protocol==='https:') detail.append(el('a',{href:u.href,target:'_blank',rel:'noopener noreferrer'},s('boards.source')+' ↗'));} catch {}
    if(it.base_d) {
      detail.append(el('p.muted.small',(it.outcome_label || '—')+' · '+s('creators.base_close')+' '+it.base_d+' · '+px(it.base_px)),
        el('div.study-results',...[1,5,20].map(n=>metric(s('creators.trading_days',{n}),pct(it['ret_'+n+'d']),it['ret_'+n+'d']))),
        el('p.muted.small',s('boards.outcome_method')));
    }
    if (it.extra?.message_truncated) detail.appendChild(el("p.muted.small", s("boards.truncated")));
    const meta = el("div.brd-meta");
    meta.appendChild(el("span.brd-kind", isZh ? kl[0] : kl[1]));
    if (it.ts) meta.appendChild(el("span.brd-when.muted", new Date(it.ts).toLocaleString(isZh ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })));
    if (tk) meta.appendChild(el("a.brd-chart", { href: "#/chart/" + tk }, (isZh ? "看 $" : "$") + tk + (isZh ? " 图表 →" : " chart →")));
    if(tk) meta.append(el('a.brd-chart',{href:'#/alerts?ticker='+encodeURIComponent(tk)},s('boards.set_alert')));
    detail.appendChild(meta);
    if (it.archived && /^https:\/\/(www\.sec\.gov|job-boards\.greenhouse\.io)\//.test(it.source_url || "")) {
      detail.appendChild(el("a", {href:it.source_url,target:"_blank",rel:"noopener noreferrer"},s("boards.source")));
    }

    row.addEventListener("click", () => { const open = wrap.classList.toggle("open"); row.setAttribute("aria-expanded", open ? "true" : "false"); disclosure.textContent=s(open?'boards.collapse':'boards.expand'); });
    if (it.archived) wrap.appendChild(el("span.brd-archive-tag", s("boards.history")));
    wrap.append(row, detail);
    return wrap;
  }
}
