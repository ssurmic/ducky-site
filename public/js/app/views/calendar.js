// views/calendar.js — 投资日历 (Pro): a real month GRID (not just a list) of the events that move a
// US-stock watchlist — Fed speakers (ET times), FOMC / rate decisions, CPI/PPI/PCE macro, earnings,
// OPEX / quad witching, index & month-end rebalances. Click a day → that day's events. The user's own
// tickers are highlighted; "my names only" + the grid personalisation is the Pro value.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, spinner, empty } from "../ui.js";

const ICON = { macro: "📊", earnings: "📈", opex: "🎰", witching: "🎰", rebal: "🔄" };
const DOTC = { macro: "var(--accent)", earnings: "#4ea1ff", opex: "#c07cff", witching: "#c07cff", rebal: "#33c793" };
const FILTERS = ["all", "macro", "earnings", "opex", "rebal"];
const FILTER_TYPES = { all: null, macro: ["macro"], earnings: ["earnings"], opex: ["opex", "witching"], rebal: ["rebal"] };

function ymd(d) { const z = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
function weekSunday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }

export async function mount(root) {
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const isPro = store.isPro();
  const WD = isZh ? ["日", "一", "二", "三", "四", "五", "六"] : ["S", "M", "T", "W", "T", "F", "S"];
  const MON = isZh
    ? (y, m) => `${y} 年 ${m + 1} 月`
    : (y, m) => `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]} ${y}`;

  const card = el("section.card.calendar-view");
  root.appendChild(card);
  card.append(el("h1", s("calendar.h1")), el("p.muted", s("calendar.sub")));
  card.appendChild(spinner());

  let doc, watch = [];
  try {
    doc = await api.calendar.feed();
    watch = (store.get("watchlist") || []).map((t) => String(t).toUpperCase());
    if (!watch.length) { try { const w = await api.watchlist.list(); watch = (w.items || []).map((x) => String(x.ticker || x).toUpperCase()); } catch (e) { /* ignore */ } }
  } catch (e) {
    clear(card); card.append(el("h1", s("calendar.h1")), el("p.err", s("calendar.load_error")));
    return () => {};
  }
  const watchSet = new Set(watch);
  const events = (doc && doc.events) || [];
  const evHasMine = (e) => (e.tickers || []).some((t) => watchSet.has(String(t).toUpperCase()));

  // index events by date for O(1) day lookup
  const byDate = new Map();
  for (const e of events) { if (!byDate.has(e.date)) byDate.set(e.date, []); byDate.get(e.date).push(e); }

  const todayIso = ymd(new Date());
  // default the selected day to today (even if it has no events), and open the grid on today's month —
  // NOT events[0], which is a backfilled prior-month event and would open last month on the 1st–5th.
  let selected = byDate.has(todayIso) ? todayIso : todayIso;
  const anchor = new Date((selected || todayIso) + "T00:00:00");
  let viewY = anchor.getFullYear(), viewM = anchor.getMonth();  // month being shown
  let filter = "all", mineOnly = false;
  let viewMode = "biweekly";                 // "biweekly" (default: at-a-glance earnings) | "month"
  let biStart = weekSunday(new Date());      // Sunday on/before today; prev/next shift by 14d
  render();

  function typeMatch(e) { const t = FILTER_TYPES[filter]; return !t || t.includes(e.type); }
  function dayEvents(iso) {
    let list = (byDate.get(iso) || []).filter(typeMatch);
    if (mineOnly && isPro) list = list.filter((e) => e.type !== "earnings" || evHasMine(e));
    return list;
  }

  function dateLabel(iso) {
    const today = todayIso, tmr = ymd(new Date(Date.now() + 86400000));
    const d = new Date(iso + "T00:00:00");
    const wd = (isZh ? ["周日","周一","周二","周三","周四","周五","周六"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"])[d.getDay()];
    const base = isZh ? `${d.getMonth() + 1}月${d.getDate()}日 · ${wd}` : `${wd} ${d.getMonth() + 1}/${d.getDate()}`;
    if (iso === today) return s("calendar.today") + " · " + base;
    if (iso === tmr) return s("calendar.tomorrow") + " · " + base;
    return base;
  }

  function render() {
    clear(card);
    card.append(el("h1", s("calendar.h1")), el("p.muted", s("calendar.sub")));
    if (!isPro) {
      card.appendChild(el("div.cr-pro-banner",
        el("span.cr-pro-badge", s("calendar.pro_badge")),
        el("span", " " + s("calendar.pro_hint") + " "),
        el("a.btn.btn-primary.btn-sm", { href: "#/billing" }, s("calendar.upgrade"))));
    }

    // filter chips + "my watchlist" toggle
    const bar = el("div.cal-bar");
    for (const f of FILTERS) {
      const chip = el("button.cal-fchip" + (filter === f ? ".on" : ""), { type: "button" }, s("calendar.f_" + f));
      chip.addEventListener("click", () => { filter = f; render(); });
      bar.appendChild(chip);
    }
    const mineBtn = el("button.cal-fchip.cal-mine" + (mineOnly ? ".on" : ""), { type: "button" },
      (mineOnly ? "★ " : "☆ ") + s("calendar.mine_only") + (isPro ? "" : " 🔒"));
    mineBtn.addEventListener("click", () => { if (!isPro) { router.go("#/billing"); return; } mineOnly = !mineOnly; render(); });
    bar.appendChild(mineBtn);
    card.appendChild(bar);

    // view-mode toggle: 两周 (at-a-glance earnings) | 月
    const modeBar = el("div.cal-modebar");
    for (const m of ["biweekly", "month"]) {
      const b = el("button.cal-mode" + (viewMode === m ? ".on" : ""), { type: "button" }, s("calendar.mode_" + m));
      b.addEventListener("click", () => { viewMode = m; render(); });
      modeBar.appendChild(b);
    }
    card.appendChild(modeBar);

    if (viewMode === "month") card.appendChild(monthGrid());
    else card.appendChild(biweekly());

    function eventGlyphs(evs, withLogos) {
      // compact per-day glyph strip: earnings show the company LOGO (data: URI) or a $TICKER chip so you can
      // SEE who reports at a glance; macro/structural show their emoji. Dots are the fallback in dense month cells.
      const strip = el("div.cal-glyphs");
      for (const e of evs.slice(0, withLogos ? 8 : 4)) {
        if (e.type === "earnings") {
          const sym = (e.tickers || [])[0] || "";
          if (withLogos && e.logo) {
            const img = el("img.cal-logo", { src: e.logo, alt: sym, title: sym, loading: "lazy" });
            strip.appendChild(img);
          } else {
            strip.appendChild(el("span.cal-glyph-tk.mono" + (isPro && evHasMine(e) ? ".on" : ""), sym || "📈"));
          }
        } else {
          strip.appendChild(el("span.cal-glyph-ic", { title: e.type }, ICON[e.type] || "•"));
        }
      }
      if (evs.length > (withLogos ? 8 : 4)) strip.appendChild(el("span.cal-glyph-more.muted", "+" + (evs.length - (withLogos ? 8 : 4))));
      return strip;
    }

    function monthGrid() {
      const box = el("div.cal-monthbox");
      const head = el("div.cal-mhead");
      const prev = el("button.cal-mnav", { type: "button", "aria-label": "prev" }, "‹");
      const next = el("button.cal-mnav", { type: "button", "aria-label": "next" }, "›");
      prev.addEventListener("click", () => { viewM--; if (viewM < 0) { viewM = 11; viewY--; } render(); });
      next.addEventListener("click", () => { viewM++; if (viewM > 11) { viewM = 0; viewY++; } render(); });
      const todayBtn = el("button.cal-today", { type: "button" }, s("calendar.jump_today"));
      todayBtn.addEventListener("click", () => { const d = new Date(); viewY = d.getFullYear(); viewM = d.getMonth(); selected = todayIso; render(); });
      head.append(prev, el("div.cal-mtitle", MON(viewY, viewM)), next, todayBtn);
      box.appendChild(head);

      const grid = el("div.cal-grid");
      for (const w of WD) grid.appendChild(el("div.cal-wd", w));
      const firstDow = new Date(viewY, viewM, 1).getDay();
      const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
      for (let i = 0; i < firstDow; i++) grid.appendChild(el("div.cal-cell.cal-empty"));
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = ymd(new Date(viewY, viewM, day));
        const evs = dayEvents(iso);
        const mine = isPro && evs.some(evHasMine);
        const cell = el("button.cal-cell" + (iso === todayIso ? ".cal-is-today" : "") + (iso === selected ? ".cal-sel" : "") + (evs.length ? ".cal-has" : "") + (mine ? ".cal-mine-cell" : ""),
          { type: "button" });
        cell.appendChild(el("span.cal-dnum", String(day)));
        if (evs.length) {
          const dots = el("span.cal-dots");
          const kinds = [...new Set(evs.map((e) => e.type))].slice(0, 4);
          for (const k of kinds) { const dot = el("i.cal-dot"); dot.style.background = DOTC[k] || "var(--muted)"; dots.appendChild(dot); }
          cell.appendChild(dots);
        }
        cell.addEventListener("click", () => { selected = iso; render(); });
        grid.appendChild(cell);
      }
      box.appendChild(grid);
      return box;
    }

    function biweekly() {
      const box = el("div.cal-bibox");
      const head = el("div.cal-mhead");
      const prev = el("button.cal-mnav", { type: "button", "aria-label": "prev" }, "‹");
      const next = el("button.cal-mnav", { type: "button", "aria-label": "next" }, "›");
      prev.addEventListener("click", () => { biStart = addDays(biStart, -14); render(); });
      next.addEventListener("click", () => { biStart = addDays(biStart, 14); render(); });
      const end = addDays(biStart, 13);
      const span = (isZh
        ? `${biStart.getMonth() + 1}月${biStart.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`
        : `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][biStart.getMonth()]} ${biStart.getDate()} – ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][end.getMonth()]} ${end.getDate()}`);
      const todayBtn = el("button.cal-today", { type: "button" }, s("calendar.jump_today"));
      todayBtn.addEventListener("click", () => { biStart = weekSunday(new Date()); selected = todayIso; render(); });
      head.append(prev, el("div.cal-mtitle", span), next, todayBtn);
      box.appendChild(head);

      const grid = el("div.cal-bigrid");
      for (const w of WD) grid.appendChild(el("div.cal-wd", w));
      for (let i = 0; i < 14; i++) {
        const d = addDays(biStart, i);
        const iso = ymd(d);
        const evs = dayEvents(iso);
        const mine = isPro && evs.some(evHasMine);
        const cell = el("button.cal-bicell" + (iso === todayIso ? ".cal-is-today" : "") + (iso === selected ? ".cal-sel" : "") + (evs.length ? ".cal-has" : "") + (mine ? ".cal-mine-cell" : ""),
          { type: "button" });
        cell.appendChild(el("span.cal-bidnum", String(d.getDate())));
        if (evs.length) cell.appendChild(eventGlyphs(evs, true));
        cell.addEventListener("click", () => { selected = iso; render(); });
        grid.appendChild(cell);
      }
      box.appendChild(grid);
      return box;
    }

    // selected-day detail
    const detail = el("div.cal-detail");
    detail.appendChild(el("div.cal-day-h.mono", dateLabel(selected)));
    const evs = dayEvents(selected);
    if (!evs.length) { detail.appendChild(el("p.muted.cal-empty-day", s("calendar.day_empty"))); }
    else {
      for (const e of evs) {
        const isMine = isPro && evHasMine(e);
        const row = el("div.cal-ev" + (isMine ? ".cal-mine-ev" : "") + ".cal-t-" + e.type);
        if (e.type === "earnings" && e.logo) row.appendChild(el("img.cal-ev-logo", { src: e.logo, alt: (e.tickers || [])[0] || "", loading: "lazy" }));
        else row.appendChild(el("span.cal-ico", { "aria-hidden": "true" }, ICON[e.type] || "•"));
        const main = el("div.cal-main");
        const title = el("div.cal-title", isZh ? (e.title || "") : (e.title_en || e.title || ""));
        for (const t of (e.tickers || [])) title.appendChild(el("span.cal-tk.mono" + (watchSet.has(String(t).toUpperCase()) ? ".on" : ""), "$" + t));
        if (isMine) title.appendChild(el("span.cal-mine-badge", s("calendar.mine_badge")));
        main.appendChild(title);
        const note = isZh ? (e.note || "") : (e.note_en || e.note || "");
        if (note) main.appendChild(el("div.cal-note.muted", note));
        if (e.url) main.appendChild(el("a.cal-link.mono", { href: e.url, target: "_blank", rel: "noopener" }, isZh ? "详情 ↗" : "details ↗"));
        row.appendChild(main);
        detail.appendChild(row);
      }
    }
    card.appendChild(detail);
  }

  return () => {};
}
