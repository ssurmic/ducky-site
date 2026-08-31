// market-weather.js — keep the hero "大盘总结 · 市场天气" card LIVE without a rebuild.
// The card is baked at build time (resilient: it always shows *something*, even if the API/tunnel is down).
// This progressively upgrades it: fetch the latest regime from our own edge-cached API and, if it's newer
// than the baked reading, refresh the weather line, the VIX/trend water-level, and the 读数日 date in place.
// Same-origin-family request (API_BASE is allowlisted in the CSP connect-src); any failure leaves the baked
// value untouched. No third-party code, no dependencies.
(function () {
  "use strict";
  var card = document.querySelector(".mw-card[data-mw]");
  if (!card || !window.DUCKY || !window.DUCKY.API_BASE) return;
  var meta;
  try { meta = JSON.parse(card.getAttribute("data-mw")); } catch (e) { return; }
  if (!meta || !meta.wx) return;

  function fmtTrend(x) { return (x >= 0 ? "+" : "") + (x * 100).toFixed(1) + "%"; }
  function fmtVix(x) { return (Math.round(x * 10) / 10).toFixed(1); }

  fetch(window.DUCKY.API_BASE.replace(/\/$/, "") + "/public/track-record.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (doc) {
      var rt = doc && doc.regimes_today;
      if (!rt || !rt.d) return;
      // only move forward — never replace a newer baked reading with an older API one
      if (meta.d && String(rt.d) <= String(meta.d)) return;

      var asof = card.querySelector(".mw-asof");
      if (asof) asof.textContent = (meta.asof || "") + rt.d;

      var wx = card.querySelector(".mw-wx");
      var txt = meta.wx[rt.regime] || meta.wx.unknown;
      if (wx && txt) wx.textContent = txt;

      var level = card.querySelector(".mw-level");
      if (level && meta.level && typeof rt.vix_close === "number" && typeof rt.spx_vs_200dma === "number") {
        level.textContent = meta.level
          .replace("{vix}", fmtVix(rt.vix_close))
          .replace("{trend}", fmtTrend(rt.spx_vs_200dma));
      }
      card.setAttribute("data-mw-live", rt.d);
    })
    .catch(function () { /* keep the baked value — landing stays resilient if the API is unreachable */ });
})();
