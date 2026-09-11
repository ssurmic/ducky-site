// lang.js — zh ↔ EN toggle that preserves the in-page anchor (#proof, #pricing …).
// Retain the selected record on dynamically rewritten idea pages as well as location.hash.
(function () {
  "use strict";
  var toggles = document.querySelectorAll("[data-lang-toggle], [data-lang-toggle-footer]");
  if (!toggles.length) return;
  var bases = [];
  var idea = /^\/(?:(?:en|zh)\/)?ideas\/([A-Za-z0-9._-]+)\/?$/.exec(location.pathname);
  toggles.forEach(function (a, i) {
    bases[i] = a.getAttribute("href").split("#")[0];
    if (idea && /^\/(?:(?:en|zh)\/)?idea\/$/.test(bases[i])) {
      bases[i] = bases[i].replace(/idea\/$/, "ideas/" + encodeURIComponent(idea[1]) + "/");
    }
  });
  function sync() {
    var h = location.hash || "";
    // Recovery credentials remain in the form closure, never in a persistent link.
    if (/^#\/reset(?:\?|$)/.test(h)) h = "#/reset";
    toggles.forEach(function (a, i) { a.setAttribute("href", bases[i] + h); });
  }
  sync();
  window.addEventListener("hashchange", sync);
  toggles.forEach(function (a) { a.addEventListener("click", sync); });
})();
