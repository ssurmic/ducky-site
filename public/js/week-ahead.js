// week-ahead.js — keep the hero "本周前瞻 / Week Ahead" card LIVE without a rebuild.
// The card ships as a labelled SAMPLE (real generator is the Monday DM). This progressively upgrades it: fetch
// this week's real macro + big-earnings calendar from our edge-cached API and, if present, swap the sample
// events for the real ones, flip the "示意样例" badge to a "本周·实时" one, and drop the sample odds line.
// Any failure leaves the sample untouched (landing stays static-safe). Same-origin-family fetch, no third-party.
(function () {
  "use strict";
  var card = document.querySelector(".wa-card[data-wa]");
  if (!card || !window.DUCKY || !window.DUCKY.API_BASE) return;
  var meta;
  try { meta = JSON.parse(card.getAttribute("data-wa")); } catch (e) { return; }
  var isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";

  function evLabel(e) {
    if (e.kind === "earnings") {
      var when = isZh ? (e.et_zh || "") : (e.et_en || "");
      return "$" + e.name + " " + (meta.earn || "") + (when ? " (" + when + ")" : "") + (e.watch ? " ⭐" : "");
    }
    return e.name + (e.et ? " · " + e.et : "");
  }

  fetch(window.DUCKY.API_BASE.replace(/\/$/, "") + "/public/week-ahead.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (doc) {
      var evs = doc && Array.isArray(doc.events) ? doc.events : null;
      if (!evs || !evs.length) return;
      // prioritise high-impact macro, then watched/mega earnings; show the first 4
      var order = { macro: 0, earnings: 1 };
      evs = evs.slice().sort(function (a, b) {
        var ai = order[a.kind] + (a.tier === "fed" ? 0.5 : 0) - (a.watch ? 0.3 : 0);
        var bi = order[b.kind] + (b.tier === "fed" ? 0.5 : 0) - (b.watch ? 0.3 : 0);
        return ai - bi;
      }).slice(0, 4);

      var ul = card.querySelector(".wa-events");
      if (ul) {
        ul.textContent = "";
        evs.forEach(function (e) {
          var li = document.createElement("li");
          var day = document.createElement("span"); day.className = "wa-day mono";
          day.textContent = (isZh ? e.dow : e.dow_en) || "";
          var ev = document.createElement("span"); ev.className = "wa-ev";
          ev.textContent = evLabel(e);
          li.appendChild(day); li.appendChild(ev); ul.appendChild(li);
        });
      }
      var badge = card.querySelector(".wa-badge");
      if (badge && meta.badge) { badge.textContent = meta.badge; badge.classList.add("wa-badge-live"); }
      var odds = card.querySelector(".wa-odds");
      if (odds) odds.hidden = true;                        // export carries events only, not base-rate odds
      var note = card.querySelector(".wa-note");
      if (note && meta.note) note.textContent = meta.note;
      card.setAttribute("data-wa-live", doc.week_of || "1");
    })
    .catch(function () { /* keep the sample — landing stays resilient if the API is unreachable */ });
})();
