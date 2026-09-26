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

  if (/^\/(?:en|zh)(?:\/|$)/.test(location.pathname)) return;
  // Previously issued Chinese recovery/OAuth URLs have their own routing owner.
  if (/^\/app(?:\/|\/index\.html)?$/.test(location.pathname) &&
      /^#\/(?:oauth|reset)(?:\?|$)/.test(location.hash)) return;

  var language = savedLanguage() || browserLanguage();
  // Neutral pages already contain English, preserving the static/SEO fallback.
  if (language === "en") return;
  location.replace("/" + language + location.pathname + location.search + location.hash);
})();
