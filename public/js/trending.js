// trending.js — /trending/ : k-anonymous "what people watch" from CFG.API_BASE + /public/trending.json.
// Stale-while-revalidate: paint the localStorage copy immediately, refetch, replace; offline → keep the cached copy
// and say so. Never renders a count below K=5 (null → "—"; any non-null count < 5 is also masked, defensively).
(function () {
  "use strict";
  var root = document.getElementById("trending");
  if (!root) return;
  var L = JSON.parse(root.getAttribute("data-l10n") || "{}");
  var CFG = window.DUCKY || {};
  var K = 5;
  var URL_ = (CFG.API_BASE || "").replace(/\/$/, "") + (root.getAttribute("data-path") || "/public/trending.json");
  var KEY = "ducky.trending.v1";
  var $ = function (id) { return document.getElementById(id); };

  function fmt(s, vars) { return String(s || "").replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : "—"; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function count(x) { return isNum(x) && x >= K ? String(Math.round(x)) : "—"; }   // K-anonymity guard, client side too
  function delta(x, base) {
    var td = el("td", "num");
    if (!isNum(x) || !isNum(base) || base < K) { td.textContent = "—"; return td; }
    td.textContent = (x > 0 ? "+" : "") + Math.round(x);
    if (x) td.classList.add(x > 0 ? "delta-pos" : "delta-neg");
    return td;
  }

  function readCache() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function writeCache(j) { try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (e) { /* private mode etc. */ } }

  function render(j, cached) {
    var tbody = $("trend-table").tBodies[0];
    tbody.innerHTML = "";
    var items = Array.isArray(j.items) ? j.items : Array.isArray(j.tickers) ? j.tickers : [];
    items = items.filter(function (it) { return it && it.ticker && isNum(it.watchers) && it.watchers >= K; });
    items.sort(function (a, b) { return (a.rank_24h || 1e9) - (b.rank_24h || 1e9) || (b.watchers || 0) - (a.watchers || 0); });
    var up = $("trend-updated");
    if (up) up.textContent = (L.as_of || "as of") + " " + (j.as_of || j.generated_at || "—") + (cached ? " " + (L.cached || "(cached)") : "");
    if (!items.length) {
      var tr0 = el("tr"); var td0 = el("td", "empty", L.empty); td0.colSpan = 6; tr0.appendChild(td0); tbody.appendChild(tr0); return;
    }
    items.forEach(function (it) {
      var tr = el("tr");
      var tdt = el("td"); tdt.appendChild(el("span", "tk", it.ticker)); tr.appendChild(tdt);
      var w = el("td", "num", count(it.watchers)); if (!isNum(it.watchers)) w.title = L.hidden || ""; tr.appendChild(w);
      tr.appendChild(delta(it.d_watchers_24h, it.watchers));
      tr.appendChild(delta(it.d_watchers_7d, it.watchers));
      var tdc = el("td");
      (Array.isArray(it.top_conditions) ? it.top_conditions : []).slice(0, 4).forEach(function (c) {
        var label = typeof c === "string" ? c : (c && (c.label || (c.field ? c.field + " " + (c.op || "") : ""))) || "";
        var n = c && isNum(c.n) ? c.n : null;
        if (!label || (n != null && n < K)) return;         // a condition count below K is never shown
        var chip = el("span", "cond-chip", label);
        if (n != null) chip.appendChild(el("small", "n", "×" + n));
        tdc.appendChild(chip);
      });
      if (!tdc.childNodes.length) tdc.textContent = "—";
      tr.appendChild(tdc);
      var tdw = el("td");
      (Array.isArray(it.cowatch) ? it.cowatch : []).slice(0, 5).forEach(function (c) {
        var other = typeof c === "string" ? c : c && c.other;
        var sup = c && isNum(c.support) ? c.support : null;
        if (!other || (sup != null && sup < K)) return;      // pair support below K is never shown
        tdw.appendChild(el("span", "cw-chip", other));
      });
      if (!tdw.childNodes.length) tdw.textContent = "—";
      tr.appendChild(tdw);
      tbody.appendChild(tr);
    });
  }

  function offline(cached) {
    var b = $("trend-offline");
    if (!b) return;
    b.hidden = false;
    b.textContent = (L.offline || "offline") + " " + (cached ? fmt(L.cached_from, { t: cached.as_of || cached.generated_at || "?" }) : (L.no_cache || ""));
    if (!cached) { var tb = $("trend-table").tBodies[0]; tb.innerHTML = ""; var tr = el("tr"); var td = el("td", "empty", "—"); td.colSpan = 6; tr.appendChild(td); tb.appendChild(tr); }
  }

  var cached = readCache();
  if (cached) render(cached, true);

  if (!CFG.API_BASE) { offline(cached); return; }
  var ctl = ("AbortController" in window) ? new AbortController() : null;
  if (ctl) setTimeout(function () { ctl.abort(); }, 8000);
  fetch(URL_, { mode: "cors", credentials: "omit", cache: "default", signal: ctl ? ctl.signal : undefined })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      if (!j || typeof j !== "object") throw new Error("bad schema");
      j._fetched_at = new Date().toISOString();
      writeCache(j); render(j, false);
      var b = $("trend-offline"); if (b) { b.hidden = true; b.textContent = ""; }
    })
    .catch(function () { offline(cached); });
})();
