// creators.js — populate the "财经博主" section live from /public/kol-feed.json (our edge-cached API).
// Renders the curated creator grid + the recent summary feed. Falls back to the static sample if the feed
// is empty or the API is unreachable (landing stays static-safe). Same-origin-family fetch, no third-party.
(function () {
  "use strict";
  var sec = document.querySelector(".creators[data-creators]");
  if (!sec || !window.DUCKY || !window.DUCKY.API_BASE) return;
  var meta;
  try { meta = JSON.parse(sec.getAttribute("data-creators")); } catch (e) { return; }
  var isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  var takeCls = { bull: "cr-bull", bear: "cr-bear", neutral: "cr-neutral" };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pickSummary(s) {
    if (s == null) return "";
    if (typeof s === "object") return isZh ? (s.zh || s.en || "") : (s.en || s.zh || "");
    try { var o = JSON.parse(s); return isZh ? (o.zh || o.en || "") : (o.en || o.zh || ""); } catch (e) { return String(s); }
  }

  fetch(window.DUCKY.API_BASE.replace(/\/$/, "") + "/public/kol-feed.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (doc) {
      if (!doc) return;
      var kols = Array.isArray(doc.kols) ? doc.kols : [];
      var posts = Array.isArray(doc.posts) ? doc.posts : [];

      if (kols.length) {
        var grid = document.getElementById("cr-grid");
        if (grid) {
          grid.textContent = "";
          kols.slice(0, 24).forEach(function (k) {
            var chip = el(k.url ? "a" : "span", "cr-chip");
            if (k.url) { chip.href = k.url; chip.target = "_blank"; chip.rel = "noopener"; }
            chip.textContent = "🎙️ " + (k.name || k.id);
            grid.appendChild(chip);
          });
        }
      }

      var feed = document.getElementById("cr-feed");
      if (!feed) return;
      if (!posts.length) {
        feed.textContent = "";
        feed.appendChild(el("p", "muted", meta.soon || ""));
        return;
      }
      feed.textContent = "";
      posts.slice(0, 8).forEach(function (p) {
        var art = el("article", "cr-post");
        var head = el("div", "cr-post-head");
        head.appendChild(el("b", "cr-who", "🎙️ " + (p.kol_name || p.kol_id || "")));
        var take = (p.take || "neutral");
        head.appendChild(el("span", "cr-take " + (takeCls[take] || "cr-neutral"), (meta.take && meta.take[take]) || take));
        if (p.tickers && p.tickers.length) head.appendChild(el("span", "cr-tks mono", p.tickers.slice(0, 4).map(function (t) { return "$" + t; }).join(" · ")));
        art.appendChild(head);
        art.appendChild(el("p", "cr-sum", pickSummary(p.summary)));
        if (p.url) { var a = el("a", "cr-orig", (meta.orig || "original") + " ↗"); a.href = p.url; a.target = "_blank"; a.rel = "noopener"; art.appendChild(a); }
        feed.appendChild(art);
      });
      sec.setAttribute("data-cr-live", String(posts.length));
    })
    .catch(function () { /* keep the sample — landing stays resilient */ });
})();
