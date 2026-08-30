// track.js — /track-record/ : render the append-only ledger from the static track-record.json (nightly notary).
// Rules (SYSTEMDESIGN §0.5, §5): losers never filtered; N= beside every rate; BACKTEST/LIVE labeled, never mixed;
// staleness banner when generated_at is > 30 h old; equity curve via vendored Lightweight Charts (guarded).
// No third-party requests. Fetches only the relative JSON path from config (same origin).
(function () {
  "use strict";
  var root = document.getElementById("track");
  if (!root) return;
  var L = JSON.parse(root.getAttribute("data-l10n") || "{}");
  var CFG = window.DUCKY || {};
  var SRC = CFG.TRACK_JSON || root.getAttribute("data-src") || "/track-record.json";
  var STALE_MS = 30 * 3600 * 1000;
  var $ = function (id) { return document.getElementById(id); };

  function fmt(s, vars) { return String(s || "").replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : "—"; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function pct(x, digits) { return (x > 0 ? "+" : "") + x.toFixed(digits == null ? 1 : digits) + "%"; }
  function retCell(x) {
    var td = el("td", "num");
    if (!isNum(x)) { td.appendChild(el("span", "pending", L.pending || "pending")); return td; }
    td.textContent = pct(x);
    if (x < 0) td.classList.add("neg"); else if (x > 0) td.classList.add("pos");   // classList.add("") throws
    return td;
  }
  function badge(mode) {
    var live = mode === "LIVE";
    return el("span", "badge " + (live ? "badge-live" : "badge-backtest") + " badge-inline", live ? (L.live || "LIVE") : (L.backtest || "BACKTEST"));
  }
  function tsShort(ts) { var m = /^(\d{4}-\d\d-\d\d)T(\d\d:\d\d)/.exec(String(ts || "")); return m ? m[1] + " " + m[2] : String(ts || "").replace("T", " "); }
  function dirLabel(d) { return d > 0 ? L.dir_up : d < 0 ? L.dir_down : L.dir_flat; }

  // ---- state + filters ----
  var data = null, filter = { kind: "*", mode: "*", ticker: "" };

  function chipGroup(containerId, key, values) {
    var box = $(containerId);
    if (!box) return;
    box.querySelectorAll(".chip-btn").forEach(function (b) { b.remove(); });
    ["*"].concat(values).forEach(function (v) {
      var b = el("button", "chip-btn" + (filter[key] === v ? " on" : ""), v === "*" ? (L.all || "All") : v);
      b.type = "button"; b.setAttribute("data-v", v); b.setAttribute("aria-pressed", filter[key] === v ? "true" : "false");
      b.addEventListener("click", function () {
        filter[key] = v;
        box.querySelectorAll(".chip-btn").forEach(function (o) { var on = o === b; o.classList.toggle("on", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
        renderRows();
      });
      box.appendChild(b);
    });
  }

  function tbodyOf(id) {   // templates may omit <tbody>; never let that blank the ledger
    var t = $(id); if (!t) return null;
    return t.tBodies[0] || t.appendChild(document.createElement("tbody"));
  }
  var HIDE_KINDS = (CFG.HIDE_KINDS || ["nvdev"]);   // kinds whose entity mapping is not yet trusted for the public ledger

  function renderRows() {
    var tbody = tbodyOf("ledger"); if (!tbody) return;
    tbody.innerHTML = "";
    var rows = (data.rows || []).filter(function (r) { return HIDE_KINDS.indexOf(r.kind) < 0; }).slice().sort(function (a, b) { return a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0; });
    var tk = filter.ticker.trim().toUpperCase();
    var shown = rows.filter(function (r) {
      return (filter.kind === "*" || r.kind === filter.kind) && (filter.mode === "*" || r.mode === filter.mode) &&
        (!tk || String(r.ticker || "").toUpperCase().indexOf(tk) === 0);
    });
    if (!shown.length) {
      var tr0 = el("tr"); var td0 = el("td", "empty", L.empty || "No rows match."); td0.colSpan = 8; tr0.appendChild(td0); tbody.appendChild(tr0);
    }
    shown.forEach(function (r) {
      var tr = el("tr");
      tr.setAttribute("data-mode", r.mode);
      var tdk = el("td"); tdk.appendChild(el("span", "kind", r.kind)); tr.appendChild(tdk);
      var tdt = el("td"); tdt.appendChild(el("span", "tk", r.ticker || "—")); tr.appendChild(tdt);
      var tdts = el("td", "mono", tsShort(r.ts)); tdts.title = r.ts || ""; tr.appendChild(tdts);
      tr.appendChild(retCell(r.r1)); tr.appendChild(retCell(r.r5)); tr.appendChild(retCell(r.r20));
      var tdm = el("td"); tdm.appendChild(badge(r.mode)); tr.appendChild(tdm);
      var tds = el("td", "summary");
      var dir = dirLabel(r.direction);
      tds.textContent = (dir ? dir + " · " : "") + (r.summary || "") + (isNum(r.px0) ? " · @" + r.px0 : "");
      tr.appendChild(tds);
      tbody.appendChild(tr);
    });
    var rs = $("rows-shown");
    if (rs) rs.textContent = fmt(L.rows_shown, { shown: shown.length, total: rows.length });
  }

  function rateCell(rate, n) {
    // Every percentage prints its N=. Attributes mirror the landing's data-winrate/data-n convention.
    var td = el("td", "num rate-cell");
    if (!isNum(rate) || !n) { td.appendChild(el("span", "pending", L.pending || "pending")); return td; }
    var s = el("span", "rate", rate.toFixed(0) + "%");
    s.setAttribute("data-winrate", rate.toFixed(0)); s.setAttribute("data-n", String(n));
    s.appendChild(el("small", "n", (L.n_label || "N=") + n));
    td.appendChild(s);
    return td;
  }

  function renderRates() {
    var tbody = tbodyOf("rates"); if (!tbody) return;
    tbody.innerHTML = "";
    var src = (data.by_source || []).filter(function (s) { return HIDE_KINDS.indexOf(s.kind) < 0; }).slice().sort(function (a, b) {
      if (a.mode !== b.mode) return a.mode === "LIVE" ? -1 : 1;   // LIVE block first, BACKTEST after — never interleaved
      return (b.n || 0) - (a.n || 0);
    });
    if (!src.length) { var tr0 = el("tr"); var td0 = el("td", "empty", L.empty || "—"); td0.colSpan = 6; tr0.appendChild(td0); tbody.appendChild(tr0); return; }
    src.forEach(function (s) {
      var tr = el("tr");
      var tdk = el("td"); tdk.appendChild(el("span", "kind", s.kind)); tr.appendChild(tdk);
      var tdm = el("td"); tdm.appendChild(badge(s.mode)); tr.appendChild(tdm);
      tr.appendChild(el("td", "num", String(s.n != null ? s.n : "—")));
      // the N beside a hit-rate is ITS denominator (directional signals: n_hit5 / n_hit20), never the return count
      tr.appendChild(rateCell(s.hit5, s.n_hit5 != null ? s.n_hit5 : (s.n5 != null ? s.n5 : s.n)));
      tr.appendChild(rateCell(s.hit20, s.n_hit20 != null ? s.n_hit20 : (s.n20 != null ? s.n20 : s.n)));
      var avg = retCell(s.avg20);
      if (isNum(s.avg20)) { var n20 = s.n20 != null ? s.n20 : s.n; avg.appendChild(el("small", "n", " " + (L.n_label || "N=") + n20)); }
      tr.appendChild(avg);
      tbody.appendChild(tr);
    });
  }

  // Export contract (outcomes.py build_track_record): by_source.hit5/hit20 and backtest.kindex.win20 are PERCENT
  // (0–100); backtest.kindex = {n, target, window: 20, win20, avg20} — the exporter's only horizon beyond +5d is +20d.
  function renderBacktest() {
    var p = $("backtest-line");
    if (!p) return;
    var k = data.backtest && data.backtest.kindex;
    p.innerHTML = "";
    if (!k) { p.textContent = "—"; return; }
    p.appendChild(document.createTextNode(fmt(L.backtest_line, { target: k.target, window: k.window }) + " "));
    var win = el("span", "rate");
    if (isNum(k.win20)) {
      win.textContent = (L.backtest_win || "win rate") + " " + k.win20.toFixed(0) + "% ";
      win.setAttribute("data-winrate", k.win20.toFixed(0)); win.setAttribute("data-n", String(k.n || 0));
      win.appendChild(el("small", "n", "(" + (L.n_label || "N=") + (k.n || 0) + ")"));
    } else { win.textContent = L.pending || "pending"; }
    p.appendChild(win);
    if (isNum(k.avg20)) {
      p.appendChild(document.createTextNode(" · " + (L.backtest_avg || "avg") + " "));
      p.appendChild(el("span", k.avg20 < 0 ? "neg" : "pos", pct(k.avg20)));
      p.appendChild(document.createTextNode(" " + (L.n_label || "N=") + (k.n || 0)));
    }
  }

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function renderEquity() {
    var box = $("equity");
    if (!box) return;
    var eq = (data.equity || []).filter(function (p) { return p && p.d && isNum(p.v); });
    box.innerHTML = "";
    var LW = window.LightweightCharts;
    if (!eq.length) { box.appendChild(el("div", "chart-fallback", "—")); return; }
    if (!LW || typeof LW.createChart !== "function") {   // vendored lib missing → text fallback (never a CDN)
      box.appendChild(el("div", "chart-fallback", fmt(L.equity_nochart, { first: eq[0].v, last: eq[eq.length - 1].v, n: eq.length })));
      return;
    }
    var opts = function () {
      return {
        layout: { background: { type: "solid", color: "transparent" }, textColor: cssVar("--muted") || "#9aa7b4", attributionLogo: false },
        grid: { vertLines: { color: cssVar("--border") || "#223041" }, horzLines: { color: cssVar("--border") || "#223041" } },
        rightPriceScale: { borderColor: cssVar("--border") }, timeScale: { borderColor: cssVar("--border") },
        autoSize: true, handleScroll: false, handleScale: false, crosshair: { mode: 0 }
      };
    };
    var chart = LW.createChart(box, opts());
    var color = (eq[eq.length - 1].v >= eq[0].v ? cssVar("--green") : cssVar("--red")) || "#3fb950";
    var series = chart.addSeries(LW.LineSeries, { color: color, lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
    series.setData(eq.map(function (p) { return { time: p.d, value: p.v }; }));
    chart.timeScale().fitContent();
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      var onTheme = function () { chart.applyOptions(opts()); };
      if (mq.addEventListener) mq.addEventListener("change", onTheme); else if (mq.addListener) mq.addListener(onTheme);
    }
  }

  function renderMeta() {
    var gen = $("track-generated"), fix = $("track-fixture"), stale = $("track-stale");
    var t = Date.parse(data.generated_at || "");
    if (gen) gen.textContent = (L.generated || "generated") + " " + (data.generated_at || "—");
    var note = String(data.note || "");
    if (fix && /fixture/i.test(note)) { fix.textContent = L.fixture || "FIXTURE"; fix.className = "badge badge-placeholder"; fix.title = note; }
    if (stale) {
      var old = !isNaN(t) && (Date.now() - t) > STALE_MS;
      stale.hidden = !old;
      if (old) stale.textContent = fmt(L.stale, { h: Math.round((Date.now() - t) / 3600000) });
    }
  }

  function render() {
    renderMeta();
    var kinds = [], modes = [];
    (data.rows || []).forEach(function (r) {
      if (HIDE_KINDS.indexOf(r.kind) >= 0) return;
      if (r.kind && kinds.indexOf(r.kind) < 0) kinds.push(r.kind);
      if (r.mode && modes.indexOf(r.mode) < 0) modes.push(r.mode);
    });
    kinds.sort(); modes.sort(function (a, b) { return a === "LIVE" ? -1 : b === "LIVE" ? 1 : 0; });
    chipGroup("filter-kind", "kind", kinds);
    chipGroup("filter-mode", "mode", modes);
    renderRows(); renderRates(); renderBacktest();
    try { renderEquity(); } catch (e) {   // a chart-library failure must never blank the ledger
      var box = $("equity"); var eq = data.equity || [];
      if (box) { box.innerHTML = ""; box.appendChild(el("div", "chart-fallback", eq.length ? fmt(L.equity_nochart, { first: eq[0].v, last: eq[eq.length - 1].v, n: eq.length }) : "—")); }
    }
  }

  var input = $("filter-ticker");
  if (input) input.addEventListener("input", function () { filter.ticker = input.value; if (data) renderRows(); });

  function fail(msg) {
    var e = $("track-error"); if (e) { e.hidden = false; e.textContent = msg || L.load_error; }
    ["ledger", "rates"].forEach(function (id) { var tb = tbodyOf(id); if (tb) tb.innerHTML = ""; });
  }

  // ---- §12 scorecard (live API, edge-cached; graceful offline) ----
  // §12.2 step 3: the public page only DISPLAYS rate cells with n ≥ min_display_n (the payload flags each
  // source with `shown`); thin rows keep their kind + N and print "sample too small" instead of a rate.
  function lowNCell(min) {
    var td = el("td", "num rate-cell low-n");
    td.appendChild(el("span", "pending", fmt(L.score_low_n || "N<{min}", { min: min })));
    return td;
  }
  function renderScorecard() {
    var tb = tbodyOf("scorecard-table"), reg = $("score-regime"), box = $("basket-chart"), disc = $("score-disclaimer");
    if (!tb) return;
    var api = (window.DUCKY && window.DUCKY.API_BASE) || "";
    if (!api) return;
    fetch(api.replace(/\/+$/, "") + "/public/scorecard.json", { credentials: "omit" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (sc) {
        tb.innerHTML = "";
        var minN = isNum(sc.min_display_n) ? sc.min_display_n : 10;
        var src = (sc.sources || []).filter(function (x) { return HIDE_KINDS.indexOf(x.kind) < 0; })
          .sort(function (a, b) { return (b.n || 0) - (a.n || 0); });
        if (!src.length) { var tr0 = el("tr"); var td0 = el("td", "empty", L.empty || "—"); td0.colSpan = 6; tr0.appendChild(td0); tb.appendChild(tr0); }
        src.forEach(function (x) {
          var shown = x.shown === undefined ? (x.n || 0) >= minN : x.shown === true;
          var tr = el("tr");
          if (!shown) tr.className = "low-n";
          var tdk = el("td"); tdk.appendChild(el("span", "kind", x.kind)); tr.appendChild(tdk);
          tr.appendChild(el("td", "num", String(x.n != null ? x.n : "—")));
          if (shown) {
            tr.appendChild(rateCell(x.hit20, x.n_hit != null ? x.n_hit : x.n));
            var ex = retCell(x.avg_excess20); if (isNum(x.avg_excess20)) ex.appendChild(el("small", "n", " " + (L.n_label || "N=") + (x.n || 0))); tr.appendChild(ex);
            tr.appendChild(rateCell(x.win_vs_spy, x.n));
          } else {
            tr.appendChild(lowNCell(minN)); tr.appendChild(lowNCell(minN)); tr.appendChild(lowNCell(minN));
          }
          var aw = el("td");
          if (x.all_weather === true) aw.appendChild(el("span", "badge badge-live badge-inline", L.aw_yes || "all-weather"));
          else { var b = el("span", "badge badge-inline", L.aw_no || "not yet"); var why = (x.all_weather_fail || []).map(function (f) { return f.regime + ": " + f.why + (f.n ? " (n=" + f.n + ")" : ""); }).join(" · "); if (why) b.title = (L.aw_why || "why") + ": " + why; aw.appendChild(b); }
          tr.appendChild(aw);
          tb.appendChild(tr);
        });
        if (reg && sc.regime_today) reg.textContent = (L.score_regime || "Today's regime") + ": " + (sc.regime_today.regime || "—") + " (" + (sc.regime_today.d || "") + ")";
        if (disc) disc.textContent = sc.disclaimer || "";
        var nav = (sc.baskets && sc.baskets["ducky-all"]) || [];
        if (box) {
          box.innerHTML = "";
          var LW = window.LightweightCharts;
          if (!nav.length) { box.appendChild(el("div", "chart-fallback", "—")); return; }
          if (!LW || typeof LW.createChart !== "function") { box.appendChild(el("div", "chart-fallback", "NAV " + nav[0].nav + " → " + nav[nav.length - 1].nav + " · SPY " + nav[0].spy + " → " + nav[nav.length - 1].spy)); return; }
          var chart = LW.createChart(box, { layout: { background: { type: "solid", color: "transparent" }, textColor: cssVar("--muted") || "#9aa7b4", attributionLogo: false }, grid: { vertLines: { color: cssVar("--border") }, horzLines: { color: cssVar("--border") } }, autoSize: true, handleScroll: false, handleScale: false });
          var s1 = chart.addSeries(LW.LineSeries, { color: cssVar("--green") || "#3fb950", lineWidth: 2, title: "ducky-all" });
          var s2 = chart.addSeries(LW.LineSeries, { color: cssVar("--muted") || "#9aa7b4", lineWidth: 1, title: "SPY" });
          s1.setData(nav.map(function (p) { return { time: p.d, value: p.nav }; }));
          s2.setData(nav.map(function (p) { return { time: p.d, value: p.spy }; }));
          chart.timeScale().fitContent();
        }
      })
      .catch(function () { tb.innerHTML = ""; var tr = el("tr"); var td = el("td", "empty", L.score_offline || "offline"); td.colSpan = 6; tr.appendChild(td); tb.appendChild(tr); });
  }

  fetch(SRC, { cache: "no-cache", credentials: "omit" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j || !Array.isArray(j.rows)) throw new Error("bad schema");
      data = j; render();
      try { renderScorecard(); } catch (e) { if (window.console) console.error("scorecard:", e); }
    })
    .catch(function (e) { if (window.console && console.error) console.error("track-record render failed:", e); fail(L.load_error); });
})();
