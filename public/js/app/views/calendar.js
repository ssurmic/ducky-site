// views/calendar.js — 投资日历 (Pro): a rolling agenda of the events that move a US-stock watchlist —
// macro, earnings, OPEX / quad witching, index rebalances — grouped by date, with the user's own tickers
// highlighted. Personalisation (watchlist highlighting + "my names only") is the Pro value.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, spinner, empty } from "../ui.js";

const ICON = { macro: "📊", earnings: "📈", opex: "🎰", witching: "🎰", rebal: "🔄" };
const FILTERS = ["all", "macro", "earnings", "opex", "rebal"];
// a filter maps to one or more event types
const FILTER_TYPES = { all: null, macro: ["macro"], earnings: ["earnings"], opex: ["opex", "witching"], rebal: ["rebal"] };

function ymd(d) { return d.toISOString().slice(0, 10); }

export async function mount(root) {
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const isPro = store.isPro();
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
  let filter = "all", mineOnly = false;
  render();

  function dateLabel(iso) {
    const today = ymd(new Date());
    const tmr = ymd(new Date(Date.now() + 86400000));
    if (iso === today) return s("calendar.today");
    if (iso === tmr) return s("calendar.tomorrow");
    const d = new Date(iso + "T00:00:00");
    const wd = (isZh ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])[d.getDay()];
    return isZh ? `${d.getMonth() + 1}月${d.getDate()}日 · ${wd}` : `${wd} ${d.getMonth() + 1}/${d.getDate()}`;
  }
  const evHasMine = (e) => (e.tickers || []).some((t) => watchSet.has(String(t).toUpperCase()));

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

    // filter + group by date
    const types = FILTER_TYPES[filter];
    let shown = events.filter((e) => (!types || types.includes(e.type)));
    if (mineOnly && isPro) shown = shown.filter((e) => e.type !== "earnings" || evHasMine(e));
    if (!shown.length) { card.appendChild(empty(s("calendar.empty"))); return; }

    const byDate = [];
    let cur = null;
    for (const e of shown) {
      if (!cur || cur.date !== e.date) { cur = { date: e.date, items: [] }; byDate.push(cur); }
      cur.items.push(e);
    }
    const list = el("div.cal-list");
    for (const day of byDate) {
      list.appendChild(el("div.cal-day-h mono", dateLabel(day.date)));
      for (const e of day.items) {
        const mine = isPro && evHasMine(e);
        const row = el("div.cal-ev" + (mine ? ".cal-mine-ev" : "") + " cal-t-" + e.type);
        row.appendChild(el("span.cal-ico", { "aria-hidden": "true" }, ICON[e.type] || "•"));
        const main = el("div.cal-main");
        const title = el("div.cal-title", isZh ? (e.title || "") : (e.title_en || e.title || ""));
        for (const t of (e.tickers || [])) {
          const chip = el("span.cal-tk mono" + (watchSet.has(String(t).toUpperCase()) ? ".on" : ""), "$" + t);
          title.appendChild(chip);
        }
        if (mine) title.appendChild(el("span.cal-mine-badge", s("calendar.mine_badge")));
        main.appendChild(title);
        const note = isZh ? (e.note || "") : (e.note_en || e.note || "");
        if (note) main.appendChild(el("div.cal-note muted", note));
        row.appendChild(main);
        list.appendChild(row);
      }
    }
    card.appendChild(list);
  }

  return () => {};
}
