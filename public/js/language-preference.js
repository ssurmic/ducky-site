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
  }, true);

  if (/^\/(?:en|zh)(?:\/|$)/.test(location.pathname)) return;
  // Previously issued Chinese recovery/OAuth URLs have their own routing owner.
  if (/^\/app(?:\/|\/index\.html)?$/.test(location.pathname) &&
      /^#\/(?:oauth|reset)(?:\?|$)/.test(location.hash)) return;

  var language = savedLanguage() || browserLanguage();
  // Neutral pages already contain English, preserving the static/SEO fallback.
  if (language === "en") return;
  location.replace("/" + language + location.pathname + location.search + location.hash);
})();
