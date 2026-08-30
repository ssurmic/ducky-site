// lang.js — zh ↔ EN toggle that preserves the in-page anchor (#proof, #pricing …).
// The build already writes the alternate-language URL into href; this only appends location.hash.
(function () {
  "use strict";
  var toggles = document.querySelectorAll("[data-lang-toggle], [data-lang-toggle-footer]");
  if (!toggles.length) return;
  var bases = [];
  toggles.forEach(function (a, i) { bases[i] = a.getAttribute("href").split("#")[0]; });
  function sync() {
    var h = location.hash || "";
    toggles.forEach(function (a, i) { a.setAttribute("href", bases[i] + h); });
  }
  sync();
  window.addEventListener("hashchange", sync);
  toggles.forEach(function (a) { a.addEventListener("click", sync); });
})();
