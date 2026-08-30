// glossary.js — "这是什么? / What's this?" one-tap explanations (SYSTEMDESIGN §13).
// Loads /glossary.json (same origin, exported nightly from the backend glossary), auto-annotates the first
// occurrence of each term name/alias inside [data-glossary] containers, and opens a bottom sheet on tap.
// Deterministic, no network beyond the same-origin JSON, no third-party code.
(function () {
  "use strict";
  var LANG = (document.documentElement.lang || "zh").slice(0, 2) === "en" ? "en" : "zh";
  var OTHER = LANG === "en" ? "zh" : "en";
  var G = null, sheet = null, loading = null;

  function load() {
    if (G) return Promise.resolve(G);
    if (loading) return loading;
    loading = fetch("/glossary.json", { cache: "force-cache" }).then(function (r) { return r.json(); })
      .then(function (j) { G = j.terms || j; return G; }).catch(function () { G = {}; return G; });
    return loading;
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function names(id, t) {
    var out = [];
    ["zh", "en"].forEach(function (l) { if (t[l] && t[l].name) out.push(t[l].name); });
    (t.aliases || []).forEach(function (a) { if (a && a.length >= 2) out.push(a); });
    return out.filter(function (n, i, arr) { return arr.indexOf(n) === i; });
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Wrap the first occurrence of each term inside a container (text nodes only, never inside links/buttons/code).
  function annotate(root, terms) {
    var done = {};
    var entries = Object.keys(terms).map(function (id) { return { id: id, names: names(id, terms[id]) }; })
      .filter(function (e) { return e.names.length; });
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || !n.nodeValue || n.nodeValue.trim().length < 2) return NodeFilter.FILTER_REJECT;
        if (p.closest("a, button, code, pre, abbr, .term, .bubble, input, textarea, script, style, .no-glossary")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue, best = null;
      entries.forEach(function (e) {
        if (done[e.id]) return;
        e.names.forEach(function (nm) {
          var re = /^[\x00-\x7f]+$/.test(nm) ? new RegExp("(^|[^A-Za-z0-9])(" + escapeRe(nm) + ")(?![A-Za-z0-9])", "i") : new RegExp("(" + escapeRe(nm) + ")");
          var m = re.exec(text);
          if (m && (!best || m.index < best.index)) best = { id: e.id, index: m.index + (m[1] && m.length > 2 ? m[1].length : 0), len: (m[2] || m[1]).length };
        });
      });
      if (!best) return;
      done[best.id] = true;
      var before = text.slice(0, best.index), mid = text.slice(best.index, best.index + best.len), after = text.slice(best.index + best.len);
      var abbr = el("abbr", "term", mid); abbr.setAttribute("data-term", best.id); abbr.setAttribute("title", ""); abbr.setAttribute("role", "button"); abbr.tabIndex = 0;
      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(abbr);
      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function openSheet(id) {
    load().then(function (terms) {
      var t = terms[id]; if (!t) return;
      var lang = LANG, tl = t[lang] || t[OTHER] || {};
      if (!sheet) {
        sheet = el("div", "gl-sheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
        var bd = el("div", "gl-backdrop"); bd.addEventListener("click", closeSheet);
        document.body.appendChild(bd); document.body.appendChild(sheet);
        document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
      }
      function render(l) {
        var d = t[l] || {};
        sheet.innerHTML = "";
        var head = el("div", "gl-head");
        head.appendChild(el("h3", "gl-name", d.name || id));
        var tog = el("button", "gl-lang", l === "zh" ? "EN" : "中文"); tog.type = "button";
        tog.addEventListener("click", function () { render(l === "zh" ? "en" : "zh"); });
        var x = el("button", "gl-close", "×"); x.type = "button"; x.setAttribute("aria-label", "close"); x.addEventListener("click", closeSheet);
        head.appendChild(tog); head.appendChild(x); sheet.appendChild(head);
        if (d.short) sheet.appendChild(el("p", "gl-short", d.short));
        if (t.formula) sheet.appendChild(el("p", "gl-formula mono", t.formula));
        if (d.example) { var ex = el("p", "gl-example"); ex.appendChild(el("span", "gl-label", l === "zh" ? "例子 · " : "Example · ")); ex.appendChild(document.createTextNode(d.example)); sheet.appendChild(ex); }
        if (d.long) { var det = el("details", "gl-long"); det.appendChild(el("summary", null, l === "zh" ? "展开说明" : "More")); det.appendChild(el("p", null, d.long)); sheet.appendChild(det); }
        if (t.see_also && t.see_also.length) {
          var row = el("div", "gl-see");
          t.see_also.forEach(function (sid) { var st = terms[sid]; if (!st) return; var chip = el("button", "chip-btn", (st[l] && st[l].name) || sid); chip.type = "button"; chip.addEventListener("click", function () { openSheet(sid); }); row.appendChild(chip); });
          sheet.appendChild(row);
        }
        sheet.appendChild(el("p", "gl-foot", l === "zh" ? "教育说明，不构成投资建议。" : "Educational note, not investment advice."));
      }
      render(lang);
      document.body.classList.add("gl-open");
    });
  }
  function closeSheet() { document.body.classList.remove("gl-open"); }

  function init() {
    var roots = document.querySelectorAll("[data-glossary]");
    if (!roots.length) return;
    load().then(function (terms) {
      if (!terms || !Object.keys(terms).length) return;
      roots.forEach(function (r) { annotate(r, terms); });
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("abbr.term[data-term]");
        if (a) { e.preventDefault(); openSheet(a.getAttribute("data-term")); }
      });
      document.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("abbr.term[data-term]")) { e.preventDefault(); openSheet(e.target.getAttribute("data-term")); }
      });
    });
  }
  window.DuckyGlossary = { open: openSheet, annotate: function (root) { load().then(function (t) { annotate(root, t); }); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
