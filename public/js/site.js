// site.js — landing-only behaviour. No network, no third-party code, no window.Telegram (that is tg.js, later pack).
(function () {
  "use strict";

  // 1. Mobile sticky bar: show after the hero scrolls out, hide while #pricing is in view.
  var bar = document.getElementById("sticky-bar");
  var hero = document.getElementById("top");
  var pricing = document.getElementById("pricing");
  if (bar && hero && "IntersectionObserver" in window) {
    var heroOut = false, pricingIn = false;
    function apply() {
      var show = heroOut && !pricingIn;
      bar.classList.toggle("show", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
    }
    new IntersectionObserver(function (es) { heroOut = !es[0].isIntersecting; apply(); }, { threshold: 0.05 }).observe(hero);
    if (pricing) {
      new IntersectionObserver(function (es) { pricingIn = es[0].isIntersecting; apply(); }, { threshold: 0.05 }).observe(pricing);
    }
  }

  // 2. Pricing monthly/annual toggle (annual is the default).
  var tiers = document.querySelector(".tiers");
  document.querySelectorAll("[data-billing]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-billing");
      if (tiers) tiers.setAttribute("data-billing-mode", mode);
      document.querySelectorAll("[data-billing]").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
  });

  // 3. "Copy caption" on receipt cards — a ready-made 小红书 / X share text (中文 + EN).
  document.querySelectorAll("button.copy[data-caption]").forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-caption");
      var done = function () {
        btn.classList.add("done");
        btn.textContent = btn.getAttribute("data-copied") || "✓";
        setTimeout(function () { btn.classList.remove("done"); btn.textContent = label; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
      } else {
        fallback(text, done);
      }
    });
  });
  function fallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }
})();
