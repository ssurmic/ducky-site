import {evidenceLink} from '../evidence-link.js';
import { eventResearchSession, eventHint, safeSource } from "../calendar-event.js";
import {sourceDay, effectiveTiming} from '../source-event.js';
import {calendarTicker, calendarEventTicker, orderCalendarEvents, calendarDayPreview} from '../calendar-model.js';
import { icon } from "../icons.js";
// views/calendar.js — 投资日历 (Pro): mobile agenda and selectable date grids for a
// US-stock watchlist — Fed speakers (ET times), FOMC / rate decisions, CPI/PPI/PCE macro, earnings,
// OPEX / quad witching, index & month-end rebalances. Click a day → that day's events. The user's own
// tickers are highlighted; "my names only" + the grid personalisation is the Pro value.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, spinner, empty, modal, closeModal } from "../ui.js";
import { mountSeasonality } from "../seasonality.js";

const ICON = { macro: "liquidity", earnings: "chart", opex: "calendar", witching: "calendar", rebal: "digest" };
const DOTC = { macro: "var(--accent)", earnings: "#4ea1ff", opex: "#c07cff", witching: "#c07cff", rebal: "#33c793" };
const FILTERS = ["all", "macro", "earnings", "opex", "rebal"];
const FILTER_TYPES = { all: null, macro: ["macro"], earnings: ["earnings"], opex: ["opex", "witching"], rebal: ["rebal", "index_change"] };
const CATEGORY = {earnings:"earnings", macro:"macro", opex:"expiry", witching:"expiry", rebal:"rebal", index_change:"rebal", holiday:"session", early_close:"session"};
const visualType = e => e.type==='index_change'?'rebal':e.type;
const category = e => CATEGORY[e.type] || "other";
const categoryLabel = e => s("calendar.kind_" + category(e));

// Compact, RECOGNISABLE labels for the narrow grid cells (never truncate a macro name to gibberish like
// "初请失…"), plus a one-line economic-impact note shown in the day detail. Matched on the event title
// (zh or en) so it works no matter which data source (live API vs static) wins the merge. ABBR order matters:
// more-specific patterns (小非农/ADP) come before the generic ones (非农/NFP).
const MACRO_META = [
  { re: /小非农|ADP/i, abbr: ["ADP", "ADP"],
    impact: ["私营部门就业变化，可与非农就业报告对照。", "Private-sector employment changes, for comparison with the nonfarm payroll report."] },
  { re: /非农|NFP|nonfarm|payroll/i, abbr: ["非农", "NFP"],
    impact: ["月度就业报告。就业强弱会影响经济与利率预期，需结合预期值和前值修订查看。", "The monthly jobs report. Employment changes can affect growth and rate expectations; compare the result with forecasts and revisions."] },
  { re: /初请|jobless|claims/i, abbr: ["初请", "Jobless claims"],
    impact: ["每周失业救济申请数据，用于观察就业变化。单周波动需结合近期趋势查看。", "Weekly unemployment claims help track employment changes. Compare a single reading with the recent trend."] },
  { re: /CPI/i, abbr: ["CPI", "CPI"],
    impact: ["消费者物价变化。高于或低于预期的结果可能改变利率预期。", "Changes in consumer prices. A result above or below forecasts can shift interest-rate expectations."] },
  { re: /PPI/i, abbr: ["PPI", "PPI"],
    impact: ["生产端物价变化，可用于观察成本压力。", "Producer-price changes help track cost pressures."] },
  { re: /PCE/i, abbr: ["PCE", "PCE"],
    impact: ["个人消费支出物价指数，是美联储关注的通胀指标。", "The personal consumption expenditures price index is an inflation measure followed by the Fed."] },
  { re: /零售|retail/i, abbr: ["零售", "Retail sales"],
    impact: ["零售销售反映商品消费需求，可与近期趋势和预期值比较。", "Retail sales track spending on goods. Compare the release with forecasts and recent trends."] },
  { re: /\bGDP\b/i, abbr: ["GDP", "GDP"],
    impact: ["经济增长数据，可比较本期增速、预期值和前值修订。", "Economic growth data. Compare the growth rate with forecasts and revisions."] },
  { re: /FOMC|利率|rate decision|federal funds/i, abbr: ["FOMC", "FOMC"],
    impact: ["查看美联储利率决定、声明和发布会，留意政策预期的变化。", "Review the Fed rate decision, statement and press conference for changes in the policy outlook."] },
  { re: /ISM|PMI/i, abbr: ["ISM", "ISM"],
    impact: ["采购经理调查。50 是扩张与收缩的分界，需结合行业和分项数据查看。", "Purchasing managers survey. A reading of 50 separates expansion from contraction; review the sector and components as well."] },
];
const STRUCT_ABBR = [
  { re: /四巫|quad|witch/i, abbr: ["四巫", "Quarterly expiration"] },
  { re: /期权|OPEX|expir/i, abbr: ["OPEX", "Options expiration"] },
  { re: /月末|month.?end/i, abbr: ["月末", "Month-end"] },
  { re: /MSCI/i, abbr: ["MSCI", "MSCI"] },
  { re: /标普|S&P|SPX/i, abbr: ["标普", "S&P"] },
  { re: /罗素|Russell/i, abbr: ["罗素", "Russell"] },
  { re: /纳斯达克|纳指|Nasdaq/i, abbr: ["纳指", "Nasdaq"] },
  { re: /富时|FTSE/i, abbr: ["富时", "FTSE"] },
];
function _hay(e) { return String(e.title || "") + " " + String(e.title_en || ""); }
function macroMeta(e) { const h = _hay(e); for (const m of MACRO_META) if (m.re.test(h)) return m; return null; }
function shortLabel(e, isZh, scopeTicker='') {
  if(e.type === "holiday") { const name=(isZh?e.title:e.title_en)?.split("·").slice(1).join("·").trim(); return s("calendar.closed_short")+(name?" · "+name:""); }
  if(e.type === "early_close") return s("calendar.early_short");
  if(e.type === "index_change") { const ticker=calendarEventTicker(e,scopeTicker); if(ticker)return ticker; }
  const full = isZh ? (e.title || "") : (e.title_en || e.title || "");
  if (e.type === "macro") { const m = macroMeta(e); if (m) return isZh ? m.abbr[0] : m.abbr[1]; }
  else { const h = _hay(e); for (const st of STRUCT_ABBR) if (st.re.test(h)) return isZh ? st.abbr[0] : st.abbr[1]; }
  return full;
}
function macroImpact(e, isZh) { if (e.type !== "macro") return ""; const m = macroMeta(e); return m ? (isZh ? m.impact[0] : m.impact[1]) : ""; }

function ymd(d) { const z = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
function weekSunday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }

export async function mount(root, route={}) {
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const hasContextAccess = !!store.get('me');
  const query = new URLSearchParams((location.hash.split("?")[1] || ""));
  const scopeTicker = calendarTicker(query.get("ticker"));
  const epoch=store.epoch();
  let research=null, disposed = false;
  const WD = isZh ? ["日", "一", "二", "三", "四", "五", "六"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = isZh
    ? (y, m) => `${y} 年 ${m + 1} 月`
    : (y, m) => `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]} ${y}`;

  const card = el("section.card.calendar-view");
  root.appendChild(card);
  const historyCard = el("section.card.seasonality-view", {id:"seasonality-history",tabindex:-1});
  root.appendChild(historyCard);
  const disposeHistory = mountSeasonality(historyCard);
  const cleanup=()=>{if(disposed)return;disposed=true;closeModal();research?.dispose();disposeHistory();};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  const active=()=>!disposed&&!route.signal?.aborted&&epoch===store.epoch();
  if(!active()){cleanup();return cleanup;}
  card.append(el("h1", s("calendar.h1")), el("p.muted", s("calendar.sub")));
  card.appendChild(spinner());

  let doc, watch = (store.get("watchlist") || []).map(t=>String(t).toUpperCase()), links = {}, watchError=false;
  try {
    // The in-memory list can predate a change made in another tab/device. Read
    // the shared list once per visit, including an explicit shared-data reload.
    const watches=api.watchlist.list().then(doc=>{
      const rows=Array.isArray(doc)?doc:doc?.items??doc?.watchlist??doc?.tickers;
      if(!Array.isArray(rows))throw new Error('watchlist_unavailable');
      return rows.map(row=>typeof row==='string'?row:row?.ticker||row?.symbol).filter(Boolean).map(t=>String(t).toUpperCase());
    }).catch(()=>{watchError=true;return null;});
    const loaded = await Promise.all([api.calendar.feed(), hasContextAccess ? api.calendar.links().catch(() => ({})) : Promise.resolve({}),watches]);
    if(!active()){cleanup();return cleanup;}
    doc=loaded[0]; links=loaded[1]?.issuers || {};
    if(loaded[2]!==null){watch=loaded[2];store.set('watchlist',watch);}
  } catch (e) {
    if(!active()){cleanup();return cleanup;}
    clear(card); card.append(el("h1", s("calendar.h1")), el("p.err", s("calendar.load_error")));
    return cleanup;
  }
  research=eventResearchSession(watch.includes(scopeTicker)?scopeTicker:'');
  const watchSet = new Set(watch);
  const evHasMine = (e) => (e.tickers || []).some((t) => watchSet.has(String(t).toUpperCase()) || (e.type === "earnings" && (links[String(t).toUpperCase()] || []).some(w => watchSet.has(w))));
  const events = orderCalendarEvents((doc && doc.events) || [], {scopeTicker,isWatched:evHasMine});

  // index events by date for O(1) day lookup
  const byDate = new Map();
  for (const e of events) { if (!byDate.has(e.date)) byDate.set(e.date, []); byDate.get(e.date).push(e); }

  const todayIso = new Intl.DateTimeFormat("en-CA", {timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const todayDate = new Date(todayIso + "T12:00:00");
  // default the selected day to today (even if it has no events), and open the grid on today's month —
  // NOT events[0], which is a backfilled prior-month event and would open last month on the 1st–5th.
  let selected = sourceDay(query.get('date')) || todayIso;
  const anchor = new Date((selected || todayIso) + "T00:00:00");
  let viewY = anchor.getFullYear(), viewM = anchor.getMonth();  // month being shown
  let filter = "all", mineOnly = false;
  let viewMode = "biweekly"; // Every new visit starts with the current two weeks, on phones and desktop.
  let biStart = weekSunday(anchor);      // A source-event link opens its effective period.
  render();

  function typeMatch(e) { if(["holiday", "early_close"].includes(e.type)) return true; const t = FILTER_TYPES[filter]; return !t || t.includes(e.type); }
  function dayEvents(iso) {
    let list = (byDate.get(iso) || []).filter(typeMatch);
    if (mineOnly && hasContextAccess) list = list.filter((e) => e.type !== "earnings" || evHasMine(e));
    return list;
  }

  function dateLabel(iso) {
    const today = todayIso, tmr = ymd(addDays(todayDate, 1));
    const d = new Date(iso + "T00:00:00");
    const wd = (isZh ? ["周日","周一","周二","周三","周四","周五","周六"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"])[d.getDay()];
    const base = isZh ? `${d.getMonth() + 1}月${d.getDate()}日 · ${wd}` : `${wd} ${d.getMonth() + 1}/${d.getDate()}`;
    if (iso === today) return s("calendar.today") + " · " + base;
    if (iso === tmr) return s("calendar.tomorrow") + " · " + base;
    return base;
  }

  function shiftPeriod(days) {
    biStart = addDays(biStart, days);
    // Keep the detail inside the visible period after paging away from today.
    selected = ymd(biStart);
    render();
  }

  function shiftMonth(amount) {
    const first = new Date(viewY, viewM + amount, 1);
    viewY = first.getFullYear(); viewM = first.getMonth();
    selected = ymd(first);
    render();
  }

  function render() {
    if(disposed) return;
    clear(card);
    card.append(el("header.calendar-heading", el("div", el("h1", s("calendar.h1")), el("p.muted", s("calendar.sub"))),
      el("button.btn.btn-ghost.btn-sm.cal-history-link", {type:"button", "aria-controls":"seasonality-history", onclick:()=>{historyCard.scrollIntoView({block:"start"});historyCard.focus({preventScroll:true});}}, s("calendar.history_short") + " ↓")));
    if(watchError)card.append(el('div.data-notice.calendar-watch-warning',{role:'status'},
      el('p',s('calendar.watchlist_unavailable',{n:watch.length})),
      el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>router.go(location.hash)},s('common.retry'))));
    else if(hasContextAccess) card.appendChild(el("p.event-scope-note.muted.small",s("event.scope_note",{n:watch.length})));
    if (!hasContextAccess) {
      card.appendChild(el("div.cr-pro-banner",
        el("span.cr-pro-badge", s("calendar.pro_badge")),
        el("span", " " + s("calendar.pro_hint") + " "),
        el("a.btn.btn-primary.btn-sm", { href: "#/billing" }, s("calendar.upgrade"))));
    }

    const earningsFailed=doc?.earnings_source_status==='fetch_failed';
    const sourceNotice=(doc?.partial||earningsFailed)?el('div.data-notice',
      el('p',{role:'status'},s('calendar.partial'))):null;
    if(sourceNotice)card.append(sourceNotice);
    if(earningsFailed){
      const coverage=doc.earnings_source_coverage||{};
      const stamp=value=>{
        if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value))return s('calendar.source_time_unknown');
        const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString().slice(0,16).replace('T',' ')+' UTC':s('calendar.source_time_unknown');
      };
      sourceNotice.append(el('details.calendar-source-warning',
        el('summary',s('calendar.earnings_source_failed')),
        el('p',s('calendar.earnings_source_retained')),
        el('p.small',s('calendar.source_last_success',{time:stamp(coverage.last_success_at)})),
        el('p.small',s('calendar.source_last_attempt',{time:stamp(coverage.last_attempt_at)}))));
    }


    // filter chips + "my watchlist" toggle
    const bar = el("div.cal-bar");
    for (const f of FILTERS) {
      const chip = el("button.cal-fchip" + (filter === f ? ".on" : ""), { type: "button", "aria-pressed": String(filter === f) }, s("calendar.f_" + f));
      chip.addEventListener("click", () => { filter = f; render(); });
      bar.appendChild(chip);
    }
    const mineBtn = el("button.cal-fchip.cal-mine" + (mineOnly ? ".on" : ""), { type: "button", "aria-pressed":String(mineOnly) },
      (mineOnly ? "★ " : "☆ ") + s("calendar.mine_only") + (hasContextAccess ? "" : " 🔒"));
    mineBtn.addEventListener("click", () => { if (!hasContextAccess) { router.go("#/billing"); return; } mineOnly = !mineOnly; render(); });
    bar.appendChild(mineBtn);
    const filters=el("details.cal-filters", el("summary", s("calendar.filters")), bar, el("p.small.muted",s("calendar.timing_note")));
    filters.open=filter!=="all" || mineOnly;

    // view-mode toggle: 两周 (at-a-glance earnings) | 月
    const modeBar = el("div.cal-modebar");
    for (const m of ["list", "biweekly", "month"]) {
      const b = el("button.cal-mode" + (viewMode === m ? ".on" : ""), { type: "button", "aria-pressed": String(viewMode === m) }, s("calendar.mode_" + m));
      b.addEventListener("click", () => {
        viewMode = m;
        const day = new Date(selected + "T12:00:00");
        if(m === "month") { viewY = day.getFullYear(); viewM = day.getMonth(); }
        else if(selected < ymd(biStart) || selected > ymd(addDays(biStart,13))) biStart = weekSunday(day);
        render();
      });
      modeBar.appendChild(b);
    }
    card.appendChild(el('div.cal-toolbar', modeBar, filters));
    if (viewMode !== "list") card.appendChild(el("p.cal-grid-hint.muted.small", s(viewMode === "biweekly" ? "calendar.biweekly_hint" : "calendar.grid_hint")));

    if (viewMode === "month") card.appendChild(monthGrid());
    else if (viewMode === "biweekly") card.appendChild(biweekly());
    else {
      const end = addDays(biStart, 13);
      card.appendChild(navHead(isZh ? `${biStart.getMonth()+1}月${biStart.getDate()}日 / ${end.getMonth()+1}月${end.getDate()}日` : `${biStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} / ${end.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
        () => shiftPeriod(-14),
        () => shiftPeriod(14)));
    }

    function preview(evs) { return calendarDayPreview(evs,{scopeTicker,isWatched:evHasMine}); }

    function previewDescription(evs) {
      const {visible,hidden}=preview(evs);
      return [s("calendar.event_count",{n:evs.length}), ...visible.map(e=>String(isZh?e.title:(e.title_en||e.title)).slice(0,80)), ...(hidden.length?[s("calendar.more_events",{n:hidden.length})]:[])].join(", ");
    }

    function pills(evs) {
      // biweekly: color-coded event pills — earnings show the company LOGO + $TICKER so you can SEE who
      // reports at a glance; other events use recognisable short labels. Extra events remain in the day detail.
      const box = el("div.cal-events");
      const {visible,hidden}=preview(evs);
      for (const e of visible) {
        if (e.type === "earnings") {
          const sym = calendarEventTicker(e,scopeTicker);
          const pill = el("span.pill.pill-earn.cal-kind-earnings" + (hasContextAccess && evHasMine(e) ? ".mine" : ""), { title: (sym + " " + (isZh ? (e.title || "") : (e.title_en || e.title || ""))).trim() });
          pill.appendChild(el("span.pill-kind", categoryLabel(e)));
          if (e.logo) pill.appendChild(el("img.pill-logo", { src: e.logo, alt: sym, loading: "lazy" }));
          pill.appendChild(el("span.pill-tk", sym || "ER"));
          box.appendChild(pill);
        } else {
          const full = isZh ? (e.title || "") : (e.title_en || e.title || "");
          const pill = el("span.pill.pill-" + visualType(e) + ".cal-kind-" + category(e), { title: full });
          pill.appendChild(el("span.pill-kind", categoryLabel(e)));
          pill.appendChild(el("span.pill-ic", { "aria-hidden": "true" }, icon(ICON[visualType(e)] || "calendar")));
          pill.appendChild(el("span.pill-txt", shortLabel(e, isZh, scopeTicker)));
          box.appendChild(pill);
        }
      }
      if (hidden.length) box.appendChild(el("span.pill-more", s("calendar.more_events", {n: hidden.length})));
      return box;
    }

    function miniBars(evs) {
      // month cells: compact colour-dot + label rows (ticker for earnings, name for macro/structural).
      const box = el("div.cal-mini");
      const {visible,hidden}=preview(evs);
      for (const e of visible) {
        const b = el("div.mbar");
        const dot = el("i.bardot"); dot.style.background = DOTC[visualType(e)] || "var(--muted)"; b.appendChild(dot);
        const label = e.type === "earnings" ? (calendarEventTicker(e,scopeTicker) || categoryLabel(e)) : shortLabel(e, isZh, scopeTicker);
        b.setAttribute("title", isZh ? (e.title || "") : (e.title_en || e.title || ""));
        b.appendChild(el("span.pill-txt" + (e.type === "earnings" && hasContextAccess && evHasMine(e) ? ".mine" : ""), label));
        box.appendChild(b);
      }
      if (hidden.length) box.appendChild(el("div.pill-more", "+" + hidden.length));
      return box;
    }

    function weekdayRow() { const r = el("div.cal-wdrow"); for (const w of WD) r.appendChild(el("div.cal-wd", w)); return r; }

    function navHead(title, onPrev, onNext) {
      const head = el("div.cal-mhead");
      const prev = el("button.cal-mnav", { type: "button", "aria-label": s("calendar.previous") }, "‹");
      const next = el("button.cal-mnav", { type: "button", "aria-label": s("calendar.next") }, "›");
      prev.addEventListener("click", onPrev);
      next.addEventListener("click", onNext);
      const todayBtn = el("button.cal-today", { type: "button" }, s("calendar.jump_today"));
      todayBtn.addEventListener("click", () => { const d = todayDate; viewY = d.getFullYear(); viewM = d.getMonth(); biStart = weekSunday(d); selected = todayIso; render(); });
      head.append(prev, el("div.cal-mtitle", title), next, todayBtn);
      return head;
    }

    function monthGrid() {
      const box = el("div.cal-monthbox");
      box.appendChild(navHead(MON(viewY, viewM),
        () => shiftMonth(-1),
        () => shiftMonth(1)));
      box.appendChild(weekdayRow());
      const grid = el("div.cal-grid");
      const firstDow = new Date(viewY, viewM, 1).getDay();
      const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
      for (let i = 0; i < firstDow; i++) grid.appendChild(el("div.cal-cell.cal-empty"));
      for (let day = 1; day <= daysInMonth; day++) {
        const dt = new Date(viewY, viewM, day);
        const iso = ymd(dt);
        const evs = dayEvents(iso);
        const mine = hasContextAccess && evs.some(evHasMine);
        const wknd = dt.getDay() === 0 || dt.getDay() === 6;
        const cell = el("button.cal-cell" + (iso === todayIso ? ".cal-is-today" : "") + (iso === selected ? ".cal-sel" : "") + (evs.length ? ".cal-has" : "") + (mine ? ".cal-mine-cell" : "") + (wknd ? ".cal-weekend" : "") + (evs.some(e=>e.type==="holiday") ? ".cal-closed" : "") + (evs.some(e=>e.type==="early_close") ? ".cal-early" : ""),
          { type: "button", "aria-label": iso + ", " + previewDescription(evs), "aria-pressed": String(iso === selected), "data-date":iso, "aria-haspopup":"dialog" });
        cell.appendChild(el("span.cal-dnum", String(day)));
        if (evs.length) { cell.appendChild(miniBars(evs)); cell.appendChild(el("span.cal-event-count", String(evs.length))); }
        // Phone month cells hide the regular preview. Preserve watched earnings
        // identities as compact, wrapping labels instead of only a star/count.
        const earnings=preview(evs).visible.filter(e=>e.type==='earnings' && (evHasMine(e) || (scopeTicker && calendarEventTicker(e,scopeTicker)===scopeTicker)));
        if(earnings.length) {
          const labels=el('span.cal-month-earnings',{'aria-label':s('calendar.kind_earnings')});
          for(const e of earnings) labels.append(el('span',calendarEventTicker(e,scopeTicker) || categoryLabel(e)));
          cell.append(labels);
        }
        const session=evs.find(e=>["holiday","early_close"].includes(e.type));
        if(session) cell.append(el("span.cal-session-grid-label",shortLabel(session,isZh)));
        cell.addEventListener("click", () => openDay(iso));
        grid.appendChild(cell);
      }
      box.appendChild(grid);
      return box;
    }

    function biweekly() {
      const box = el("div.cal-bibox");
      const end = addDays(biStart, 13);
      const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const span = isZh
        ? `${biStart.getMonth() + 1}月${biStart.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`
        : `${M[biStart.getMonth()]} ${biStart.getDate()} – ${M[end.getMonth()]} ${end.getDate()}`;
      box.appendChild(navHead(span,
        () => shiftPeriod(-14),
        () => shiftPeriod(14)));
      box.appendChild(weekdayRow());
      const weeks = el("div.cal-biweeks");
      for (let week = 0; week < 2; week++) {
        const first = addDays(biStart, week * 7), last = addDays(first, 6);
        const label = isZh
          ? `${first.getMonth()+1}月${first.getDate()}日 – ${last.getMonth()+1}月${last.getDate()}日`
          : `${M[first.getMonth()]} ${first.getDate()} – ${M[last.getMonth()]} ${last.getDate()}`;
        const group = el("section.cal-biweek", {"aria-label": label});
        group.append(el("h3.cal-week-label", label));
        const grid = el("div.cal-bigrid");
        for (let i = 0; i < 7; i++) {
          const d = addDays(first, i), iso = ymd(d), evs = dayEvents(iso);
          const mine = hasContextAccess && evs.some(evHasMine);
          const wknd = d.getDay() === 0 || d.getDay() === 6;
          const session = evs.find(e => ["holiday", "early_close"].includes(e.type));
          const weekday = new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", {weekday:"short"}).format(d);
          const cell = el("button.cal-bicell" + (iso === todayIso ? ".cal-is-today" : "") + (iso === selected ? ".cal-sel" : "") + (evs.length ? ".cal-has" : "") + (mine ? ".cal-mine-cell" : "") + (wknd ? ".cal-weekend" : "") + (session?.type === "holiday" ? ".cal-closed" : "") + (session?.type === "early_close" ? ".cal-early" : ""),
            {type:"button", "data-date":iso, "aria-label":dateLabel(iso) + ", " + previewDescription(evs), "aria-pressed":String(iso === selected), "aria-haspopup":"dialog"});
          const date = el("div.cal-bidate", el("span.cal-bidnum", String(d.getDate())), el("span.cal-biweekday", iso === todayIso ? s("calendar.today") : weekday));
          cell.append(date);
          if (evs.length) cell.append(pills(evs));
          else cell.append(el("span.cal-biquiet", s("calendar.no_events_short")));
          cell.addEventListener("click", () => openDay(iso));
          grid.append(cell);
        }
        group.append(grid); weeks.append(group);
      }
      box.append(weeks);
      return box;
    }

    if (viewMode === "list") {
      const dates = Array.from({length:14}, (_, i) => ymd(addDays(biStart, i))).filter(iso => dayEvents(iso).length);
      if (!dates.length) card.appendChild(el("p.muted", s("calendar.empty")));
      for (const iso of dates) card.appendChild(dayDetail(iso));
    }
  }

  function openDay(iso) {
    selected = iso;
    for (const cell of card.querySelectorAll("button[data-date]")) {
      const active = cell.dataset.date === iso;
      cell.classList.toggle("cal-sel", active);
      cell.setAttribute("aria-pressed", String(active));
    }
    const host = modal(dateLabel(iso), dayDetail(iso));
    host.querySelector(".modal-box").classList.add("calendar-dialog");
  }

  function dayDetail(detailDate) {
    const detail = el("div.cal-detail");
    detail.appendChild(el("div.cal-day-h.mono", dateLabel(detailDate)));
    const evs = dayEvents(detailDate);
    if (!evs.length) { detail.appendChild(el("p.muted.cal-empty-day", s("calendar.day_empty"))); }
    else {
      for (const e of evs) {
        const isMine = hasContextAccess && evHasMine(e);
        const row = el("div.cal-ev" + (isMine ? ".cal-mine-ev" : "") + ".cal-t-" + visualType(e) + ".cal-kind-" + category(e));
        if (e.type === "earnings" && e.logo) row.appendChild(el("img.cal-ev-logo", { src: e.logo, alt: (e.tickers || [])[0] || "", loading: "lazy" }));
        else row.appendChild(el("span.cal-ico", { "aria-hidden": "true" }, icon(ICON[visualType(e)] || "calendar")));
        const main = el("div.cal-main");
        main.appendChild(el("span.cal-kind-label", categoryLabel(e)));
        const title = el("div.cal-title", isZh ? (e.title || "") : (e.title_en || e.title || ""));
        for (const t of (e.tickers || [])) title.append(evidenceLink(t),el("a.cal-tk.mono" + (watchSet.has(String(t).toUpperCase()) ? ".on" : ""), { href: "#/chart/" + encodeURIComponent(t) }, "$" + t));
        if (isMine) title.appendChild(el("span.cal-mine-badge", s("calendar.mine_badge")));
        main.appendChild(title);
        if(e.type==='index_change')main.append(el('p.cal-note',s('event.effective_date')+' · '+effectiveTiming(e)));
        const note = isZh ? (e.note || "") : (e.note_en || e.note || "");
        if (note) main.appendChild(el("div.cal-note.muted", note));
        if(["holiday","early_close"].includes(e.type)) {
          if(e.type==="holiday") main.appendChild(el("p.cal-holiday-brief",s("calendar.holiday_brief")));
          const impacts=el("details.cal-session-impact",el("summary",s(e.type==="holiday"?"calendar.impact":"calendar.early_impact")));
          for(const impact of e.impacts || []) {
            const section=el("div",el("strong",isZh?impact.title:impact.title_en),el("p.small",isZh?impact.body:impact.body_en));
            if(impact.url) section.append(el("a.small",{href:impact.url,target:"_blank",rel:"noopener"},"OIC · Theta ↗"));
            impacts.append(section);
          }
          main.append(impacts);
        } else {
          // Reuse the same event-type explanation as expanded research; no per-viewer calculation.
          main.appendChild(el("p.cal-event-brief", eventHint(e)));
          const more=el("details.cal-research-more",el("summary",s("calendar.research_more")));
          let mounted=false;
          more.addEventListener("toggle",()=>{if(more.open&&!mounted&&!disposed){mounted=true;more.append(research.mount(e,{showHint:false}));}});
          main.append(more);
        }
        const source=safeSource(e.source_url || e.url);
        if (source) main.appendChild(el("a.cal-link.mono", { href: source, target: "_blank", rel: "noopener" }, s(["holiday","early_close"].includes(e.type)?"calendar.source":"event.source")+" ↗"));
        row.appendChild(main);
        detail.appendChild(row);
      }
    }
    return detail;
  }

  return cleanup;
}
