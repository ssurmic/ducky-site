// Preserve the page requested before sign-in, including a round trip to Google.
// Only a canonical app route and allowlisted public creator choices are stored.
// Never store arbitrary queries, credentials or private draft data.
import { creatorRoute, creatorTarget } from './creator-route.js';
const KEY = "ducky.login-target";
const MAX_AGE = 20 * 60 * 1000;
const SIMPLE = new Set(["watchlist", "alerts", "billing", "profile", "creators", "calendar", "boards"]);

export function safeTarget(hash) {
  if (typeof hash !== "string" || hash.length > 2048) return null;
  const path = hash.split("?")[0];
  if (path === '#/creators') return creatorTarget(creatorRoute(new URLSearchParams(hash.split('?')[1] || '')));
  if (path === '#/boards') {
    const q = new URLSearchParams(hash.split('?')[1] || ''), screen = q.get('screen');
    if (['insider-oversold','institution-oversold'].includes(screen)) return '#/boards?screen=' + screen;
    const ticker=(q.get('ticker')||'').toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker)) return '#/boards';
    const target=new URLSearchParams({mode:'archive',ticker});
    for (const key of ['start','end']) { const date=q.get(key)||''; if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date) target.set(key,date); }
    return '#/boards?'+target;
  }
  if (path === '#/briefing') {
    const period=new URLSearchParams(hash.split('?')[1] || '').get('period');
    return period==='weekly' ? '#/briefing?period=weekly' : '#/briefing';
  }
  if (path === '#/alerts' || path === '#/calendar') {
    const ticker=(new URLSearchParams(hash.split('?')[1] || '').get('ticker')||'').toUpperCase();
    return /^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker) ? path+'?ticker='+ticker : path;
  }
  if (SIMPLE.has(path.slice(2)) && path.startsWith("#/")) return path;
  const match = /^#\/(chart|research)(?:\/([A-Za-z0-9][A-Za-z0-9.-]{0,14}))?$/.exec(path);
  return match ? `#/${match[1]}${match[2] ? "/" + match[2].toUpperCase() : ""}` : null;
}

export function rememberTarget(hash) {
  const target = safeTarget(hash);
  if (!target) return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ target, at: Date.now() })); }
  catch (_) { /* Sign-in still works when browser storage is unavailable. */ }
}

export function takeTarget(fallback = "#/watchlist") {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    const saved = JSON.parse(raw);
    const age = Date.now() - saved?.at;
    if (typeof saved?.at === "number" && Number.isFinite(age) && age >= 0 && age <= MAX_AGE) {
      const target = safeTarget(saved.target);
      if (target) return target;
    }
  } catch (_) { /* A stale or malformed entry must never prevent sign-in. */ }
  return fallback;
}

export function verificationTarget() {
  const next = takeTarget(null);
  return next && next !== "#/profile" ? "#/profile?next=" + encodeURIComponent(next.slice(2)) : "#/profile";
}
