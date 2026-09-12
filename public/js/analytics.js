// Owner-authorized GA4, 2026-09-11. Basic consent mode: no Google request before opt-in.
// Enhanced measurement must remain OFF in the web stream (including history events).
(() => {
  'use strict';
  const id = window.DUCKY?.GA4_MEASUREMENT_ID;
  const origin = window.DUCKY?.GA4_ORIGIN;
  const banner = document.getElementById('analytics-choice');
  if (!/^G-[A-Z0-9]+$/.test(id || '') || !banner || window.__duckyAnalytics) return;
  window.__duckyAnalytics = true;
  const production = location.origin === origin && !location.pathname.includes('/preview/');
  const choiceKey = 'ducky.analytics-consent.v1';
  const maxAge = 180 * 24 * 60 * 60 * 1000;
  const app = document.body.classList.contains('page-app');
  const routes = new Set(('today explore stock research-brief reports record evidence opportunities degen vibe market macro screens research login oauth register forgot reset watchlist briefing alerts updates chart billing profile creators calendar boards').split(' '));
  const publicPages = new Set('index privacy disclaimer research-records track-record trending ideas idea 404'.split(' '));
  const lang = document.documentElement.dataset.lang === 'zh' ? 'zh' : 'en';
  const prefix = location.pathname.startsWith('/en/') ? '/en' : location.pathname.startsWith('/zh/') ? '/zh' : '';
  const page = [...document.body.classList].find(c => c.startsWith('page-'))?.slice(5);
  // A credential-bearing arrival never loads third-party code in that document, even after auth cleans it.
  const sensitiveAddress = () => /(?:[?&#]|^)(?:code|state|token|access_token|id_token|credential|password|email|session|tgWebAppData)=/i.test(location.search + location.hash)
    || /#\/?(?:oauth|reset)(?:[/?]|$)/.test(location.hash);
  const sensitiveArrival = sensitiveAddress();
  let choice = null, loaded = false, current = null, lastSentKey = null, restoreFocus = null;
  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(choiceKey));
      if (saved && ['granted', 'denied'].includes(saved.value) && Date.now() - saved.at < maxAge && saved.at <= Date.now()) return saved.value;
    } catch { /* Storage can be blocked; remain opted out. */ }
    return null;
  }
  function allowed() { return production && !sensitiveArrival && !sensitiveAddress() && choice === 'granted'; }
  function gtag() { window.dataLayer.push(arguments); }
  function context(route) {
    if (app && !routes.has(route)) return null;
    if (!app && !publicPages.has(page)) return null;
    const path = app ? `${prefix}/app/${route}/` : `${prefix}/${page === 'index' ? '' : page + '/'}`;
    return {
      page_location: origin + path,
      page_title: `Ducky Bot | ${app ? route : page === 'index' ? 'Home' : page} (${lang})`,
      page_referrer: '',
      language: lang,
    };
  }
  function initialReferrer() {
    try { const url = new URL(document.referrer); return /^https?:$/.test(url.protocol) ? url.origin + '/' : ''; }
    catch { return ''; }
  }
  function send() {
    if (!allowed() || !current || current.key === lastSentKey) return;
    window['ga-disable-' + id] = false;
    if (!loaded) {
      loaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = gtag;
      gtag('consent', 'default', {
        analytics_storage: 'granted', ad_storage: 'denied',
        ad_user_data: 'denied', ad_personalization: 'denied',
      });
      gtag('js', new Date());
      gtag('config', id, {
        ...current.value, send_page_view: false,
        allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_expires: 15552000, cookie_update: false, cookie_flags: 'SameSite=Lax;Secure',
      });
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
      document.head.appendChild(script);
    } else {
      gtag('config', id, { ...current.value, update: true, send_page_view: false });
    }
    // Set context for GA's own session/engagement events as well as our explicit page view.
    gtag('set', current.value);
    gtag('event', 'page_view', { ...current.value, send_to: id });
    lastSentKey = current.key;
  }
  function view(route) {
    if (sensitiveAddress()) { window['ga-disable-' + id] = true; return; }
    const value = context(route);
    if (!value) return;
    // Local comparison only: identifiers never enter dataLayer or the request payload.
    const key = location.pathname + location.hash.split('?')[0] + '|' + (route || page);
    if (current?.key === key) return;
    value.page_referrer = current?.value.page_location || initialReferrer();
    current = { key, value };
    send();
  }
  function clearCookies() {
    for (const part of document.cookie.split(';')) {
      const name = part.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', ';domain=' + location.hostname, ';domain=.' + location.hostname]) {
        document.cookie = `${name}=;max-age=0;path=/${domain};SameSite=Lax;Secure`;
      }
    }
  }
  function apply(value, persist = true) {
    choice = value;
    if (persist) { try { localStorage.setItem(choiceKey, JSON.stringify({ value, at: Date.now() })); } catch {} }
    if (value !== 'granted') {
      window['ga-disable-' + id] = true;
      clearCookies();
    } else send();
    banner.hidden = true;
    restoreFocus?.focus({ preventScroll: true });
    restoreFocus = null;
  }
  banner.querySelectorAll('[data-analytics-choice]').forEach(button => button.addEventListener('click', () => apply(button.dataset.analyticsChoice)));
  document.querySelectorAll('[data-analytics-manage]').forEach(button => button.addEventListener('click', () => {
    restoreFocus = button; banner.hidden = false;
    banner.querySelector('button').focus({ preventScroll: true });
  }));
  window.addEventListener('storage', event => {
    if (event.key === choiceKey || event.key === null) apply(readChoice(), false);
  });
  window.addEventListener('ducky:page', event => { if (app) view(event.detail?.route); });
  choice = readChoice();
  window['ga-disable-' + id] = choice !== 'granted';
  if (choice !== 'granted') clearCookies();
  if (app) { if (document.body.dataset.route) view(document.body.dataset.route); }
  else view();
  banner.hidden = choice !== null;
})();
