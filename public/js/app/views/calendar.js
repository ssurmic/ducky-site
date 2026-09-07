import { eventResearchSession, eventHint } from "../calendar-event.js";
import { icon } from "../icons.js";
// views/calendar.js — 投资日历 (Pro): mobile agenda and selectable date grids for a
// US-stock watchlist — Fed speakers (ET times), FOMC / rate decisions, CPI/PPI/PCE macro, earnings,
// OPEX / quad witching, index & month-end rebalances. Click a day → that day's events. The user's own
// tickers are highlighted; "my names only" + the grid personalisation is the Pro value.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, spinner, empty } from "../ui.js";
import { mountSeasonality } from "../seasonality.js";

const ICON = { macro: "liquidity", earnings: "chart", opex: "calendar", witching: "calendar", rebal: "digest" };
const DOTC = { macro: "var(--accent)", earnings: "#4ea1ff", opex: "#c07cff", witching: "#c07cff", rebal: "#33c793" };
const FILTERS = ["all", "macro", "earnings", "opex", "rebal"];
const FILTER_TYPES = { all: null, macro: ["macro"], earnings: ["earnings"], opex: ["opex", "witching"], rebal: ["rebal"] };
const CATEGORY = {earnings:"earnings", macro:"macro", opex:"expiry", witching:"expiry", rebal:"rebal", holiday:"session", early_close:"session"};
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
  { re: /初请|jobless|claims/i, abbr: ["初请", "Jobless"],
    impact: ["每周失业救济申请数据，用于观察就业变化。单周波动需结合近期趋势查看。", "Weekly unemployment claims help track employment changes. Compare a single reading with the recent trend."] },
  { re: /CPI/i, abbr: ["CPI", "CPI"],
    impact: ["消费者物价变化。高于或低于预期的结果可能改变利率预期。", "Changes in consumer prices. A result above or below forecasts can shift interest-rate expectations."] },
  { re: /PPI/i, abbr: ["PPI", "PPI"],
    impact: ["生产端物价变化，可用于观察成本压力。", "Producer-price changes help track cost pressures."] },
  { re: /PCE/i, abbr: ["PCE", "PCE"],
    impact: ["个人消费支出物价指数，是美联储关注的通胀指标。", "The personal consumption expenditures price index is an inflation measure followed by the Fed."] },
  { re: /零售|retail/i, abbr: ["零售", "Retail"],
    impact: ["零售销售反映商品消费需求，可与近期趋势和预期值比较。", "Retail sales track spending on goods. Compare the release with forecasts and recent trends."] },
  { re: /\bGDP\b/i, abbr: ["GDP", "GDP"],
    impact: ["经济增长数据，可比较本期增速、预期值和前值修订。", "Economic growth data. Compare the growth rate with forecasts and revisions."] },
  { re: /FOMC|利率|rate decision|federal funds/i, abbr: ["FOMC", "FOMC"],
    impact: ["查看美联储利率决定、声明和发布会，留意政策预期的变化。", "Review the Fed rate decision, statement and press conference for changes in the policy outlook."] },
  { re: /ISM|PMI/i, abbr: ["ISM", "ISM"],
    impact: ["采购经理调查。50 是扩张与收缩的分界，需结合行业和分项数据查看。", "Purchasing managers survey. A reading of 50 separates expansion from contraction; review the sector and components as well."] },
];
const STRUCT_ABBR = [
  { re: /四巫|quad|witch/i, abbr: ["四巫", "Quad"] },
  { re: /期权|OPEX|expir/i, abbr: ["OPEX", "OPEX"] },
  { re: /月末|month.?end/i, abbr: ["月末", "Month-end"] },
  { re: /MSCI/i, abbr: ["MSCI", "MSCI"] },
  { re: /标普|S&P|SPX/i, abbr: ["标普", "S&P"] },
  { re: /罗素|Russell/i, abbr: ["罗素", "Russell"] },
  { re: /纳斯达克|纳指|Nasdaq/i, abbr: ["纳指", "Nasdaq"] },
  { re: /富时|FTSE/i, abbr: ["富时", "FTSE"] },
];
function _hay(e) { return String(e.title || "") + " " + String(e.title_en || ""); }
function macroMeta(e) { const h = _hay(e); for (const m of MACRO_META) if (m.re.test(h)) return m; return null; }
function shortLabel(e, isZh) {
  if(e.type === "holiday") return s("calendar.closed_short");
  if(e.type === "early_close") return s("calendar.early_short");
  const full = isZh ? (e.title || "") : (e.title_en || e.title || "");
  if (e.type === "macro") { const m = macroMeta(e); if (m) return isZh ? m.abbr[0] : m.abbr[1]; }
  else { const h = _hay(e); for (const st of STRUCT_ABBR) if (st.re.test(h)) return isZh ? st.abbr[0] : st.abbr[1]; }
  return full;
}
function macroImpact(e, isZh) { if (e.type !== "macro") return ""; const m = macroMeta(e); return m ? (isZh ? m.impact[0] : m.impact[1]) : ""; }

function ymd(d) { const z = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
function weekSunday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }

export async function mount(root) {
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const isPro = store.isPro();
  const scopeTicker = new URLSearchParams((location.hash.split("?")[1] || "")).get("ticker") || "";
  const research = eventResearchSession((store.get("watchlist") || []).includes(scopeTicker) ? scopeTicker : "");
  let disposed = false;
  const WD = isZh ? ["日", "一", "二", "三", "四", "五", "六"] : ["S", "M", "T", "W", "T", "F", "S"];
  const MON = isZh
    ? (y, m) => `${y} 年 ${m + 1} 月`
    : (y, m) => `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]} ${y}`;

  const card = el("section.card.calendar-view");
  root.appendChild(card);
  const historyCard = el("section.card.seasonality-view", {id:"seasonality-history",tabindex:-1});
  root.appendChild(historyCard);
  const disposeHistory = mountSeasonality(historyCard);
  card.append(el("h1", s("calendar.h1")), el("p.muted", s("calendar.sub")));
  card.appendChild(spinner());

  let doc, watch = [], links = {};
  try {
    const loaded = await Promise.all([api.calendar.feed(), isPro ? api.calendar.links().catch(() => ({})) : Promise.resolve({})]);
    doc=loaded[0]; links=loaded[1]?.issuers || {};
    watch = (store.get("watchlist") || []).map((t) => String(t).toUpperCase());
    if (!watch.length) { try { const w = await api.watchlist.list(); watch = (w.items || []).map((x) => String(x.ticker || x).toUpperCase()); } catch (e) { /* ignore */ } }
  } catch (e) {
    clear(card); card.append(el("h1", s("calendar.h1")), el("p.err", s("calendar.load_error")));
    return () => { disposed=true; research.dispose(); disposeHistory(); };
  }
  const watchSet = new Set(watch);
  const events = ((doc && doc.events) || []).slice().sort((a,b)=>a.date.localeCompare(b.date) || (Number(!["holiday","early_close"].includes(a.type))-Number(!["holiday","early_close"].includes(b.type))));
  const evHasMine = (e) => (e.tickers || []).some((t) => watchSet.has(String(t).toUpperCase()) || (e.type === "earnings" && (links[String(t).toUpperCase()] || []).some(w => watchSet.has(w))));

  // index events by date for O(1) day lookup
  const byDate = new Map();
  for (const e of events) { if (!byDate.has(e.date)) byDate.set(e.date, []); byDate.get(e.date).push(e); }

  const todayIso = new Intl.DateTimeFormat("en-CA", {timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const todayDate = new Date(todayIso + "T12:00:00");
  // default the selected day to today (even if it has no events), and open the grid on today's month —
  // NOT events[0], which is a backfilled prior-month event and would open last month on the 1st–5th.
  let selected = todayIso;
  const anchor = new Date((selected || todayIso) + "T00:00:00");
  let viewY = anchor.getFullYear(), viewM = anchor.getMonth();  // month being shown
  let filter = "all", mineOnly = false;
  let viewMode = "biweekly"; // Every new visit starts with the current two weeks, on phones and desktop.
  let biStart = weekSunday(todayDate);      // Sunday on/before today; prev/next shift by 14d
  render();

  function typeMatch(e) { if(["holiday", "early_close"].includes(e.type)) return true; const t = FILTER_TYPES[filter]; return !t || t.includes(e.type); }
  function dayEvents(iso) {
    let list = (byDate.get(iso) || []).filter(typeMatch);
    if (mineOnly && isPro) list = list.filter((e) => e.type !== "earnings" || evHasMine(e));
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
    card.append(el("h1", s("calendar.h1")), el("p.muted", s("calendar.sub")));
    if(isPro) card.appendChild(el("p.event-scope-note.muted.small",s("event.scope_note",{n:watch.length})));
    card.append(el("button.btn.btn-ghost.btn-sm", {type:"button", "aria-controls":"seasonality-history", onclick:()=>{historyCard.scrollIntoView({block:"start"});historyCard.focus({preventScroll:true});}}, s("season.title") + " ↓"));
    if (!isPro) {
      card.appendChild(el("div.cr-pro-banner",
        el("span.cr-pro-badge", s("calendar.pro_badge")),
        el("span", " " + s("calendar.pro_hint") + " "),
        el("a.btn.btn-primary.btn-sm", { href: "#/billing" }, s("calendar.upgrade"))));
    }

    if (doc?.partial) card.appendChild(el("p.data-notice", { role: "status" }, s("calendar.partial")));

    // filter chips + "my watchlist" toggle
    const bar = el("div.cal-bar");
    for (const f of FILTERS) {
      const chip = el("button.cal-fchip" + (filter === f ? ".on" : ""), { type: "button", "aria-pressed": String(filter === f) }, s("calendar.f_" + f));
      chip.addEventListener("click", () => { filter = f; render(); });
      bar.appendChild(chip);
    }
    const mineBtn = el("button.cal-fchip.cal-mine" + (mineOnly ? ".on" : ""), { type: "button" },
      (mineOnly ? "★ " : "☆ ") + s("calendar.mine_only") + (isPro ? "" : " 🔒"));
    mineBtn.addEventListener("click", () => { if (!isPro) { router.go("#/billing"); return; } mineOnly = !mineOnly; render(); });
    bar.appendChild(mineBtn);
    const filters=el("details.cal-filters", el("summary", s("calendar.filters")), bar, el("p.small.muted",s("calendar.timing_note")));
    filters.open=filter!=="all" || mineOnly;
    card.appendChild(filters);

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
    card.appendChild(modeBar);
    if (viewMode !== "list") card.appendChild(el("p.cal-grid-hint.muted.small", s(viewMode === "biweekly" ? "calendar.biweekly_hint" : "calendar.grid_hint")));

    if (viewMode === "month") card.appendChild(monthGrid());
    else if (viewMode === "biweekly") card.appendChild(biweekly());
    else {
      const end = addDays(biStart, 13);
      card.appendChild(navHead(isZh ? `${biStart.getMonth()+1}月${biStart.getDate()}日 / ${end.getMonth()+1}月${end.getDate()}日` : `${biStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} / ${end.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
        () => shiftPeriod(-14),
        () => shiftPeriod(14)));
    }

    function pills(evs, limit = 3) {
      // biweekly: color-coded event pills — earnings show the company LOGO + $TICKER so you can SEE who
      // reports at a glance; other events use recognisable short labels. Extra events remain in the day detail.
      const box = el("div.cal-events");
      for (const e of evs.slice(0, limit)) {
        if (e.type === "earnings") {
          const sym = (e.tickers || [])[0] || "";
          const pill = el("span.pill.pill-earn.cal-kind-earnings" + (isPro && evHasMine(e) ? ".mine" : ""), { title: (sym + " " + (isZh ? (e.title || "") : (e.title_en || e.title || ""))).trim() });
          pill.appendChild(el("span.pill-kind", categoryLabel(e)));
          if (e.logo) pill.appendChild(el("img.pill-logo", { src: e.logo, alt: sym, loading: "lazy" }));
          pill.appendChild(el("span.pill-tk", sym || "ER"));
          box.appendChild(pill);
        } else {
          const full = isZh ? (e.title || "") : (e.title_en || e.title || "");
          const pill = el("span.pill.pill-" + e.type + ".cal-kind-" + category(e), { title: full });
          pill.appendChild(el("span.pill-kind", categoryLabel(e)));
          pill.appendChild(el("span.pill-ic", { "aria-hidden": "true" }, icon(ICON[e.type] || "calendar")));
          pill.appendChild(el("span.pill-txt", shortLabel(e, isZh)));
          box.appendChild(pill);
        }
      }
      if (evs.length > limit) box.appendChild(el("span.pill-more", s("calendar.more_events", {n: evs.length - limit})));
      return box;
    }

    function miniBars(evs) {
      // month cells: compact colour-dot + label rows (ticker for earnings, name for macro/structural).
      const box = el("div.cal-mini");
      for (const e of evs.slice(0, 3)) {
        const b = el("div.mbar");
        const dot = el("i.bardot"); dot.style.background = DOTC[e.type] || "var(--muted)"; b.appendChild(dot);
        const label = e.type === "earnings" ? ((e.tickers || [])[0] || (isZh ? "财报" : "ER")) : shortLabel(e, isZh);
        b.setAttribute("title", isZh ? (e.title || "") : (e.title_en || e.title || ""));
        b.appendChild(el("span.pill-txt" + (e.type === "earnings" && isPro && evHasMine(e) ? ".mine" : ""), label));
        box.appendChild(b);
      }
      if (evs.length > 3) box.appendChild(el("div.pill-more", "+" + (evs.length - 3)));
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
        const mine = isPro && evs.some(evHasMine);
        const wknd = dt.getDay() === 0 || dt.getDay() === 6;
        const cell = el("button.cal-cell" + (iso === todayIso ? ".cal-is-today" : "") + (iso === selected ? ".cal-sel" : "") + (evs.length ? ".cal-has" : "") + (mine ? ".cal-mine-cell" : "") + (wknd ? ".cal-weekend" : "") + (evs.some(e=>e.type==="holiday") ? ".cal-closed" : "") + (evs.some(e=>e.type==="early_close") ? ".cal-early" : ""),
          { type: "button", "aria-label": iso + ", " + s("calendar.event_count", {n: evs.length}) + (evs.some(e=>e.type==="holiday") ? ", " + s("calendar.closed_short") : ""), "aria-pressed": String(iso === selected) });
        cell.appendChild(el("span.cal-dnum", String(day)));
        if (evs.length) { cell.appendChild(miniBars(evs)); cell.appendChild(el("span.cal-event-count", String(evs.length))); }
        const session=evs.find(e=>["holiday","early_close"].includes(e.type));
        if(session) cell.append(el("span.cal-session-grid-label",shortLabel(session,isZh)));
        cell.addEventListener("click", () => { selected = iso; render(); card.querySelector(".cal-detail")?.scrollIntoView?.({block: "start", behavior: "auto"}); });
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
          const mine = isPro && evs.some(evHasMine);
          const wknd = d.getDay() === 0 || d.getDay() === 6;
          const session = evs.find(e => ["holiday", "early_close"].includes(e.type));
          const weekday = new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", {weekday:"short"}).format(d);
          const cell = el("button.cal-bicell" + (iso === todayIso ? ".cal-is-today" : "") + (iso === selected ? ".cal-sel" : "") + (evs.length ? ".cal-has" : "") + (mine ? ".cal-mine-cell" : "") + (wknd ? ".cal-weekend" : "") + (session?.type === "holiday" ? ".cal-closed" : "") + (session?.type === "early_close" ? ".cal-early" : ""),
            {type:"button", "data-date":iso, "aria-label":[dateLabel(iso), s("calendar.event_count", {n:evs.length}), ...evs.map(e => isZh ? e.title : (e.title_en || e.title))].join(", "), "aria-pressed":String(iso === selected)});
          const date = el("div.cal-bidate", el("span.cal-bidnum", String(d.getDate())), el("span.cal-biweekday", iso === todayIso ? s("calendar.today") : weekday));
          cell.append(date);
          if (evs.length) cell.append(pills(evs, 2));
          else cell.append(el("span.cal-biquiet", s("calendar.no_events_short")));
          cell.addEventListener("click", () => { selected = iso; render(); card.querySelector(".cal-detail")?.scrollIntoView?.({block:"start", behavior:"auto"}); });
          grid.append(cell);
        }
        group.append(grid); weeks.append(group);
      }
      box.append(weeks);
      return box;
    }

    // The list shows every event in the selected period; grid selections use the same rows.
    const visibleDates = viewMode === "list"
      ? Array.from({length: 14}, (_, i) => ymd(addDays(biStart, i))).filter(iso => dayEvents(iso).length)
      : [selected];
    if (!visibleDates.length) card.appendChild(el("p.muted", s("calendar.empty")));
    for (const detailDate of visibleDates) {
    const detail = el("div.cal-detail");
    detail.appendChild(el("div.cal-day-h.mono", dateLabel(detailDate)));
    const evs = dayEvents(detailDate);
    if (!evs.length) { detail.appendChild(el("p.muted.cal-empty-day", s("calendar.day_empty"))); }
    else {
      for (const e of evs) {
        const isMine = isPro && evHasMine(e);
        const row = el("div.cal-ev" + (isMine ? ".cal-mine-ev" : "") + ".cal-t-" + e.type + ".cal-kind-" + category(e));
        if (e.type === "earnings" && e.logo) row.appendChild(el("img.cal-ev-logo", { src: e.logo, alt: (e.tickers || [])[0] || "", loading: "lazy" }));
        else row.appendChild(el("span.cal-ico", { "aria-hidden": "true" }, icon(ICON[e.type] || "calendar")));
        const main = el("div.cal-main");
        main.appendChild(el("span.cal-kind-label", categoryLabel(e)));
        const title = el("div.cal-title", isZh ? (e.title || "") : (e.title_en || e.title || ""));
        for (const t of (e.tickers || [])) title.appendChild(el("a.cal-tk.mono" + (watchSet.has(String(t).toUpperCase()) ? ".on" : ""), { href: "#/chart/" + encodeURIComponent(t) }, "$" + t));
        if (isMine) title.appendChild(el("span.cal-mine-badge", s("calendar.mine_badge")));
        main.appendChild(title);
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
        if (e.url) main.appendChild(el("a.cal-link.mono", { href: e.url, target: "_blank", rel: "noopener" }, s(["holiday","early_close"].includes(e.type)?"calendar.source":"event.source")+" ↗"));
        row.appendChild(main);
        detail.appendChild(row);
      }
    }
    card.appendChild(detail);
    }
  }

  return () => { disposed=true; research.dispose(); disposeHistory(); };
}
