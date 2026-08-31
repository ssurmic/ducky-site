// hero.js — landing hero carousel (SYSTEMDESIGN §5.3.5): dots + ‹ › arrows + one-shot auto-advance.
// No deps, no network; works in the Telegram WebView; keyboard accessible (carousel is focusable).
(function () {
  "use strict";
  var car = document.getElementById("hero-carousel");
  var dots = Array.prototype.slice.call(document.querySelectorAll("#hero-dots .hero-dot"));
  if (!car || !dots.length) return;
  var moved = false;
  var smooth = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var lastIdx = -1;
  function cur() { return Math.round(car.scrollLeft / car.clientWidth); }
  function go(i) { car.scrollTo({ left: Math.max(0, Math.min(dots.length - 1, i)) * car.clientWidth, behavior: smooth ? "smooth" : "auto" }); }
  // Live-demo feel (§5.3.5): replay the staggered bubble entrance whenever slide 1 becomes current. Motion is
  // opt-in — the class is only ever added when motion is allowed; CSS keeps the bubbles fully visible otherwise.
  function replayBubbles() { if (!smooth) return; car.classList.remove("hero-animate"); void car.offsetWidth; car.classList.add("hero-animate"); }
  function paint() {
    var i = cur();
    dots.forEach(function (d, k) { d.classList.toggle("on", k === i); d.setAttribute("aria-current", k === i ? "true" : "false"); });
    if (i === 0 && lastIdx !== 0) replayBubbles();
    lastIdx = i;
  }
  dots.forEach(function (d, k) { d.addEventListener("click", function () { moved = true; go(k); }); });
  Array.prototype.forEach.call(document.querySelectorAll("#hero-dots .hero-arrow"), function (b) {
    b.addEventListener("click", function () { moved = true; go(cur() + Number(b.getAttribute("data-hero-arrow"))); });
  });
  car.addEventListener("scroll", function () { window.requestAnimationFrame(paint); }, { passive: true });
  car.addEventListener("pointerdown", function () { moved = true; }, { passive: true });
  car.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { moved = true; e.preventDefault(); go(cur() + (e.key === "ArrowRight" ? 1 : -1)); }
  });
  setTimeout(function () { if (!moved && cur() === 0) go(1); }, 4000); // hint swipeability once, then stop
  paint();
})();
