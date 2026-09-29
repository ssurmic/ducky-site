// Run before page scripts: explicit locale URLs stay shareable; neutral entries
// use the saved choice, then this browser profile's ordered language preferences.
(function () {
  "use strict";
  var cookieName = "ducky_lang";
  function locale(value) {
    var match = /^(en|zh)(?:-|$)/i.exec(String(value || ""));
    return match ? match[1].toLowerCase() : null;
  }
  function savedLanguage() {
    try {
      var match = document.cookie.match(/(?:^|;\s*)ducky_lang=(en|zh)(?:;|$)/);
      return match ? match[1] : null;
    } catch (_) { return null; }
  }
  function browserLanguage() {
    var languages = navigator.languages || [];
    for (var i = 0; i < languages.length; i++) {
      var supported = locale(languages[i]);
      if (supported) return supported;
    }
    return locale(navigator.language) || "en";
  }

  // Capture also runs when the reset-password view handles navigation itself.
  // The cookie contains only the locale, never the destination or credentials.
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("[data-lang-toggle], [data-lang-toggle-footer]");
    if (!link) return;
    var target = new URL(link.href, location.href);
    var match = /^\/(en|zh)(?:\/|$)/.exec(target.pathname);
    if (target.origin !== location.origin || !match) return;
    try {
      document.cookie = cookieName + "=" + match[1] + "; Path=/; Max-Age=31536000; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
    } catch (_) { /* Language links still work when cookies are blocked. */ }
    saveOnAccount(match[1]);
  }, true);

  // A signed-in reader's choice follows the account to every browser (POST /me/profile {lang}); the
  // keepalive request outlives the page load the link starts. Nothing is sent without a session token.
  function saveOnAccount(language) {
    try {
      var token = window.localStorage.getItem("ducky.token");
      var base = window.DUCKY && window.DUCKY.API_BASE;
      if (!token || !base || typeof fetch !== "function") return;
      fetch(String(base).replace(/\/+$/, "") + "/me/profile", {
        method: "POST", keepalive: true, credentials: "omit",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ lang: language })
      }).catch(function () {});
    } catch (_) { /* the cookie already holds the choice for this browser */ }
  }

  var explicit = /^\/(en|zh)(?:\/|$)/.exec(location.pathname);
  var language = explicit ? explicit[1] : savedLanguage() || browserLanguage();

  // A navigation hint only: the app's existing bootstrap validates/renews the
  // session. No credentials, private data or extra auth request on the landing.
  // Explicit marketing anchors and ?intro=1 remain reachable after signing in.
  function returningBrowser() {
    try {
      if (window.localStorage.getItem("ducky.logged-out") === "1") return false;
      if (window.localStorage.getItem("ducky.token")) return true;
    } catch (_) { /* Cookie-only sessions can still enter the app below. */ }
    try { return /(?:^|;\s*)ducky_entry=1(?:;|$)/.test(document.cookie); }
    catch (_) { return false; }
  }
  if (/^\/(?:(?:en|zh)(?:\/(?:index\.html)?)?|index\.html)?$/.test(location.pathname) &&
      !location.hash && new URL(location.href).searchParams.get("intro") !== "1" && returningBrowser()) {
    location.replace("/" + language + "/app/#/today");
    return;
  }
  if (explicit) return;
  // Previously issued Chinese recovery/OAuth URLs have their own routing owner.
  if (/^\/app(?:\/|\/index\.html)?$/.test(location.pathname) &&
      /^#\/(?:oauth|reset)(?:\?|$)/.test(location.hash)) return;

  // Neutral pages already contain English, preserving the static/SEO fallback.
  if (language === "en") return;
  location.replace("/" + language + location.pathname + location.search + location.hash);
})();
