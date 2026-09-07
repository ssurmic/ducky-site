// ideas.js — /ideas/ (list) and /ideas/<slug>/ (detail; built at /idea/, rewritten by functions/ideas/[[slug]].js).
// Source: CFG.API_BASE + /public/ideas.json (live, progressive enhancement) → static /ideas.json fallback (nightly).
// Thesis markdown is rendered minimally and safely: escape HTML first, then **bold**, *em*, lists, paragraphs, <br>.
// "记录，不是荐股 / a log, not a call" is printed by the template on both pages. No third-party requests.
(function () {
  "use strict";
  var root = document.getElementById("ideas") || document.getElementById("idea");
  if (!root) return;
  var L = JSON.parse(root.getAttribute("data-l10n") || "{}");
  var CFG = window.DUCKY || {};
  var view = root.getAttribute("data-view") || "list";
  var LIVE = CFG.API_BASE ? CFG.API_BASE.replace(/\/$/, "") + (root.getAttribute("data-path") || "/public/ideas.json") : null;
  var FALLBACK = root.getAttribute("data-fallback") || "/ideas.json";
  var DETAIL_BASE = root.getAttribute("data-detail-base") || "/ideas/";
  var $ = function (id) { return document.getElementById(id); };

  function fmt(s, vars) { return String(s || "").replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : "—"; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function pct(x) { return (x > 0 ? "+" : "") + x.toFixed(1) + "%"; }
  function statusLabel(s) { return L["st_" + s] || s || "—"; }
  function statusPill(s) { return el("span", "status-pill status-" + (s || "none"), statusLabel(s)); }
  function bookPill(b) { return el("span", "book-pill" + (b === "live" ? " book-live" : ""), b === "live" ? (L.book_live || "LIVE") : (L.book_paper || "PAPER")); }
  function dirLabel(d) { return d > 0 ? L.dir_up : d < 0 ? L.dir_down : L.dir_flat; }

  // outcome so far from px fields: exit_px (closed) or last_px (open) vs entry_px
  function outcome(it) {
    if (!isNum(it.entry_px)) return null;
    var cur = isNum(it.exit_px) ? it.exit_px : isNum(it.last_px) ? it.last_px : null;
    if (cur == null) return null;
    return { pct: (cur / it.entry_px - 1) * 100, cur: cur, closed: isNum(it.exit_px), d: isNum(it.exit_px) ? it.closed_d : it.last_px_d };
  }

  // ---- minimal, safe markdown: escape first, then a handful of inline/block rules ----
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>");
  }
  function md(src) {
    var out = [], para = [], list = null;
    function flushPara() { if (para.length) { out.push("<p>" + para.map(inline).join("<br>") + "</p>"); para = []; } }
    function flushList() { if (list) { out.push("<" + list.tag + ">" + list.items.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("") + "</" + list.tag + ">"); list = null; } }
    String(src || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (line) {
      var m;
      if (!line.trim()) { flushPara(); flushList(); return; }
      if ((m = /^\s*[-*•]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; } list.items.push(m[1]); return; }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== "ol") { flushList(); list = { tag: "ol", items: [] }; } list.items.push(m[1]); return; }
      if ((m = /^\s*#{1,6}\s+(.*)$/.exec(line))) { flushPara(); flushList(); out.push("<p><strong>" + inline(m[1]) + "</strong></p>"); return; }
      flushList(); para.push(line);
    });
    flushPara(); flushList();
    return out.join("\n");
  }

  function slugFromLocation() {
    var m = /\/ideas\/([A-Za-z0-9._-]+)\/?$/.exec(location.pathname);
    if (m) return m[1];
    var h = (location.hash || "").replace(/^#\/?/, "");
    return /^[A-Za-z0-9._-]+$/.test(h) ? h : "";
  }
  function detailHref(slug) { return DETAIL_BASE.replace(/\/?$/, "/") + encodeURIComponent(slug) + "/"; }

  function metaLine(j, cached) {
    var g = $("ideas-generated"), f = $("ideas-fixture");
    if (g) g.textContent = (L.generated || "generated") + " " + (j.generated_at || j.as_of || "—") + (cached ? " · " + (L.static || "") : "");
    if (f && /fixture/i.test(String(j.note || ""))) { f.textContent = L.fixture || "FIXTURE"; f.className = "badge badge-placeholder"; f.title = j.note; }
  }

  function renderList(j, cached) {
    metaLine(j, cached);
    var tbody = $("ideas-table").tBodies[0];
    tbody.innerHTML = "";
    var ideas = (j.ideas || []).slice().sort(function (a, b) { return (b.updated_at || "") < (a.updated_at || "") ? -1 : 1; });
    if (!ideas.length) { var tr0 = el("tr"); var td0 = el("td", "empty", L.empty); td0.colSpan = 6; tr0.appendChild(td0); tbody.appendChild(tr0); return; }
    ideas.forEach(function (it) {
      var tr = el("tr");
      var tdt = el("td"); tdt.appendChild(el("span", "tk", it.ticker || "—")); tr.appendChild(tdt);
      var tdl = el("td", "summary"); var a = el("a", "idea-link", it.title || it.slug); a.href = detailHref(it.slug); tdl.appendChild(a); tr.appendChild(tdl);
      var tds = el("td"); tds.appendChild(statusPill(it.status)); tr.appendChild(tds);
      var tdb = el("td"); tdb.appendChild(bookPill(it.book)); tr.appendChild(tdb);
      tr.appendChild(el("td", "mono", it.opened_d || "—"));
      var o = outcome(it); var tdo = el("td", "num");
      if (o) { tdo.textContent = pct(o.pct); tdo.classList.add(o.pct < 0 ? "neg" : "pos"); } else tdo.textContent = "—";
      tr.appendChild(tdo);
      tbody.appendChild(tr);
    });
  }

  function renderDetail(j, cached) {
    var slug = slugFromLocation();
    var it = (j.ideas || []).filter(function (x) { return x.slug === slug; })[0];
    var title = $("idea-title");
    if (!it) { title.textContent = L.not_found || "Not found"; var e = $("idea-error"); if (e) { e.hidden = false; e.textContent = L.not_found; } return; }
    var t0 = it.title || it.slug;
    document.title = (it.ticker && t0.indexOf(it.ticker) !== 0 ? it.ticker + " · " : "") + t0 + " · Ducky Bot";
    title.textContent = it.title || it.slug;
    var head = $("idea-head"); head.appendChild(bookPill(it.book)); head.appendChild(statusPill(it.status));
    var meta = $("idea-meta"); meta.innerHTML = "";
    [[null, it.ticker], [L.structure, it.structure], [L.entry, isNum(it.entry_px) ? it.entry_px + (it.opened_d ? " · " + it.opened_d : "") : null],
     [L.exit, isNum(it.exit_px) ? it.exit_px + (it.closed_d ? " · " + it.closed_d : "") : null],
     [L.last, isNum(it.last_px) ? it.last_px + (it.last_px_d ? " · " + it.last_px_d : "") : null],
     [L.updated, (it.updated_at || "").slice(0, 10) + (cached ? " · " + (L.static || "") : "")]
    ].forEach(function (kv) { if (kv[1]) meta.appendChild(el("span", kv[0] ? null : "tk", (kv[0] ? kv[0] + " " : "") + kv[1])); });
    if (/fixture/i.test(String(j.note || ""))) { var fb = el("span", "badge badge-placeholder", L.fixture || "FIXTURE"); fb.title = j.note; meta.appendChild(fb); }

    $("idea-thesis").innerHTML = md(it.thesis_md);

    var ob = $("idea-outcome"); ob.innerHTML = "";
    var o = outcome(it);
    if (!o) { ob.appendChild(el("p", "outcome-line", L.outcome_na)); }
    else {
      ob.appendChild(el("p", "outcome-big " + (o.pct < 0 ? "neg" : "pos"), pct(o.pct)));
      ob.appendChild(el("p", "outcome-line", it.entry_px + " → " + o.cur + " · " + (o.closed ? (L.exit || "exit") : (L.last || "last")) + " " + (o.d || "—")));
      if (it.structure && it.structure !== "shares") ob.appendChild(el("p", "outcome-note", fmt(L.outcome_struct_note, { structure: it.structure })));
    }

    var tl = $("idea-timeline"); tl.innerHTML = "";
    (it.events || []).slice().sort(function (a, b) { return (a.d || "") < (b.d || "") ? -1 : 1; }).forEach(function (ev) {
      var li = el("li", "ev-" + (ev.kind || "note"));
      li.appendChild(el("span", "ev-d", ev.d || "—"));
      li.appendChild(statusPill(ev.kind));
      if (isNum(ev.px)) li.appendChild(el("span", "ev-px", "@" + ev.px));
      if (ev.note_md) { var n = el("div", "ev-note"); n.innerHTML = md(ev.note_md); li.appendChild(n); }
      tl.appendChild(li);
    });

    var sl = $("idea-signals"); sl.innerHTML = "";
    var sigs = it.signals || it.linked_signals || [];
    if (!sigs.length) sl.appendChild(el("li", "pending", L.signals_empty));
    sigs.forEach(function (s) {
      var li = el("li");
      li.appendChild(el("span", "kind", s.kind || "—")); li.appendChild(document.createTextNode(" "));
      li.appendChild(el("span", "mono", String(s.ts || "").slice(0, 10)));
      li.appendChild(document.createTextNode(" · " + (dirLabel(s.direction) || "") + " · " + (s.summary || "")));
      sl.appendChild(li);
    });
  }

  function render(j, cached) { if (view === "detail") renderDetail(j, cached); else renderList(j, cached); }
  function fail() {
    var e = $("ideas-error") || $("idea-error"); if (e) { e.hidden = false; e.textContent = L.load_error; }
    var t = $("ideas-table"); if (t) t.tBodies[0].innerHTML = "";
    var h = $("idea-title"); if (h) h.textContent = "—";
  }
  function get(url, opts) {
    return fetch(url, opts).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (!j || !Array.isArray(j.ideas)) throw new Error("bad schema"); return j; });
  }

  var ctl = ("AbortController" in window) ? new AbortController() : null;
  if (ctl) setTimeout(function () { ctl.abort(); }, 6000);
  var live = LIVE ? get(LIVE, { mode: "cors", credentials: "omit", signal: ctl ? ctl.signal : undefined }) : Promise.reject(new Error("no API_BASE"));
  live.then(function (j) { render(j, false); })
    .catch(function () {
      get(FALLBACK, { cache: "no-cache", credentials: "omit" }).then(function (j) { render(j, true); }).catch(fail);
    });
  if (view === "detail") window.addEventListener("hashchange", function () { location.reload(); });
})();
